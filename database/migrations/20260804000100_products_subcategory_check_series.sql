-- =====================================================================
-- BlackBox Ghana — widen products.subcategory check for series slugs
-- Migration: 20260804000100_products_subcategory_check_series.sql
--
-- Cause: live DB had products_subcategory_check that only allowed brand/type
-- tags (PlayStation, AirPods, …). Store series filters store iPad/Mac/iPhone
-- series on products.subcategory (pro, air, mini, standard, iphone-16, …),
-- so the iPad catalogue seed failed with 23514 on subcategory = 'pro'.
--
-- Run this BEFORE re-running:
--   20260803000100_ipad_retail_display_size_and_rpcs.sql (if needed)
--   20260803000200_ipad_retail_catalogue_seed.sql
--
-- Verify after seed:
--   SELECT name, subcategory, condition, price
--   FROM products WHERE category = 'iPad' ORDER BY name LIMIT 20;
-- =====================================================================

BEGIN;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_subcategory_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_subcategory_check
  CHECK (
    subcategory IS NULL
    OR subcategory IN (
      -- Condition leftovers (legacy / mistaken writes)
      'new',
      'used',
      'preowned',
      'refurbished',
      -- Brand / type tags (CATEGORY_SUBCATEGORY_CONFIG)
      'iWatches',
      'Others',
      'PlayStation',
      'Xbox',
      'Steam',
      'Nintendo',
      'AirPods',
      'JBL',
      'Sony',
      'EarPods',
      'HomePod',
      'HarmanKardon',
      'PhoneCases',
      'ScreenProtectors',
      'Chargers',
      -- iPad / MacBook series
      'pro',
      'air',
      'mini',
      'standard',
      'other',
      -- iPhone series
      'iphone-17',
      'iphone-16',
      'iphone-15',
      'iphone-14',
      'iphone-13',
      'iphone-12',
      'iphone-11',
      'iphone-x',
      'iphone-se',
      'iphone-older'
    )
  );

COMMENT ON CONSTRAINT products_subcategory_check ON public.products IS
  'Allow brand/type tags and series slugs used by storefront taxonomy (see lib/storeFilters.ts).';

COMMIT;
