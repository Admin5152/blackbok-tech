-- ============================================================
-- profiles SELECT + UPDATE: honor user_roles-based admins/staff
--
-- Fixes: admins only saw their own profile row because the legacy
-- policy only checked profiles.role. Now checks has_role(), which
-- matches grants stored in public.user_roles.
--
-- UPDATE: replaces legacy "Admins update any profile" + own-profile
-- policy so admins can change roles from the app; staff can edit
-- profiles but cannot set anyone's role to admin; users cannot
-- self-escalate role (unless they are admin/staff updating self).
--
-- Requires: public.has_role, public.app_role enum (roles_canonical
--   or production_ready migration).
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- Pre-flight: verify dependencies exist
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'has_role'
  ) THEN
    RAISE EXCEPTION 'Missing dependency: public.has_role not found. Run roles_canonical / production_ready migration first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace AND typname = 'app_role'
  ) THEN
    RAISE EXCEPTION 'Missing dependency: public.app_role enum not found. Run roles migration first.';
  END IF;
END $$;

-- Snapshot caller's stored profiles.role without tripping RLS recursion
-- (policies on profiles must not SELECT public.profiles in WITH CHECK).
CREATE OR REPLACE FUNCTION public.fn_profiles_current_role_for_auth()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.fn_profiles_current_role_for_auth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_profiles_current_role_for_auth() TO authenticated;

-- ------------------------------------------------------------
-- SELECT: admins and staff can view all profiles
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

-- ------------------------------------------------------------
-- UPDATE: drop legacy names from schema.sql + 2026_05_01
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can update profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Staff can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'::public.app_role))
  WITH CHECK (
    public.has_role(auth.uid(), 'staff'::public.app_role)
    AND lower(trim(coalesce(role::text, ''))) <> 'admin'
  );

-- ------------------------------------------------------------
-- Users: update own row (name, phone, etc.) but not self-escalate role
-- (admins/staff editing self are covered by their policies above).
-- WITH CHECK: new role must match stored role OR caller is admin/staff.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
      OR role IS NOT DISTINCT FROM public.fn_profiles_current_role_for_auth()
    )
  );

COMMIT;
