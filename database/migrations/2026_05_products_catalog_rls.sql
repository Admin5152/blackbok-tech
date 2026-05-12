-- ============================================================
-- Section 20 / catalog: let staff manage products (not only
-- profiles.role = 'admin'). Matches Admin.tsx isSales gate.
--
-- Uses public.has_role() from 2026_05_production_ready.sql.
-- Requires app_role enum to include 'staff'. If you see:
--   invalid input value for enum app_role: "staff"
-- run 2026_05_production_staff_enum.sql first (adds the label on old DBs).
-- Idempotent: DROP + CREATE policy.
-- ============================================================
BEGIN;

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Staff and admins can manage products" ON public.products;

CREATE POLICY "Staff and admins can manage products"
  ON public.products
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
