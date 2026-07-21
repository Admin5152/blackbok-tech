-- =====================================================================
-- BlackBox Ghana — Promotions & Discount Codes
-- Migration: 20260721000000_promotions.sql
--
-- MODEL:  rule (promotions) -> key (promotion_codes) -> log (promotion_redemptions)
-- MONEY:  integer pesewas everywhere. GHS 1,500.00 == 150000. No floats.
-- SCOPE:  empty promotion_campuses == applies to every campus.
-- LIFECYCLE: validate (read-only) -> reserve -> apply | reverse
--
-- ADAPTATIONS (BlackBox schema cross-check):
--   1. CREATE public.campuses (did not exist); seed KNUST/knust;
--      RLS active-read for anon/authenticated; admin write via promo_is_admin;
--      GRANT SELECT to anon, authenticated.
--   2. ALTER orders ADD campus_id FK campuses; ALTER profiles ADD campus_id FK campuses;
--      ADD orders.discount_pesewas bigint NOT NULL DEFAULT 0 CHECK >= 0.
--   3. promo_is_admin() uses has_role(admin|staff) OR profiles.role in (admin,staff);
--      no super_admin role exists. Revoke public/anon; grant authenticated, service_role.
--   4. promotion_redemptions.order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT.
--   5. promo_order_campus: coalesce(o.campus_id, pr.campus_id); revoke public/anon/
--      authenticated; grant service_role.
--   6. promo_reserve ownership: orders.user_id only (no guest_phone on orders).
--   7. promo_reserve line items: kind=product, unit_price_pesewas from
--      round(coalesce(unit_price,price,0)*100), qty=quantity; category_id null.
--   8. promo_reserve order write: discount_pesewas, discount_amount, total_price
--      (not subtotal_pesewas/total_pesewas/delivery_pesewas — those do not exist).
--   9. promo_eligible_subtotal: compare product_id/category_id as text vs
--      target_ids::text (products.id may be UUID or TEXT).
--  10. search_path = public, pg_temp on SECURITY DEFINER; status default 'draft'.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Extensions & enums
-- ---------------------------------------------------------------------
create extension if not exists citext;
create extension if not exists pgcrypto;

do $$ begin
  create type promo_discount_type as enum ('percentage', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_status as enum ('draft', 'active', 'paused', 'expired', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_scope_type as enum ('global', 'campus');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_trigger_type as enum ('code', 'automatic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_applies_to as enum
    ('order', 'category', 'product', 'delivery', 'repair', 'tradein_topup');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_redemption_status as enum ('reserved', 'applied', 'reversed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 0b. campuses (ADAPT — table did not exist)
-- ---------------------------------------------------------------------
create table if not exists public.campuses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campuses_slug_key unique (slug)
);

insert into public.campuses (name, slug, is_active)
values ('KNUST', 'knust', true)
on conflict (slug) do nothing;

alter table public.orders
  add column if not exists campus_id uuid references public.campuses(id) on delete set null;

alter table public.profiles
  add column if not exists campus_id uuid references public.campuses(id) on delete set null;

alter table public.orders
  add column if not exists discount_pesewas bigint not null default 0;

alter table public.orders
  drop constraint if exists orders_discount_pesewas_check;
alter table public.orders
  add constraint orders_discount_pesewas_check check (discount_pesewas >= 0);

-- ---------------------------------------------------------------------
-- 1. promotions — THE RULE
-- ---------------------------------------------------------------------
create table if not exists public.promotions (
  id                       uuid primary key default gen_random_uuid(),
  name                     text        not null,
  internal_note            text,
  description              text,                 -- customer-facing
  trigger_type             promo_trigger_type not null default 'code',
  discount_type            promo_discount_type not null,
  percent_off              numeric(5,2),         -- 0.01 .. 100.00
  amount_off_pesewas       bigint,               -- fixed cash, in pesewas
  max_discount_pesewas     bigint,               -- cap for percentage promos
  min_order_pesewas        bigint      not null default 0,
  applies_to               promo_applies_to not null default 'order',
  target_ids               uuid[]      not null default '{}',
  scope_type               promo_scope_type not null default 'global',
  priority                 integer     not null default 0,
  stackable                boolean     not null default false,
  starts_at                timestamptz not null default now(),
  ends_at                  timestamptz,
  max_redemptions          integer,              -- null = unlimited (campaign budget)
  max_redemptions_per_user integer     default 1,-- null = unlimited
  times_redeemed           integer     not null default 0,  -- cache; truth is the log
  status                   promo_status not null default 'draft',
  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  -- ---- integrity: the discount must be internally coherent ----------
  constraint promo_percentage_shape check (
    discount_type <> 'percentage' or (
      percent_off is not null
      and percent_off > 0 and percent_off <= 100
      and amount_off_pesewas is null
    )
  ),
  constraint promo_fixed_shape check (
    discount_type <> 'fixed' or (
      amount_off_pesewas is not null
      and amount_off_pesewas > 0
      and percent_off is null
      and max_discount_pesewas is null
    )
  ),
  constraint promo_nonneg check (
    min_order_pesewas >= 0
    and (max_discount_pesewas is null or max_discount_pesewas > 0)
    and (max_redemptions is null or max_redemptions > 0)
    and (max_redemptions_per_user is null or max_redemptions_per_user > 0)
  ),
  constraint promo_window check (ends_at is null or ends_at > starts_at),
  constraint promo_targets check (
    applies_to in ('order','delivery','repair','tradein_topup')
      or cardinality(target_ids) > 0
  ),
  -- automatic promos never have codes; code promos always do (enforced in RPC too)
  constraint promo_auto_not_stackable check (
    trigger_type = 'code' or stackable = false
  )
);

create index if not exists promotions_active_idx
  on public.promotions (status, starts_at, ends_at)
  where status = 'active';

create index if not exists promotions_auto_idx
  on public.promotions (trigger_type, status)
  where trigger_type = 'automatic';

-- ---------------------------------------------------------------------
-- 2. promotion_codes — THE KEY
-- ---------------------------------------------------------------------
create table if not exists public.promotion_codes (
  id               uuid primary key default gen_random_uuid(),
  promotion_id     uuid not null references public.promotions(id) on delete cascade,
  code             citext not null,
  max_redemptions  integer,           -- null = unlimited uses of this string
  times_redeemed   integer not null default 0,
  is_active        boolean not null default true,
  assigned_user_id uuid references auth.users(id) on delete cascade,
  expires_at       timestamptz,       -- optional override, tighter than the rule
  batch_label      text,              -- e.g. 'knust-freshers-aug26'
  created_at       timestamptz not null default now(),
  constraint promo_code_shape check (
    length(code) between 4 and 32
    and code = upper(code::text)::citext
    and code !~ '[^A-Z0-9-]'
  ),
  constraint promo_code_max check (max_redemptions is null or max_redemptions > 0)
);

create unique index if not exists promotion_codes_code_key
  on public.promotion_codes (code);

create index if not exists promotion_codes_promo_idx
  on public.promotion_codes (promotion_id);

create index if not exists promotion_codes_assigned_idx
  on public.promotion_codes (assigned_user_id)
  where assigned_user_id is not null;

-- ---------------------------------------------------------------------
-- 3. promotion_campuses — THE SCOPE  (empty set == everywhere)
-- ---------------------------------------------------------------------
create table if not exists public.promotion_campuses (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  campus_id    uuid not null references public.campuses(id)   on delete cascade,
  primary key (promotion_id, campus_id)
);

create index if not exists promotion_campuses_campus_idx
  on public.promotion_campuses (campus_id);

-- ---------------------------------------------------------------------
-- 4. promotion_redemptions — THE LOG (append-only truth)
-- ---------------------------------------------------------------------
create table if not exists public.promotion_redemptions (
  id                        uuid primary key default gen_random_uuid(),
  promotion_id              uuid not null references public.promotions(id)      on delete restrict,
  code_id                   uuid          references public.promotion_codes(id) on delete restrict,
  order_id                  uuid not null references public.orders(id) on delete restrict,
  user_id                   uuid          references auth.users(id) on delete set null,
  guest_phone               text,            -- used when user_id is null (anon + OTP)
  amount_discounted_pesewas bigint not null check (amount_discounted_pesewas >= 0),
  eligible_subtotal_pesewas bigint not null check (eligible_subtotal_pesewas >= 0),
  status                    promo_redemption_status not null default 'reserved',
  reserved_at               timestamptz not null default now(),
  applied_at                timestamptz,
  reversed_at               timestamptz,
  reversal_reason           text,
  constraint promo_redemption_identity check (
    user_id is not null or guest_phone is not null
  )
);

-- One promotion per order while stacking is off.
create unique index if not exists promo_one_per_order
  on public.promotion_redemptions (order_id)
  where status in ('reserved','applied');

-- Per-user cap of 1 enforced by the database, not by application memory.
-- (Caps > 1 fall back to SELECT ... FOR UPDATE inside promo_reserve.)
create unique index if not exists promo_once_per_user
  on public.promotion_redemptions (promotion_id, user_id)
  where status in ('reserved','applied') and user_id is not null;

create unique index if not exists promo_once_per_guest
  on public.promotion_redemptions (promotion_id, guest_phone)
  where status in ('reserved','applied') and guest_phone is not null;

create index if not exists promo_redemptions_sweep_idx
  on public.promotion_redemptions (status, reserved_at)
  where status = 'reserved';

create index if not exists promo_redemptions_promo_idx
  on public.promotion_redemptions (promotion_id, status);

-- ---------------------------------------------------------------------
-- 5. Helpers
-- ---------------------------------------------------------------------
-- ADAPT: BlackBox has_role(admin|staff) + profiles.role mirror; no super_admin.
create or replace function public.promo_is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'staff'::public.app_role)
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','staff'));
$$;

create or replace function public.promo_normalize_code(p_code text)
returns citext
language sql immutable set search_path = public, pg_temp as $$
  select nullif(upper(regexp_replace(coalesce(p_code,''), '\s', '', 'g')), '')::citext;
$$;

-- Crockford-style alphabet, ambiguous glyphs removed: no 0 O 1 I L U
create or replace function public.promo_random_code(p_prefix text default 'BBX', p_len int default 6)
returns text
language plpgsql volatile set search_path = public, pg_temp as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  out text := '';
  i int;
begin
  for i in 1..p_len loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return case when p_prefix is null or p_prefix = '' then out
              else upper(p_prefix) || '-' || out end;
end $$;

-- Resolve the campus of an order, SERVER-SIDE ONLY.
-- Precedence: order location -> user's verified campus -> null (global only).
create or replace function public.promo_order_campus(p_order_id uuid)
returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_campus uuid;
begin
  select coalesce(o.campus_id, pr.campus_id)
    into v_campus
  from public.orders o
  left join public.profiles pr on pr.id = o.user_id
  where o.id = p_order_id;
  return v_campus;
end $$;

-- ---------------------------------------------------------------------
-- 6. Eligible subtotal + discount math
-- ---------------------------------------------------------------------
-- Line items arrive as jsonb so the same code path serves an unsaved cart
-- and a persisted order:
--   [{"kind":"product","product_id":"...","category_id":"...",
--     "unit_price_pesewas":150000,"qty":2}, ...]
-- kind ∈ product | delivery | repair | tradein_topup
-- ADAPT: product/category match compares as text (products.id may be TEXT).
create or replace function public.promo_eligible_subtotal(
  p_items jsonb,
  p_applies_to promo_applies_to,
  p_target_ids uuid[]
) returns bigint
language sql immutable set search_path = public, pg_temp as $$
  select coalesce(sum(
    (item->>'unit_price_pesewas')::bigint * coalesce((item->>'qty')::bigint, 1)
  ), 0)::bigint
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  where case p_applies_to
    when 'order'         then true
    when 'delivery'      then item->>'kind' = 'delivery'
    when 'repair'        then item->>'kind' = 'repair'
    when 'tradein_topup' then item->>'kind' = 'tradein_topup'
    when 'product'       then (item->>'product_id') = any (p_target_ids::text[])
    when 'category'      then (item->>'category_id') = any (p_target_ids::text[])
  end;
$$;

create or replace function public.promo_compute_discount(
  p_promo public.promotions,
  p_eligible_subtotal bigint
) returns bigint
language plpgsql immutable set search_path = public, pg_temp as $$
declare d bigint;
begin
  if p_eligible_subtotal <= 0 then return 0; end if;
  if p_promo.discount_type = 'percentage' then
    d := floor(p_eligible_subtotal * p_promo.percent_off / 100.0)::bigint;
    if p_promo.max_discount_pesewas is not null then
      d := least(d, p_promo.max_discount_pesewas);
    end if;
  else
    d := p_promo.amount_off_pesewas;
  end if;
  -- never discount more than the eligible amount; never go negative
  return greatest(0, least(d, p_eligible_subtotal));
end $$;

-- ---------------------------------------------------------------------
-- 7. The validation pipeline (single source of truth for eligibility)
-- ---------------------------------------------------------------------
-- Returns jsonb: {ok, reason, message, promotion_id, code_id,
--                 discount_pesewas, eligible_subtotal_pesewas, name}
-- Soft failures return ok=false with a reason code. Nothing is mutated.
create or replace function public.promo_evaluate(
  p_promotion_id uuid,
  p_code_id      uuid,
  p_items        jsonb,
  p_campus_id    uuid,
  p_user_id      uuid,
  p_guest_phone  text
) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_promo   public.promotions;
  v_code    public.promotion_codes;
  v_sub     bigint;
  v_disc    bigint;
  v_used    integer;
  v_now     timestamptz := now();
  function_result jsonb;
begin
  select * into v_promo from public.promotions where id = p_promotion_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found',
      'message', 'This code is not valid.');
  end if;

  -- 3. rule must be live
  if v_promo.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'inactive',
      'message', 'This offer is no longer available.');
  end if;

  -- 4. time window (rule)
  if v_now < v_promo.starts_at then
    return jsonb_build_object('ok', false, 'reason', 'not_started',
      'message', 'This offer has not started yet.');
  end if;
  if v_promo.ends_at is not null and v_now >= v_promo.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'expired',
      'message', 'This offer has ended.');
  end if;

  -- 2/4/5. code-level checks
  if p_code_id is not null then
    select * into v_code from public.promotion_codes where id = p_code_id;
    if not found or not v_code.is_active or v_code.promotion_id <> v_promo.id then
      return jsonb_build_object('ok', false, 'reason', 'not_found',
        'message', 'This code is not valid.');
    end if;
    if v_code.expires_at is not null and v_now >= v_code.expires_at then
      return jsonb_build_object('ok', false, 'reason', 'expired',
        'message', 'This code has expired.');
    end if;
    if v_code.assigned_user_id is not null
       and (p_user_id is null or v_code.assigned_user_id <> p_user_id) then
      return jsonb_build_object('ok', false, 'reason', 'wrong_user',
        'message', 'This code belongs to another account.');
    end if;
    -- 8. per-code cap
    if v_code.max_redemptions is not null
       and v_code.times_redeemed >= v_code.max_redemptions then
      return jsonb_build_object('ok', false, 'reason', 'code_exhausted',
        'message', 'This code has already been used.');
    end if;
  elsif v_promo.trigger_type = 'code' then
    return jsonb_build_object('ok', false, 'reason', 'not_found',
      'message', 'This code is not valid.');
  end if;

  -- 5.5 campus scope: no rows == global
  if exists (select 1 from public.promotion_campuses where promotion_id = v_promo.id)
     and not exists (
       select 1 from public.promotion_campuses
       where promotion_id = v_promo.id and campus_id = p_campus_id
     ) then
    return jsonb_build_object('ok', false, 'reason', 'wrong_campus',
      'message', 'This code is not available at your campus.');
  end if;

  -- 9. campaign budget
  if v_promo.max_redemptions is not null
     and v_promo.times_redeemed >= v_promo.max_redemptions then
    return jsonb_build_object('ok', false, 'reason', 'promo_exhausted',
      'message', 'This offer has ended.');
  end if;

  -- 10. per-user cap, counted live from the log
  if v_promo.max_redemptions_per_user is not null then
    select count(*) into v_used
    from public.promotion_redemptions r
    where r.promotion_id = v_promo.id
      and r.status in ('reserved','applied')
      and ( (p_user_id is not null and r.user_id = p_user_id)
         or (p_user_id is null and p_guest_phone is not null
             and r.guest_phone = p_guest_phone) );
    if v_used >= v_promo.max_redemptions_per_user then
      return jsonb_build_object('ok', false, 'reason', 'user_limit_reached',
        'message', 'You have already used this offer.');
    end if;
  end if;

  -- 6. eligible subtotal
  v_sub := public.promo_eligible_subtotal(p_items, v_promo.applies_to, v_promo.target_ids);
  if v_sub <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_eligible_items',
      'message', 'This code does not apply to the items in your cart.');
  end if;

  -- 7. minimum spend
  if v_sub < v_promo.min_order_pesewas then
    return jsonb_build_object('ok', false, 'reason', 'min_order_not_met',
      'message', format('Spend at least GHS %s to use this offer.',
                        to_char(v_promo.min_order_pesewas / 100.0, 'FM999G999D00')),
      'min_order_pesewas', v_promo.min_order_pesewas);
  end if;

  -- 11/12. compute + clamp
  v_disc := public.promo_compute_discount(v_promo, v_sub);
  if v_disc <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'zero_discount',
      'message', 'This code gives no discount on your current cart.');
  end if;

  return jsonb_build_object(
    'ok', true, 'reason', 'ok',
    'promotion_id', v_promo.id,
    'code_id', p_code_id,
    'name', v_promo.name,
    'description', v_promo.description,
    'discount_type', v_promo.discount_type,
    'priority', v_promo.priority,
    'discount_pesewas', v_disc,
    'eligible_subtotal_pesewas', v_sub,
    'message', 'Discount applied.'
  );
end $$;

-- ---------------------------------------------------------------------
-- 8. Public quote — best-for-customer across entered code + auto promos
-- ---------------------------------------------------------------------
-- Read-only. Call on every cart change. Increments nothing.
create or replace function public.promo_quote(
  p_items       jsonb,
  p_code        text default null,
  p_campus_id   uuid default null,
  p_guest_phone text default null
) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_user      uuid := auth.uid();
  v_code_norm citext;
  v_code_row  public.promotion_codes;
  v_best      jsonb := null;
  v_candidate jsonb;
  v_code_res  jsonb := null;
  r           record;
begin
  if jsonb_typeof(coalesce(p_items,'null'::jsonb)) <> 'array' then
    raise exception 'p_items must be a jsonb array' using errcode = '22023';
  end if;

  -- (a) entered code
  v_code_norm := public.promo_normalize_code(p_code);
  if v_code_norm is not null then
    select * into v_code_row from public.promotion_codes where code = v_code_norm;
    if not found then
      v_code_res := jsonb_build_object('ok', false, 'reason', 'not_found',
        'message', 'This code is not valid.');
    else
      v_code_res := public.promo_evaluate(
        v_code_row.promotion_id, v_code_row.id,
        p_items, p_campus_id, v_user, p_guest_phone);
    end if;
    if (v_code_res->>'ok')::boolean then v_best := v_code_res; end if;
  end if;

  -- (b) every live automatic promo
  for r in
    select id from public.promotions
    where trigger_type = 'automatic'
      and status = 'active'
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
  loop
    v_candidate := public.promo_evaluate(
      r.id, null, p_items, p_campus_id, v_user, p_guest_phone);
    if (v_candidate->>'ok')::boolean then
      if v_best is null
         or (v_candidate->>'discount_pesewas')::bigint > (v_best->>'discount_pesewas')::bigint
         or ((v_candidate->>'discount_pesewas')::bigint = (v_best->>'discount_pesewas')::bigint
             and (v_candidate->>'priority')::int > (v_best->>'priority')::int)
      then
        v_best := v_candidate;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'applied',      v_best,                                   -- null if nothing applies
    'code_result',  v_code_res,                               -- why the typed code failed
    'discount_pesewas', coalesce((v_best->>'discount_pesewas')::bigint, 0)
  );
end $$;

-- ---------------------------------------------------------------------
-- 9. Reserve — the only function that takes stock
-- ---------------------------------------------------------------------
-- Called at checkout init, BEFORE Paystack. Recomputes the discount from
-- persisted order rows; never trusts a client-supplied amount.
create or replace function public.promo_reserve(
  p_order_id    uuid,
  p_code        text default null,
  p_guest_phone text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_user      uuid := auth.uid();
  v_items     jsonb;
  v_campus    uuid;
  v_code_norm citext;
  v_code_row  public.promotion_codes;
  v_promo     public.promotions;
  v_eval      jsonb;
  v_promo_id  uuid;
  v_code_id   uuid;
  v_disc      bigint;
  v_sub       bigint;
  v_used      integer;
  v_owner     uuid;
  v_sub_ghs   numeric;
  v_ship_ghs  numeric;
begin
  -- ownership: you may only reserve against your own order
  -- ADAPT: orders.user_id only (no guest_phone on orders)
  select o.user_id into v_owner from public.orders o where o.id = p_order_id;
  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if v_owner is not null and v_owner is distinct from v_user then
    raise exception 'not your order' using errcode = '42501';
  end if;

  -- build line items from persisted rows (ADAPT to BlackBox order_items)
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind',               'product',
           'product_id',         oi.product_id,
           'category_id',        null,
           'unit_price_pesewas', round(coalesce(oi.unit_price, oi.price, 0) * 100)::bigint,
           'qty',                oi.quantity)), '[]'::jsonb)
    into v_items
  from public.order_items oi
  where oi.order_id = p_order_id;

  v_campus := public.promo_order_campus(p_order_id);

  -- pick the winner using the same read-only pipeline
  v_code_norm := public.promo_normalize_code(p_code);
  if v_code_norm is not null then
    select * into v_code_row from public.promotion_codes where code = v_code_norm;
    if found then
      v_eval := public.promo_evaluate(v_code_row.promotion_id, v_code_row.id,
                                      v_items, v_campus, v_user, p_guest_phone);
      v_code_id := v_code_row.id;
    end if;
  end if;

  if v_eval is null or not (v_eval->>'ok')::boolean then
    -- fall back to the best automatic promo, if any
    v_code_id := null;
    v_eval := (public.promo_quote(v_items, null, v_campus, p_guest_phone))->'applied';
  end if;

  if v_eval is null or not coalesce((v_eval->>'ok')::boolean, false) then
    return coalesce(v_eval, jsonb_build_object(
      'ok', false, 'reason', 'not_found', 'message', 'This code is not valid.'));
  end if;

  v_promo_id := (v_eval->>'promotion_id')::uuid;
  v_code_id  := nullif(v_eval->>'code_id','')::uuid;
  v_disc     := (v_eval->>'discount_pesewas')::bigint;
  v_sub      := (v_eval->>'eligible_subtotal_pesewas')::bigint;

  -- ---- take stock atomically; subtransaction rolls back on any race ---
  begin
    select * into v_promo from public.promotions where id = v_promo_id for update;

    -- per-user cap > 1: serialise under the row lock we now hold
    if v_promo.max_redemptions_per_user is not null
       and v_promo.max_redemptions_per_user > 1 then
      select count(*) into v_used
      from public.promotion_redemptions r
      where r.promotion_id = v_promo_id
        and r.status in ('reserved','applied')
        and ( (v_user is not null and r.user_id = v_user)
           or (v_user is null and p_guest_phone is not null
               and r.guest_phone = p_guest_phone) );
      if v_used >= v_promo.max_redemptions_per_user then
        raise exception 'user_limit_reached' using errcode = 'P0001';
      end if;
    end if;

    -- campaign budget
    update public.promotions
       set times_redeemed = times_redeemed + 1, updated_at = now()
     where id = v_promo_id
       and (max_redemptions is null or times_redeemed < max_redemptions);
    if not found then
      raise exception 'promo_exhausted' using errcode = 'P0001';
    end if;

    -- per-code cap
    if v_code_id is not null then
      update public.promotion_codes
         set times_redeemed = times_redeemed + 1
       where id = v_code_id
         and is_active
         and (max_redemptions is null or times_redeemed < max_redemptions);
      if not found then
        raise exception 'code_exhausted' using errcode = 'P0001';
      end if;
    end if;

    insert into public.promotion_redemptions (
      promotion_id, code_id, order_id, user_id, guest_phone,
      amount_discounted_pesewas, eligible_subtotal_pesewas, status)
    values (v_promo_id, v_code_id, p_order_id, v_user, p_guest_phone,
            v_disc, v_sub, 'reserved');
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'reason', 'user_limit_reached',
        'message', 'You have already used this offer.');
    when raise_exception then
      return jsonb_build_object('ok', false, 'reason', sqlerrm,
        'message', case sqlerrm
          when 'code_exhausted'     then 'This code has already been used.'
          when 'promo_exhausted'    then 'This offer has ended.'
          when 'user_limit_reached' then 'You have already used this offer.'
          else 'This code is not valid.' end);
  end;

  -- ADAPT: write discount onto BlackBox money columns (GHS numeric, not pesewas totals)
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

  return jsonb_build_object('ok', true, 'reason', 'ok',
    'promotion_id', v_promo_id, 'code_id', v_code_id,
    'discount_pesewas', v_disc, 'name', v_eval->>'name',
    'message', 'Discount applied.');
end $$;

-- ---------------------------------------------------------------------
-- 10. Apply / reverse — driven by the Paystack webhook
-- ---------------------------------------------------------------------
create or replace function public.promo_apply(p_order_id uuid)
returns integer
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  update public.promotion_redemptions
     set status = 'applied', applied_at = now()
   where order_id = p_order_id and status = 'reserved';
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.promo_reverse(p_order_id uuid, p_reason text)
returns integer
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare r record; n integer := 0;
begin
  for r in
    select * from public.promotion_redemptions
    where order_id = p_order_id and status in ('reserved','applied')
    for update
  loop
    update public.promotion_redemptions
       set status = 'reversed', reversed_at = now(), reversal_reason = p_reason
     where id = r.id;
    update public.promotions
       set times_redeemed = greatest(0, times_redeemed - 1), updated_at = now()
     where id = r.promotion_id;
    if r.code_id is not null then
      update public.promotion_codes
         set times_redeemed = greatest(0, times_redeemed - 1)
       where id = r.code_id;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Sweeper: release reservations from abandoned checkouts. Schedule every
-- 5 minutes (pg_cron or a Supabase scheduled Edge Function).
create or replace function public.promo_sweep_expired(p_minutes integer default 30)
returns integer
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare r record; n integer := 0;
begin
  for r in
    select distinct order_id from public.promotion_redemptions
    where status = 'reserved'
      and reserved_at < now() - make_interval(mins => p_minutes)
  loop
    n := n + public.promo_reverse(r.order_id, 'checkout_expired');
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 11. Admin: bulk code generation
-- ---------------------------------------------------------------------
create or replace function public.promo_generate_codes(
  p_promotion_id     uuid,
  p_count            integer,
  p_prefix           text    default 'BBX',
  p_max_redemptions  integer default 1,
  p_batch_label      text    default null
) returns setof text
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_made integer := 0;
  v_tries integer := 0;
  v_code text;
begin
  if not public.promo_is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_count is null or p_count < 1 or p_count > 10000 then
    raise exception 'p_count must be 1..10000' using errcode = '22023';
  end if;
  if not exists (select 1 from public.promotions
                 where id = p_promotion_id and trigger_type = 'code') then
    raise exception 'promotion not found or is automatic' using errcode = 'P0002';
  end if;
  while v_made < p_count and v_tries < p_count * 20 loop
    v_tries := v_tries + 1;
    v_code := public.promo_random_code(p_prefix, 6);
    begin
      insert into public.promotion_codes
        (promotion_id, code, max_redemptions, batch_label)
      values (p_promotion_id, v_code::citext, p_max_redemptions, p_batch_label);
      v_made := v_made + 1;
      return next v_code;
    exception when unique_violation then
      -- collision, just draw again
      null;
    end;
  end loop;
  if v_made < p_count then
    raise exception 'only generated % of % codes; widen the code length',
      v_made, p_count using errcode = 'P0001';
  end if;
end $$;

-- Reconciliation: cached counter vs the append-only log. Should be empty.
create or replace view public.promo_counter_drift as
select p.id as promotion_id, p.name, p.times_redeemed as cached,
       count(r.id) filter (where r.status in ('reserved','applied')) as actual
from public.promotions p
left join public.promotion_redemptions r on r.promotion_id = p.id
group by p.id, p.name, p.times_redeemed
having p.times_redeemed <> count(r.id) filter (where r.status in ('reserved','applied'));

-- ---------------------------------------------------------------------
-- 12. RLS — customers never read these tables directly
-- ---------------------------------------------------------------------
alter table public.campuses              enable row level security;
alter table public.promotions            enable row level security;
alter table public.promotion_codes       enable row level security;
alter table public.promotion_campuses    enable row level security;
alter table public.promotion_redemptions enable row level security;

-- campuses: active rows readable; admin write
drop policy if exists campuses_read_active on public.campuses;
create policy campuses_read_active on public.campuses
  for select using (is_active = true);

drop policy if exists campuses_admin_all on public.campuses;
create policy campuses_admin_all on public.campuses
  for all using (public.promo_is_admin()) with check (public.promo_is_admin());

-- No public SELECT on promotions/codes: anon must not enumerate codes.
drop policy if exists promotions_admin_all on public.promotions;
create policy promotions_admin_all on public.promotions
  for all using (public.promo_is_admin()) with check (public.promo_is_admin());

drop policy if exists promotion_codes_admin_all on public.promotion_codes;
create policy promotion_codes_admin_all on public.promotion_codes
  for all using (public.promo_is_admin()) with check (public.promo_is_admin());

drop policy if exists promotion_campuses_admin_all on public.promotion_campuses;
create policy promotion_campuses_admin_all on public.promotion_campuses
  for all using (public.promo_is_admin()) with check (public.promo_is_admin());

-- Users read their own redemption history; only RPCs write.
drop policy if exists promo_redemptions_own_read on public.promotion_redemptions;
create policy promo_redemptions_own_read on public.promotion_redemptions
  for select using (user_id = auth.uid() or public.promo_is_admin());

drop policy if exists promo_redemptions_admin_write on public.promotion_redemptions;
create policy promo_redemptions_admin_write on public.promotion_redemptions
  for all using (public.promo_is_admin()) with check (public.promo_is_admin());

-- ---------------------------------------------------------------------
-- 13. Grants — least privilege
-- ---------------------------------------------------------------------
grant select on public.campuses to anon, authenticated;

revoke all on function public.promo_is_admin() from public, anon;
grant execute on function public.promo_is_admin() to authenticated, service_role;

revoke all on function public.promo_order_campus(uuid) from public, anon, authenticated;
grant execute on function public.promo_order_campus(uuid) to service_role;

revoke all on function public.promo_evaluate(uuid,uuid,jsonb,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.promo_apply(uuid)                 from public, anon, authenticated;
revoke all on function public.promo_reverse(uuid,text)          from public, anon, authenticated;
revoke all on function public.promo_sweep_expired(integer)      from public, anon, authenticated;
revoke all on function public.promo_generate_codes(uuid,integer,text,integer,text) from public, anon;

grant execute on function public.promo_quote(jsonb,text,uuid,text)   to anon, authenticated;
grant execute on function public.promo_reserve(uuid,text,text)       to anon, authenticated;
grant execute on function public.promo_generate_codes(uuid,integer,text,integer,text) to authenticated;
grant execute on function public.promo_apply(uuid)                   to service_role;
grant execute on function public.promo_reverse(uuid,text)            to service_role;
grant execute on function public.promo_sweep_expired(integer)        to service_role;

commit;
