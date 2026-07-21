-- =====================================================================
-- BlackBox Ghana — Promotions: allow custom amounts
-- Migration: 20260721000200_promo_custom_amounts.sql
-- Depends on: 20260721000100_promo_denominations.sql
--
-- CHANGE OF INTENT:
--   Before: the ladder was a whitelist. Off-ladder value => hard error.
--   Now:    the ladder is a quick-pick with defaults. ANY amount is legal.
--           What is enforced is the MARGIN FLOOR, on every promo, ladder
--           or not. That is the rule that actually protects the client.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Extra round numbers people will reach for
-- ---------------------------------------------------------------------
insert into public.promo_denominations
  (kind, value_pesewas, label, sort_order, recommended_min_order_pesewas)
values
  ('fixed',  30_000, 'GHS 300',   65, 180_000),
  ('fixed',  75_000, 'GHS 750',   75, 450_000),
  ('fixed', 200_000, 'GHS 2000',  95, 1_200_000),
  ('fixed', 250_000, 'GHS 2500', 100, 1_500_000),
  ('fixed', 300_000, 'GHS 3000', 105, 1_800_000)
on conflict do nothing;

-- Mark ladder rows as presets so the UI can say "quick pick" honestly.
alter table public.promo_denominations
  add column if not exists is_preset boolean not null default true;

-- ---------------------------------------------------------------------
-- 2. Where the floor multiplier lives (tunable without a code change)
-- ---------------------------------------------------------------------
create table if not exists public.promo_settings (
  id                        boolean primary key default true check (id),
  fixed_min_order_multiple  numeric(6,2) not null default 6.00,
  require_percentage_cap    boolean      not null default true,
  liability_review_pesewas  bigint       not null default 1_000_000, -- GHS 10,000
  updated_at                timestamptz  not null default now()
);

insert into public.promo_settings (id) values (true) on conflict do nothing;

alter table public.promo_settings enable row level security;

drop policy if exists promo_settings_admin on public.promo_settings;
create policy promo_settings_admin on public.promo_settings
  for all using (public.promo_is_admin()) with check (public.promo_is_admin());

grant select on public.promo_settings to authenticated;

-- ---------------------------------------------------------------------
-- 3. Replacement guard
-- ---------------------------------------------------------------------
-- Rules now:
--   a) denomination_id set   -> it is the source of truth for the amount
--   b) denomination_id null  -> custom amount, perfectly legal
--   c) EVERY fixed promo     -> min_order >= amount * fixed_min_order_multiple
--   d) EVERY percentage promo-> max_discount_pesewas must be set
--   e) bypass_denomination   -> skips (c) and (d), reason mandatory
create or replace function public.promo_enforce_denomination()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  d      public.promo_denominations;
  cfg    public.promo_settings;
  v_floor bigint;
begin
  select * into cfg from public.promo_settings where id;

  -- (a) an explicitly chosen preset overwrites the typed amount
  if new.denomination_id is not null then
    select * into d from public.promo_denominations
    where id = new.denomination_id and is_active;
    if not found then
      raise exception 'denomination not found or inactive' using errcode = '23503';
    end if;
    if d.kind = 'fixed' then
      new.discount_type      := 'fixed';
      new.amount_off_pesewas := d.value_pesewas;
      new.percent_off        := null;
    else
      new.discount_type        := 'percentage';
      new.percent_off          := d.percent;
      new.amount_off_pesewas   := null;
      new.max_discount_pesewas :=
        coalesce(new.max_discount_pesewas, d.recommended_max_discount_pesewas);
    end if;

  -- (b) custom amount: still try to attach a matching preset for reporting,
  --     but never reject for being off-ladder.
  else
    if new.discount_type = 'fixed' then
      select * into d from public.promo_denominations
      where kind = 'fixed' and value_pesewas = new.amount_off_pesewas and is_active;
    else
      select * into d from public.promo_denominations
      where kind = 'percentage' and percent = new.percent_off and is_active;
    end if;
    if found then
      new.denomination_id := d.id;
      if new.discount_type = 'percentage' then
        new.max_discount_pesewas :=
          coalesce(new.max_discount_pesewas, d.recommended_max_discount_pesewas);
      end if;
    end if;
  end if;

  if new.bypass_denomination then
    return new;  -- deliberate override, reason recorded by CHECK constraint
  end if;

  -- (c) margin floor — applies to ladder and custom alike.
  --     Trade-in top-ups are a payout, not a basket discount: no floor.
  if new.discount_type = 'fixed' and new.applies_to <> 'tradein_topup' then
    v_floor := ceil(new.amount_off_pesewas * cfg.fixed_min_order_multiple)::bigint;
    if new.min_order_pesewas < v_floor then
      raise exception
        'Minimum order must be at least GHS % for a GHS % discount (% x). Raise it, or set bypass_denomination with a reason.',
        to_char(v_floor / 100.0, 'FM999G999D00'),
        to_char(new.amount_off_pesewas / 100.0, 'FM999G999D00'),
        cfg.fixed_min_order_multiple
        using errcode = '23514';
    end if;
  end if;

  -- (d) an uncapped percentage is an open cheque on expensive devices
  if new.discount_type = 'percentage'
     and cfg.require_percentage_cap
     and new.max_discount_pesewas is null then
    raise exception
      'Percentage promos need a maximum discount cap. Set max_discount_pesewas, or bypass with a reason.'
      using errcode = '23514';
  end if;

  return new;
end $$;

-- widen the trigger so applies_to changes are re-checked too
drop trigger if exists promo_denomination_guard on public.promotions;
create trigger promo_denomination_guard
  before insert or update of discount_type, percent_off, amount_off_pesewas,
                             min_order_pesewas, denomination_id, applies_to,
                             max_discount_pesewas
  on public.promotions
  for each row execute function public.promo_enforce_denomination();

commit;
