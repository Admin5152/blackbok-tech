-- =============================================================================
-- Persist signed-in carts in Supabase (mirror wishlist_items)
-- Migration: 20260813001200_cart_items_persist.sql
--
-- Deadlock-safe: short lock_timeout; CREATE TABLE IF NOT EXISTS is concurrent-
-- friendly; policies applied only on cart_items.
-- =============================================================================

SET lock_timeout = '8s';
SET statement_timeout = '60s';

CREATE TABLE IF NOT EXISTS public.cart_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL,
  variant_id       UUID NULL REFERENCES public.product_variants (id) ON DELETE SET NULL,
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  selected_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  line_key         TEXT NOT NULL,
  unit_price       NUMERIC(12, 2) NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items (product_id);

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

RESET lock_timeout;
RESET statement_timeout;
