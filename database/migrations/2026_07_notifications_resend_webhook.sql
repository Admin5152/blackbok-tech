-- ============================================================
-- Fan-out webhook: notifications INSERT → Resend + Web Push
-- Production values for blackboxghana.com
--
-- BEFORE RUNNING:
-- 1) Enable extension "pg_net" (Database → Extensions) if needed
-- 2) Confirm EMAIL_WEBHOOK_SECRET on Vercel matches v_secret below
-- 3) Set SUPABASE_SERVICE_ROLE_KEY on Vercel (required for status emails)
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
  v_url    TEXT := 'https://blackboxghana.com/api/notify/email';
  v_secret TEXT := 's2L740AQv6CPGeoJhw3yE4JwypAoIXKrW4YkF85h';
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
    timeout_milliseconds := 8000
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
