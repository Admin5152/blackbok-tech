-- =====================================================================
-- Expose missing products columns on v_product_page (esp. subcategory)
-- Migration: 20260813000850_v_product_page_expose_product_columns.sql
--
-- 00800 assert failed with: missing CORE column subcategory.
-- Rebuilds the view by wrapping the *current* view SQL (pg_get_viewdef)
-- and joining public.products for omitted shop columns.
--
-- Idempotent. Run AFTER catalogue seeds; then re-run 00800.
-- =====================================================================

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_deal_of_the_day BOOLEAN DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promo_text TEXT;

DO $$
DECLARE
  missing_join TEXT[] := ARRAY[]::TEXT[];
  col TEXT;
  want TEXT[] := ARRAY[
    'subcategory',
    'is_deal_of_the_day',
    'promo_text',
    'condition',
    'is_new',
    'trade_model',
    'featured',
    'discount',
    'specifications',
    'brand',
    'slug',
    'description',
    'colors',
    'storage',
    'ram',
    'specs'
  ];
  join_cols TEXT;
  old_def TEXT;
  sql TEXT;
  bak TEXT := 'v_product_page_bak_202608130850';
BEGIN
  IF to_regclass('public.v_product_page') IS NULL THEN
    RAISE EXCEPTION
      'public.v_product_page does not exist. Create the storefront catalog view before this migration.';
  END IF;

  FOREACH col IN ARRAY want
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = col
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'v_product_page'
        AND column_name = col
    ) THEN
      missing_join := array_append(missing_join, col);
    END IF;
  END LOOP;

  IF array_length(missing_join, 1) IS NULL THEN
    RAISE NOTICE 'v_product_page already exposes joinable product columns (incl. subcategory).';
    RETURN;
  END IF;

  -- Snapshot current view SQL (no dependency on backup after recreate)
  old_def := pg_get_viewdef('public.v_product_page'::regclass, true);
  old_def := regexp_replace(old_def, ';\s*$', '');

  SELECT string_agg(format('p.%I AS %I', x, x), ', ')
    INTO join_cols
  FROM unnest(missing_join) AS x;

  IF to_regclass('public.' || bak) IS NOT NULL THEN
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', bak);
  END IF;

  EXECUTE format('ALTER VIEW public.v_product_page RENAME TO %I', bak);

  -- New view inlines old_def — does not depend on bak
  sql := format(
    'CREATE VIEW public.v_product_page AS SELECT v.*, %s FROM (%s) AS v INNER JOIN public.products p ON p.id = v.id',
    join_cols,
    old_def
  );
  EXECUTE sql;

  EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', bak);

  GRANT SELECT ON public.v_product_page TO anon, authenticated, service_role;

  RAISE NOTICE 'v_product_page rebuilt with added columns: %', array_to_string(missing_join, ', ');
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
