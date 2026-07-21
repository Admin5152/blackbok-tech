-- Expand trade status emails for under_review + scheduled (used by admin UI).
-- Run after 2026_07_email_notification_triggers.sql / heal migration.

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
    'submitted', 'inspecting', 'under_review', 'offer_made', 'awaiting_user',
    'accepted', 'scheduled', 'completed', 'rejected', 'expired', 'cancelled'
  ) THEN
    RETURN NEW;
  END IF;

  v_title := CASE v_status
    WHEN 'submitted'     THEN 'Trade-in received'
    WHEN 'inspecting'    THEN 'Device being inspected'
    WHEN 'under_review'  THEN 'Trade-in under review'
    WHEN 'offer_made'    THEN 'Trade-in offer ready'
    WHEN 'awaiting_user' THEN 'Awaiting your response'
    WHEN 'accepted'      THEN 'Trade-in accepted'
    WHEN 'scheduled'     THEN 'Trade-in visit scheduled'
    WHEN 'completed'     THEN 'Trade-in completed'
    WHEN 'rejected'      THEN 'Trade-in not approved'
    WHEN 'expired'       THEN 'Trade-in estimate expired'
    WHEN 'cancelled'     THEN 'Trade-in cancelled'
    ELSE 'Trade-in update'
  END;

  v_body := CASE v_status
    WHEN 'submitted'     THEN 'We received your trade-in request ' || v_ref || '.'
    WHEN 'inspecting'    THEN 'Trade-in ' || v_ref || ' is being inspected.'
    WHEN 'under_review'  THEN 'Trade-in ' || v_ref || ' is under review.'
    WHEN 'offer_made'    THEN 'An offer has been made for trade-in ' || v_ref || '. Review it in your account.'
    WHEN 'awaiting_user' THEN 'Trade-in ' || v_ref || ' is awaiting your response.'
    WHEN 'accepted'      THEN 'Trade-in ' || v_ref || ' has been accepted.'
    WHEN 'scheduled'     THEN 'Your trade-in visit for ' || v_ref || ' is scheduled. See tracking for details.'
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
