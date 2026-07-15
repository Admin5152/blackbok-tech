-- ============================================================
-- BlackBox: Trade-In Actual Pricing Mode
--
-- Adds new columns for the actual pricing snapshot and
-- updates the pricing_mode check constraint.
--
-- Idempotent.
-- ============================================================
BEGIN;

-- 1. Add snapshot columns to trade_in_requests
ALTER TABLE public.trade_in_requests 
  ADD COLUMN IF NOT EXISTS storage_tier TEXT,
  ADD COLUMN IF NOT EXISTS sim_variant TEXT,
  ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT false;

-- 2. Update pricing_mode CHECK constraint
-- Drop existing constraint if it exists
ALTER TABLE public.trade_in_requests DROP CONSTRAINT IF EXISTS trade_in_requests_pricing_mode_check;

-- Add new constraint allowing 'actual_pricing'
ALTER TABLE public.trade_in_requests
  ADD CONSTRAINT trade_in_requests_pricing_mode_check 
  CHECK (pricing_mode IN ('matrix_estimate', 'inspection_quote', 'actual_pricing'));

COMMIT;
