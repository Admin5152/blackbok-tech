-- ============================================================================
-- BlackBox — CLIENT ANSWERS SEED
-- 2026_07_client_answers.sql
--
-- Applies the client's confirmed decisions. Run AFTER:
--   1) 2026_07_production_trade_and_products.sql
--   2) 2026_07_trade_product_resolution_v2.sql
--   3) 2026_07_production_readiness.sql
--
-- ⚠️ FOUR ITEMS STILL NEED THE CLIENT — see §7. The system runs safely
--    without them (threshold stays disabled), but the cut-off feature and
--    top-up payment flow are not live until they land.
-- ============================================================================


-- ============================================================================
-- 1. D1 — PRICE ANOMALIES RESOLVED
-- ============================================================================
BEGIN;

-- D1b: "47OO" confirmed as 4700 ✅ (already seeded correctly — verifying)
DO $$
DECLARE v NUMERIC;
BEGIN
  SELECT base_value INTO v FROM public.trade_base_values
   WHERE model='iPhone 14 Pro Max' AND storage='256GB' AND sim_variant='ps';
  IF v IS DISTINCT FROM 4700 THEN
    RAISE WARNING 'iPhone 14 Pro Max PS 256GB is % — client confirmed 4700. Re-run Pricing Seed v2.', v;
  ELSE
    RAISE NOTICE 'D1b OK: 14 Pro Max PS 256GB = 4700';
  END IF;
END $$;

-- D1c: 17 Pro Max eSIM 2TB confirmed as 14,000 as written ✅
UPDATE public.trade_base_values
   SET base_value = 14000, updated_at = NOW()
 WHERE model='iPhone 17 Pro Max' AND storage='2TB' AND sim_variant='es';

-- D1a: iPhone 15 (PS) fourth value 4650 — client answered "yes" (= it is a
--      1TB tier). ⚠️ PROBLEM: Apple never made a 1TB iPhone 15 (base model
--      tops out at 512GB; only Pro Max reaches 1TB). Seeded INACTIVE so it
--      cannot reach customers until the client clarifies which configuration
--      4650 actually belongs to.
INSERT INTO public.trade_base_values (model, storage, sim_variant, base_value, is_active)
VALUES ('iPhone 15', '1TB', 'ps', 4650, FALSE)
ON CONFLICT (model, storage, sim_variant)
DO UPDATE SET base_value = 4650, is_active = FALSE, updated_at = NOW();

COMMENT ON TABLE public.trade_base_values IS
  'GHS base trade-in values. NOTE: iPhone 15 / 1TB / ps = 4650 is INACTIVE — Apple made no 1TB iPhone 15; awaiting client clarification (D1a).';

COMMIT;


-- ============================================================================
-- 2. D2, D17, D19, D22 — POLICY DECISIONS
-- ============================================================================
BEGIN;

-- D2: iCloud-locked → reject the trade-in completely
UPDATE public.trade_config
   SET value='hard_stop', updated_at=NOW(),
       description='D2 ✅CLIENT: iCloud-locked devices are rejected outright.'
 WHERE key='icloud_locked_policy';

-- D17: camera replaced → full deduction, engineer may verify
UPDATE public.trade_config
   SET value='full_verify', updated_at=NOW(),
       description='D17 ✅CLIENT: full camera deduction online; engineer verifies at inspection.'
 WHERE key='camera_replaced_policy';

-- D22: battery replaced but healthy → (d) full online, engineer may increase
UPDATE public.trade_config
   SET value='full_verify', updated_at=NOW(),
       description='D22 ✅CLIENT: option (d) — full deduction shown online; engineer may raise the final offer after inspection.'
 WHERE key='battery_replaced_policy';

-- D19: screen replaced → full · screen cracked → full
--      (matches the placeholder rules already seeded; confirming them)
UPDATE public.trade_answers a
   SET outcome='deduct_full'
  FROM public.trade_questions q
 WHERE q.id=a.question_id
   AND q.code IN ('S1','S2','iS1','iS2')
   AND a.answer_text='Yes';

COMMIT;


-- ============================================================================
-- 3. A1 / A2 — AESTHETIC GRADES (25% / 50% of base value)
-- ============================================================================
BEGIN;

UPDATE public.trade_config
   SET value='percent', updated_at=NOW(),
       description='A1 ✅CLIENT: percentage of base value.'
 WHERE key='aesthetic_a1_mode';
UPDATE public.trade_config
   SET value='25', updated_at=NOW(),
       description='A1 ✅CLIENT: "Some visible wear" = 25% of base value.'
 WHERE key='aesthetic_a1_value';

UPDATE public.trade_config
   SET value='percent', updated_at=NOW(),
       description='A2 ✅CLIENT: percentage of base value.'
 WHERE key='aesthetic_a2_mode';
UPDATE public.trade_config
   SET value='50', updated_at=NOW(),
       description='A2 ✅CLIENT: "Heavily worn" = 50% of base value.'
 WHERE key='aesthetic_a2_value';

COMMIT;

-- ⚠️ IMPACT CHECK (see §7 item 2): at 50%, a heavily-worn device with any
--    screen fault clamps to GHS 0 on most modern models:
--      iPhone 16 Pro 256GB : 7300 − 3650 (A2) − 4500 (screen) = 0
--      iPhone 17 Pro Max   : 13000 − 6500 − 7500              = 0
--    That may be intended (those devices genuinely aren't worth trading),
--    but the client should see it before launch.


-- ============================================================================
-- 4. D9 / D11 — LOGISTICS
--    Client: "they come to BlackBox" → inspection at the shop, drop-off only.
--    Client: "do not reserve stock — first come, first served".
-- ============================================================================
BEGIN;

INSERT INTO public.trade_config (key, value, description) VALUES
 ('inspection_point','store','D9 ✅CLIENT: customer brings the device to BlackBox; engineers inspect on site.'),
 ('stock_reservation','none','D11 ✅CLIENT: target device is NOT reserved — first come, first served.'),
 ('default_fulfillment','dropoff','D9 ✅CLIENT: drop-off is the default (and currently only) handover method.')
ON CONFLICT (key) DO UPDATE
  SET value=EXCLUDED.value, description=EXCLUDED.description, updated_at=NOW();

-- Drop-off only: normalise existing rows and default
UPDATE public.trade_in_requests
   SET fulfillment_method='dropoff'
 WHERE fulfillment_method IS NULL OR lower(btrim(fulfillment_method)) <> 'pickup';

ALTER TABLE public.trade_in_requests ALTER COLUMN fulfillment_method SET DEFAULT 'dropoff';

COMMIT;


-- ============================================================================
-- 5. D16 — PER-MODEL THRESHOLD  🔧 SCHEMA CHANGE
--    The client wants a FIXED cut-off amount set INDIVIDUALLY PER MODEL.
--    The original config supported only one global number, so the threshold
--    now lives on trade_devices, with trade_config as the fallback.
-- ============================================================================
BEGIN;

ALTER TABLE public.trade_devices
  ADD COLUMN IF NOT EXISTS threshold_value NUMERIC CHECK (threshold_value IS NULL OR threshold_value >= 0);

COMMENT ON COLUMN public.trade_devices.threshold_value IS
  'D16 ✅CLIENT: fixed GHS cut-off for THIS model. When the running estimate falls below it, the questionnaire stops with the client''s message. NULL = fall back to trade_config threshold_mode/threshold_value. Admin-editable.';

UPDATE public.trade_config
   SET value='per_model', updated_at=NOW(),
       description='D16 ✅CLIENT: fixed amount set individually per model — see trade_devices.threshold_value. Global value below is the fallback only.'
 WHERE key='threshold_mode';

-- Engine updated: per-model threshold first, then global fallback.
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

  -- D16: per-model threshold takes precedence over the global setting
  SELECT threshold_value INTO v_model_th FROM public.trade_devices WHERE model = p_model;
  SELECT value INTO v_th_mode         FROM public.trade_config WHERE key='threshold_mode';
  SELECT value::NUMERIC INTO v_th_val FROM public.trade_config WHERE key='threshold_value';

  v_threshold := CASE
    WHEN v_model_th IS NOT NULL AND v_model_th > 0 THEN v_model_th
    WHEN COALESCE(v_th_val,0) <= 0                 THEN 0
    WHEN v_th_mode = 'percent'                     THEN public.trade_round(v_base * v_th_val/100)
    WHEN v_th_mode = 'fixed'                       THEN v_th_val
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

COMMIT;

-- ⚠️ The per-model threshold NUMBERS have not been supplied yet. Until the
--    client fills them in, threshold_value is NULL on every model and the
--    global fallback is 0 → the cut-off message never fires. See §7 item 1.


-- ============================================================================
-- 6. ADMIN HELPER — the fill-in list to send back to the client
-- ============================================================================
CREATE OR REPLACE VIEW public.v_trade_threshold_worksheet AS
SELECT d.model,
       d.device_type,
       MIN(b.base_value) AS lowest_base,
       MAX(b.base_value) AS highest_base,
       d.threshold_value AS current_threshold,
       CASE WHEN d.threshold_value IS NULL THEN 'NEEDS CLIENT VALUE' ELSE 'set' END AS status
  FROM public.trade_devices d
  LEFT JOIN public.trade_base_values b ON b.model = d.model AND b.is_active
 WHERE d.is_active
 GROUP BY d.model, d.device_type, d.threshold_value, d.sort_order
 ORDER BY d.sort_order, d.model;

GRANT SELECT ON public.v_trade_threshold_worksheet TO authenticated;

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- 7. STILL OUTSTANDING — needs the client
-- ============================================================================
-- 1. 🔴 D16 PER-MODEL THRESHOLD NUMBERS. The client chose "fixed amount per
--    model" but supplied no amounts. The cut-off message cannot fire until
--    each model has one. Send them:
--       SELECT model, lowest_base, highest_base FROM v_trade_threshold_worksheet;
--    Apply with:
--       UPDATE trade_devices SET threshold_value = 800 WHERE model='iPhone XR';
--
-- 2. ⚠️ A2 = 50% IMPACT. Combined with a screen fault this clamps to GHS 0 on
--    most current models (16 Pro: 7300−3650−4500 = 0). Confirm intended.
--
-- 3. 🔴 D8 TOP-UP PAYMENT — the answer given ("Cash/MoMo refund of the
--    difference") answers a DIFFERENT question (D6: what happens when the
--    trade-in is worth MORE than the target device). Still needed: when the
--    customer OWES money, how do they pay — Paystack online at acceptance,
--    or cash/MoMo/POS at the exchange?
--    (D6 is now answered: refund the difference in cash/MoMo.)
--
-- 4. ⚠️ D1a — 4650 as a 1TB iPhone 15. Apple made no 1TB iPhone 15 (base model
--    stops at 512GB). Row seeded INACTIVE. Which configuration is 4650 for?
--
-- 5. iPad pricing tables (Action Sheet 2B/2C) — 23 iPad models still inactive.
-- ============================================================================