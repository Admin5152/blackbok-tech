-- BlackBox Ghana — delivery lines in promo_reserve + repair/trade promo reserve
-- Run after 20260721000700_iphone_retail_variant_prices.sql

-- ---------------------------------------------------------------------
-- 1. Redemption log supports orders, repairs, and trade-ins
-- ---------------------------------------------------------------------
alter table public.promotion_redemptions
  alter column order_id drop not null;

alter table public.promotion_redemptions
  add column if not exists repair_request_id uuid
    references public.repair_requests(id) on delete restrict,
  add column if not exists trade_in_request_id uuid
    references public.trade_in_requests(id) on delete restrict;

alter table public.promotion_redemptions
  drop constraint if exists promo_redemption_entity;

alter table public.promotion_redemptions
  add constraint promo_redemption_entity check (
    num_nonnulls(order_id, repair_request_id, trade_in_request_id) = 1
  );

create unique index if not exists promo_one_per_repair
  on public.promotion_redemptions (repair_request_id)
  where status in ('reserved', 'applied') and repair_request_id is not null;

create unique index if not exists promo_one_per_trade
  on public.promotion_redemptions (trade_in_request_id)
  where status in ('reserved', 'applied') and trade_in_request_id is not null;

-- ---------------------------------------------------------------------
-- 2. Service request discount columns (integer pesewas)
-- ---------------------------------------------------------------------
alter table public.repair_requests
  add column if not exists discount_pesewas bigint not null default 0;

alter table public.repair_requests
  drop constraint if exists repair_requests_discount_pesewas_check;

alter table public.repair_requests
  add constraint repair_requests_discount_pesewas_check
  check (discount_pesewas >= 0);

alter table public.trade_in_requests
  add column if not exists discount_pesewas bigint not null default 0;

alter table public.trade_in_requests
  drop constraint if exists trade_in_requests_discount_pesewas_check;

alter table public.trade_in_requests
  add constraint trade_in_requests_discount_pesewas_check
  check (discount_pesewas >= 0);

-- ---------------------------------------------------------------------
-- 3. Stock take — one parent entity per redemption
-- ---------------------------------------------------------------------
drop function if exists public.promo_reserve_take_stock(uuid, uuid, uuid, uuid, text, bigint, bigint);

create or replace function public.promo_reserve_take_stock(
  p_promo_id              uuid,
  p_code_id               uuid,
  p_order_id              uuid,
  p_repair_request_id     uuid,
  p_trade_in_request_id   uuid,
  p_user_id               uuid,
  p_guest_phone           text,
  p_disc                  bigint,
  p_sub                   bigint,
  p_status                promo_redemption_status default 'reserved'
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $bb$
declare
  v_promo public.promotions;
  v_used  integer;
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
    promotion_id, code_id, order_id, repair_request_id, trade_in_request_id,
    user_id, guest_phone,
    amount_discounted_pesewas, eligible_subtotal_pesewas, status
  ) values (
    p_promo_id, p_code_id, p_order_id, p_repair_request_id, p_trade_in_request_id,
    p_user_id, p_guest_phone,
    p_disc, p_sub, p_status
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

revoke all on function public.promo_reserve_take_stock(
  uuid, uuid, uuid, uuid, uuid, uuid, text, bigint, bigint, promo_redemption_status
) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. promo_reserve — include delivery fee in eligible items
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

  select coalesce((select o.shipping_cost from public.orders o where o.id = p_order_id), 0)
    into v_ship_ghs;

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

  if v_ship_ghs > 0 then
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'kind', 'delivery',
      'unit_price_pesewas', round(v_ship_ghs * 100)::bigint,
      'qty', 1
    ));
  end if;

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
    v_promo_id, v_code_id, p_order_id, null, null,
    v_user, p_guest_phone, v_disc, v_sub, 'reserved'
  );
  if not coalesce((v_stock->>'ok')::boolean, false) then
    return v_stock;
  end if;

  select coalesce(sum(oi.quantity * coalesce(oi.unit_price, oi.price, 0)), 0)
    into v_sub_ghs
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

-- ---------------------------------------------------------------------
-- 5. promo_reserve_repair — Apple-matrix / quoted repair payable
-- ---------------------------------------------------------------------
create or replace function public.promo_reserve_repair(
  p_repair_id uuid,
  p_code      text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $bb$
declare
  v_user      uuid := auth.uid();
  v_repair    public.repair_requests;
  v_payable   numeric;
  v_items     jsonb;
  v_campus    uuid;
  v_code_norm citext;
  v_code_row  public.promotion_codes;
  v_eval      jsonb;
  v_promo_id  uuid;
  v_code_id   uuid;
  v_disc      bigint;
  v_sub       bigint;
  v_stock     jsonb;
begin
  select * into v_repair from public.repair_requests where id = p_repair_id;
  if not found then
    raise exception 'repair not found' using errcode = 'P0002';
  end if;
  if v_repair.user_id is not null and v_repair.user_id is distinct from v_user then
    raise exception 'not your repair request' using errcode = '42501';
  end if;

  v_payable := coalesce(v_repair.final_cost, v_repair.estimated_cost, 0);
  if v_payable <= 0 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'no_payable_amount',
      'message', 'No repair amount to discount yet. Apply a promo after you receive a quote.'
    );
  end if;

  v_items := jsonb_build_array(jsonb_build_object(
    'kind', 'repair',
    'unit_price_pesewas', round(v_payable * 100)::bigint,
    'qty', 1
  ));

  select pr.campus_id into v_campus
  from public.profiles pr
  where pr.id = v_user;

  v_code_norm := public.promo_normalize_code(p_code);
  if v_code_norm is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'This code is not valid.');
  end if;

  select * into v_code_row from public.promotion_codes where code = v_code_norm;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'This code is not valid.');
  end if;

  v_eval := public.promo_evaluate(
    v_code_row.promotion_id, v_code_row.id,
    v_items, v_campus, v_user, null
  );

  if v_eval is null or not coalesce((v_eval->>'ok')::boolean, false) then
    return coalesce(v_eval, jsonb_build_object(
      'ok', false, 'reason', 'not_found', 'message', 'This code is not valid.'));
  end if;

  v_promo_id := (v_eval->>'promotion_id')::uuid;
  v_code_id  := nullif(v_eval->>'code_id', '')::uuid;
  v_disc     := (v_eval->>'discount_pesewas')::bigint;
  v_sub      := (v_eval->>'eligible_subtotal_pesewas')::bigint;

  v_stock := public.promo_reserve_take_stock(
    v_promo_id, v_code_id, null, p_repair_id, null,
    v_user, null, v_disc, v_sub, 'applied'
  );
  if not coalesce((v_stock->>'ok')::boolean, false) then
    return v_stock;
  end if;

  update public.repair_requests
     set discount_pesewas = v_disc,
         updated_at = now()
   where id = p_repair_id;

  return jsonb_build_object(
    'ok', true, 'reason', 'ok',
    'promotion_id', v_promo_id, 'code_id', v_code_id,
    'discount_pesewas', v_disc, 'name', v_eval->>'name',
    'message', 'Discount applied.'
  );
end;
$bb$;

revoke all on function public.promo_reserve_repair(uuid, text) from public;
grant execute on function public.promo_reserve_repair(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. promo_reserve_trade — trade-in top-up payable
-- ---------------------------------------------------------------------
create or replace function public.promo_reserve_trade(
  p_trade_id uuid,
  p_code     text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $bb$
declare
  v_user      uuid := auth.uid();
  v_trade     public.trade_in_requests;
  v_payable   numeric;
  v_items     jsonb;
  v_campus    uuid;
  v_code_norm citext;
  v_code_row  public.promotion_codes;
  v_eval      jsonb;
  v_promo_id  uuid;
  v_code_id   uuid;
  v_disc      bigint;
  v_sub       bigint;
  v_stock     jsonb;
begin
  select * into v_trade from public.trade_in_requests where id = p_trade_id;
  if not found then
    raise exception 'trade-in not found' using errcode = 'P0002';
  end if;
  if v_trade.user_id is not null and v_trade.user_id is distinct from v_user then
    raise exception 'not your trade-in request' using errcode = '42501';
  end if;

  v_payable := coalesce(v_trade.top_up_amount, 0);
  if v_payable <= 0 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'no_payable_amount',
      'message', 'This trade-in has no top-up to discount.'
    );
  end if;

  v_items := jsonb_build_array(jsonb_build_object(
    'kind', 'tradein_topup',
    'unit_price_pesewas', round(v_payable * 100)::bigint,
    'qty', 1
  ));

  select pr.campus_id into v_campus
  from public.profiles pr
  where pr.id = v_user;

  v_code_norm := public.promo_normalize_code(p_code);
  if v_code_norm is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'This code is not valid.');
  end if;

  select * into v_code_row from public.promotion_codes where code = v_code_norm;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'This code is not valid.');
  end if;

  v_eval := public.promo_evaluate(
    v_code_row.promotion_id, v_code_row.id,
    v_items, v_campus, v_user, null
  );

  if v_eval is null or not coalesce((v_eval->>'ok')::boolean, false) then
    return coalesce(v_eval, jsonb_build_object(
      'ok', false, 'reason', 'not_found', 'message', 'This code is not valid.'));
  end if;

  v_promo_id := (v_eval->>'promotion_id')::uuid;
  v_code_id  := nullif(v_eval->>'code_id', '')::uuid;
  v_disc     := (v_eval->>'discount_pesewas')::bigint;
  v_sub      := (v_eval->>'eligible_subtotal_pesewas')::bigint;

  v_stock := public.promo_reserve_take_stock(
    v_promo_id, v_code_id, null, null, p_trade_id,
    v_user, null, v_disc, v_sub, 'applied'
  );
  if not coalesce((v_stock->>'ok')::boolean, false) then
    return v_stock;
  end if;

  update public.trade_in_requests
     set discount_pesewas = v_disc,
         updated_at = now()
   where id = p_trade_id;

  return jsonb_build_object(
    'ok', true, 'reason', 'ok',
    'promotion_id', v_promo_id, 'code_id', v_code_id,
    'discount_pesewas', v_disc, 'name', v_eval->>'name',
    'message', 'Discount applied.'
  );
end;
$bb$;

revoke all on function public.promo_reserve_trade(uuid, text) from public;
grant execute on function public.promo_reserve_trade(uuid, text) to authenticated;
