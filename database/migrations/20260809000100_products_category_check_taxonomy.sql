-- =====================================================================
-- BlackBox Ghana — widen products.category check for storefront taxonomy
-- Migration: 20260809000100_products_category_check_taxonomy.sql
--
-- Cause: live DB still had products_category_check from 2026_05_qa_sprint
--   CHECK (category IN ('iPhone', 'Laptop', 'Accessories', 'Gaming', 'Audio'))
-- Admin / August seed write canonical labels like Laptops, Headphones,
-- Speakers, iPad, MacBooks, Android phones, Smart watches → 23514.
--
-- Run this alone in Supabase SQL editor if the August seed still fails.
-- Then re-run 20260808000100_august_retail_catalogue_seed.sql.
--
-- Verify:
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.products'::regclass
--     AND conname = 'products_category_check';
-- =====================================================================

BEGIN;

-- Drop every CHECK on products that gates `category` (not subcategory)
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
      -- Legacy aliases
      'Laptop',
      'Audio',
      'Tablet',
      'Trades'
    )
  ) NOT VALID;

COMMENT ON CONSTRAINT products_category_check ON public.products IS
  'Storefront taxonomy categories (ADMIN_MAIN_CATEGORIES) plus legacy aliases. NOT VALID skips legacy-row recheck.';

COMMIT;
