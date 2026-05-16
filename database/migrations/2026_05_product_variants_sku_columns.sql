-- ============================================================
-- 2026_05_product_variants_sku_columns.sql
-- Ensure SKU matrix columns exist for Color / Storage / RAM stock.
-- Idempotent.
-- ============================================================
BEGIN;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS storage TEXT,
  ADD COLUMN IF NOT EXISTS ram TEXT,
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_modifier NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sku TEXT;

-- Link to products when column was added without FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_variants_product_id_fkey'
      AND conrelid = 'public.product_variants'::regclass
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT product_variants_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.product_variants.color IS 'SKU color label (matches products.colors chips)';
COMMENT ON COLUMN public.product_variants.storage IS 'SKU storage label (matches products.storage chips)';
COMMENT ON COLUMN public.product_variants.ram IS 'SKU RAM label (matches products.ram chips)';

COMMIT;
