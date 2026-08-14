-- =============================================================================
-- Heal existing cart_items tables created before persisted cart lines
-- Migration: 20260814000200_heal_cart_items_line_key.sql
--
-- CREATE TABLE IF NOT EXISTS does not add missing columns to an older table.
-- This migration upgrades that table in place and is safe to rerun.
-- =============================================================================

SET lock_timeout = '8s';
SET statement_timeout = '60s';

-- Create the table if a database never ran 01200 at all.
CREATE TABLE IF NOT EXISTS public.cart_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL,
  variant_id       UUID NULL REFERENCES public.product_variants (id) ON DELETE SET NULL,
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  selected_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  line_key         TEXT,
  unit_price       NUMERIC(12, 2) NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS selected_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS line_key TEXT,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Preserve old cart rows by assigning a deterministic key before NOT NULL.
UPDATE public.cart_items
SET line_key = concat_ws(
  ':',
  product_id,
  COALESCE(variant_id::text, 'base'),
  md5(COALESCE(selected_options, '{}'::jsonb)::text)
)
WHERE line_key IS NULL OR btrim(line_key) = '';

-- Remove accidental duplicates, retaining the most recently updated line.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, line_key
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS position
  FROM public.cart_items
)
DELETE FROM public.cart_items c
USING ranked r
WHERE c.id = r.id
  AND r.position > 1;

ALTER TABLE public.cart_items
  ALTER COLUMN line_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_id_line_key_key
  ON public.cart_items (user_id, line_key);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id
  ON public.cart_items (user_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id
  ON public.cart_items (product_id);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cart_items_select_own ON public.cart_items;
CREATE POLICY cart_items_select_own
  ON public.cart_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS cart_items_insert_own ON public.cart_items;
CREATE POLICY cart_items_insert_own
  ON public.cart_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cart_items_update_own ON public.cart_items;
CREATE POLICY cart_items_update_own
  ON public.cart_items FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cart_items_delete_own ON public.cart_items;
CREATE POLICY cart_items_delete_own
  ON public.cart_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';

RESET lock_timeout;
RESET statement_timeout;
