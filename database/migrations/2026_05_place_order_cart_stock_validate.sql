-- ============================================================
-- Phase 3 (prereq): Cart stock validation for place_order
--
-- Must run BEFORE 2026_05_place_order_rpc.sql (alphabetically:
-- place_order_cart_stock_validate < place_order_rpc).
-- Aggregates duplicate lines (same product + options) then checks
-- stock using the same variant-vs-product rules as
-- fn_order_items_decrement_stock.
--
-- Idempotent: CREATE OR REPLACE FUNCTION.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_place_order_validate_cart_stock(p_cart_items JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_opts JSONB;
  v_pid UUID;
  v_qty INTEGER;
  v_vid UUID;
  v_stock INTEGER;
  v_satisfied BOOLEAN;
BEGIN
  IF p_cart_items IS NULL OR jsonb_typeof(p_cart_items) <> 'array' THEN
    RETURN;
  END IF;

  FOR r IN
    WITH cart AS (
      SELECT
        COALESCE((j->>'quantity')::INTEGER, 1) AS qty,
        COALESCE(j->'product_options', '{}'::JSONB) - 'configuration' AS opts,
        NULLIF(TRIM(j->>'product_id'), '') AS pid_text
      FROM jsonb_array_elements(p_cart_items) AS t(j)
    ),
    resolved AS (
      SELECT
        c.qty,
        c.opts,
        CASE
          WHEN c.pid_text IS NOT NULL
               AND c.pid_text ~ '^[0-9a-fA-F-]{36}$'
            THEN c.pid_text::UUID
          ELSE NULL
        END AS pid
      FROM cart c
    ),
    agg AS (
      SELECT pid, opts, SUM(qty)::INTEGER AS qty
      FROM resolved
      WHERE pid IS NOT NULL
      GROUP BY pid, opts
    )
    SELECT * FROM agg
  LOOP
    v_pid := r.pid;
    v_qty := r.qty;
    v_opts := r.opts;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity in cart.'
        USING ERRCODE = '22023';
    END IF;

    v_vid := NULL;
    v_satisfied := false;

    IF (v_opts ? 'Color') OR (v_opts ? 'Storage') OR (v_opts ? 'RAM') THEN
      SELECT pv.id, COALESCE(pv.stock, 0)
        INTO v_vid, v_stock
        FROM public.product_variants pv
       WHERE pv.product_id::TEXT = v_pid::TEXT
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

      IF v_vid IS NOT NULL THEN
        IF v_stock < v_qty THEN
          RAISE EXCEPTION 'Insufficient stock for the selected product options.'
            USING ERRCODE = 'P0001';
        END IF;
        v_satisfied := true;
      END IF;
    END IF;

    IF NOT v_satisfied THEN
      SELECT COALESCE(p.stock, 0)
        INTO v_stock
        FROM public.products p
       WHERE p.id::TEXT = v_pid::TEXT;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found for cart line.'
          USING ERRCODE = '22023';
      END IF;

      IF v_stock < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for one or more items.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.fn_place_order_validate_cart_stock(JSONB) IS
  'Used by place_order before inserting orders: ensures variant or product stock covers aggregated cart lines.';

COMMIT;
