-- =====================================================================
-- BlackBox Ghana — Promotions: campus attach + category bridge
-- Migration: 20260721000500_promo_campus_and_category.sql
-- Depends on: 20260721000000_promotions.sql … 20260721000400
--
-- Run this entire file in one go (Supabase SQL editor).
-- Dollar-quoted with $bb$ so statement splitters do not break PL/pgSQL.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Product categories (UUID bridge for text products.category)
-- ---------------------------------------------------------------------
create table if not exists public.product_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now(),
  constraint product_categories_name_key unique (name)
);

insert into public.product_categories (name)
values
  ('iPhone'),
  ('iPad'),
  ('Laptop'),
  ('Accessories'),
  ('Gaming'),
  ('Audio'),
  ('Tablet')
on conflict (name) do nothing;

insert into public.product_categories (name)
select distinct trim(p.category)
from public.products p
where p.category is not null
  and length(trim(p.category)) > 0
on conflict (name) do nothing;

alter table public.product_categories enable row level security;

drop policy if exists product_categories_read on public.product_categories;
create policy product_categories_read on public.product_categories
  for select using (true);

drop policy if exists product_categories_admin on public.product_categories;
create policy product_categories_admin on public.product_categories
  for all using (public.promo_is_admin()) with check (public.promo_is_admin());

grant select on public.product_categories to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Campus attach — profile only (ignore client campus_id)
-- ---------------------------------------------------------------------
drop function if exists public.promo_set_order_campus(uuid, uuid);
drop function if exists public.promo_set_order_campus(uuid);

create or replace function public.promo_set_order_campus(
  p_order_id uuid,
  p_campus_id uuid default null
) returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $bb$
declare
  v_owner uuid;
  v_campus uuid;
begin
  -- p_campus_id is intentionally unused: campus is never taken from the client.
  select o.user_id into v_owner
  from public.orders o
  where o.id = p_order_id;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_owner is distinct from auth.uid() then
    raise exception 'not your order' using errcode = '42501';
  end if;

  select pr.campus_id into v_campus
  from public.profiles pr
  where pr.id = auth.uid();

  if v_campus is null then
    return;
  end if;

  if not exists (
    select 1 from public.campuses c where c.id = v_campus and c.is_active
  ) then
    return;
  end if;

  update public.orders
     set campus_id = v_campus,
         updated_at = now()
   where id = p_order_id
     and campus_id is null;
end;
$bb$;

revoke all on function public.promo_set_order_campus(uuid, uuid) from public, anon;
grant execute on function public.promo_set_order_campus(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3a. Atomic stock take (isolated so EXCEPTION is never mis-parsed)
-- ---------------------------------------------------------------------
create or replace function public.promo_reserve_take_stock(
  p_promo_id uuid,
  p_code_id uuid,
  p_order_id uuid,
  p_user_id uuid,
  p_guest_phone text,
  p_disc bigint,
  p_sub bigint
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $bb$
declare
  v_promo public.promotions;
  v_used integer;
begin
  select * into v_promo from public.promotions where id = p_promo_id for update;

  if v_promo.max_redemptions_per_user is not null
     and v_promo.max_redemptions_per_user > 1 then
    select count(*) into v_used
    from public.promotion_redemptions r
    where r.promotion_id = p_promo_id
      and r.status in ('reserved', 'applied')
      and (
        (p_user_id is not null and r.user_id = p_user_id)
        or (p_user_id is null and p_guest_phone is not null and r.guest_phone = p_guest_phone)
      );
    if v_used >= v_promo.max_redemptions_per_user then
      return jsonb_build_object(
        'ok', false,
        'reason', 'user_limit_reached',
        'message', 'You have already used this offer.'
      );
    end if;
  end if;

  update public.promotions
     set times_redeemed = times_redeemed + 1,
         updated_at = now()
   where id = p_promo_id
     and (max_redemptions is null or times_redeemed < max_redemptions);
  if not found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'promo_exhausted',
      'message', 'This offer has ended.'
    );
  end if;

  if p_code_id is not null then
    update public.promotion_codes
       set times_redeemed = times_redeemed + 1
     where id = p_code_id
       and is_active
       and (max_redemptions is null or times_redeemed < max_redemptions);
    if not found then
      return jsonb_build_object(
        'ok', false,
        'reason', 'code_exhausted',
        'message', 'This code has already been used.'
      );
    end if;
  end if;

  insert into public.promotion_redemptions (
    promotion_id, code_id, order_id, user_id, guest_phone,
    amount_discounted_pesewas, eligible_subtotal_pesewas, status
  ) values (
    p_promo_id, p_code_id, p_order_id, p_user_id, p_guest_phone,
    p_disc, p_sub, 'reserved'
  );

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'reason', 'user_limit_reached',
      'message', 'You have already used this offer.'
    );
end;
$bb$;

revoke all on function public.promo_reserve_take_stock(uuid, uuid, uuid, uuid, text, bigint, bigint)
  from public, anon, authenticated;
-- Only callable from promo_reserve (same owner). Not exposed to clients.

-- ---------------------------------------------------------------------
-- 3b. promo_reserve — include category_id from products.category
-- ---------------------------------------------------------------------
create or replace function public.promo_reserve(
  p_order_id    uuid,
  p_code        text default null,
  p_guest_phone text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $bb$
declare
  v_user      uuid := auth.uid();
  v_items     jsonb;
  v_campus    uuid;
  v_code_norm citext;
  v_code_row  public.promotion_codes;
  v_eval      jsonb;
  v_promo_id  uuid;
  v_code_id   uuid;
  v_disc      bigint;
  v_sub       bigint;
  v_owner     uuid;
  v_sub_ghs   numeric;
  v_ship_ghs  numeric;
  v_stock     jsonb;
begin
  select o.user_id into v_owner from public.orders o where o.id = p_order_id;
  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if v_owner is not null and v_owner is distinct from v_user then
    raise exception 'not your order' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'kind',               'product',
           'product_id',         oi.product_id,
           'category_id',        pc.id,
           'unit_price_pesewas', round(coalesce(oi.unit_price, oi.price, 0) * 100)::bigint,
           'qty',                oi.quantity)), '[]'::jsonb)
    into v_items
  from public.order_items oi
  left join public.products p on p.id = oi.product_id
  left join public.product_categories pc
    on pc.name = nullif(trim(p.category), '')
  where oi.order_id = p_order_id;

  v_campus := public.promo_order_campus(p_order_id);

  v_code_norm := public.promo_normalize_code(p_code);
  if v_code_norm is not null then
    select * into v_code_row from public.promotion_codes where code = v_code_norm;
    if found then
      v_eval := public.promo_evaluate(
        v_code_row.promotion_id, v_code_row.id,
        v_items, v_campus, v_user, p_guest_phone
      );
      v_code_id := v_code_row.id;
    end if;
  end if;

  if v_eval is null or not (v_eval->>'ok')::boolean then
    v_code_id := null;
    v_eval := (public.promo_quote(v_items, null, v_campus, p_guest_phone))->'applied';
  end if;

  if v_eval is null or not coalesce((v_eval->>'ok')::boolean, false) then
    return coalesce(v_eval, jsonb_build_object(
      'ok', false, 'reason', 'not_found', 'message', 'This code is not valid.'));
  end if;

  v_promo_id := (v_eval->>'promotion_id')::uuid;
  v_code_id  := nullif(v_eval->>'code_id', '')::uuid;
  v_disc     := (v_eval->>'discount_pesewas')::bigint;
  v_sub      := (v_eval->>'eligible_subtotal_pesewas')::bigint;

  v_stock := public.promo_reserve_take_stock(
    v_promo_id, v_code_id, p_order_id, v_user, p_guest_phone, v_disc, v_sub
  );
  if not coalesce((v_stock->>'ok')::boolean, false) then
    return v_stock;
  end if;

  select coalesce(sum(oi.quantity * coalesce(oi.unit_price, oi.price, 0)), 0),
         coalesce((select o.shipping_cost from public.orders o where o.id = p_order_id), 0)
    into v_sub_ghs, v_ship_ghs
  from public.order_items oi
  where oi.order_id = p_order_id;

  update public.orders
     set discount_pesewas = v_disc,
         discount_amount  = round(v_disc / 100.0, 2),
         total_price      = greatest(0, round(v_sub_ghs + v_ship_ghs - (v_disc / 100.0), 2)),
         updated_at       = now()
   where id = p_order_id;

  return jsonb_build_object(
    'ok', true, 'reason', 'ok',
    'promotion_id', v_promo_id, 'code_id', v_code_id,
    'discount_pesewas', v_disc, 'name', v_eval->>'name',
    'message', 'Discount applied.'
  );
end;
$bb$;

revoke all on function public.promo_reserve(uuid, text, text) from public;
grant execute on function public.promo_reserve(uuid, text, text) to anon, authenticated;
