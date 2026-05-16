-- ============================================================
-- 2026_05_product_variants_admin_rls.sql
-- Allow storefront reads + staff/admin SKU matrix edits.
-- Idempotent.
-- ============================================================
BEGIN;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view product variants" ON public.product_variants;
CREATE POLICY "Anyone can view product variants"
  ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff and admins manage product variants" ON public.product_variants;
CREATE POLICY "Staff and admins manage product variants"
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

COMMIT;
