-- Registration helper: explain why an email cannot sign up again.
-- SECURITY DEFINER reads auth.users + public.profiles (booleans only).
-- Tradeoff: allows limited email existence probing; enable only if you accept that for clearer UX.

BEGIN;

CREATE OR REPLACE FUNCTION public.registration_email_status(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_auth boolean := false;
  v_profile boolean := false;
BEGIN
  IF v_email = '' OR position('@' in v_email) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE lower(trim(coalesce(au.email, ''))) = v_email
  ) INTO v_auth;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE lower(trim(coalesce(pr.email, ''))) = v_email
  ) INTO v_profile;

  RETURN jsonb_build_object(
    'ok', true,
    'exists_in_auth', v_auth,
    'has_profile', v_profile,
    'state', CASE
      WHEN NOT v_auth AND NOT v_profile THEN 'available'
      WHEN v_auth AND v_profile THEN 'active_account'
      WHEN v_auth AND NOT v_profile THEN 'auth_without_profile'
      WHEN NOT v_auth AND v_profile THEN 'profile_only'
      ELSE 'unknown'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registration_email_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_email_status(text) TO anon, authenticated;

COMMENT ON FUNCTION public.registration_email_status(text) IS
  'Returns { exists_in_auth, has_profile, state } for signup UX. States: available | active_account | auth_without_profile | profile_only.';

COMMIT;
