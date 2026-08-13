-- =============================================================================
-- Ensure staff can WRITE product_variants (stock / price / SKUs)
-- Migration: 20260813001100_heal_product_variants_staff_write.sql
--
-- 2026_07_trade_public_read_fix.sql added SELECT-only policies for
-- product_variants. The manage (FOR ALL) policy from
-- 2026_05_product_variants_admin_rls.sql must remain for admin stock edits.
-- Idempotent recreate.
-- =============================================================================

BEGIN;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Public / storefront can read active SKUs
DROP POLICY IF EXISTS "Anyone can view product variants" ON public.product_variants;
DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;
CREATE POLICY product_variants_public_read ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE OR public.fn_is_staff());

-- Staff can read every row (incl. inactive)
DROP POLICY IF EXISTS product_variants_staff_read_all ON public.product_variants;
CREATE POLICY product_variants_staff_read_all ON public.product_variants
  FOR SELECT TO authenticated
  USING (public.fn_is_staff());

-- Staff / admin INSERT UPDATE DELETE (stock qty, prices, etc.)
DROP POLICY IF EXISTS "Staff and admins manage product variants" ON public.product_variants;
CREATE POLICY "Staff and admins manage product variants"
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.fn_is_staff()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.fn_is_staff()
  );

COMMIT;
