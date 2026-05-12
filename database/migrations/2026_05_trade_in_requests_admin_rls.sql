-- ============================================================
-- trade_in_requests — broaden admin RLS so catalog staff and
-- user_roles-based admins can list/update all rows.
--
-- Replaces the policy from 2026_05_trade_in_requests.sql that only
-- matched profiles.role = 'admin'.
--
-- Requires: public.user_roles (from 2026_05_production_ready.sql).
-- Idempotent: DROP + CREATE same policy name.
-- ============================================================
BEGIN;

DROP POLICY IF EXISTS "trade_in_requests_admin_all" ON public.trade_in_requests;

CREATE POLICY "trade_in_requests_admin_all"
  ON public.trade_in_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(coalesce(p.role::text, '')) IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND lower(ur.role::text) IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(coalesce(p.role::text, '')) IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND lower(ur.role::text) IN ('admin', 'staff')
    )
  );

COMMIT;
