-- =====================================================================
-- BlackBox Ghana — iPad retail support on generic products/variants
-- Migration: 20260803000100_ipad_retail_display_size_and_rpcs.sql
--
-- 1. product_variants.display_size (nullable for phones; set for iPads)
-- 2. Rebuild uq_variant_combo to include display_size
-- 3. get_ipad_availability / resolve_ipad_variant RPCs
-- 4. Price-change audit via existing audit_log
--
-- Conventions (products.specifications jsonb for iPad catalogue rows):
--   catalog: 'ipad'
--   model_family: spreadsheet model_slug (e.g. ipad-pro-8-m5)
--   series: pro | air | mini | standard
--   series_name, chip, generation_label, release_year
-- Connectivity maps to product_variants.sim_type: wifi | cell_ps | cell_es
-- Condition: products.condition new | preowned (customer copy: Brand new / Used)
-- Idempotent.
-- =====================================================================

BEGIN;

-- ---- display_size axis ----
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS display_size TEXT;

COMMENT ON COLUMN public.product_variants.display_size IS
  'Screen size label for tablets (e.g. 11", 13"). NULL/empty for phones. Part of the iPad price key with sim_type + storage; colour is outside the price key when prices match.';

DROP INDEX IF EXISTS public.uq_variant_combo;
CREATE UNIQUE INDEX uq_variant_combo ON public.product_variants
  (product_id,
   COALESCE(display_size, ''),
   COALESCE(color, ''),
   COALESCE(storage, ''),
   COALESCE(ram, ''),
   COALESCE(sim_type, ''));

CREATE INDEX IF NOT EXISTS idx_product_variants_product_active
  ON public.product_variants (product_id, is_active);

CREATE INDEX IF NOT EXISTS idx_product_variants_ipad_filter
  ON public.product_variants (product_id, display_size, sim_type, storage)
  WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_products_ipad_model_family
  ON public.products ((specifications->>'model_family'))
  WHERE category = 'iPad';

-- ---- Price audit (reuse audit_log) ----
CREATE OR REPLACE FUNCTION public.fn_audit_product_variant_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.price IS DISTINCT FROM OLD.price THEN
    PERFORM public.fn_audit_log_row(
      'price_update',
      'product_variants',
      NEW.id::TEXT,
      jsonb_build_object('price', OLD.price, 'sku', OLD.sku),
      jsonb_build_object('price', NEW.price, 'sku', NEW.sku)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_product_variant_price ON public.product_variants;
CREATE TRIGGER trg_audit_product_variant_price
  AFTER UPDATE OF price ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_product_variant_price();

-- ---- Availability matrix (one round-trip for PDP) ----
CREATE OR REPLACE FUNCTION public.get_ipad_availability(p_model_family text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family text := lower(btrim(COALESCE(p_model_family, '')));
  v_result jsonb;
BEGIN
  IF v_family = '' THEN
    RETURN jsonb_build_object('model_family', p_model_family, 'products', '[]'::jsonb, 'combos', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'model_family', v_family,
    'products', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', p.id,
        'slug', p.slug,
        'name', p.name,
        'condition', p.condition,
        'series', p.specifications->>'series',
        'series_name', p.specifications->>'series_name',
        'chip', p.specifications->>'chip',
        'image_url', p.image_url,
        'price_from', (
          SELECT MIN(pv.price)
            FROM public.product_variants pv
           WHERE pv.product_id = p.id AND pv.is_active AND pv.price > 0
        )
      ) ORDER BY CASE p.condition WHEN 'new' THEN 0 WHEN 'preowned' THEN 1 ELSE 2 END)
      FROM public.products p
      WHERE p.category = 'iPad'
        AND p.status = 'active'
        AND lower(btrim(COALESCE(p.specifications->>'model_family', ''))) = v_family
    ), '[]'::jsonb),
    'combos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', p.id,
        'condition', p.condition,
        'variant_id', pv.id,
        'sku', pv.sku,
        'display_size', pv.display_size,
        'sim_type', pv.sim_type,
        'connectivity', CASE
          WHEN pv.sim_type = 'wifi' THEN 'wifi'
          WHEN pv.sim_type IN ('cell_ps', 'cell_es') THEN 'cellular'
          ELSE pv.sim_type
        END,
        'storage', pv.storage,
        'color', pv.color,
        'price_pesewas', ROUND(COALESCE(pv.price, 0) * 100)::bigint,
        'price_ghs', COALESCE(pv.price, 0),
        'stock_qty', COALESCE(pv.stock, 0),
        'status', CASE
          WHEN NOT COALESCE(pv.is_active, false) THEN 'not_stocked'
          WHEN COALESCE(pv.stock, 0) <= 0 THEN 'out_of_stock'
          ELSE COALESCE(pv.attributes->>'status', 'active')
        END,
        'hex', pv.attributes->>'hex',
        'color_slug', pv.attributes->>'color_slug',
        'image_url', COALESCE(pv.image_url, p.image_url),
        'display_name', p.name
      ) ORDER BY
        p.condition,
        pv.display_size NULLS LAST,
        pv.sim_type,
        pv.storage,
        pv.color
      )
      FROM public.products p
      JOIN public.product_variants pv ON pv.product_id = p.id
      WHERE p.category = 'iPad'
        AND p.status = 'active'
        AND lower(btrim(COALESCE(p.specifications->>'model_family', ''))) = v_family
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ipad_availability(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_ipad_availability(text) IS
  'iPad PDP: one-shot availability matrix for a model_family (specifications.model_family). Drives Size→Connectivity→Storage→Condition→Colour without per-click RPCs.';

-- ---- Single-SKU resolver ----
CREATE OR REPLACE FUNCTION public.resolve_ipad_variant(
  p_model_family text,
  p_size text,
  p_connectivity text,
  p_storage text,
  p_condition text,
  p_color text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family text := lower(btrim(COALESCE(p_model_family, '')));
  v_size text := btrim(COALESCE(p_size, ''));
  v_conn text := lower(btrim(COALESCE(p_connectivity, '')));
  v_storage text := btrim(COALESCE(p_storage, ''));
  v_cond text := lower(btrim(COALESCE(p_condition, '')));
  v_color text := btrim(COALESCE(p_color, ''));
  v_sim text;
  v_db_cond text;
  v_row record;
  v_colours jsonb;
BEGIN
  IF v_family = '' OR v_size = '' OR v_conn = '' OR v_storage = '' OR v_cond = '' THEN
    RETURN jsonb_build_object('error', 'missing_axes');
  END IF;

  -- Accept wifi|cellular|cell_ps|cell_es
  v_sim := CASE
    WHEN v_conn IN ('wifi', 'wi-fi') THEN 'wifi'
    WHEN v_conn IN ('cellular', 'cell', 'cell_ps') THEN 'cell_ps'
    WHEN v_conn IN ('cell_es', 'cellular_esim') THEN 'cell_es'
    ELSE v_conn
  END;

  v_db_cond := CASE
    WHEN v_cond IN ('used', 'preowned', 'pre-owned') THEN 'preowned'
    ELSE 'new'
  END;

  -- Normalize size: allow 11 or 11"
  IF right(v_size, 1) <> '"' AND v_size ~ '^[0-9]+(\.[0-9]+)?$' THEN
    v_size := v_size || '"';
  END IF;

  SELECT p.id AS product_id, p.name AS product_name, p.condition,
         pv.id AS variant_id, pv.sku, pv.price, pv.stock, pv.is_active,
         pv.display_size, pv.sim_type, pv.storage, pv.color, pv.image_url,
         pv.attributes
    INTO v_row
    FROM public.products p
    JOIN public.product_variants pv ON pv.product_id = p.id
   WHERE p.category = 'iPad'
     AND p.status = 'active'
     AND lower(btrim(COALESCE(p.specifications->>'model_family', ''))) = v_family
     AND p.condition = v_db_cond
     AND COALESCE(pv.display_size, '') = v_size
     AND COALESCE(pv.sim_type, '') = v_sim
     AND lower(replace(COALESCE(pv.storage, ''), ' ', '')) = lower(replace(v_storage, ' ', ''))
     AND (v_color = '' OR lower(COALESCE(pv.color, '')) = lower(v_color))
   ORDER BY
     CASE WHEN v_color <> '' AND lower(COALESCE(pv.color, '')) = lower(v_color) THEN 0 ELSE 1 END,
     COALESCE(pv.stock, 0) DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'variant_id', pv.id,
    'sku', pv.sku,
    'color', pv.color,
    'color_slug', pv.attributes->>'color_slug',
    'hex', pv.attributes->>'hex',
    'stock_qty', COALESCE(pv.stock, 0),
    'image_url', COALESCE(pv.image_url, p.image_url),
    'is_active', pv.is_active
  ) ORDER BY COALESCE((pv.attributes->>'sort_order')::int, 99), pv.color), '[]'::jsonb)
    INTO v_colours
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
   WHERE pv.product_id = v_row.product_id
     AND COALESCE(pv.display_size, '') = v_row.display_size
     AND COALESCE(pv.sim_type, '') = v_row.sim_type
     AND lower(replace(COALESCE(pv.storage, ''), ' ', '')) = lower(replace(v_row.storage, ' ', ''));

  RETURN jsonb_build_object(
    'product_id', v_row.product_id,
    'variant_id', v_row.variant_id,
    'sku', v_row.sku,
    'display_name', v_row.product_name,
    'condition', v_row.condition,
    'display_size', v_row.display_size,
    'sim_type', v_row.sim_type,
    'storage', v_row.storage,
    'color', v_row.color,
    'price_ghs', COALESCE(v_row.price, 0),
    'price_pesewas', ROUND(COALESCE(v_row.price, 0) * 100)::bigint,
    'stock_qty', COALESCE(v_row.stock, 0),
    'status', CASE
      WHEN NOT COALESCE(v_row.is_active, false) THEN 'not_stocked'
      WHEN COALESCE(v_row.stock, 0) <= 0 THEN 'out_of_stock'
      ELSE 'active'
    END,
    'image_url', v_row.image_url,
    'colours', v_colours
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_ipad_variant(text, text, text, text, text, text)
  TO anon, authenticated;

COMMENT ON FUNCTION public.resolve_ipad_variant(text, text, text, text, text, text) IS
  'Resolve one iPad SKU from model_family + size + connectivity + storage + condition (+ optional colour). Returns colours array for the price key.';

COMMIT;
