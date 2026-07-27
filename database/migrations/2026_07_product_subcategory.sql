-- ============================================================
-- BlackBox: Add subcategory column to products
-- Enables brand/type-based subcategory filtering in the store.
-- Idempotent. Safe to run on existing production data.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

CREATE INDEX IF NOT EXISTS idx_products_subcategory ON public.products (subcategory)
  WHERE subcategory IS NOT NULL;

COMMENT ON COLUMN public.products.subcategory IS
  'Optional brand/type tag for storefront subcategory picker (e.g. PlayStation, AirPods).';

-- Expose on catalog view when possible.
-- PostgREST/Supabase: after applying, run NOTIFY pgrst, 'reload schema';
-- and ensure public.v_product_page SELECTs p.subcategory (add the column to the
-- view definition in the SQL editor if it is not SELECT * / p.* based).
DO $$
BEGIN
  IF to_regclass('public.v_product_page') IS NULL THEN
    RAISE NOTICE 'products.subcategory added. v_product_page not found.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'v_product_page'
      AND column_name = 'subcategory'
  ) THEN
    RAISE NOTICE 'v_product_page already exposes subcategory.';
  ELSE
    RAISE NOTICE
      'products.subcategory added. Add p.subcategory to v_product_page SELECT, then NOTIFY pgrst, ''reload schema'';';
  END IF;
END;
$$;
