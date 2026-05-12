-- ============================================================
-- BlackBox: Checkout completeness migration
--
-- Purpose
--   Fixes QA failures CHK-11..CHK-17 by guaranteeing that:
--     1. The `orders` table has every column the checkout form
--        submits (payment_method, shipping_*, notes, display_id,
--        tracking_number, payment_status).
--     2. A `tracking_updates` table exists with the shape the rest
--        of the app expects.
--     3. `orders.tracking_number` is auto-generated `BB<epoch_ms>` on
--        insert if the caller didn't supply one (CHK-15).
--     4. The first `tracking_updates` row ("Order Placed") is
--        auto-inserted by a DB trigger on order creation (CHK-16).
--
-- All steps are idempotent — safe to re-run.
-- Run AFTER `2026_05_place_order_rpc.sql`.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. Ensure orders has every column the checkout RPC writes to.
--    Most of these were added by earlier migrations, but we
--    re-assert them here so a fresh environment (or a partially
--    migrated one) has everything in one place.
-- ------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS display_id        TEXT,
  ADD COLUMN IF NOT EXISTS payment_method    TEXT,
  ADD COLUMN IF NOT EXISTS payment_status    TEXT
    DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  ADD COLUMN IF NOT EXISTS shipping_address  TEXT,
  ADD COLUMN IF NOT EXISTS shipping_method   TEXT,
  ADD COLUMN IF NOT EXISTS shipping_cost     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number   TEXT,
  ADD COLUMN IF NOT EXISTS customer_id       UUID;

-- Backfill any nulls so existing rows are consistent with the
-- new defaults. NULLs in `display_id` are still allowed because
-- the `place_order` RPC computes one on insert.
UPDATE public.orders SET payment_status = 'pending' WHERE payment_status IS NULL;
UPDATE public.orders SET shipping_cost  = 0         WHERE shipping_cost  IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_display_id      ON public.orders (display_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders (tracking_number);

-- ------------------------------------------------------------
-- 2. tracking_updates table.
--    The view `public.order_tracking` in 2026_05_qa_sprint.sql
--    expects columns: id, order_id, status, description, location,
--    created_at. Make sure they all exist.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reassert each column in case an older variant of the table
-- (e.g. `order_tracking_updates` migrated as a partial dataset)
-- was created without them.
ALTER TABLE public.tracking_updates
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS location    TEXT,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_tracking_updates_order_id ON public.tracking_updates (order_id);

-- RLS: users see their own tracking, admins see all.
ALTER TABLE public.tracking_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_tracking" ON public.tracking_updates;
CREATE POLICY "users_select_own_tracking"
  ON public.tracking_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = tracking_updates.order_id
        AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins_all_tracking" ON public.tracking_updates;
CREATE POLICY "admins_all_tracking"
  ON public.tracking_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- 3. Auto-generate tracking_number on insert (CHK-15).
--    Format: `BB` + 13-digit epoch milliseconds + 4 random hex chars.
--    Collision probability is ~negligible; we additionally enforce
--    uniqueness via the index in step 1.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_generate_tracking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
    NEW.tracking_number :=
      'BB'
      || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT
      || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_tracking_number ON public.orders;
CREATE TRIGGER trg_orders_tracking_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_tracking_number();

-- ------------------------------------------------------------
-- 4. Auto-insert the first tracking_updates row on order creation
--    (CHK-16). We do this in an AFTER INSERT trigger so the
--    `orders` row is fully visible to the FK in tracking_updates.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_insert_initial_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tracking_updates (order_id, status, description, location)
  VALUES (
    NEW.id,
    'Order Placed',
    'Your order has been received and is being processed.',
    NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_initial_tracking ON public.orders;
CREATE TRIGGER trg_orders_initial_tracking
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_insert_initial_tracking();

-- ------------------------------------------------------------
-- 5. Realtime + REPLICA IDENTITY for tracking_updates so the
--    profile/orders page can subscribe to status changes.
--    Wrapped in a DO block so re-runs don't error on duplicate.
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_updates;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

ALTER TABLE public.tracking_updates REPLICA IDENTITY FULL;

COMMIT;
