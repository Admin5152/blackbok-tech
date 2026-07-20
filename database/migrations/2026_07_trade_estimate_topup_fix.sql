-- =============================================================================
-- Fix trade estimate + top-up pricing consistency
-- =============================================================================
-- 1) compute_trade_estimate: keep deduct_quarter (battery 85–90%) and all outcomes
-- 2) fn_trade_snapshot_target_price: treat variant.price 0/NULL as unset;
--    use absolute price only when > 0, else product.price + price_modifier
--    (avoids inflated upgrade prices that create bogus top-ups)
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.compute_trade_estimate(
  p_model TEXT, p_storage TEXT, p_sim TEXT, p_answers JSONB
) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_base NUMERIC; v_total NUMERIC := 0; v_estimate NUMERIC;
  v_verify BOOLEAN := FALSE; v_hard BOOLEAN := FALSE;
  v_lines JSONB := '[]'::JSONB;
  v_th_mode TEXT; v_th_val NUMERIC; v_threshold NUMERIC; v_below BOOLEAN;
  v_model_th NUMERIC;
  r RECORD;
BEGIN
  SELECT base_value INTO v_base FROM public.trade_base_values
   WHERE model=p_model AND storage=p_storage AND sim_variant=p_sim AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active base value for % / % / %', p_model, p_storage, p_sim
      USING ERRCODE='P0001';
  END IF;

  FOR r IN
    WITH chosen AS (
      SELECT a.outcome, a.flag_verify, q.component
        FROM jsonb_array_elements(COALESCE(p_answers, '[]'::JSONB)) x
        JOIN public.trade_answers   a ON a.id = (x->>'answer_id')::UUID
        JOIN public.trade_questions q ON q.id = a.question_id
    ), priced AS (
      SELECT c.component,
             bool_or(c.flag_verify) AS verify,
             bool_or(c.outcome='hard_stop') AS hard,
             MAX(CASE c.outcome
               WHEN 'deduct_full' THEN COALESCE(d.deduction,0)
               WHEN 'deduct_half' THEN public.trade_round(COALESCE(d.deduction,0)*0.5)
               WHEN 'deduct_quarter' THEN public.trade_round(COALESCE(d.deduction,0)*0.25)
               WHEN 'battery_replaced_policy' THEN
                 CASE (SELECT value FROM public.trade_config WHERE key='battery_replaced_policy')
                   WHEN 'none_if_90' THEN 0
                   WHEN 'half_if_85' THEN public.trade_round(COALESCE(d.deduction,0)*0.5)
                   ELSE COALESCE(d.deduction,0) END
               WHEN 'camera_replaced_policy' THEN
                 CASE (SELECT value FROM public.trade_config WHERE key='camera_replaced_policy')
                   WHEN 'none_if_working' THEN 0
                   ELSE COALESCE(d.deduction,0) END
               WHEN 'aesthetic_a1' THEN COALESCE(
                 (SELECT amount FROM public.trade_aesthetic_overrides o WHERE o.model=p_model AND o.grade='a1'),
                 CASE (SELECT value FROM public.trade_config WHERE key='aesthetic_a1_mode')
                   WHEN 'fixed' THEN (SELECT value::NUMERIC FROM public.trade_config WHERE key='aesthetic_a1_value')
                   ELSE public.trade_round(v_base * (SELECT value::NUMERIC FROM public.trade_config WHERE key='aesthetic_a1_value')/100) END)
               WHEN 'aesthetic_a2' THEN COALESCE(
                 (SELECT amount FROM public.trade_aesthetic_overrides o WHERE o.model=p_model AND o.grade='a2'),
                 CASE (SELECT value FROM public.trade_config WHERE key='aesthetic_a2_mode')
                   WHEN 'fixed' THEN (SELECT value::NUMERIC FROM public.trade_config WHERE key='aesthetic_a2_value')
                   ELSE public.trade_round(v_base * (SELECT value::NUMERIC FROM public.trade_config WHERE key='aesthetic_a2_value')/100) END)
               ELSE 0 END) AS amount
        FROM chosen c
        LEFT JOIN public.trade_fault_deductions d
          ON d.model=p_model AND d.fault_code=c.component AND d.is_active
       WHERE c.component IS NOT NULL
       GROUP BY c.component
    ) SELECT * FROM priced
  LOOP
    v_verify := v_verify OR r.verify;
    v_hard   := v_hard   OR r.hard;
    IF COALESCE(r.amount,0) > 0 THEN
      v_total := v_total + r.amount;
      v_lines := v_lines || jsonb_build_object('component', r.component, 'amount', r.amount);
    END IF;
  END LOOP;

  v_estimate := GREATEST(v_base - v_total, 0);

  SELECT threshold_value INTO v_model_th FROM public.trade_devices WHERE model = p_model;
  SELECT value INTO v_th_mode         FROM public.trade_config WHERE key='threshold_mode';
  SELECT value::NUMERIC INTO v_th_val FROM public.trade_config WHERE key='threshold_value';

  v_threshold := CASE
    WHEN v_model_th IS NOT NULL AND v_model_th > 0 THEN v_model_th
    WHEN COALESCE(v_th_val,0) <= 0                 THEN 0
    WHEN v_th_mode = 'percent'                     THEN public.trade_round(v_base * v_th_val/100)
    WHEN v_th_mode = 'fixed'                       THEN v_th_val
    WHEN v_th_mode = 'per_model'                   THEN 0
    ELSE 0 END;

  v_below := v_threshold > 0 AND v_estimate < v_threshold;

  RETURN jsonb_build_object(
    'base_value', v_base, 'deductions', v_lines, 'total_deductions', v_total,
    'estimate', v_estimate, 'needs_verification', v_verify, 'hard_stop', v_hard,
    'threshold', v_threshold, 'threshold_source',
      CASE WHEN v_model_th IS NOT NULL AND v_model_th > 0 THEN 'model' ELSE 'global' END,
    'below_threshold', v_below,
    'threshold_message', CASE WHEN v_below THEN
      (SELECT value FROM public.trade_config WHERE key='threshold_message') END);
END $$;

GRANT EXECUTE ON FUNCTION public.compute_trade_estimate(TEXT,TEXT,TEXT,JSONB) TO anon, authenticated;

COMMENT ON FUNCTION public.compute_trade_estimate IS
  'Live trade estimate: base − one deduction per component. Battery: ≥91 none · 85–90 25% · 70–84 50% · <70 full.';

CREATE OR REPLACE FUNCTION public.fn_trade_snapshot_target_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  IF NEW.target_variant_id IS NULL AND NEW.target_product_id IS NULL THEN
    IF TG_OP = 'UPDATE'
       AND (
         NEW.target_variant_id IS DISTINCT FROM OLD.target_variant_id
         OR NEW.target_product_id IS DISTINCT FROM OLD.target_product_id
       ) THEN
      NEW.target_product_price := NULL;
      NEW.top_up_amount := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.target_variant_id IS NOT DISTINCT FROM OLD.target_variant_id
     AND NEW.target_product_id IS NOT DISTINCT FROM OLD.target_product_id THEN
    RETURN NEW;
  END IF;

  IF NEW.target_variant_id IS NOT NULL THEN
    SELECT CASE
             WHEN pv.price IS NOT NULL AND pv.price > 0 THEN pv.price
             ELSE COALESCE(p.price, 0) + COALESCE(pv.price_modifier, 0)
           END
      INTO v_price
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
     WHERE pv.id = NEW.target_variant_id;
  ELSIF NEW.target_product_id IS NOT NULL THEN
    SELECT p.price INTO v_price
      FROM public.products p
     WHERE p.id = NEW.target_product_id;
  END IF;

  IF v_price IS NOT NULL AND v_price > 0 THEN
    NEW.target_product_price := v_price;
    IF NEW.estimated_value IS NOT NULL THEN
      -- Top-up only when upgrade costs more than trade credit; trading down → 0
      NEW.top_up_amount := GREATEST(v_price - COALESCE(NEW.estimated_value, 0), 0);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_trade_snapshot_target_price() IS
  'Server target price + top-up. Absolute variant.price only when > 0; else base + modifier. top_up = max(price − credit, 0).';

COMMIT;
