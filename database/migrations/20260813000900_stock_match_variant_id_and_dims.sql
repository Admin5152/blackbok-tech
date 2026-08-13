-- =====================================================================
-- Stock authority: prefer variant_id + match SIM / Size / Edition
-- Migration: 20260813000900_stock_match_variant_id_and_dims.sql
--
-- Gaps fixed:
-- 1) Cart may send variant_id — use it first for validate + decrement
-- 2) Option matching previously only Color/Storage/RAM — now also
--    SIM / Connectivity, Size / Display size, Edition
-- 3) When product has any SKU rows and options/variant don't match,
--    do NOT fall back to products.stock (prevents Blue selling Black qty)
--
-- Idempotent CREATE OR REPLACE of the two stock functions.
-- =====================================================================

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

-- Helper: pick option text by any of several UI keys
CREATE OR REPLACE FUNCTION public.fn_opt_text(p_opts JSONB, VARIADIC p_keys TEXT[])
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k TEXT;
  v TEXT;
BEGIN
  IF p_opts IS NULL OR jsonb_typeof(p_opts) <> 'object' THEN
    RETURN NULL;
  END IF;
  FOREACH k IN ARRAY p_keys
  LOOP
    IF p_opts ? k THEN
      v := NULLIF(btrim(p_opts->>k), '');
      IF v IS NOT NULL THEN
        RETURN v;
      END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

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
  v_has_skus BOOLEAN;
  v_color TEXT;
  v_storage TEXT;
  v_ram TEXT;
  v_sim TEXT;
  v_size TEXT;
  v_edition TEXT;
BEGIN
  IF p_cart_items IS NULL OR jsonb_typeof(p_cart_items) <> 'array' THEN
    RETURN;
  END IF;

  FOR r IN
    WITH cart AS (
      SELECT
        COALESCE((j->>'quantity')::INTEGER, 1) AS qty,
        public.fn_jsonb_product_opts_for_stock(j->'product_options') AS opts,
        NULLIF(TRIM(j->>'product_id'), '') AS pid_text,
        NULLIF(TRIM(j->>'variant_id'), '') AS vid_text
      FROM jsonb_array_elements(p_cart_items) AS t(j)
    ),
    resolved AS (
      SELECT
        c.qty,
        c.opts,
        CASE
          WHEN c.pid_text IS NOT NULL AND c.pid_text ~ '^[0-9a-fA-F-]{36}$'
            THEN c.pid_text::UUID
          ELSE NULL
        END AS pid,
        CASE
          WHEN c.vid_text IS NOT NULL AND c.vid_text ~ '^[0-9a-fA-F-]{36}$'
            THEN c.vid_text::UUID
          ELSE NULL
        END AS vid
      FROM cart c
    ),
    agg AS (
      SELECT pid, opts, vid, SUM(qty)::INTEGER AS qty
      FROM resolved
      WHERE pid IS NOT NULL
      GROUP BY pid, opts, vid
    )
    SELECT * FROM agg
  LOOP
    v_pid := r.pid;
    v_qty := r.qty;
    v_opts := r.opts;
    v_vid := r.vid;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity in cart.'
        USING ERRCODE = '22023';
    END IF;

    v_satisfied := false;

    SELECT EXISTS (
      SELECT 1 FROM public.product_variants pv WHERE pv.product_id = v_pid
    ) INTO v_has_skus;

    -- 1) Exact variant_id from cart
    IF v_vid IS NOT NULL THEN
      SELECT COALESCE(pv.stock, 0)
        INTO v_stock
        FROM public.product_variants pv
       WHERE pv.id = v_vid
         AND pv.product_id = v_pid;

      IF FOUND THEN
        IF v_stock < v_qty THEN
          RAISE EXCEPTION 'Insufficient stock for the selected product options.'
            USING ERRCODE = 'P0001';
        END IF;
        v_satisfied := true;
      END IF;
    END IF;

    -- 2) Match by option dimensions (Color / Storage / RAM / SIM / Size / Edition)
    IF NOT v_satisfied THEN
      v_color := public.fn_opt_text(v_opts, VARIADIC ARRAY['Color', 'color']);
      v_storage := public.fn_opt_text(v_opts, VARIADIC ARRAY['Storage', 'storage']);
      v_ram := public.fn_opt_text(v_opts, VARIADIC ARRAY['RAM', 'ram']);
      v_sim := public.fn_opt_text(
        v_opts,
        VARIADIC ARRAY['SIM', 'Sim', 'sim', 'SIM type', 'sim_type', 'Connectivity', 'connectivity']
      );
      v_size := public.fn_opt_text(
        v_opts,
        VARIADIC ARRAY['Size', 'size', 'Display size', 'display_size', 'Display Size']
      );
      v_edition := public.fn_opt_text(v_opts, VARIADIC ARRAY['Edition', 'edition']);

      IF v_color IS NOT NULL OR v_storage IS NOT NULL OR v_ram IS NOT NULL
         OR v_sim IS NOT NULL OR v_size IS NOT NULL OR v_edition IS NOT NULL THEN
        SELECT pv.id, COALESCE(pv.stock, 0)
          INTO v_vid, v_stock
          FROM public.product_variants pv
         WHERE pv.product_id = v_pid
           AND (v_color IS NULL OR (
             pv.color IS NOT NULL AND lower(btrim(pv.color::TEXT)) = lower(v_color)
           ))
           AND (v_storage IS NULL OR (
             pv.storage IS NOT NULL AND lower(btrim(pv.storage::TEXT)) = lower(v_storage)
           ))
           AND (v_ram IS NULL OR (
             pv.ram IS NOT NULL AND lower(btrim(pv.ram::TEXT)) = lower(v_ram)
           ))
           AND (v_sim IS NULL OR (
             pv.sim_type IS NOT NULL AND lower(btrim(pv.sim_type::TEXT)) = lower(v_sim)
           ))
           AND (v_size IS NULL OR (
             pv.display_size IS NOT NULL
             AND lower(regexp_replace(btrim(pv.display_size::TEXT), '[''"`′″\s]', '', 'g'))
               = lower(regexp_replace(v_size, '[''"`′″\s]', '', 'g'))
           ))
           AND (v_edition IS NULL OR (
             pv.edition IS NOT NULL AND lower(btrim(pv.edition::TEXT)) = lower(v_edition)
           ))
         ORDER BY pv.id
         LIMIT 1;

        IF v_vid IS NOT NULL THEN
          IF v_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for the selected product options.'
              USING ERRCODE = 'P0001';
          END IF;
          v_satisfied := true;
        ELSIF v_has_skus THEN
          RAISE EXCEPTION 'Selected product options do not match any stocked version.'
            USING ERRCODE = 'P0001';
        END IF;
      ELSIF v_has_skus THEN
        -- Options empty but SKUs exist — require a variant_id
        RAISE EXCEPTION 'Select a product version (color / storage) before checkout.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

    -- 3) Family stock only when product has no SKU rows
    IF NOT v_satisfied THEN
      IF v_has_skus THEN
        RAISE EXCEPTION 'Insufficient stock for the selected product options.'
          USING ERRCODE = 'P0001';
      END IF;

      SELECT COALESCE(p.stock, 0)
        INTO v_stock
        FROM public.products p
       WHERE p.id = v_pid;

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
  'Validates cart qty against product_variants (variant_id first, then full dims). No family-stock fallback when SKUs exist.';

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
  v_has_skus BOOLEAN;
  v_color TEXT;
  v_storage TEXT;
  v_ram TEXT;
  v_sim TEXT;
  v_size TEXT;
  v_edition TEXT;
  v_vid UUID;
BEGIN
  IF NEW.product_id IS NULL OR NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RETURN NEW;
  END IF;

  v_opts := public.fn_jsonb_product_opts_for_stock(NEW.product_options);

  SELECT EXISTS (
    SELECT 1 FROM public.product_variants pv WHERE pv.product_id = NEW.product_id
  ) INTO v_has_skus;

  -- Prefer order_items.variant_id when column + value exist
  BEGIN
    v_vid := NULL;
    IF to_jsonb(NEW) ? 'variant_id' THEN
      v_vid := NULLIF(btrim(to_jsonb(NEW)->>'variant_id'), '')::UUID;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_vid := NULL;
  END;

  IF v_vid IS NOT NULL THEN
    UPDATE public.product_variants pv
       SET stock = COALESCE(pv.stock, 0) - NEW.quantity::INTEGER
     WHERE pv.id = v_vid
       AND pv.product_id = NEW.product_id
       AND COALESCE(pv.stock, 0) >= NEW.quantity::INTEGER;
    GET DIAGNOSTICS v_hit = ROW_COUNT;
    IF v_hit > 0 THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Insufficient stock for the selected product options.'
      USING ERRCODE = 'P0001';
  END IF;

  v_color := public.fn_opt_text(v_opts, VARIADIC ARRAY['Color', 'color']);
  v_storage := public.fn_opt_text(v_opts, VARIADIC ARRAY['Storage', 'storage']);
  v_ram := public.fn_opt_text(v_opts, VARIADIC ARRAY['RAM', 'ram']);
  v_sim := public.fn_opt_text(
    v_opts,
    VARIADIC ARRAY['SIM', 'Sim', 'sim', 'SIM type', 'sim_type', 'Connectivity', 'connectivity']
  );
  v_size := public.fn_opt_text(
    v_opts,
    VARIADIC ARRAY['Size', 'size', 'Display size', 'display_size', 'Display Size']
  );
  v_edition := public.fn_opt_text(v_opts, VARIADIC ARRAY['Edition', 'edition']);

  IF v_color IS NOT NULL OR v_storage IS NOT NULL OR v_ram IS NOT NULL
     OR v_sim IS NOT NULL OR v_size IS NOT NULL OR v_edition IS NOT NULL THEN
    SELECT pv.id
      INTO v_cand
      FROM public.product_variants pv
     WHERE pv.product_id = NEW.product_id
       AND (v_color IS NULL OR (
         pv.color IS NOT NULL AND lower(btrim(pv.color::TEXT)) = lower(v_color)
       ))
       AND (v_storage IS NULL OR (
         pv.storage IS NOT NULL AND lower(btrim(pv.storage::TEXT)) = lower(v_storage)
       ))
       AND (v_ram IS NULL OR (
         pv.ram IS NOT NULL AND lower(btrim(pv.ram::TEXT)) = lower(v_ram)
       ))
       AND (v_sim IS NULL OR (
         pv.sim_type IS NOT NULL AND lower(btrim(pv.sim_type::TEXT)) = lower(v_sim)
       ))
       AND (v_size IS NULL OR (
         pv.display_size IS NOT NULL
         AND lower(regexp_replace(btrim(pv.display_size::TEXT), '[''"`′″\s]', '', 'g'))
           = lower(regexp_replace(v_size, '[''"`′″\s]', '', 'g'))
       ))
       AND (v_edition IS NULL OR (
         pv.edition IS NOT NULL AND lower(btrim(pv.edition::TEXT)) = lower(v_edition)
       ))
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
    ELSIF v_has_skus THEN
      RAISE EXCEPTION 'Selected product options do not match any stocked version.'
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_has_skus THEN
    RAISE EXCEPTION 'Select a product version (color / storage) before checkout.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Family stock only when no SKU matrix
  IF v_has_skus THEN
    RAISE EXCEPTION 'Insufficient stock for the selected product options.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.products p
     SET stock = COALESCE(p.stock, 0) - NEW.quantity::INTEGER
   WHERE p.id = NEW.product_id
     AND COALESCE(p.stock, 0) >= NEW.quantity::INTEGER;

  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit = 0 THEN
    RAISE EXCEPTION 'Insufficient stock for this product.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
