-- ============================================================
-- (1/4) Roles: user_roles as canonical privilege source
--
-- - has_role() reads ONLY public.user_roles (typed app_role).
-- - Backfill user_roles from profiles.role where missing.
-- - handle_new_user inserts profile only; trigger mirrors role → user_roles.
-- - profiles.role kept for legacy UI / reads; marked deprecated in COMMENT.
-- - Sync profiles.role when admin updates user_roles (optional drift fix).
--
-- Run AFTER: production_ready / production ready2, qa_sprint, section25
--   (handle_new_user is replaced here).
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. has_role: canonical = user_roles only
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  );
$$;

COMMENT ON COLUMN public.profiles.role IS
  'Deprecated mirror for display and legacy code. Source of truth for access control is public.user_roles; kept in sync by trg_profiles_mirror_user_roles.';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IS NULL OR lower(role::TEXT) IN ('user', 'admin', 'staff'));

-- ------------------------------------------------------------
-- 2. Backfill user_roles from profiles (users with no rows yet)
-- ------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT
  p.id,
  CASE lower(trim(coalesce(p.role::TEXT, 'user')))
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'staff' THEN 'staff'::public.app_role
    ELSE 'user'::public.app_role
  END
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Mirror profiles.role → user_roles (primary app role rows)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiles_mirror_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := CASE lower(trim(coalesce(NEW.role::TEXT, 'user')))
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'staff' THEN 'staff'::public.app_role
    ELSE 'user'::public.app_role
  END;

  DELETE FROM public.user_roles
  WHERE user_id = NEW.id
    AND role IN ('user'::public.app_role, 'staff'::public.app_role, 'admin'::public.app_role);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_mirror_user_roles ON public.profiles;
CREATE TRIGGER trg_profiles_mirror_user_roles
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_profiles_mirror_user_roles();

-- ------------------------------------------------------------
-- 4. handle_new_user: profile row only (trigger adds user_roles)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name   TEXT;
  v_letter TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1)
  );
  v_letter := UPPER(LEFT(COALESCE(NULLIF(v_name, ''), NEW.email, 'U'), 1));

  INSERT INTO public.profiles (id, email, name, role, avatar_letter)
  VALUES (NEW.id, COALESCE(NEW.email, ''), v_name, 'user', v_letter)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 5. tracking_updates admin policy uses has_role (not profiles.role alone)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admins_all_tracking" ON public.tracking_updates;

CREATE POLICY "admins_all_tracking"
  ON public.tracking_updates
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

-- ------------------------------------------------------------
-- 6. Admins may update any profile (role / support edits)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
CREATE POLICY "Admins update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

COMMIT;
