-- ============================================================
-- Notification triggers → power Resend webhook fan-out
-- - Orders: INSERT + status updates (pickup-aware shipped copy)
-- - Repairs: INSERT + modern status codes
-- - Trades: include cancelled
-- ============================================================
BEGIN;

-- Orders: notify on insert (placed) and status change
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
  v_status TEXT;
  v_ship TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_ref := COALESCE(
    NULLIF(BTRIM(NEW.display_id), ''),
    SUBSTRING(NEW.id::TEXT, 1, 8)
  );
  v_status := lower(btrim(COALESCE(NEW.status::text, '')));
  v_ship := lower(btrim(COALESCE(NEW.shipping_method::text, '')));

  v_title := CASE v_status
    WHEN 'pending'    THEN 'Order received'
    WHEN 'processing' THEN 'Order processing'
    WHEN 'shipped'    THEN CASE
      WHEN v_ship LIKE '%pick%' THEN 'Order ready for pickup'
      ELSE 'Order shipped'
    END
    WHEN 'delivered'  THEN CASE
      WHEN v_ship LIKE '%pick%' THEN 'Order picked up'
      ELSE 'Order delivered'
    END
    WHEN 'cancelled'  THEN 'Order cancelled'
    WHEN 'refunded'   THEN 'Order refunded'
    ELSE 'Order update'
  END;

  v_body := CASE v_status
    WHEN 'pending'    THEN 'We received order ' || v_ref || ' and will process it shortly.'
    WHEN 'processing' THEN 'Order ' || v_ref || ' is being prepared.'
    WHEN 'shipped'    THEN CASE
      WHEN v_ship LIKE '%pick%' THEN 'Order ' || v_ref || ' is ready for pickup at BlackBox HQ.'
      ELSE 'Order ' || v_ref || ' is on its way.'
    END
    WHEN 'delivered'  THEN CASE
      WHEN v_ship LIKE '%pick%' THEN 'Order ' || v_ref || ' has been picked up. Thank you!'
      ELSE 'Order ' || v_ref || ' has been delivered. Thank you for shopping with us!'
    END
    WHEN 'cancelled'  THEN 'Order ' || v_ref || ' has been cancelled.'
    WHEN 'refunded'   THEN 'Order ' || v_ref || ' has been refunded.'
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
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_status();

-- Repairs: insert + status (include app status strings)
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
  v_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
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
  v_status := lower(btrim(COALESCE(NEW.status::text, '')));

  v_title := CASE v_status
    WHEN 'pending'        THEN 'Repair request received'
    WHEN 'received'       THEN 'Repair request received'
    WHEN 'diagnosing'     THEN 'Diagnosis in progress'
    WHEN 'estimate_sent'  THEN 'Repair quote ready'
    WHEN 'in_progress'    THEN 'Repair started'
    WHEN 'in_repair'      THEN 'Repair started'
    WHEN 'awaiting_parts' THEN 'Awaiting parts'
    WHEN 'ready'          THEN 'Repair ready for pickup'
    WHEN 'completed'      THEN 'Repair completed'
    WHEN 'cancelled'      THEN 'Repair cancelled'
    WHEN 'rejected'       THEN 'Repair request closed'
    ELSE 'Repair update'
  END;

  v_body := CASE v_status
    WHEN 'pending'        THEN 'We received your repair request ' || v_ref || '.'
    WHEN 'received'       THEN 'We received your repair request ' || v_ref || '.'
    WHEN 'diagnosing'     THEN 'Our technicians are diagnosing repair ' || v_ref || '.'
    WHEN 'estimate_sent'  THEN 'A repair quote is ready for ' || v_ref || '. Review it in your account.'
    WHEN 'in_progress'    THEN 'Repair ' || v_ref || ' is now in progress.'
    WHEN 'in_repair'      THEN 'Repair ' || v_ref || ' is now in progress.'
    WHEN 'awaiting_parts' THEN 'Repair ' || v_ref || ' is awaiting parts.'
    WHEN 'ready'          THEN 'Repair ' || v_ref || ' is ready for pickup.'
    WHEN 'completed'      THEN 'Repair ' || v_ref || ' is complete. Thank you!'
    WHEN 'cancelled'      THEN 'Repair ' || v_ref || ' has been cancelled.'
    WHEN 'rejected'       THEN 'Repair ' || v_ref || ' was closed.'
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
  AFTER INSERT OR UPDATE OF status ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_repair_status();

-- Trades: add cancelled to allowlist (keeps INSERT OR UPDATE from expiry migration)
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
  v_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
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
  v_status := lower(btrim(COALESCE(NEW.status::text, '')));

  IF v_status NOT IN (
    'submitted', 'inspecting', 'offer_made', 'awaiting_user',
    'accepted', 'completed', 'rejected', 'expired', 'cancelled'
  ) THEN
    RETURN NEW;
  END IF;

  v_title := CASE v_status
    WHEN 'submitted'     THEN 'Trade-in received'
    WHEN 'inspecting'    THEN 'Device being inspected'
    WHEN 'offer_made'    THEN 'Trade-in offer ready'
    WHEN 'awaiting_user' THEN 'Awaiting your response'
    WHEN 'accepted'      THEN 'Trade-in accepted'
    WHEN 'completed'     THEN 'Trade-in completed'
    WHEN 'rejected'      THEN 'Trade-in not approved'
    WHEN 'expired'       THEN 'Trade-in estimate expired'
    WHEN 'cancelled'     THEN 'Trade-in cancelled'
    ELSE 'Trade-in update'
  END;

  v_body := CASE v_status
    WHEN 'submitted'     THEN 'We received your trade-in request ' || v_ref || '.'
    WHEN 'inspecting'    THEN 'Trade-in ' || v_ref || ' is being inspected.'
    WHEN 'offer_made'    THEN 'An offer has been made for trade-in ' || v_ref || '. Review it in your account.'
    WHEN 'awaiting_user' THEN 'Trade-in ' || v_ref || ' is awaiting your response.'
    WHEN 'accepted'      THEN 'Trade-in ' || v_ref || ' has been accepted.'
    WHEN 'completed'     THEN 'Trade-in ' || v_ref || ' is complete.'
    WHEN 'rejected'      THEN 'Trade-in ' || v_ref || ' was not approved.'
    WHEN 'expired'       THEN 'Your estimate for ' || v_ref || ' has expired. Start a new trade-in anytime.'
    WHEN 'cancelled'     THEN 'Trade-in ' || v_ref || ' has been cancelled.'
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
  AFTER INSERT OR UPDATE OF status ON public.trade_in_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_trade_status();

COMMIT;
