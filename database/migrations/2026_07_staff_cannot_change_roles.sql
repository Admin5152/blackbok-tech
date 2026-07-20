-- ============================================================
-- Staff must not change anyone's role (including granting staff).
-- Admins remain the only callers who can UPDATE profiles.role.
-- Staff may still update non-role profile fields if needed.
-- ============================================================
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'has_role'
  ) THEN
    RAISE EXCEPTION 'Missing dependency: public.has_role';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_profiles_role_of(p_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role::text FROM public.profiles p WHERE p.id = p_id;
$$;

REVOKE ALL ON FUNCTION public.fn_profiles_role_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_profiles_role_of(uuid) TO authenticated;

DROP POLICY IF EXISTS "Staff can update profiles" ON public.profiles;

-- Staff can edit profile contact fields but cannot change role.
CREATE POLICY "Staff can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::public.app_role))
  WITH CHECK (
    public.has_role(auth.uid(), 'staff'::public.app_role)
    AND role IS NOT DISTINCT FROM public.fn_profiles_role_of(id)
  );

COMMIT;
