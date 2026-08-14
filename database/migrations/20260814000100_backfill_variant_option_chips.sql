-- =====================================================================
-- Backfill products.colors / storage from product_variants
-- Migration: 20260814000100_backfill_variant_option_chips.sql
--
-- WHY: Consoles, controllers, headphones, speakers, and accessories often
-- have sellable SKU rows but empty products.colors / products.storage arrays.
-- Admin "Generate versions from options" needs those chips to unlock the
-- checkbox and show per-row stock editors.
--
-- Idempotent: only fills empty (or null) chip arrays from distinct variant dims.
-- =====================================================================
BEGIN;

UPDATE public.products p
SET
  colors = COALESCE(
    (
      SELECT array_agg(DISTINCT trim(v.color) ORDER BY trim(v.color))
      FROM public.product_variants v
      WHERE v.product_id = p.id
        AND nullif(trim(v.color), '') IS NOT NULL
    ),
    COALESCE(p.colors, ARRAY[]::text[])
  )
WHERE p.category IN (
    'Consoles',
    'Controllers',
    'Gaming',
    'Headphones',
    'Speakers',
    'Accessories'
  )
  AND COALESCE(cardinality(p.colors), 0) = 0
  AND EXISTS (
    SELECT 1
    FROM public.product_variants v
    WHERE v.product_id = p.id
      AND nullif(trim(v.color), '') IS NOT NULL
  );

UPDATE public.products p
SET
  storage = COALESCE(
    (
      SELECT array_agg(DISTINCT trim(v.storage) ORDER BY trim(v.storage))
      FROM public.product_variants v
      WHERE v.product_id = p.id
        AND nullif(trim(v.storage), '') IS NOT NULL
    ),
    COALESCE(p.storage, ARRAY[]::text[])
  )
WHERE p.category IN (
    'Consoles',
    'Controllers',
    'Gaming',
    'Headphones',
    'Speakers',
    'Accessories'
  )
  AND COALESCE(cardinality(p.storage), 0) = 0
  AND EXISTS (
    SELECT 1
    FROM public.product_variants v
    WHERE v.product_id = p.id
      AND nullif(trim(v.storage), '') IS NOT NULL
  );

-- Keep product.stock aligned with variant totals when variants exist.
UPDATE public.products p
SET stock = COALESCE(
  (
    SELECT sum(GREATEST(0, COALESCE(v.stock, 0)))::integer
    FROM public.product_variants v
    WHERE v.product_id = p.id
  ),
  p.stock
)
WHERE p.category IN (
    'Consoles',
    'Controllers',
    'Gaming',
    'Headphones',
    'Speakers',
    'Accessories'
  )
  AND EXISTS (
    SELECT 1 FROM public.product_variants v WHERE v.product_id = p.id
  );

COMMIT;
