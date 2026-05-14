-- ============================================================
-- Inventory: decrement on order line insert + trade complete
--
-- 1) order_items trigger: when a line has Color/Storage/RAM in
--    product_options matching a product_variants row, decrement
--    that variant's stock (sync_product_from_variants updates
--    products.stock if present). Otherwise decrement products.stock
--    only (legacy / no SKU rows).
--
-- 2) trade_in_requests: when status becomes Completed, decrement
--    target product stock by 1 once (target_inventory_applied_at).
--
-- Run after: 2026_05_section25_db_backend.sql, 2026_05_trade_in_requests.sql
-- Idempotent: CREATE OR REPLACE functions; ADD COLUMN IF NOT EXISTS.
-- ============================================================
BEGIN;

-- -----------------------------------------------------------------
-- Trade target: one-time flag so we do not double-decrement if
-- status is toggled away and back to Completed.
-- -----------------------------------------------------------------
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS target_inventory_applied_at TIMESTAMPTZ;

COMMENT ON COLUMN public.trade_in_requests.target_inventory_applied_at IS
  'Set when target_product_id stock was decremented on trade completion.';

-- -----------------------------------------------------------------
-- DB-07 (revised): order_items → variant stock or product stock
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_order_items_decrement_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opts JSONB;
  v_hit  INTEGER;
BEGIN
  IF NEW.product_id IS NULL OR NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RETURN NEW;
  END IF;

  v_opts := COALESCE(NEW.product_options, '{}'::JSONB) - 'configuration';

  IF (v_opts ? 'Color') OR (v_opts ? 'Storage') OR (v_opts ? 'RAM') THEN
    WITH cand AS (
      SELECT pv.id
      FROM public.product_variants pv
      WHERE pv.product_id::TEXT = NEW.product_id::TEXT
        AND (
          pv.color IS NOT NULL
          OR pv.storage IS NOT NULL
          OR pv.ram IS NOT NULL
        )
        AND (
          NOT (v_opts ? 'Color')
          OR (
            pv.color IS NOT NULL
            AND lower(btrim(pv.color::TEXT)) = lower(btrim(v_opts->>'Color'))
          )
        )
        AND (
          NOT (v_opts ? 'Storage')
          OR (
            pv.storage IS NOT NULL
            AND lower(btrim(pv.storage::TEXT)) = lower(btrim(v_opts->>'Storage'))
          )
        )
        AND (
          NOT (v_opts ? 'RAM')
          OR (
            pv.ram IS NOT NULL
            AND lower(btrim(pv.ram::TEXT)) = lower(btrim(v_opts->>'RAM'))
          )
        )
      ORDER BY pv.id
      LIMIT 1
    )
    UPDATE public.product_variants pv
       SET stock = GREATEST(0, COALESCE(pv.stock, 0) - NEW.quantity::INTEGER)
      FROM cand
     WHERE pv.id = cand.id;

    GET DIAGNOSTICS v_hit = ROW_COUNT;
    IF v_hit > 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  UPDATE public.products p
     SET stock = GREATEST(0, COALESCE(p.stock, 0) - NEW.quantity::INTEGER)
   WHERE p.id::TEXT = NEW.product_id::TEXT;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------
-- Trade-in completed → reduce target catalog product by 1
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_trade_target_inventory_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid UUID;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.target_inventory_applied_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF lower(btrim(COALESCE(NEW.status, ''))) <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF lower(btrim(COALESCE(OLD.status, ''))) = 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.target_product_id IS NULL OR btrim(NEW.target_product_id) = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_pid := btrim(NEW.target_product_id)::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NEW;
  END;

  UPDATE public.products p
     SET stock = GREATEST(0, COALESCE(p.stock, 0) - 1)
   WHERE p.id = v_pid;

  NEW.target_inventory_applied_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_target_inventory_on_complete ON public.trade_in_requests;
CREATE TRIGGER trg_trade_target_inventory_on_complete
  BEFORE UPDATE OF status ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trade_target_inventory_on_complete();

COMMIT;
