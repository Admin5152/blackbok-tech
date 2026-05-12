-- ============================================================
-- handle_new_user: also read display_name from auth metadata
--
-- Signup clients may send name / full_name / display_name in
-- raw_user_meta_data. Keeps profiles.name aligned with registration.
-- Run after section25 / roles migrations that define handle_new_user.
-- ============================================================
BEGIN;

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
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1)
  );
  v_letter := UPPER(LEFT(COALESCE(NULLIF(v_name, ''), NEW.email, 'U'), 1));

  INSERT INTO public.profiles (id, email, name, role, avatar_letter)
  VALUES (NEW.id, COALESCE(NEW.email, ''), v_name, 'user', v_letter)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMIT;
