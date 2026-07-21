-- =====================================================================
-- BlackBox Ghana — Promotion Denominations
-- Migration: 20260721000100_promo_denominations.sql
-- Depends on: 20260721000000_promotions.sql
--
-- The fixed-cash and percentage values a promo is allowed to take.
-- A LOOKUP TABLE, not a CHECK constraint: adding GHS 75 later is an
-- INSERT, not a migration against a live table.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. The ladder
-- ---------------------------------------------------------------------
create table if not exists public.promo_denominations (
  id                            uuid primary key default gen_random_uuid(),
  kind                          promo_discount_type not null,
  value_pesewas                 bigint,        -- fixed only
  percent                       numeric(5,2),  -- percentage only
  label                         text not null, -- 'GHS 50', '10%'
  sort_order                    integer not null default 0,
  -- guard rails, applied when a promo picks this denomination
  recommended_min_order_pesewas bigint not null default 0,
  recommended_max_discount_pesewas bigint,     -- percentage only
  is_active                     boolean not null default true,
  is_default                    boolean not null default false,
  created_at                    timestamptz not null default now(),
  constraint denom_fixed_shape check (
    kind <> 'fixed' or (value_pesewas is not null and value_pesewas > 0
                        and percent is null)
  ),
  constraint denom_pct_shape check (
    kind <> 'percentage' or (percent is not null and percent > 0 and percent <= 100
                             and value_pesewas is null)
  )
);

create unique index if not exists denom_fixed_key
  on public.promo_denominations (value_pesewas) where kind = 'fixed';

create unique index if not exists denom_pct_key
  on public.promo_denominations (percent) where kind = 'percentage';

-- ---------------------------------------------------------------------
-- 2. Seed — the agreed ladder
-- ---------------------------------------------------------------------
-- recommended_min_order = 6 x denomination. That caps the effective
-- discount at ~16.7% of the order, which is the real reason the ladder
-- exists: a GHS 1,500 voucher on a GHS 1,600 device is a margin event.
-- GHS 1 and GHS 2 are rounding/goodwill tokens, so no floor.
insert into public.promo_denominations
  (kind, value_pesewas, label, sort_order, recommended_min_order_pesewas, is_default)
values
  ('fixed',      100, 'GHS 1',    10,       0, false),
  ('fixed',      200, 'GHS 2',    20,       0, false),
  ('fixed',    1_000, 'GHS 10',   30,   6_000, false),
  ('fixed',    5_000, 'GHS 50',   40,  30_000, true ),
  ('fixed',   10_000, 'GHS 100',  50,  60_000, false),
  ('fixed',   20_000, 'GHS 200',  60, 120_000, false),
  ('fixed',   50_000, 'GHS 500',  70, 300_000, false),
  ('fixed',  100_000, 'GHS 1000', 80, 600_000, false),
  ('fixed',  150_000, 'GHS 1500', 90, 900_000, false)
on conflict do nothing;

insert into public.promo_denominations
  (kind, percent, label, sort_order, recommended_min_order_pesewas,
   recommended_max_discount_pesewas, is_default)
values
  ('percentage',  5.00,  '5%', 110,       0,  10_000, false),
  ('percentage', 10.00, '10%', 120,       0,  20_000, true ),
  ('percentage', 15.00, '15%', 130,  20_000,  30_000, false),
  ('percentage', 20.00, '20%', 140,  30_000,  50_000, false),
  ('percentage', 25.00, '25%', 150,  50_000,  75_000, false),
  ('percentage', 50.00, '50%', 160,  50_000, 100_000, false)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3. Bind promotions to the ladder
-- ---------------------------------------------------------------------
alter table public.promotions
  add column if not exists denomination_id uuid
    references public.promo_denominations(id) on delete restrict,
  add column if not exists bypass_denomination boolean not null default false,
  add column if not exists bypass_reason text;

alter table public.promotions
  drop constraint if exists promo_bypass_needs_reason;
alter table public.promotions
  add constraint promo_bypass_needs_reason check (
    bypass_denomination = false or bypass_reason is not null
  );

-- Enforcement lives in a trigger, not a CHECK, because it reads another
-- table. bypass_denomination = true is the deliberate, logged escape hatch.
create or replace function public.promo_enforce_denomination()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare d public.promo_denominations;
begin
  if new.bypass_denomination then
    return new;  -- admin override, reason recorded
  end if;

  if new.denomination_id is null then
    -- resolve from the value the admin actually typed
    if new.discount_type = 'fixed' then
      select * into d from public.promo_denominations
      where kind = 'fixed' and value_pesewas = new.amount_off_pesewas and is_active;
    else
      select * into d from public.promo_denominations
      where kind = 'percentage' and percent = new.percent_off and is_active;
    end if;
    if not found then
      raise exception
        'Value is not on the approved denomination ladder. Add it to promo_denominations, or set bypass_denomination with a reason.'
        using errcode = '23514';
    end if;
    new.denomination_id := d.id;
  else
    select * into d from public.promo_denominations where id = new.denomination_id;
    if not found or not d.is_active then
      raise exception 'denomination not found or inactive' using errcode = '23503';
    end if;
    -- the denomination is the source of truth for the amount
    if d.kind = 'fixed' then
      new.discount_type := 'fixed';
      new.amount_off_pesewas := d.value_pesewas;
      new.percent_off := null;
    else
      new.discount_type := 'percentage';
      new.percent_off := d.percent;
      new.amount_off_pesewas := null;
      new.max_discount_pesewas :=
        coalesce(new.max_discount_pesewas, d.recommended_max_discount_pesewas);
    end if;
  end if;

  -- margin guard
  if new.min_order_pesewas < d.recommended_min_order_pesewas then
    raise exception
      'Minimum order (%) is below the floor for % (%). Raise it, or bypass with a reason.',
      new.min_order_pesewas, d.label, d.recommended_min_order_pesewas
      using errcode = '23514';
  end if;

  return new;
end $$;

drop trigger if exists promo_denomination_guard on public.promotions;
create trigger promo_denomination_guard
  before insert or update of discount_type, percent_off, amount_off_pesewas,
                             min_order_pesewas, denomination_id
  on public.promotions
  for each row execute function public.promo_enforce_denomination();

-- ---------------------------------------------------------------------
-- 4. One-call voucher batch: pick a denomination, get N codes
-- ---------------------------------------------------------------------
-- promo_create_voucher_batch('<GHS 50 uuid>', 500, 'KNUST',
--                            array['<knust campus uuid>'], now() + interval '60 days')
create or replace function public.promo_create_voucher_batch(
  p_denomination_id uuid,
  p_count           integer,
  p_prefix          text        default 'BBX',
  p_campus_ids      uuid[]      default '{}',
  p_ends_at         timestamptz default null,
  p_name            text        default null,
  p_applies_to      promo_applies_to default 'order'
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  d        public.promo_denominations;
  v_promo  uuid;
  v_codes  text[];
  v_campus uuid;
begin
  if not public.promo_is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select * into d from public.promo_denominations
  where id = p_denomination_id and is_active;
  if not found then
    raise exception 'denomination not found or inactive' using errcode = 'P0002';
  end if;

  insert into public.promotions (
    name, trigger_type, discount_type, denomination_id,
    min_order_pesewas, applies_to, ends_at,
    scope_type,
    max_redemptions, max_redemptions_per_user,
    status, created_by,
    -- set by the trigger from the denomination, placeholders here
    percent_off, amount_off_pesewas
  ) values (
    coalesce(p_name, format('%s voucher batch — %s', d.label,
                            to_char(now(), 'Mon YYYY'))),
    'code', d.kind, d.id,
    d.recommended_min_order_pesewas, p_applies_to, p_ends_at,
    case when cardinality(p_campus_ids) > 0 then 'campus' else 'global' end,
    p_count, 1,
    'draft', auth.uid(),
    case when d.kind = 'percentage' then d.percent end,
    case when d.kind = 'fixed' then d.value_pesewas end
  ) returning id into v_promo;

  foreach v_campus in array p_campus_ids loop
    insert into public.promotion_campuses (promotion_id, campus_id)
    values (v_promo, v_campus) on conflict do nothing;
  end loop;

  select array_agg(c) into v_codes
  from public.promo_generate_codes(
    v_promo, p_count, p_prefix, 1,
    format('%s-%s', lower(replace(d.label,' ','')), to_char(now(),'YYYYMM'))
  ) as c;

  -- created as 'draft' on purpose: someone reviews before it goes live.
  return jsonb_build_object(
    'promotion_id', v_promo,
    'denomination', d.label,
    'count', coalesce(cardinality(v_codes), 0),
    'status', 'draft',
    'codes', to_jsonb(v_codes)
  );
end $$;

-- ---------------------------------------------------------------------
-- 5. RLS & grants
-- ---------------------------------------------------------------------
alter table public.promo_denominations enable row level security;

drop policy if exists denom_admin_all on public.promo_denominations;
create policy denom_admin_all on public.promo_denominations
  for all using (public.promo_is_admin()) with check (public.promo_is_admin());

-- Denominations are not secret (unlike codes) — the admin UI reads them.
drop policy if exists denom_read on public.promo_denominations;
create policy denom_read on public.promo_denominations
  for select using (is_active);

grant select on public.promo_denominations to authenticated;

revoke all on function public.promo_create_voucher_batch(uuid,integer,text,uuid[],timestamptz,text,promo_applies_to) from public, anon;
grant execute on function public.promo_create_voucher_batch(uuid,integer,text,uuid[],timestamptz,text,promo_applies_to) to authenticated;

commit;
