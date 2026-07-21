-- Ensure service_role can read/delete push_subscriptions (server-side web push send).
BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;

COMMIT;
