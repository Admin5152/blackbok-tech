-- ============================================================
-- Phase 4: Authoritative inventory + optional trade SKU
--
-- A) order_items: decrement only when stock >= quantity; otherwise
--    RAISE (prevents silent clamp-to-zero oversell vs concurrent carts).
-- B) trade_in_requests: optional target_variant_id (UUID). When set and
--    valid for target_product_id, completion decrements that variant
--    (sync_product_stock_from_variants updates products.stock). Else
--    legacy products.stock decrement by 1.
-- C) Customer write guard: block non-staff from changing
--    target_variant_id after it is set.
--
-- Run after: 2026_05_inventory_decrement_orders_and_trades.sql,
--            2026_05_trade_customer_guard_and_rls.sql,
--            gapfillmitigation (product_variants + sync trigger).
-- Idempotent.
-- ============================================================
BEGIN;

-- -----------------------------------------------------------------
-- B) Optional staff column for trade target SKU
-- -----------------------------------------------------------------
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS target_variant_id UUID;

COMMENT ON COLUMN public.trade_in_requests.target_variant_id IS
  'When staff sets this to a product_variants.id for target_product_id, completing the trade decrements variant stock (and aggregate product stock via sync).';

-- -----------------------------------------------------------------
-- A) order_items → strict decrement (matches place_order pre-check)
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
  v_cand UUID;
BEGIN
  IF NEW.product_id IS NULL OR NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RETURN NEW;
  END IF;

  v_opts := COALESCE(NEW.product_options, '{}'::JSONB) - 'configuration';

  IF (v_opts ? 'Color') OR (v_opts ? 'Storage') OR (v_opts ? 'RAM') THEN
    SELECT pv.id
      INTO v_cand
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
     LIMIT 1;

    IF v_cand IS NOT NULL THEN
      UPDATE public.product_variants pv
         SET stock = COALESCE(pv.stock, 0) - NEW.quantity::INTEGER
       WHERE pv.id = v_cand
         AND COALESCE(pv.stock, 0) >= NEW.quantity::INTEGER;

      GET DIAGNOSTICS v_hit = ROW_COUNT;
      IF v_hit > 0 THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'Insufficient stock for the selected product options.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.products p
     SET stock = COALESCE(p.stock, 0) - NEW.quantity::INTEGER
   WHERE p.id::TEXT = NEW.product_id::TEXT
     AND COALESCE(p.stock, 0) >= NEW.quantity::INTEGER;

  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit = 0 THEN
    RAISE EXCEPTION 'Insufficient stock for this product.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------
-- B+C) Trade completion + customer guard (variant lock)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_trade_target_inventory_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid UUID;
  v_hit INTEGER;
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

  IF NEW.target_variant_id IS NOT NULL THEN
    UPDATE public.product_variants pv
       SET stock = COALESCE(pv.stock, 0) - 1
     WHERE pv.id = NEW.target_variant_id
       AND pv.product_id = v_pid
       AND COALESCE(pv.stock, 0) >= 1;

    GET DIAGNOSTICS v_hit = ROW_COUNT;
    IF v_hit = 0 THEN
      RAISE EXCEPTION 'Cannot complete trade: target variant is out of stock or does not match the target product.'
        USING ERRCODE = 'P0001';
    END IF;

    NEW.target_inventory_applied_at := NOW();
    RETURN NEW;
  END IF;

  UPDATE public.products p
     SET stock = COALESCE(p.stock, 0) - 1
   WHERE p.id = v_pid
     AND COALESCE(p.stock, 0) >= 1;

  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit = 0 THEN
    RAISE EXCEPTION 'Cannot complete trade: target product is out of stock.'
      USING ERRCODE = 'P0001';
  END IF;

  NEW.target_inventory_applied_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_trade_in_requests_customer_write_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff BOOLEAN;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id = auth.uid()
       AND lower(coalesce(p.role::text, '')) IN ('admin', 'staff')
  )
  OR EXISTS (
    SELECT 1
      FROM public.user_roles ur
     WHERE ur.user_id = auth.uid()
       AND lower(ur.role::text) IN ('admin', 'staff')
  )
  INTO v_staff;

  IF COALESCE(v_staff, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  IF lower(btrim(coalesce(NEW.status, ''))) = 'completed' THEN
    RAISE EXCEPTION 'Only staff can mark a trade as completed.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.target_product_id IS NOT NULL
     AND NEW.target_product_id IS DISTINCT FROM OLD.target_product_id THEN
    RAISE EXCEPTION 'Trade target product cannot be changed.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.target_variant_id IS NOT NULL
     AND NEW.target_variant_id IS DISTINCT FROM OLD.target_variant_id THEN
    RAISE EXCEPTION 'Trade target variant cannot be changed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
