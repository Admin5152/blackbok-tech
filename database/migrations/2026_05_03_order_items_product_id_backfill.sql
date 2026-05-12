-- ============================================================
-- (3/4) order_items.product_id — align with products.id
--
-- When order_items.product_id is UUID, assign products.id (UUID) directly.
-- Match rows where the line already holds the same id as text, or where
-- the text form of product_id matched products.display_id (legacy slug
-- paths only apply if values were ever stored in a compatible form).
--
-- Rows with NULL product_id (non-resolved checkout snapshots) are
-- left unchanged.
--
-- If public.products.id is TEXT in your project, use
-- SET product_id = p.id::uuid only where p.id parses as UUID, or split
-- this migration for your schema.
-- ============================================================
BEGIN;

COMMENT ON COLUMN public.order_items.product_id IS
  'FK to public.products.id (UUID). Legacy display_id alignment via text comparison when applicable.';

UPDATE public.order_items oi
SET product_id = p.id
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
  AND p.id IS DISTINCT FROM oi.product_id;

COMMIT;
