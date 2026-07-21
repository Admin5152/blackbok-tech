-- =====================================================================
-- BlackBox Ghana — Promotions: admin layer completion
-- Migration: 20260721000300_promo_admin.sql
-- Depends on: ...000000_promotions.sql, ...000100_promo_denominations.sql,
--             ...000200_promo_custom_amounts.sql
--
-- Closes the gaps found while walking the design:
--   * usage presets live in the DB, not only in TypeScript
--   * min_order is a real parameter on batch creation
--   * personal codes can be assigned to an account
--   * per-code expiry, settable in bulk
--   * publish is a separate, gated action
--   * audit trail + spend reporting
--
-- ADAPTATIONS (BlackBox schema cross-check):
--   1. promo_is_super_admin() uses has_role(admin) OR profiles.role = 'admin';
--      BlackBox has no super_admin — admin-only is the publish gate above staff.
-- =====================================================================

begin;

do $$ begin create type promo_usage_preset as enum
  ('single','personal','public_once','public_open','batch','first_n','custom');
exception when duplicate_object then null; end $$;

alter table public.promotions
  add column if not exists usage_preset promo_usage_preset not null default 'custom',
  add column if not exists published_by uuid references auth.users(id) on delete set null,
  add column if not exists published_at timestamptz;

-- ---------------------------------------------------------------------
-- 1. Audit trail
-- ---------------------------------------------------------------------
create table if not exists public.promotion_audit (
  id           bigserial primary key,
  promotion_id uuid,
  action       text not null,
  actor_id     uuid references auth.users(id) on delete set null,
  before_data  jsonb,
  after_data   jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists promotion_audit_promo_idx
  on public.promotion_audit (promotion_id, created_at desc);

create or replace function public.promo_audit_row()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  insert into public.promotion_audit
    (promotion_id, action, actor_id, before_data, after_data)
  values (coalesce(new.id, old.id), tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

drop trigger if exists promo_audit on public.promotions;
create trigger promo_audit after insert or update or delete
  on public.promotions for each row execute function public.promo_audit_row();

-- ---------------------------------------------------------------------
-- 2. Super admin predicate (ADAPT — BlackBox has no super_admin role)
-- ---------------------------------------------------------------------
create or replace function public.promo_is_super_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select public.has_role(auth.uid(), 'admin'::public.app_role)
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

revoke all on function public.promo_is_super_admin() from public, anon;
grant execute on function public.promo_is_super_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Code generation: assigned accounts + per-code expiry
-- ---------------------------------------------------------------------
-- Drop the 5-arg overload from file 1 so callers resolve to this signature
-- (extra params have defaults; 5-arg calls still work).
drop function if exists public.promo_generate_codes(uuid,integer,text,integer,text);

create or replace function public.promo_generate_codes(
  p_promotion_id uuid, p_count integer, p_prefix text default 'BBX',
  p_max_redemptions integer default 1, p_batch_label text default null,
  p_assigned_user_id uuid default null, p_expires_at timestamptz default null
) returns setof text language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare v_made integer := 0; v_tries integer := 0; v_code text;
begin
  if not public.promo_is_admin() then
    raise exception 'admin only' using errcode='42501'; end if;
  if p_count is null or p_count < 1 or p_count > 10000 then
    raise exception 'p_count must be 1..10000' using errcode='22023'; end if;
  if p_assigned_user_id is not null and p_count <> 1 then
    raise exception 'assigned codes are generated one at a time' using errcode='22023'; end if;
  if not exists (select 1 from public.promotions
                 where id = p_promotion_id and trigger_type='code') then
    raise exception 'promotion not found or is automatic' using errcode='P0002'; end if;
  while v_made < p_count and v_tries < p_count * 20 loop
    v_tries := v_tries + 1;
    v_code := public.promo_random_code(p_prefix, 6);
    begin
      insert into public.promotion_codes (promotion_id, code, max_redemptions,
        batch_label, assigned_user_id, expires_at)
      values (p_promotion_id, v_code::citext, p_max_redemptions,
              p_batch_label, p_assigned_user_id, p_expires_at);
      v_made := v_made + 1;
      return next v_code;
    exception when unique_violation then null; end;
  end loop;
  if v_made < p_count then
    raise exception 'only generated % of % codes', v_made, p_count using errcode='P0001';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Usage presets — one mapping, shared by API and UI
-- ---------------------------------------------------------------------
create or replace function public.promo_preset_limits(
  p_preset promo_usage_preset, p_count integer
) returns jsonb language sql immutable set search_path = public, pg_temp as $$
  select case p_preset
    when 'single'      then jsonb_build_object('code_max',1,'promo_max',1,'per_user',1,'codes',1)
    when 'personal'    then jsonb_build_object('code_max',null,'promo_max',null,'per_user',null,'codes',1)
    when 'public_once' then jsonb_build_object('code_max',null,'promo_max',p_count,'per_user',1,'codes',1)
    when 'public_open' then jsonb_build_object('code_max',null,'promo_max',null,'per_user',null,'codes',1)
    when 'batch'       then jsonb_build_object('code_max',1,'promo_max',p_count,'per_user',1,'codes',p_count)
    when 'first_n'     then jsonb_build_object('code_max',p_count,'promo_max',p_count,'per_user',1,'codes',1)
    else jsonb_build_object('code_max',null,'promo_max',p_count,'per_user',1,'codes',1)
  end;
$$;

-- ---------------------------------------------------------------------
-- 5. One-call creation. Always DRAFT. Replaces promo_create_voucher_batch.
-- ---------------------------------------------------------------------
drop function if exists public.promo_create_voucher_batch(
  uuid,integer,text,uuid[],timestamptz,text,promo_applies_to);

create or replace function public.promo_create_batch(
  p_name                 text,
  p_usage_preset         promo_usage_preset,
  p_count                integer,
  p_denomination_id      uuid        default null,
  p_discount_type        promo_discount_type default null,
  p_amount_off_pesewas   bigint      default null,
  p_percent_off          numeric     default null,
  p_max_discount_pesewas bigint      default null,
  p_min_order_pesewas    bigint      default null,
  p_applies_to           promo_applies_to default 'order',
  p_target_ids           uuid[]      default '{}',
  p_campus_ids           uuid[]      default '{}',
  p_prefix               text        default 'BBX',
  p_starts_at            timestamptz default now(),
  p_ends_at              timestamptz default null,
  p_assigned_user_id     uuid        default null,
  p_code_expires_at      timestamptz default null,
  p_bypass_reason        text        default null
) returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare
  d public.promo_denominations; cfg public.promo_settings;
  lim jsonb; v_promo uuid; v_codes text[]; v_campus uuid;
  v_type promo_discount_type; v_amt bigint; v_pct numeric;
  v_min bigint; v_label text;
begin
  if not public.promo_is_admin() then
    raise exception 'admin only' using errcode='42501'; end if;
  select * into cfg from public.promo_settings where id;
  lim := public.promo_preset_limits(p_usage_preset, p_count);

  if p_denomination_id is not null then
    select * into d from public.promo_denominations
    where id = p_denomination_id and is_active;
    if not found then raise exception 'denomination not found' using errcode='P0002'; end if;
    v_type  := d.kind;
    v_amt   := case when d.kind='fixed' then d.value_pesewas end;
    v_pct   := case when d.kind='percentage' then d.percent end;
    v_min   := coalesce(p_min_order_pesewas, d.recommended_min_order_pesewas);
    v_label := d.label;
  else
    v_type  := p_discount_type;
    v_amt   := p_amount_off_pesewas;
    v_pct   := p_percent_off;
    v_min   := coalesce(p_min_order_pesewas,
                 case when p_discount_type='fixed'
                      then ceil(p_amount_off_pesewas * cfg.fixed_min_order_multiple)::bigint
                      else 0 end);
    v_label := case when p_discount_type='fixed'
                    then 'GHS '||to_char(p_amount_off_pesewas/100.0,'FM999G999')
                    else p_percent_off||'%' end;
  end if;

  insert into public.promotions (
    name, trigger_type, usage_preset, discount_type, denomination_id,
    amount_off_pesewas, percent_off, max_discount_pesewas, min_order_pesewas,
    applies_to, target_ids, scope_type, starts_at, ends_at,
    max_redemptions, max_redemptions_per_user, status, created_by,
    bypass_denomination, bypass_reason
  ) values (
    coalesce(p_name, format('%s — %s', v_label, to_char(now(),'Mon YYYY'))),
    'code', p_usage_preset, v_type, p_denomination_id,
    v_amt, v_pct, p_max_discount_pesewas, v_min,
    p_applies_to, p_target_ids,
    case when cardinality(p_campus_ids) > 0 then 'campus' else 'global' end,
    p_starts_at, p_ends_at,
    (lim->>'promo_max')::integer, (lim->>'per_user')::integer,
    'draft', auth.uid(),
    p_bypass_reason is not null, p_bypass_reason
  ) returning id into v_promo;

  foreach v_campus in array p_campus_ids loop
    insert into public.promotion_campuses (promotion_id, campus_id)
    values (v_promo, v_campus) on conflict do nothing;
  end loop;

  select array_agg(c) into v_codes
  from public.promo_generate_codes(v_promo, (lim->>'codes')::integer, p_prefix,
    (lim->>'code_max')::integer,
    format('%s-%s', lower(replace(v_label,' ','')), to_char(now(),'YYYYMM')),
    p_assigned_user_id, p_code_expires_at) as c;

  return jsonb_build_object('promotion_id',v_promo,'label',v_label,'status','draft',
    'count',coalesce(cardinality(v_codes),0),'codes',to_jsonb(v_codes));
end $$;

-- ---------------------------------------------------------------------
-- 6. Publish — gated on maximum liability
-- ---------------------------------------------------------------------
create or replace function public.promo_publish(p_promotion_id uuid)
returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare p public.promotions; cfg public.promo_settings; v_liab bigint;
begin
  if not public.promo_is_admin() then
    raise exception 'admin only' using errcode='42501'; end if;
  select * into cfg from public.promo_settings where id;
  select * into p from public.promotions where id = p_promotion_id;
  if not found then raise exception 'not found' using errcode='P0002'; end if;
  if p.status <> 'draft' then
    raise exception 'only drafts can be published' using errcode='22023'; end if;
  v_liab := case when p.max_redemptions is null then null
    else p.max_redemptions * coalesce(p.amount_off_pesewas, p.max_discount_pesewas, 0) end;
  if (v_liab is null or v_liab > cfg.liability_review_pesewas)
     and not public.promo_is_super_admin() then
    raise exception 'This campaign exceeds the review threshold. A super admin must publish it.'
      using errcode='42501';
  end if;
  update public.promotions set status='active', published_by=auth.uid(),
    published_at=now(), updated_at=now() where id = p_promotion_id;
  return jsonb_build_object('ok',true,'promotion_id',p_promotion_id,
    'max_liability_pesewas',v_liab);
end $$;

-- ---------------------------------------------------------------------
-- 7. Bulk per-code expiry
-- ---------------------------------------------------------------------
create or replace function public.promo_set_codes_expiry(
  p_promotion_id uuid, p_code_ids uuid[] default '{}', p_expires_at timestamptz default null
) returns integer language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare n integer;
begin
  if not public.promo_is_admin() then
    raise exception 'admin only' using errcode='42501'; end if;
  update public.promotion_codes set expires_at = p_expires_at
   where promotion_id = p_promotion_id
     and (cardinality(p_code_ids) = 0 or id = any(p_code_ids));
  get diagnostics n = row_count; return n;
end $$;

-- ---------------------------------------------------------------------
-- 8. Reporting
-- ---------------------------------------------------------------------
create or replace view public.promo_spend as
select p.id as promotion_id, p.name, p.status, p.times_redeemed, p.max_redemptions,
  coalesce(sum(r.amount_discounted_pesewas) filter (where r.status='applied'),0)
    as spent_pesewas,
  count(r.id) filter (where r.status='applied')  as applied_count,
  count(r.id) filter (where r.status='reserved') as reserved_count,
  case when p.max_redemptions is null then null
       else p.max_redemptions
            * coalesce(p.amount_off_pesewas, p.max_discount_pesewas, 0)
  end as max_liability_pesewas
from public.promotions p
left join public.promotion_redemptions r on r.promotion_id = p.id
group by p.id;

-- ---------------------------------------------------------------------
-- 9. RLS & grants for the new objects
-- ---------------------------------------------------------------------
alter table public.promotion_audit enable row level security;

drop policy if exists audit_admin on public.promotion_audit;
create policy audit_admin on public.promotion_audit
  for select using (public.promo_is_admin());

revoke all on function public.promo_generate_codes(uuid,integer,text,integer,text,uuid,timestamptz) from public, anon;
grant execute on function public.promo_generate_codes(uuid,integer,text,integer,text,uuid,timestamptz) to authenticated;

revoke all on function public.promo_create_batch(text,promo_usage_preset,integer,uuid,
  promo_discount_type,bigint,numeric,bigint,bigint,promo_applies_to,uuid[],uuid[],text,
  timestamptz,timestamptz,uuid,timestamptz,text) from public, anon;
grant execute on function public.promo_create_batch(text,promo_usage_preset,integer,uuid,
  promo_discount_type,bigint,numeric,bigint,bigint,promo_applies_to,uuid[],uuid[],text,
  timestamptz,timestamptz,uuid,timestamptz,text) to authenticated;

grant execute on function public.promo_publish(uuid) to authenticated;
grant execute on function public.promo_set_codes_expiry(uuid,uuid[],timestamptz) to authenticated;
grant execute on function public.promo_preset_limits(promo_usage_preset,integer) to authenticated;
grant select on public.promo_spend to authenticated;

commit;
