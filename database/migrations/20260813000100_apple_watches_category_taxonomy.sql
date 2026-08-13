-- =====================================================================
-- Smart watches Brand → Series taxonomy + Ultra / Series line tags
-- Migration: 20260813000100_apple_watches_category_taxonomy.sql
--
-- Shop path: Smart watches → Brand (Apple / Samsung / Others) → Series
-- Series values on products.subcategory: Ultra | Series | Galaxy
-- Replaces legacy iWatches / Others tags for Apple lines.
--
-- IMPORTANT: Drop CHECK constraints BEFORE remapping. The previous live
-- products_subcategory_check did not allow 'Ultra' / 'Series', so UPDATE
-- (or re-ADD) failed with 23514.
-- Idempotent.
-- =====================================================================

BEGIN;

-- 1) Drop category + subcategory checks first (names may vary on live DBs)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.products'::regclass
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) ~* 'category'
        OR pg_get_constraintdef(c.oid) ~* 'subcategory'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- 2) Canonical wearables category is Smart watches (Brand → Series).
-- Keep Apple Watches as a legacy alias in the CHECK, but store Smart watches.
UPDATE public.products
SET category = 'Smart watches'
WHERE category = 'Apple Watches';

-- Remap legacy watch group tags when present
UPDATE public.products
SET subcategory = 'Series',
    brand = COALESCE(NULLIF(TRIM(brand), ''), 'Apple')
WHERE category = 'Smart watches'
  AND subcategory IN ('iWatches', 'Others', 'iwatches', 'others');

UPDATE public.products
SET subcategory = 'Ultra',
    brand = COALESCE(NULLIF(TRIM(brand), ''), 'Apple')
WHERE category = 'Smart watches'
  AND (
    lower(name) LIKE '%ultra%'
    OR lower(COALESCE(model, '')) LIKE '%ultra%'
  )
  AND subcategory IS DISTINCT FROM 'Ultra';

-- Also flip watch_group in specifications when catalog is watches
UPDATE public.products
SET specifications =
  CASE
    WHEN lower(name) LIKE '%ultra%' OR lower(COALESCE(model, '')) LIKE '%ultra%' THEN
      COALESCE(specifications, '{}'::jsonb) || jsonb_build_object('catalog', 'watches', 'watch_group', 'Ultra')
    ELSE
      COALESCE(specifications, '{}'::jsonb) || jsonb_build_object('catalog', 'watches', 'watch_group', 'Series')
  END
WHERE category IN ('Smart watches', 'Apple Watches');

UPDATE public.products
SET brand = COALESCE(NULLIF(TRIM(brand), ''), 'Apple')
WHERE category = 'Smart watches'
  AND subcategory IN ('Ultra', 'Series');

-- 3) Re-add widened checks (NOT VALID skips recheck of messy legacy rows;
--    new inserts/updates are still enforced)
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
      'Apple Watches',
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

ALTER TABLE public.products
  ADD CONSTRAINT products_subcategory_check
  CHECK (
    subcategory IS NULL
    OR subcategory IN (
      'new', 'used', 'preowned', 'refurbished',
      'iWatches', 'Others',
      'Ultra', 'Series', 'Galaxy', 'Other',
      'PlayStation', 'Xbox', 'Steam', 'Nintendo',
      'AirPods', 'JBL', 'Sony', 'EarPods', 'Beats',
      'HomePod', 'HarmanKardon',
      'PhoneCases', 'ScreenProtectors', 'Chargers',
      'HP', 'Dell',
      'Tune', 'Solo', 'Flip', 'Charge', 'Boombox', 'Go', 'Onyx', 'Pill',
      'Omen', 'Envy', 'Victus', 'Alienware',
      'pro', 'air', 'mini', 'standard', 'other', 'neo',
      'iphone-17', 'iphone-16', 'iphone-15', 'iphone-14',
      'iphone-13', 'iphone-12', 'iphone-11', 'iphone-x',
      'iphone-se', 'iphone-older',
      'PlayStation 5', 'PlayStation Portal', 'Xbox Series',
      'Switch', 'Steam Deck', 'DualSense'
    )
  ) NOT VALID;

COMMIT;
