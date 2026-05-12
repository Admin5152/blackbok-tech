-- Promote a user to admin by profile email.
-- Run in Supabase Dashboard → SQL Editor (postgres role).
--
-- With roles migration applied, updating profiles.role fires
-- trg_profiles_mirror_user_roles and refreshes public.user_roles.

BEGIN;

UPDATE public.profiles
SET role = 'admin'
WHERE lower(trim(email)) = lower(trim('osmondabdulkarimworiwi72@gmail.com'));

-- Optional: show what changed (1 row expected if the account exists)
SELECT
  p.id,
  p.email,
  p.role AS profiles_role,
  array_agg(ur.role::text ORDER BY ur.role::text) FILTER (WHERE ur.role IS NOT NULL) AS user_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE lower(trim(p.email)) = lower(trim('osmondabdulkarimworiwi72@gmail.com'))
GROUP BY p.id, p.email, p.role;

COMMIT;
