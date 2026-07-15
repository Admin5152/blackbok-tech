-- ============================================================
-- BlackBox: Trade-In Pricing Tables (Actual GHS Pricing)
--
-- Replaces percentage-based estimates with exact GHS pricing.
-- Creates tables for base values (per model/storage/SIM) and
-- fault deductions (per model/fault).
--
-- Idempotent.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. Base Values Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_base_values (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model        TEXT NOT NULL,          -- e.g. 'iPhone 16 Pro Max'
  storage      TEXT NOT NULL,          -- e.g. '256GB'
  sim_variant  TEXT NOT NULL DEFAULT 'ps',  -- 'ps' | 'es' | 'single'
  base_value   INTEGER NOT NULL,       -- Exact GHS
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model, storage, sim_variant)
);

-- RLS
ALTER TABLE public.trade_base_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_base_values_select_all" ON public.trade_base_values;
CREATE POLICY "trade_base_values_select_all"
  ON public.trade_base_values FOR SELECT
  USING (true); -- Publicly readable for estimator

DROP POLICY IF EXISTS "trade_base_values_admin_all" ON public.trade_base_values;
CREATE POLICY "trade_base_values_admin_all"
  ON public.trade_base_values FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(p.role::text) IN ('admin', 'staff'))
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND lower(ur.role::text) IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(p.role::text) IN ('admin', 'staff'))
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND lower(ur.role::text) IN ('admin', 'staff'))
  );

-- Trigger: updated_at
DROP TRIGGER IF EXISTS trg_trade_base_values_updated_at ON public.trade_base_values;
CREATE TRIGGER trg_trade_base_values_updated_at
  BEFORE UPDATE ON public.trade_base_values
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_timestamp();

-- ------------------------------------------------------------
-- 2. Fault Deductions Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_fault_deductions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model        TEXT NOT NULL,          -- e.g. 'iPhone 16 Pro Max'
  fault_code   TEXT NOT NULL,          -- 'screen' | 'battery' | 'backglass' | etc.
  fault_label  TEXT NOT NULL,          -- 'Screen' | 'Battery' | etc.
  deduction    INTEGER NOT NULL,       -- Exact GHS
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model, fault_code)
);

-- RLS
ALTER TABLE public.trade_fault_deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_fault_deductions_select_all" ON public.trade_fault_deductions;
CREATE POLICY "trade_fault_deductions_select_all"
  ON public.trade_fault_deductions FOR SELECT
  USING (true); -- Publicly readable for estimator

DROP POLICY IF EXISTS "trade_fault_deductions_admin_all" ON public.trade_fault_deductions;
CREATE POLICY "trade_fault_deductions_admin_all"
  ON public.trade_fault_deductions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(p.role::text) IN ('admin', 'staff'))
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND lower(ur.role::text) IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(p.role::text) IN ('admin', 'staff'))
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND lower(ur.role::text) IN ('admin', 'staff'))
  );

-- Trigger: updated_at
DROP TRIGGER IF EXISTS trg_trade_fault_deductions_updated_at ON public.trade_fault_deductions;
CREATE TRIGGER trg_trade_fault_deductions_updated_at
  BEFORE UPDATE ON public.trade_fault_deductions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_timestamp();

COMMIT;
