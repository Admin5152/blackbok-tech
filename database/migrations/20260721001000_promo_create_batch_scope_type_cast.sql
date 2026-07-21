-- Fix promo_create_batch: scope_type CASE must cast to promo_scope_type (not text)
-- Error: column "scope_type" is of type promo_scope_type but expression is of type text

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
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $bb$
declare
  d public.promo_denominations;
  cfg public.promo_settings;
  lim jsonb;
  v_promo uuid;
  v_codes text[];
  v_campus uuid;
  v_type promo_discount_type;
  v_amt bigint;
  v_pct numeric;
  v_min bigint;
  v_label text;
  v_scope promo_scope_type;
begin
  if not public.promo_is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select * into cfg from public.promo_settings where id;
  lim := public.promo_preset_limits(p_usage_preset, p_count);

  v_scope := case
    when cardinality(p_campus_ids) > 0 then 'campus'::promo_scope_type
    else 'global'::promo_scope_type
  end;

  if p_denomination_id is not null then
    select * into d from public.promo_denominations
    where id = p_denomination_id and is_active;
    if not found then
      raise exception 'denomination not found' using errcode = 'P0002';
    end if;
    v_type  := d.kind;
    v_amt   := case when d.kind = 'fixed' then d.value_pesewas end;
    v_pct   := case when d.kind = 'percentage' then d.percent end;
    v_min   := coalesce(p_min_order_pesewas, d.recommended_min_order_pesewas);
    v_label := d.label;
  else
    v_type  := p_discount_type;
    v_amt   := p_amount_off_pesewas;
    v_pct   := p_percent_off;
    v_min   := coalesce(
      p_min_order_pesewas,
      case
        when p_discount_type = 'fixed' then
          ceil(p_amount_off_pesewas * cfg.fixed_min_order_multiple)::bigint
        else 0
      end
    );
    v_label := case
      when p_discount_type = 'fixed' then
        'GHS ' || to_char(p_amount_off_pesewas / 100.0, 'FM999G999')
      else p_percent_off || '%'
    end;
  end if;

  insert into public.promotions (
    name, trigger_type, usage_preset, discount_type, denomination_id,
    amount_off_pesewas, percent_off, max_discount_pesewas, min_order_pesewas,
    applies_to, target_ids, scope_type, starts_at, ends_at,
    max_redemptions, max_redemptions_per_user, status, created_by,
    bypass_denomination, bypass_reason
  ) values (
    coalesce(p_name, format('%s — %s', v_label, to_char(now(), 'Mon YYYY'))),
    'code'::promo_trigger_type,
    p_usage_preset,
    v_type,
    p_denomination_id,
    v_amt,
    v_pct,
    p_max_discount_pesewas,
    v_min,
    p_applies_to,
    p_target_ids,
    v_scope,
    p_starts_at,
    p_ends_at,
    (lim->>'promo_max')::integer,
    (lim->>'per_user')::integer,
    'draft'::promo_status,
    auth.uid(),
    p_bypass_reason is not null,
    p_bypass_reason
  ) returning id into v_promo;

  foreach v_campus in array p_campus_ids loop
    insert into public.promotion_campuses (promotion_id, campus_id)
    values (v_promo, v_campus)
    on conflict do nothing;
  end loop;

  select array_agg(c) into v_codes
  from public.promo_generate_codes(
    v_promo,
    (lim->>'codes')::integer,
    p_prefix,
    (lim->>'code_max')::integer,
    format('%s-%s', lower(replace(v_label, ' ', '')), to_char(now(), 'YYYYMM')),
    p_assigned_user_id,
    p_code_expires_at
  ) as c;

  return jsonb_build_object(
    'promotion_id', v_promo,
    'label', v_label,
    'status', 'draft',
    'count', coalesce(cardinality(v_codes), 0),
    'codes', to_jsonb(v_codes)
  );
end;
$bb$;

revoke all on function public.promo_create_batch(
  text, promo_usage_preset, integer, uuid, promo_discount_type, bigint, numeric,
  bigint, bigint, promo_applies_to, uuid[], uuid[], text, timestamptz, timestamptz,
  uuid, timestamptz, text
) from public, anon;
grant execute on function public.promo_create_batch(
  text, promo_usage_preset, integer, uuid, promo_discount_type, bigint, numeric,
  bigint, bigint, promo_applies_to, uuid[], uuid[], text, timestamptz, timestamptz,
  uuid, timestamptz, text
) to authenticated;

-- Legacy voucher batch helper (same scope_type bug)
create or replace function public.promo_create_voucher_batch(
  p_denomination_id uuid,
  p_count           integer,
  p_prefix          text        default 'BBX',
  p_campus_ids      uuid[]      default '{}',
  p_ends_at         timestamptz default null,
  p_name            text        default null,
  p_applies_to      promo_applies_to default 'order'
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $bb$
declare
  d        public.promo_denominations;
  v_promo  uuid;
  v_codes  text[];
  v_campus uuid;
  v_scope  promo_scope_type;
begin
  if not public.promo_is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select * into d from public.promo_denominations
  where id = p_denomination_id and is_active;
  if not found then
    raise exception 'denomination not found or inactive' using errcode = 'P0002';
  end if;

  v_scope := case
    when cardinality(p_campus_ids) > 0 then 'campus'::promo_scope_type
    else 'global'::promo_scope_type
  end;

  insert into public.promotions (
    name, trigger_type, discount_type, denomination_id,
    min_order_pesewas, applies_to, ends_at,
    scope_type,
    max_redemptions, max_redemptions_per_user,
    status, created_by,
    percent_off, amount_off_pesewas
  ) values (
    coalesce(p_name, format('%s voucher batch — %s', d.label, to_char(now(), 'Mon YYYY'))),
    'code'::promo_trigger_type,
    d.kind,
    d.id,
    d.recommended_min_order_pesewas,
    p_applies_to,
    p_ends_at,
    v_scope,
    p_count,
    1,
    'draft'::promo_status,
    auth.uid(),
    case when d.kind = 'percentage' then d.percent end,
    case when d.kind = 'fixed' then d.value_pesewas end
  ) returning id into v_promo;

  foreach v_campus in array p_campus_ids loop
    insert into public.promotion_campuses (promotion_id, campus_id)
    values (v_promo, v_campus)
    on conflict do nothing;
  end loop;

  select array_agg(c) into v_codes
  from public.promo_generate_codes(
    v_promo, p_count, p_prefix, 1,
    format('%s-%s', lower(replace(d.label, ' ', '')), to_char(now(), 'YYYYMM'))
  ) as c;

  return jsonb_build_object(
    'promotion_id', v_promo,
    'denomination', d.label,
    'count', coalesce(cardinality(v_codes), 0),
    'status', 'draft',
    'codes', to_jsonb(v_codes)
  );
end;
$bb$;

grant execute on function public.promo_create_voucher_batch(
  uuid, integer, text, uuid[], timestamptz, text, promo_applies_to
) to authenticated;
