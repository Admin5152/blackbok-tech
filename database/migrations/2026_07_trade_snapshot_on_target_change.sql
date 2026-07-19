-- BlackBox — Re-snapshot target price + top-up when staff switches target SKU
--
-- WHY: Completion may fail OOS (D11 — no reservation). Staff restocks or switches
-- target_variant_id / target_product_id; money must stay server-derived.
-- Existing trg_trade_snapshot_target_price was INSERT-only.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_trade_snapshot_target_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  -- Cash-only (no target) → clear price/top-up so UI does not show stale top-up
  IF NEW.target_variant_id IS NULL AND NEW.target_product_id IS NULL THEN
    IF TG_OP = 'UPDATE'
       AND (
         NEW.target_variant_id IS DISTINCT FROM OLD.target_variant_id
         OR NEW.target_product_id IS DISTINCT FROM OLD.target_product_id
       ) THEN
      NEW.target_product_price := NULL;
      NEW.top_up_amount := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.target_variant_id IS NOT DISTINCT FROM OLD.target_variant_id
     AND NEW.target_product_id IS NOT DISTINCT FROM OLD.target_product_id THEN
    RETURN NEW;
  END IF;

  IF NEW.target_variant_id IS NOT NULL THEN
    SELECT COALESCE(pv.price, p.price + COALESCE(pv.price_modifier, 0))
      INTO v_price
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
     WHERE pv.id = NEW.target_variant_id;
  ELSIF NEW.target_product_id IS NOT NULL THEN
    SELECT p.price INTO v_price
      FROM public.products p
     WHERE p.id = NEW.target_product_id;
  END IF;

  IF v_price IS NOT NULL THEN
    NEW.target_product_price := v_price;
    IF NEW.estimated_value IS NOT NULL THEN
      NEW.top_up_amount := GREATEST(v_price - NEW.estimated_value, 0);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_snapshot_target_price ON public.trade_in_requests;
CREATE TRIGGER trg_trade_snapshot_target_price
  BEFORE INSERT OR UPDATE OF target_variant_id, target_product_id
  ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trade_snapshot_target_price();

COMMENT ON FUNCTION public.fn_trade_snapshot_target_price() IS
  'Server-side target price + top-up on insert and when staff switches target SKU.';

COMMIT;
