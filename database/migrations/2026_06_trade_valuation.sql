-- Trade-in matrix valuation: component deductions + top-up tracking.
-- Safe to re-run.

BEGIN;

ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS device_type           TEXT,
  ADD COLUMN IF NOT EXISTS pricing_mode          TEXT,
  ADD COLUMN IF NOT EXISTS base_trade_value      NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS deduction_breakdown   JSONB,
  ADD COLUMN IF NOT EXISTS component_flags       JSONB,
  ADD COLUMN IF NOT EXISTS target_product_price  NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS top_up_amount         NUMERIC(10, 2);

COMMENT ON COLUMN public.trade_in_requests.device_type IS
  'smartphone (iPhone) or tablet (iPad)';

COMMENT ON COLUMN public.trade_in_requests.pricing_mode IS
  'matrix_estimate = customer component checklist; inspection_quote = price TBD';

COMMENT ON COLUMN public.trade_in_requests.deduction_breakdown IS
  'Array of { key, label, percent, amount } deduction lines';

COMMENT ON COLUMN public.trade_in_requests.component_flags IS
  'Array of faulty component keys from customer checklist';

ALTER TABLE public.trade_in_requests
  DROP CONSTRAINT IF EXISTS trade_in_requests_pricing_mode_check;

ALTER TABLE public.trade_in_requests
  ADD CONSTRAINT trade_in_requests_pricing_mode_check
  CHECK (pricing_mode IS NULL OR pricing_mode IN ('matrix_estimate', 'inspection_quote'));

NOTIFY pgrst, 'reload schema';

COMMIT;
