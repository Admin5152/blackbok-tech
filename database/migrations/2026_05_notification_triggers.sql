-- ============================================================
-- BlackBox: Notification Triggers
--
-- Replaces what the original spec called the
--   notify-on-{order,repair,trade}-status Edge Functions.
--
-- Why triggers instead of Edge Functions:
--   1. Atomic with the originating UPDATE — a status change and the
--      resulting notification commit (or roll back) together.
--   2. Cannot be missed. No webhook to misconfigure, no deploy step,
--      no cold-start failures.
--   3. Works regardless of who initiated the change: admin panel,
--      SQL console, an automation, a future Edge Function — they all
--      get the same notification behavior.
--   4. Zero runtime cost outside the transaction.
--
-- If/when we need email or SMS side effects, an Edge Function can
-- subscribe to INSERTs on `public.notifications` via Database Webhook
-- without changing this layer.
--
-- Also wraps up the Phase-1 notification gaps:
--   * CHECK constraint on notifications.type
--   * notifications added to supabase_realtime publication
--   * REPLICA IDENTITY FULL on notifications
--
-- Idempotent. Run once in Supabase SQL editor.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. Tighten notifications.type with a CHECK constraint
-- ------------------------------------------------------------
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Defensive backfill: coerce any disallowed values to 'info' so the
-- CHECK can be added without violating existing rows.
UPDATE public.notifications
   SET type = 'info'
 WHERE type NOT IN ('info','order','repair','trade','promo');

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info','order','repair','trade','promo'));

-- ------------------------------------------------------------
-- 2. Realtime: include notifications in supabase_realtime
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ------------------------------------------------------------
-- 3. Helper: insert a notification.
--    SECURITY DEFINER so triggers fired by admin/staff updates can
--    write rows owned by the customer (RLS would otherwise block it).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id      UUID,
  p_title        TEXT,
  p_body         TEXT,
  p_type         TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id, title, body, type, reference_id, is_read
  )
  VALUES (
    p_user_id, p_title, p_body, p_type, p_reference_id, FALSE
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(
  UUID, TEXT, TEXT, TEXT, UUID
) TO authenticated;

-- ------------------------------------------------------------
-- 4. Trigger: notify_on_order_status
--    Fires AFTER UPDATE OF status on public.orders.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
  v_ref   TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_ref := COALESCE(
    NULLIF(BTRIM(NEW.display_id), ''),
    SUBSTRING(NEW.id::TEXT, 1, 8)
  );

  v_title := CASE LOWER(NEW.status)
    WHEN 'pending'    THEN 'Order received'
    WHEN 'processing' THEN 'Order processing'
    WHEN 'shipped'    THEN 'Order shipped'
    WHEN 'delivered'  THEN 'Order delivered'
    WHEN 'cancelled' THEN 'Order cancelled'
    ELSE 'Order update'
  END;

  v_body := CASE LOWER(NEW.status)
    WHEN 'pending'    THEN 'We received order ' || v_ref || ' and will process it shortly.'
    WHEN 'processing' THEN 'Order ' || v_ref || ' is being prepared.'
    WHEN 'shipped'    THEN 'Order ' || v_ref || ' is on its way.'
    WHEN 'delivered'  THEN 'Order ' || v_ref || ' has been delivered. Thank you for shopping with us!'
    WHEN 'cancelled'  THEN 'Order ' || v_ref || ' has been cancelled.'
    ELSE 'Order ' || v_ref || ' status: ' || NEW.status
  END;

  PERFORM public.create_notification(
    NEW.user_id, v_title, v_body, 'order', NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_order_status ON public.orders;
CREATE TRIGGER trg_notify_on_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_status();

-- ------------------------------------------------------------
-- 5. Trigger: notify_on_repair_status
--    Fires AFTER UPDATE OF status on public.repair_requests.
--    Uses `to_jsonb(NEW)->>'display_id'` so we don't break if the
--    table doesn't have a display_id column.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_repair_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
  v_ref   TEXT;
  v_display TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_display := to_jsonb(NEW)->>'display_id';
  v_ref := COALESCE(
    NULLIF(BTRIM(v_display), ''),
    SUBSTRING(NEW.id::TEXT, 1, 8)
  );

  v_title := CASE LOWER(NEW.status)
    WHEN 'pending'        THEN 'Repair request received'
    WHEN 'diagnosing'     THEN 'Diagnosis in progress'
    WHEN 'in_progress'    THEN 'Repair started'
    WHEN 'awaiting_parts' THEN 'Awaiting parts'
    WHEN 'completed'      THEN 'Repair completed'
    WHEN 'cancelled'      THEN 'Repair cancelled'
    ELSE 'Repair update'
  END;

  v_body := CASE LOWER(NEW.status)
    WHEN 'pending'        THEN 'We received your repair request ' || v_ref || '.'
    WHEN 'diagnosing'     THEN 'Our technicians are diagnosing repair ' || v_ref || '.'
    WHEN 'in_progress'    THEN 'Repair ' || v_ref || ' is now in progress.'
    WHEN 'awaiting_parts' THEN 'Repair ' || v_ref || ' is awaiting parts.'
    WHEN 'completed'      THEN 'Repair ' || v_ref || ' is complete and ready for pickup.'
    WHEN 'cancelled'      THEN 'Repair ' || v_ref || ' has been cancelled.'
    ELSE 'Repair ' || v_ref || ' status: ' || NEW.status
  END;

  PERFORM public.create_notification(
    NEW.user_id, v_title, v_body, 'repair', NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_repair_status ON public.repair_requests;
CREATE TRIGGER trg_notify_on_repair_status
  AFTER UPDATE OF status ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_repair_status();

-- ------------------------------------------------------------
-- 6. Trigger: notify_on_trade_status
--    Fires AFTER UPDATE OF status on public.trade_in_requests.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_trade_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
  v_ref   TEXT;
  v_display TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_display := to_jsonb(NEW)->>'display_id';
  v_ref := COALESCE(
    NULLIF(BTRIM(v_display), ''),
    SUBSTRING(NEW.id::TEXT, 1, 8)
  );

  v_title := CASE LOWER(NEW.status)
    WHEN 'submitted'     THEN 'Trade-in received'
    WHEN 'inspecting'    THEN 'Device being inspected'
    WHEN 'offer_made'    THEN 'Trade-in offer ready'
    WHEN 'awaiting_user' THEN 'Awaiting your response'
    WHEN 'accepted'      THEN 'Trade-in accepted'
    WHEN 'completed'     THEN 'Trade-in completed'
    WHEN 'rejected'      THEN 'Trade-in not approved'
    ELSE 'Trade-in update'
  END;

  v_body := CASE LOWER(NEW.status)
    WHEN 'submitted'     THEN 'We received your trade-in request ' || v_ref || '.'
    WHEN 'inspecting'    THEN 'Trade-in ' || v_ref || ' is being inspected.'
    WHEN 'offer_made'    THEN 'An offer has been made for trade-in ' || v_ref || '. Review it in your account.'
    WHEN 'awaiting_user' THEN 'Trade-in ' || v_ref || ' is awaiting your response.'
    WHEN 'accepted'      THEN 'Trade-in ' || v_ref || ' has been accepted.'
    WHEN 'completed'     THEN 'Trade-in ' || v_ref || ' is complete.'
    WHEN 'rejected'      THEN 'Trade-in ' || v_ref || ' was not approved.'
    ELSE 'Trade-in ' || v_ref || ' status: ' || NEW.status
  END;

  PERFORM public.create_notification(
    NEW.user_id, v_title, v_body, 'trade', NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_trade_status ON public.trade_in_requests;
CREATE TRIGGER trg_notify_on_trade_status
  AFTER UPDATE OF status ON public.trade_in_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_trade_status();

COMMIT;
