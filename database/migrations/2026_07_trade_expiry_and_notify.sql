-- BlackBox — Trade expiry sweep + ops config keys + INSERT notify for submitted
--
-- Idempotent. Complements Edge Function trade-expiry-sweep.
-- Acceptance: UPDATE a row's expires_at into the past, CALL fn_trade_expiry_sweep(),
-- expect status='expired' and a count return.

BEGIN;

-- ─── Ops config keys (SLA / validity already seeded elsewhere) ─────────────
INSERT INTO public.trade_config (key, value, description)
VALUES
  (
    'store_location',
    'Visit us in store — ask staff for the trade-in desk.',
    'Customer-facing drop-off / store location card on trade Details'
  ),
  (
    'notification_channel',
    'in_app',
    'Outbound channel preference: in_app | sms | whatsapp | email (provider TODO)'
  )
ON CONFLICT (key) DO NOTHING;

-- ─── Expiry sweep RPC (service role / Edge Function) ───────────────────────
CREATE OR REPLACE FUNCTION public.fn_trade_expiry_sweep()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Pre-offer only — never expire offer_made / awaiting_user / accepted / …
  WITH updated AS (
    UPDATE public.trade_in_requests t
       SET status = 'expired',
           updated_at = NOW()
     WHERE t.expires_at IS NOT NULL
       AND t.expires_at < NOW()
       AND lower(btrim(t.status::text)) IN (
         'submitted', 'inspecting', 'under_review', 'pending'
       )
    RETURNING t.id
  )
  SELECT COUNT(*)::INTEGER INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.fn_trade_expiry_sweep() IS
  'Idempotent daily sweep: expire pre-offer trades past expires_at. Returns rows flipped.';

REVOKE ALL ON FUNCTION public.fn_trade_expiry_sweep() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_trade_expiry_sweep() TO service_role;

-- ─── Also notify on INSERT when status is submitted ────────────────────────
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

  -- Lifecycle focus: submitted, offer_made/awaiting_user, completed (+ useful extras)
  IF v_status NOT IN (
    'submitted', 'inspecting', 'offer_made', 'awaiting_user',
    'accepted', 'completed', 'rejected', 'expired'
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
