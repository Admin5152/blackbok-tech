-- ============================================================
-- Fix customer trade pricing load ("Unable to load pricing")
--
-- Root cause: public SELECT policies use `is_active OR fn_is_staff()`,
-- but anon/authenticated often lack EXECUTE on fn_is_staff(). RLS then
-- aborts with "permission denied for function fn_is_staff" even for
-- active rows — so category/model/config/estimate all fail.
--
-- Fix:
-- 1) Re-grant EXECUTE on fn_is_staff to anon + authenticated
-- 2) Split public read (is_active only) from staff read-all
-- ============================================================
BEGIN;

-- Ensure helper exists and is safe for policy use
CREATE OR REPLACE FUNCTION public.fn_is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(coalesce(p.role::text, '')) IN ('admin', 'staff')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND lower(ur.role::text) IN ('admin', 'staff')
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_is_staff() TO anon, authenticated;

-- ------------------------------------------------------------
-- trade_devices
-- ------------------------------------------------------------
DROP POLICY IF EXISTS trade_devices_public_read ON public.trade_devices;
CREATE POLICY trade_devices_public_read ON public.trade_devices
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS trade_devices_staff_read_all ON public.trade_devices;
CREATE POLICY trade_devices_staff_read_all ON public.trade_devices
  FOR SELECT TO authenticated
  USING (public.fn_is_staff());

-- ------------------------------------------------------------
-- trade_base_values
-- ------------------------------------------------------------
DROP POLICY IF EXISTS trade_base_values_public_read ON public.trade_base_values;
CREATE POLICY trade_base_values_public_read ON public.trade_base_values
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS trade_base_values_staff_read_all ON public.trade_base_values;
CREATE POLICY trade_base_values_staff_read_all ON public.trade_base_values
  FOR SELECT TO authenticated
  USING (public.fn_is_staff());

-- ------------------------------------------------------------
-- trade_fault_deductions
-- ------------------------------------------------------------
DROP POLICY IF EXISTS trade_fault_deductions_public_read ON public.trade_fault_deductions;
CREATE POLICY trade_fault_deductions_public_read ON public.trade_fault_deductions
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS trade_fault_deductions_staff_read_all ON public.trade_fault_deductions;
CREATE POLICY trade_fault_deductions_staff_read_all ON public.trade_fault_deductions
  FOR SELECT TO authenticated
  USING (public.fn_is_staff());

-- ------------------------------------------------------------
-- trade_questions (condition quiz)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS trade_questions_public_read ON public.trade_questions;
CREATE POLICY trade_questions_public_read ON public.trade_questions
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS trade_questions_staff_read_all ON public.trade_questions;
CREATE POLICY trade_questions_staff_read_all ON public.trade_questions
  FOR SELECT TO authenticated
  USING (public.fn_is_staff());

-- ------------------------------------------------------------
-- product_variants (upgrade targets / shop SKUs)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;
CREATE POLICY product_variants_public_read ON public.product_variants
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS product_variants_staff_read_all ON public.product_variants;
CREATE POLICY product_variants_staff_read_all ON public.product_variants
  FOR SELECT TO authenticated
  USING (public.fn_is_staff());

-- Estimate RPC must stay callable by visitors browsing trade-in
GRANT EXECUTE ON FUNCTION public.compute_trade_estimate(TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

COMMIT;
