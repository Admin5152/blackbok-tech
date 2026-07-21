-- BlackBox Ghana — publish gate fix + clearer promo error messages (coupon-style)
-- Run after 20260721000800_promo_repair_trade_delivery.sql

-- ---------------------------------------------------------------------
-- 1. Publish — any admin/staff can publish; high-liability is audited, not blocked
-- ---------------------------------------------------------------------
create or replace function public.promo_publish(p_promotion_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $bb$
declare
  p public.promotions;
  cfg public.promo_settings;
  v_liab bigint;
begin
  if not public.promo_is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select * into cfg from public.promo_settings where id;
  select * into p from public.promotions where id = p_promotion_id;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if p.status <> 'draft' then
    raise exception 'only drafts can be published' using errcode = '22023';
  end if;

  v_liab := case
    when p.max_redemptions is null then null
    else p.max_redemptions * coalesce(p.amount_off_pesewas, p.max_discount_pesewas, 0)
  end;

  update public.promotions
     set status = 'active',
         published_by = auth.uid(),
         published_at = now(),
         updated_at = now()
   where id = p_promotion_id;

  if v_liab is null or v_liab > cfg.liability_review_pesewas then
    insert into public.promotion_audit (promotion_id, action, actor_id, after_data)
    values (
      p_promotion_id,
      'publish_high_liability',
      auth.uid(),
      jsonb_build_object(
        'max_liability_pesewas', v_liab,
        'liability_review_pesewas', cfg.liability_review_pesewas
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'promotion_id', p_promotion_id,
    'max_liability_pesewas', v_liab,
    'message', 'Promotion published. Codes are now active.'
  );
end;
$bb$;

grant execute on function public.promo_publish(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. promo_evaluate — clearer customer-facing messages
-- ---------------------------------------------------------------------
create or replace function public.promo_evaluate(
  p_promotion_id uuid,
  p_code_id      uuid,
  p_items        jsonb,
  p_campus_id    uuid,
  p_user_id      uuid,
  p_guest_phone  text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $bb$
declare
  v_promo public.promotions;
  v_code  public.promotion_codes;
  v_sub   bigint;
  v_disc  bigint;
  v_used  integer;
  v_now   timestamptz := now();
begin
  select * into v_promo from public.promotions where id = p_promotion_id;
  if not found then
    return jsonb_build_object(
      'ok', false, 'reason', 'not_found',
      'message', 'We could not find that code. Check the spelling and try again.');
  end if;

  if v_promo.status <> 'active' then
    return jsonb_build_object(
      'ok', false, 'reason', 'inactive',
      'message', case v_promo.status
        when 'draft' then 'This promotion has not been published yet.'
        when 'paused' then 'This promotion is paused right now.'
        when 'expired' then 'This promotion has ended.'
        when 'archived' then 'This promotion is no longer available.'
        else 'This promotion is not active right now.'
      end);
  end if;

  if v_now < v_promo.starts_at then
    return jsonb_build_object(
      'ok', false, 'reason', 'not_started',
      'message', 'This promotion has not started yet. Try again on '
        || to_char(v_promo.starts_at at time zone 'UTC', 'DD Mon YYYY') || '.');
  end if;

  if v_promo.ends_at is not null and v_now >= v_promo.ends_at then
    return jsonb_build_object(
      'ok', false, 'reason', 'expired',
      'message', 'This promotion ended on '
        || to_char(v_promo.ends_at at time zone 'UTC', 'DD Mon YYYY') || '.');
  end if;

  if p_code_id is not null then
    select * into v_code from public.promotion_codes where id = p_code_id;
    if not found or not v_code.is_active or v_code.promotion_id <> v_promo.id then
      return jsonb_build_object(
        'ok', false, 'reason', 'not_found',
        'message', 'We could not find that code. Check the spelling and try again.');
    end if;
    if v_code.expires_at is not null and v_now >= v_code.expires_at then
      return jsonb_build_object(
        'ok', false, 'reason', 'expired',
        'message', 'This code expired on '
          || to_char(v_code.expires_at at time zone 'UTC', 'DD Mon YYYY') || '.');
    end if;
    if v_code.assigned_user_id is not null
       and (p_user_id is null or v_code.assigned_user_id <> p_user_id) then
      return jsonb_build_object(
        'ok', false, 'reason', 'wrong_user',
        'message', case
          when p_user_id is null then 'Sign in to use this personal code.'
          else 'This code belongs to another account.'
        end);
    end if;
    if v_code.max_redemptions is not null
       and v_code.times_redeemed >= v_code.max_redemptions then
      return jsonb_build_object(
        'ok', false, 'reason', 'code_exhausted',
        'message', 'This code has already been used.');
    end if;
  elsif v_promo.trigger_type = 'code' then
    return jsonb_build_object(
      'ok', false, 'reason', 'not_found',
      'message', 'We could not find that code. Check the spelling and try again.');
  end if;

  if exists (select 1 from public.promotion_campuses where promotion_id = v_promo.id)
     and not exists (
       select 1 from public.promotion_campuses
       where promotion_id = v_promo.id and campus_id = p_campus_id
     ) then
    return jsonb_build_object(
      'ok', false, 'reason', 'wrong_campus',
      'message', case
        when p_campus_id is null then
          'This code is for a specific campus. Set your campus in Profile, then try again.'
        else 'This code is not available at your campus.'
      end);
  end if;

  if v_promo.max_redemptions is not null
     and v_promo.times_redeemed >= v_promo.max_redemptions then
    return jsonb_build_object(
      'ok', false, 'reason', 'promo_exhausted',
      'message', 'This promotion has reached its usage limit.');
  end if;

  if v_promo.max_redemptions_per_user is not null then
    select count(*) into v_used
    from public.promotion_redemptions r
    where r.promotion_id = v_promo.id
      and r.status in ('reserved', 'applied')
      and (
        (p_user_id is not null and r.user_id = p_user_id)
        or (p_user_id is null and p_guest_phone is not null and r.guest_phone = p_guest_phone)
      );
    if v_used >= v_promo.max_redemptions_per_user then
      return jsonb_build_object(
        'ok', false, 'reason', 'user_limit_reached',
        'message', 'You have already used this code.');
    end if;
  end if;

  v_sub := public.promo_eligible_subtotal(p_items, v_promo.applies_to, v_promo.target_ids);
  if v_sub <= 0 then
    return jsonb_build_object(
      'ok', false, 'reason', 'no_eligible_items',
      'message', case v_promo.applies_to
        when 'order' then 'This code does not apply to the items in your cart.'
        when 'product' then 'This code only applies to specific products not in your cart.'
        when 'category' then 'This code only applies to certain categories not in your cart.'
        when 'delivery' then 'This code only applies to delivery fees. Choose delivery at checkout.'
        when 'repair' then 'This code only applies to repair services.'
        when 'tradein_topup' then 'This code only applies to trade-in top-up payments.'
        else 'This code does not apply to your order.'
      end,
      'applies_to', v_promo.applies_to);
  end if;

  if v_sub < v_promo.min_order_pesewas then
    return jsonb_build_object(
      'ok', false, 'reason', 'min_order_not_met',
      'message', format(
        'Spend at least GHS %s to use this code (eligible total: GHS %s).',
        to_char(v_promo.min_order_pesewas / 100.0, 'FM999G999D00'),
        to_char(v_sub / 100.0, 'FM999G999D00')
      ),
      'min_order_pesewas', v_promo.min_order_pesewas,
      'eligible_subtotal_pesewas', v_sub);
  end if;

  v_disc := public.promo_compute_discount(v_promo, v_sub);
  if v_disc <= 0 then
    return jsonb_build_object(
      'ok', false, 'reason', 'zero_discount',
      'message', 'This code gives no discount on your current order.');
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
    'message', 'Code applied.'
  );
end;
$bb$;

-- ---------------------------------------------------------------------
-- 3. promo_quote — clearer message when code string is unknown
-- ---------------------------------------------------------------------
create or replace function public.promo_quote(
  p_items       jsonb,
  p_code        text default null,
  p_campus_id   uuid default null,
  p_guest_phone text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $bb$
declare
  v_user      uuid := auth.uid();
  v_code_norm citext;
  v_code_row  public.promotion_codes;
  v_best      jsonb := null;
  v_candidate jsonb;
  v_code_res  jsonb := null;
  r           record;
begin
  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array' then
    raise exception 'p_items must be a jsonb array' using errcode = '22023';
  end if;

  v_code_norm := public.promo_normalize_code(p_code);
  if v_code_norm is not null then
    select * into v_code_row from public.promotion_codes where code = v_code_norm;
    if not found then
      v_code_res := jsonb_build_object(
        'ok', false, 'reason', 'not_found',
        'message', 'We could not find that code. Check the spelling and try again.');
    else
      v_code_res := public.promo_evaluate(
        v_code_row.promotion_id, v_code_row.id,
        p_items, p_campus_id, v_user, p_guest_phone);
    end if;
    if (v_code_res->>'ok')::boolean then
      v_best := v_code_res;
    end if;
  end if;

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
         or (
           (v_candidate->>'discount_pesewas')::bigint = (v_best->>'discount_pesewas')::bigint
           and (v_candidate->>'priority')::int > (v_best->>'priority')::int
         )
      then
        v_best := v_candidate;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'applied', v_best,
    'code_result', v_code_res,
    'discount_pesewas', coalesce((v_best->>'discount_pesewas')::bigint, 0)
  );
end;
$bb$;

grant execute on function public.promo_quote(jsonb, text, uuid, text) to anon, authenticated;
