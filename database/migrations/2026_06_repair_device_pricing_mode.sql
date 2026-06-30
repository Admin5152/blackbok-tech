-- Repair requests: device category + iPhone matrix pricing flag.
-- Safe to re-run.

BEGIN;

ALTER TABLE public.repair_requests
  ADD COLUMN IF NOT EXISTS device_type   TEXT,
  ADD COLUMN IF NOT EXISTS pricing_mode  TEXT;

COMMENT ON COLUMN public.repair_requests.device_type IS
  'Customer-selected category: smartphone, tablet, laptop, gaming, smartwatch, other';

COMMENT ON COLUMN public.repair_requests.pricing_mode IS
  'apple_matrix = iPhone component estimate on form; diagnostic_quote = quote after inspection';

UPDATE public.repair_requests
   SET pricing_mode = CASE
     WHEN LOWER(COALESCE(device_brand, '')) = 'apple'
      AND COALESCE(device_model, '') ILIKE 'iphone%'
      AND estimated_cost IS NOT NULL
      AND estimated_cost > 0
     THEN 'apple_matrix'
     ELSE 'diagnostic_quote'
   END,
       device_type = CASE
     WHEN LOWER(COALESCE(device_brand, '')) = 'apple'
      AND COALESCE(device_model, '') ILIKE 'iphone%'
      AND estimated_cost IS NOT NULL
      AND estimated_cost > 0
     THEN 'smartphone'
     ELSE device_type
   END
 WHERE pricing_mode IS NULL;

ALTER TABLE public.repair_requests
  DROP CONSTRAINT IF EXISTS repair_requests_pricing_mode_check;

ALTER TABLE public.repair_requests
  DROP CONSTRAINT IF EXISTS repair_requests_apple_matrix_device_type_check;

ALTER TABLE public.repair_requests
  ADD CONSTRAINT repair_requests_pricing_mode_check
  CHECK (pricing_mode IS NULL OR pricing_mode IN ('apple_matrix', 'diagnostic_quote'));

ALTER TABLE public.repair_requests
  ADD CONSTRAINT repair_requests_apple_matrix_device_type_check
  CHECK (pricing_mode IS DISTINCT FROM 'apple_matrix' OR device_type = 'smartphone');

NOTIFY pgrst, 'reload schema';

COMMIT;
