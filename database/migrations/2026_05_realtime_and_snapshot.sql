-- ============================================================
-- Realtime + Order item snapshot fields
-- Run after 2026_05_qa_sprint.sql
-- ============================================================
BEGIN;

-- 1. Snapshot product details on the order line so they survive
--    product edits/deletes and missing FK rows (cart with local-only ids).
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_name  TEXT,
  ADD COLUMN IF NOT EXISTS product_image TEXT,
  ADD COLUMN IF NOT EXISTS product_options JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);

-- Allow product_id to be NULL when the cart item refers to a non-DB
-- (seed/local) product. The FK still validates when populated.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='order_items'
      AND column_name='product_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;
  END IF;
END$$;

-- 2. Enable realtime on customer-facing tables (idempotent).
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;            EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_in_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.repair_requests;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_updates;  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

-- Ensure UPDATE payloads carry the row identity for filtering.
ALTER TABLE public.orders            REPLICA IDENTITY FULL;
ALTER TABLE public.order_items       REPLICA IDENTITY FULL;
ALTER TABLE public.trade_in_requests REPLICA IDENTITY FULL;
ALTER TABLE public.repair_requests   REPLICA IDENTITY FULL;

COMMIT;
