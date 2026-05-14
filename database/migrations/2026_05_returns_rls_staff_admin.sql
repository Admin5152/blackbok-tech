-- Allow staff (and admin) to read and update return requests in the dashboard.
-- Replaces admin-only FOR ALL policy so INSERT still matches "Users create own returns"
-- (multiple permissive policies OR together).

BEGIN;

DROP POLICY IF EXISTS "Admins manage returns" ON public.returns;

CREATE POLICY "Staff admin select all returns"
  ON public.returns FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

CREATE POLICY "Staff admin update returns"
  ON public.returns FOR UPDATE
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
