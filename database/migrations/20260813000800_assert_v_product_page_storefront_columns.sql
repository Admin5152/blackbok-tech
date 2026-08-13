-- =====================================================================
-- Assert v_product_page exposes storefront fields used by catalogApi
-- Migration: 20260813000800_assert_v_product_page_storefront_columns.sql
--
-- The view is owned outside this repo (live Supabase). After August seeds /
-- condition heal, confirm the listing view still projects the columns the
-- shop needs. Hard-fails on core columns; notices optional deal/rating gaps.
-- Idempotent (re-run safe).
-- =====================================================================

DO $$
DECLARE
  missing_core TEXT[] := ARRAY[]::TEXT[];
  missing_optional TEXT[] := ARRAY[]::TEXT[];
  core TEXT[] := ARRAY[
    'id',
    'name',
    'brand',
    'category',
    'subcategory',
    'condition',
    'is_new',
    'status',
    'base_price',
    'image_url',
    'total_stock',
    'price_from',
    'price_to',
    'colors',
    'storage',
    'ram',
    'specs',
    'specifications'
  ];
  optional TEXT[] := ARRAY[
    'discount',
    'trade_model',
    'featured',
    'is_deal_of_the_day',
    'promo_text',
    'rating',
    'review_count',
    'slug',
    'description'
  ];
  col TEXT;
BEGIN
  IF to_regclass('public.v_product_page') IS NULL THEN
    RAISE EXCEPTION
      'public.v_product_page is missing. Recreate the storefront catalog view before go-live.';
  END IF;

  FOREACH col IN ARRAY core
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'v_product_page'
        AND column_name = col
    ) THEN
      missing_core := array_append(missing_core, col);
    END IF;
  END LOOP;

  IF array_length(missing_core, 1) IS NOT NULL THEN
    RAISE EXCEPTION
      'v_product_page is missing CORE storefront columns: %. Add them to the view SELECT (usually from products / stock aggregates), then NOTIFY pgrst, ''reload schema'';',
      array_to_string(missing_core, ', ');
  END IF;

  FOREACH col IN ARRAY optional
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'v_product_page'
        AND column_name = col
    ) THEN
      missing_optional := array_append(missing_optional, col);
    END IF;
  END LOOP;

  IF array_length(missing_optional, 1) IS NOT NULL THEN
    RAISE NOTICE
      'v_product_page missing optional columns (shop degrades gracefully): %. Prefer adding to the view SELECT.',
      array_to_string(missing_optional, ', ');
  ELSE
    RAISE NOTICE 'v_product_page storefront columns OK (core + optional).';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- If CORE columns missing (e.g. subcategory): run 00850 first, then re-run this file.
