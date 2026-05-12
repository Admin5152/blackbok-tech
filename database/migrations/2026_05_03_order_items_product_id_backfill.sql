-- ============================================================
-- (3/4) order_items.product_id — align with products.id
--
-- Legacy lines may store public.products.display_id (e.g. BB-101 slug)
-- while products.id is the canonical key. This backfill rewrites
-- order_items.product_id to products.id::text when we can resolve a
-- unique product by display_id or id match.
--
-- Rows with NULL product_id (non-resolved checkout snapshots) are
-- left unchanged.
-- ============================================================
BEGIN;

COMMENT ON COLUMN public.order_items.product_id IS
  'References public.products.id (stored as text). Prefer resolving legacy display_id slugs to id via backfill.';

UPDATE public.order_items oi
SET product_id = p.id::TEXT
FROM public.products p
WHERE oi.product_id IS NOT NULL
  AND BTRIM(oi.product_id::TEXT, ' ') <> ''
  AND (
    lower(trim(oi.product_id::TEXT)) = lower(trim(p.id::TEXT))
    OR (
      p.display_id IS NOT NULL
      AND length(trim(p.display_id)) > 0
      AND lower(trim(oi.product_id::TEXT)) = lower(trim(p.display_id))
    )
  )
  AND p.id::TEXT IS DISTINCT FROM oi.product_id::TEXT;

COMMIT;
