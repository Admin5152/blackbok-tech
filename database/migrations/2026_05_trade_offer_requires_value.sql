-- ============================================================
-- 2026_05_trade_offer_requires_value.sql
-- Block offer_made / awaiting_user without a positive offer amount.
-- Idempotent.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_trade_require_offer_for_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
  v_amount NUMERIC;
BEGIN
  v_status := LOWER(COALESCE(NEW.status, ''));
  IF v_status NOT IN ('offer_made', 'awaiting_user') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND LOWER(COALESCE(OLD.status, '')) = v_status THEN
    RETURN NEW;
  END IF;

  v_amount := GREATEST(
    COALESCE(NEW.final_value, 0),
    COALESCE(NEW.offered_price, 0)
  );

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Trade-in offer requires a positive offer value before status can be set to offer sent.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_require_offer_status ON public.trade_in_requests;
CREATE TRIGGER trg_trade_require_offer_status
  BEFORE INSERT OR UPDATE OF status, final_value, offered_price
  ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trade_require_offer_for_status();

COMMIT;
