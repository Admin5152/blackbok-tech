-- =============================================================================
-- Appearance discounts: enforce percent / fixed / per_model exclusively
-- =============================================================================
-- Before: override GHS always won via COALESCE, and per_model fell back to %.
-- After:
--   percent   → only trade_config aesthetic_*_value as % of base
--   fixed     → only trade_config aesthetic_*_value as GHS
--   per_model → only trade_aesthetic_overrides (missing row = 0)
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
               -- Light wear (A1): mode from Business rules exclusively
               WHEN 'aesthetic_a1' THEN
                 CASE (SELECT value FROM public.trade_config WHERE key='aesthetic_a1_mode')
                   WHEN 'percent' THEN
                     public.trade_round(
                       v_base * COALESCE(
                         (SELECT value::NUMERIC FROM public.trade_config WHERE key='aesthetic_a1_value'),
                         0
                       ) / 100
                     )
                   WHEN 'fixed' THEN
                     COALESCE(
                       (SELECT value::NUMERIC FROM public.trade_config WHERE key='aesthetic_a1_value'),
                       0
                     )
                   WHEN 'per_model' THEN
                     COALESCE(
                       (SELECT amount FROM public.trade_aesthetic_overrides o
                         WHERE o.model = p_model AND o.grade = 'a1'),
                       0
                     )
                   ELSE 0
                 END
               -- Heavier wear (A2): same exclusive modes
               WHEN 'aesthetic_a2' THEN
                 CASE (SELECT value FROM public.trade_config WHERE key='aesthetic_a2_mode')
                   WHEN 'percent' THEN
                     public.trade_round(
                       v_base * COALESCE(
                         (SELECT value::NUMERIC FROM public.trade_config WHERE key='aesthetic_a2_value'),
                         0
                       ) / 100
                     )
                   WHEN 'fixed' THEN
                     COALESCE(
                       (SELECT value::NUMERIC FROM public.trade_config WHERE key='aesthetic_a2_value'),
                       0
                     )
                   WHEN 'per_model' THEN
                     COALESCE(
                       (SELECT amount FROM public.trade_aesthetic_overrides o
                         WHERE o.model = p_model AND o.grade = 'a2'),
                       0
                     )
                   ELSE 0
                 END
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
  'Live trade estimate. Appearance: percent/fixed from trade_config only; per_model from trade_aesthetic_overrides only.';

COMMENT ON TABLE public.trade_aesthetic_overrides IS
  'Per-model light/heavier wear amounts (GHS). Used only when aesthetic_*_mode = per_model.';

COMMIT;
