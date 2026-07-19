-- ============================================================================
-- BlackBox — Battery health bands (client 4-tier)
-- 2026_07_battery_bands_4tier.sql
--
-- Ranges (non-overlapping edges):
--   ≥91%           → none
--   85–90%         → 25% of battery deduction (deduct_quarter)
--   70–84%         → 50% (deduct_half)
--   ≤69% / Service → full (deduct_full)
--
-- Run after 2026_07_client_answers.sql. Idempotent.
-- ============================================================================

BEGIN;

-- Allow 25% battery outcome
ALTER TABLE public.trade_answers DROP CONSTRAINT IF EXISTS trade_answers_outcome_check;
ALTER TABLE public.trade_answers
  ADD CONSTRAINT trade_answers_outcome_check
  CHECK (outcome IN (
    'none','deduct_full','deduct_half','deduct_quarter',
    'aesthetic_a1','aesthetic_a2',
    'battery_replaced_policy','camera_replaced_policy','hard_stop'
  ));

COMMENT ON CONSTRAINT trade_answers_outcome_check ON public.trade_answers IS
  'deduct_quarter = 25% of component amount (battery 85–90% band).';

-- Config keys for the new bands (documentation / future engine use)
INSERT INTO public.trade_config (key, value, description) VALUES
  ('battery_healthy_min', '91', 'No deduction at this battery health %% and above (client 100–91)'),
  ('battery_quarter_min', '85', '25%% deduction from this %% to healthy_min-1 (85–90)'),
  ('battery_half_min', '70', '50%% deduction from this %% to quarter_min-1 (70–84)'),
  ('battery_full_below', '70', 'Full battery deduction strictly below this %% (≤69)')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = NOW();

-- Replace B2 / iB2 answer options
DELETE FROM public.trade_answers a
 USING public.trade_questions q
 WHERE a.question_id = q.id AND q.code IN ('B2', 'iB2');

INSERT INTO public.trade_answers (question_id, answer_text, outcome, flag_verify, requires_description, display_order)
SELECT q.id, v.txt, v.oc, false, false, v.ord
  FROM public.trade_questions q
  JOIN (VALUES
    ('B2',  '91% or above (excellent)',              'none',           1),
    ('B2',  '85–90% (slight wear)',                   'deduct_quarter', 2),
    ('B2',  '70–84% (noticeable drain)',              'deduct_half',    3),
    ('B2',  'Below 70% / shows "Service"',            'deduct_full',    4),
    ('iB2', '91%+ / lasts most of the day',           'none',           1),
    ('iB2', '85–90% / slight drain',                  'deduct_quarter', 2),
    ('iB2', '70–84% / drains noticeably fast',        'deduct_half',    3),
    ('iB2', 'Below 70% / dies quickly or shuts down', 'deduct_full',    4)
  ) AS v(code, txt, oc, ord) ON q.code = v.code;

-- Engine: add deduct_quarter = 25% of component amount, rounded to GHS 5
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
        FROM jsonb_array_elements(p_answers) x
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
  'Live trade estimate. Battery bands: ≥91 none · 85–90 deduct_quarter (25%) · 70–84 deduct_half · <70 full.';

COMMIT;
