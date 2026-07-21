-- ============================================================
-- Fan-out webhook: notifications INSERT → Resend + Web Push
-- Use this if you cannot find Database → Webhooks in the UI.
--
-- BEFORE RUNNING:
-- 1) Replace YOUR_WEBHOOK_SECRET with the same value as
--    EMAIL_WEBHOOK_SECRET on Vercel / .env
-- 2) Confirm the URL is your live site (or change it)
-- 3) Run: Database → Extensions → enable "pg_net" (if not already)
-- ============================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.webhook_notifications_to_app()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  -- ⚠️ Change these two values to match production
  v_url    TEXT := 'https://blackboxghana.com/api/notify/email';
  v_secret TEXT := 'YOUR_WEBHOOK_SECRET';
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bb-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW)
    ),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_webhook_notifications_to_app ON public.notifications;
CREATE TRIGGER trg_webhook_notifications_to_app
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.webhook_notifications_to_app();

COMMENT ON FUNCTION public.webhook_notifications_to_app() IS
  'POSTs new notification rows to /api/notify/email (Resend + web push).';

COMMIT;
