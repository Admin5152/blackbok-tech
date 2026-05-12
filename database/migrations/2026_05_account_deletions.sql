-- ============================================================
-- Account deletions audit + registration_email_status update
--
-- 1) Log self-service deletes so admins see "Deleted accounts"
--    and signup/login UX can distinguish deleted vs active email.
-- 2) Extend registration_email_status with was_deleted + state
--    deleted_account when email is not in auth/profiles but
--    appears in account_deletions.
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.account_deletions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  email        TEXT NOT NULL,
  display_name TEXT,
  deleted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_deletions_email_lower
  ON public.account_deletions (lower(trim(email)));

CREATE INDEX IF NOT EXISTS idx_account_deletions_deleted_at
  ON public.account_deletions (deleted_at DESC);

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_deletions_insert_own" ON public.account_deletions;
CREATE POLICY "account_deletions_insert_own"
  ON public.account_deletions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "account_deletions_admin_select" ON public.account_deletions;
CREATE POLICY "account_deletions_admin_select"
  ON public.account_deletions
  FOR SELECT
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
  );

COMMENT ON TABLE public.account_deletions IS
  'Append-only log when a customer deletes their account (before auth user removal).';

GRANT SELECT, INSERT ON public.account_deletions TO authenticated;

-- ------------------------------------------------------------
-- registration_email_status: include deleted-account signal
-- ------------------------------------------------------------
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
  v_deleted boolean := false;
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

  SELECT EXISTS (
    SELECT 1
    FROM public.account_deletions ad
    WHERE lower(trim(coalesce(ad.email, ''))) = v_email
  ) INTO v_deleted;

  RETURN jsonb_build_object(
    'ok', true,
    'exists_in_auth', v_auth,
    'has_profile', v_profile,
    'was_deleted', v_deleted,
    'state', CASE
      WHEN NOT v_auth AND NOT v_profile AND NOT v_deleted THEN 'available'
      WHEN v_auth AND v_profile THEN 'active_account'
      WHEN v_auth AND NOT v_profile THEN 'auth_without_profile'
      WHEN NOT v_auth AND v_profile THEN 'profile_only'
      WHEN NOT v_auth AND NOT v_profile AND v_deleted THEN 'deleted_account'
      ELSE 'unknown'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registration_email_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_email_status(text) TO anon, authenticated;

COMMENT ON FUNCTION public.registration_email_status(text) IS
  'Returns { exists_in_auth, has_profile, was_deleted, state } for signup UX. States include deleted_account (email on file from a removed account).';

COMMIT;
