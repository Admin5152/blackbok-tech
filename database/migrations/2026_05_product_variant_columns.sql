-- ============================================================
-- 2026_05_product_variant_columns.sql
-- ------------------------------------------------------------
-- QA Sheet:  PDP-04 / PDP-05 / PDP-07
-- Problem:   The admin product form lets staff enter color /
--            storage / RAM / specs as chip arrays, but the
--            `products` table had no columns to store them, so
--            `lib/api.ts:createProduct` / `updateProduct` were
--            silently dropping the values. The Product Detail
--            page therefore rendered no color or storage
--            selectors and the chosen options never reached the
--            cart.
--
-- Fix:       Persist the chip arrays directly on `products` as
--            TEXT[] columns. We keep this independent of the
--            `product_variants` table — those rows model SKU-
--            level pricing/stock; this is the lightweight
--            display metadata the storefront UI binds to.
--
-- Idempotent: yes (uses `ADD COLUMN IF NOT EXISTS`). Safe to
-- re-run on any environment.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS colors  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS storage TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS ram     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS specs   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill: NULL values become empty arrays. The defaults above
-- already handle new rows, but historical rows inserted before
-- the column existed may still have NULL.
UPDATE public.products SET colors  = ARRAY[]::TEXT[] WHERE colors  IS NULL;
UPDATE public.products SET storage = ARRAY[]::TEXT[] WHERE storage IS NULL;
UPDATE public.products SET ram     = ARRAY[]::TEXT[] WHERE ram     IS NULL;
UPDATE public.products SET specs   = ARRAY[]::TEXT[] WHERE specs   IS NULL;

COMMENT ON COLUMN public.products.colors  IS 'Display-only color chips shown on PDP (e.g. ["Black","Silver"])';
COMMENT ON COLUMN public.products.storage IS 'Display-only storage chips shown on PDP (e.g. ["128GB","256GB"])';
COMMENT ON COLUMN public.products.ram     IS 'Display-only RAM chips shown on PDP (e.g. ["8GB","16GB"])';
COMMENT ON COLUMN public.products.specs   IS 'Bullet-list spec items rendered in the Specifications section';
