-- ============================================================
-- Fix: "cannot delete from scalar" at checkout
--
-- Cart lines without variant options send product_options: null in JSON.
-- JSON null is not SQL NULL, so COALESCE(..., '{}') stayed null and
--   (opts - 'configuration') failed.
--
-- Use fn_jsonb_product_opts_for_stock() everywhere we strip `configuration`.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_jsonb_product_opts_for_stock(p_opts JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_opts IS NULL OR jsonb_typeof(p_opts) <> 'object' THEN '{}'::JSONB
    ELSE p_opts - 'configuration'
  END;
$$;

COMMENT ON FUNCTION public.fn_jsonb_product_opts_for_stock(JSONB) IS
  'Returns product_options as a JSON object without the configuration summary key; safe for json null / scalars.';

-- -----------------------------------------------------------------
-- place_order cart stock validation
-- -----------------------------------------------------------------
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
        public.fn_jsonb_product_opts_for_stock(j->'product_options') AS opts,
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

-- -----------------------------------------------------------------
-- order_items stock decrement trigger
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

  v_opts := public.fn_jsonb_product_opts_for_stock(NEW.product_options);

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

COMMIT;
