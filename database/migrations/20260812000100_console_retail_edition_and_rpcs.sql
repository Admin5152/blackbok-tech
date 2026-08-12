-- =====================================================================
-- BlackBox Ghana — console / controller retail on products + product_variants
-- Migration: 20260812000100_console_retail_edition_and_rpcs.sql
--
-- 1. product_variants.edition (nullable; only PS5 Slim has two values)
-- 2. Rebuild uq_variant_combo to include edition
-- 3. get_console_availability / resolve_console_variant RPCs
-- 4. Widen products.category for Consoles / Controllers
--
-- Conventions (products.specifications jsonb):
--   catalog: 'console' | 'controller'
--   model_slug: e.g. playstation-5-slim
--   series, storage_label, has_edition_axis
-- Price is GHS numeric; pesewas = ROUND(price * 100) in RPCs only.
-- Idempotent.
-- =====================================================================

BEGIN;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS edition TEXT;

COMMENT ON COLUMN public.product_variants.edition IS
  'Console edition label (Digital, Standard, Disc). NULL when the model has no edition. Part of the unique combo so PS5 Slim Digital/Standard can share storage.';

ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS product_variants_edition_check;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_edition_check
  CHECK (edition IS NULL OR edition IN ('Digital', 'Standard', 'Disc'));

DROP INDEX IF EXISTS public.uq_variant_combo;
CREATE UNIQUE INDEX uq_variant_combo ON public.product_variants
  (product_id,
   COALESCE(display_size, ''),
   COALESCE(color, ''),
   COALESCE(storage, ''),
   COALESCE(ram, ''),
   COALESCE(sim_type, ''),
   COALESCE(edition, ''));

CREATE INDEX IF NOT EXISTS idx_products_console_model_slug
  ON public.products ((specifications->>'model_slug'))
  WHERE category IN ('Consoles', 'Controllers');

CREATE INDEX IF NOT EXISTS idx_product_variants_console_filter
  ON public.product_variants (product_id, edition, storage)
  WHERE is_active IS TRUE;

-- Category check: include Consoles / Controllers (keep legacy aliases)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.products'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ~* 'category'
      AND pg_get_constraintdef(c.oid) !~* 'subcategory'
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check
  CHECK (
    category IS NULL
    OR category IN (
      'iPhone',
      'Android phones',
      'iPad',
      'MacBooks',
      'Laptops',
      'Smart watches',
      'Gaming',
      'Headphones',
      'Speakers',
      'Accessories',
      'Consoles',
      'Controllers',
      'Laptop',
      'Audio',
      'Tablet',
      'Trades'
    )
  ) NOT VALID;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_subcategory_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_subcategory_check
  CHECK (
    subcategory IS NULL
    OR subcategory IN (
      'new', 'used', 'preowned', 'refurbished',
      'iWatches', 'Others',
      'PlayStation', 'Xbox', 'Steam', 'Nintendo',
      'AirPods', 'JBL', 'Sony', 'EarPods', 'Beats',
      'HomePod', 'HarmanKardon',
      'PhoneCases', 'ScreenProtectors', 'Chargers',
      'HP', 'Dell',
      'Tune', 'Solo', 'Flip', 'Charge', 'Boombox', 'Go', 'Onyx', 'Pill',
      'Omen', 'Envy', 'Victus', 'Alienware',
      'pro', 'air', 'mini', 'standard', 'other',
      'iphone-17', 'iphone-16', 'iphone-15', 'iphone-14',
      'iphone-13', 'iphone-12', 'iphone-11', 'iphone-x',
      'iphone-se', 'iphone-older',
      'PlayStation 5', 'PlayStation Portal', 'Xbox Series',
      'Switch', 'Steam Deck', 'DualSense'
    )
  );

-- ---- Availability matrix (one round-trip for PDP) ----
CREATE OR REPLACE FUNCTION public.get_console_availability(p_model_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text := lower(btrim(COALESCE(p_model_slug, '')));
  v_result jsonb;
BEGIN
  IF v_slug = '' THEN
    RETURN jsonb_build_object('model_slug', p_model_slug, 'products', '[]'::jsonb, 'combos', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'model_slug', v_slug,
    'has_edition_axis', COALESCE((
      SELECT (p.specifications->>'has_edition_axis')::boolean
      FROM public.products p
      WHERE p.category IN ('Consoles', 'Controllers')
        AND p.status = 'active'
        AND lower(btrim(COALESCE(p.specifications->>'model_slug', ''))) = v_slug
      LIMIT 1
    ), false),
    'products', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', p.id,
        'slug', p.slug,
        'name', p.name,
        'brand', p.brand,
        'category', p.category,
        'series', p.specifications->>'series',
        'storage_label', p.specifications->>'storage_label',
        'has_edition_axis', COALESCE((p.specifications->>'has_edition_axis')::boolean, false),
        'image_url', p.image_url,
        'price_from', (
          SELECT MIN(pv.price)
            FROM public.product_variants pv
           WHERE pv.product_id = p.id AND pv.is_active AND pv.price > 0
        )
      ))
      FROM public.products p
      WHERE p.category IN ('Consoles', 'Controllers')
        AND p.status = 'active'
        AND lower(btrim(COALESCE(p.specifications->>'model_slug', ''))) = v_slug
    ), '[]'::jsonb),
    'combos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', p.id,
        'variant_id', pv.id,
        'sku', pv.sku,
        'edition', pv.edition,
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
        CASE pv.edition WHEN 'Digital' THEN 0 WHEN 'Standard' THEN 1 WHEN 'Disc' THEN 2 ELSE 3 END,
        pv.color NULLS FIRST
      )
      FROM public.products p
      JOIN public.product_variants pv ON pv.product_id = p.id
      WHERE p.category IN ('Consoles', 'Controllers')
        AND p.status = 'active'
        AND lower(btrim(COALESCE(p.specifications->>'model_slug', ''))) = v_slug
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_console_availability(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_console_availability(text) IS
  'Console/controller PDP: one-shot availability for a model_slug. Fast path is a single variant; PS5 Slim returns both editions.';

-- ---- Single-SKU resolver ----
CREATE OR REPLACE FUNCTION public.resolve_console_variant(
  p_model_slug text,
  p_edition text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text := lower(btrim(COALESCE(p_model_slug, '')));
  v_edition text := btrim(COALESCE(p_edition, ''));
  v_has_axis boolean := false;
  v_row record;
  v_colours jsonb;
BEGIN
  IF v_slug = '' THEN
    RETURN jsonb_build_object('error', 'missing_axes');
  END IF;

  SELECT COALESCE((p.specifications->>'has_edition_axis')::boolean, false)
    INTO v_has_axis
    FROM public.products p
   WHERE p.category IN ('Consoles', 'Controllers')
     AND p.status = 'active'
     AND lower(btrim(COALESCE(p.specifications->>'model_slug', ''))) = v_slug
   LIMIT 1;

  -- Common case (11 of 12 models): ignore edition and return the single variant.
  IF NOT COALESCE(v_has_axis, false) THEN
    SELECT p.id AS product_id, p.name AS product_name,
           pv.id AS variant_id, pv.sku, pv.price, pv.stock, pv.is_active,
           pv.edition, pv.storage, pv.color, pv.image_url, pv.attributes
      INTO v_row
      FROM public.products p
      JOIN public.product_variants pv ON pv.product_id = p.id
     WHERE p.category IN ('Consoles', 'Controllers')
       AND p.status = 'active'
       AND lower(btrim(COALESCE(p.specifications->>'model_slug', ''))) = v_slug
     ORDER BY COALESCE(pv.stock, 0) DESC
     LIMIT 1;
  ELSE
    IF v_edition = '' THEN
      RETURN jsonb_build_object('error', 'missing_edition');
    END IF;
    SELECT p.id AS product_id, p.name AS product_name,
           pv.id AS variant_id, pv.sku, pv.price, pv.stock, pv.is_active,
           pv.edition, pv.storage, pv.color, pv.image_url, pv.attributes
      INTO v_row
      FROM public.products p
      JOIN public.product_variants pv ON pv.product_id = p.id
     WHERE p.category IN ('Consoles', 'Controllers')
       AND p.status = 'active'
       AND lower(btrim(COALESCE(p.specifications->>'model_slug', ''))) = v_slug
       AND lower(COALESCE(pv.edition, '')) = lower(v_edition)
     ORDER BY
       CASE WHEN pv.color IS NULL OR btrim(pv.color) = '' THEN 0 ELSE 1 END,
       COALESCE(pv.stock, 0) DESC
     LIMIT 1;
  END IF;

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
     AND COALESCE(pv.edition, '') = COALESCE(v_row.edition, '')
     AND COALESCE(pv.storage, '') = COALESCE(v_row.storage, '')
     AND pv.color IS NOT NULL
     AND btrim(pv.color) <> '';

  RETURN jsonb_build_object(
    'product_id', v_row.product_id,
    'variant_id', v_row.variant_id,
    'sku', v_row.sku,
    'display_name', v_row.product_name,
    'edition', v_row.edition,
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
    'colours', COALESCE(v_colours, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_console_variant(text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.resolve_console_variant(text, text) IS
  'Resolve one console/controller SKU. When the model has no edition axis, p_edition is ignored (11 of 12 models).';

COMMIT;
