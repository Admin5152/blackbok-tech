-- ============================================================
-- Section 25 — Database & Backend (Supabase)
--
-- Covers rubric items DB-01, DB-07..DB-13, DB-15, DB-16 and
-- clarifies DB-02..DB-05 ID columns (human-readable IDs live in
-- display_id; primary keys stay UUID).
--
-- Depends on: public.orders, order_items, products, profiles,
-- tracking_updates, repair_requests, trade_in_requests, reviews,
-- auth.users (for signup trigger).
--
-- Run AFTER: checkout_complete, place_order_rpc, repair_requests,
-- trade_in_requests, gapfillmitigation (messages), qa_sprint.
-- Idempotent where possible.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- DB-01: Profile on sign-up — name, role, avatar_letter
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name   TEXT;
  v_letter TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1)
  );
  v_letter := UPPER(LEFT(COALESCE(NULLIF(v_name, ''), NEW.email, 'U'), 1));

  INSERT INTO public.profiles (id, email, name, role, avatar_letter)
  VALUES (NEW.id, COALESCE(NEW.email, ''), v_name, 'user', v_letter)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON COLUMN public.orders.display_id IS
  'Human-readable order number (ORD00001). Primary key remains orders.id (UUID).';

COMMENT ON COLUMN public.repair_requests.display_id IS
  'Human-readable repair id (REP00001). Primary key remains repair_requests.id (UUID).';

COMMENT ON COLUMN public.trade_in_requests.display_id IS
  'Human-readable trade id (TRD00001). Table is public.trade_in_requests (not trade_requests).';

-- ------------------------------------------------------------
-- DB-08: Persist discount on orders for line-sum recalculation
-- ------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

UPDATE public.orders SET discount_amount = 0 WHERE discount_amount IS NULL;

-- ------------------------------------------------------------
-- DB-07: Stock decrement via trigger on order_items insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_order_items_decrement_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NULL OR NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.products p
     SET stock = GREATEST(0, COALESCE(p.stock, 0) - NEW.quantity::INTEGER)
   WHERE p.id::TEXT = NEW.product_id::TEXT;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_decrement_stock ON public.order_items;
CREATE TRIGGER trg_order_items_decrement_stock
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_order_items_decrement_stock();

-- ------------------------------------------------------------
-- DB-08: Recalculate orders.total_price from lines + shipping − discount
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_recalc_order_total_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_sub      NUMERIC;
  v_ship     NUMERIC;
  v_disc     NUMERIC;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  IF v_order_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(oi.quantity::NUMERIC * COALESCE(oi.unit_price, oi.price, 0)), 0)
    INTO v_sub
    FROM public.order_items oi
   WHERE oi.order_id = v_order_id;

  SELECT COALESCE(o.shipping_cost, 0), COALESCE(o.discount_amount, 0)
    INTO v_ship, v_disc
    FROM public.orders o
   WHERE o.id = v_order_id;

  UPDATE public.orders o
     SET total_price = GREATEST(0, ROUND(v_sub + v_ship - v_disc, 2))
   WHERE o.id = v_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_recalc_total ON public.order_items;
CREATE TRIGGER trg_order_items_recalc_total
  AFTER INSERT OR UPDATE OF quantity, price, unit_price OR DELETE
  ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalc_order_total_from_items();

-- ------------------------------------------------------------
-- DB-10: tracking_updates row when order.status changes
-- (DB-09: initial "Order Placed" row remains in checkout_complete.sql)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_orders_tracking_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label TEXT;
  v_desc  TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_label := INITCAP(LOWER(TRIM(COALESCE(NEW.status, ''))));

  v_desc := CASE LOWER(TRIM(COALESCE(NEW.status, '')))
    WHEN 'pending'    THEN 'Your order has been received and is being processed.'
    WHEN 'processing' THEN 'Your order is being prepared for shipment.'
    WHEN 'ready'       THEN 'Your order is ready for pickup or dispatch.'
    WHEN 'shipped'     THEN 'Your order has shipped and is on the way.'
    WHEN 'delivered'   THEN 'Your order has been delivered.'
    WHEN 'cancelled'   THEN 'Your order has been cancelled.'
    ELSE 'Order status updated.'
  END;

  INSERT INTO public.tracking_updates (order_id, status, description, location)
  VALUES (NEW.id, v_label, v_desc, NULL);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_tracking_on_status ON public.orders;
CREATE TRIGGER trg_orders_tracking_on_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_orders_tracking_on_status_change();

-- ------------------------------------------------------------
-- DB-11: Repair → estimate_sent when estimated_cost is set
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_repair_estimate_sent_on_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estimated_cost IS NULL OR NEW.estimated_cost <= 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'estimate_sent';
    RETURN NEW;
  END IF;

  IF OLD.estimated_cost IS DISTINCT FROM NEW.estimated_cost THEN
    NEW.status := 'estimate_sent';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repair_estimate_on_cost_ins ON public.repair_requests;
CREATE TRIGGER trg_repair_estimate_on_cost_ins
  BEFORE INSERT ON public.repair_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_repair_estimate_sent_on_cost();

DROP TRIGGER IF EXISTS trg_repair_estimate_on_cost_upd ON public.repair_requests;
CREATE TRIGGER trg_repair_estimate_on_cost_upd
  BEFORE UPDATE OF estimated_cost ON public.repair_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_repair_estimate_sent_on_cost();

-- ------------------------------------------------------------
-- DB-12: Trade → awaiting_user when final_value set while inspecting
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_trade_awaiting_user_on_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.final_value IS NULL OR NEW.final_value <= 0 THEN
    RETURN NEW;
  END IF;
  IF LOWER(COALESCE(NEW.status, '')) <> 'inspecting' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'awaiting_user';
    RETURN NEW;
  END IF;

  IF OLD.final_value IS DISTINCT FROM NEW.final_value THEN
    NEW.status := 'awaiting_user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_offer_status_ins ON public.trade_in_requests;
CREATE TRIGGER trg_trade_offer_status_ins
  BEFORE INSERT ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trade_awaiting_user_on_offer();

DROP TRIGGER IF EXISTS trg_trade_offer_status_upd ON public.trade_in_requests;
CREATE TRIGGER trg_trade_offer_status_upd
  BEFORE UPDATE OF final_value ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trade_awaiting_user_on_offer();

-- ------------------------------------------------------------
-- DB-13: Product rating + review_count from reviews
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_refresh_product_rating_from_reviews()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid TEXT;
BEGIN
  v_pid := COALESCE(NEW.product_id, OLD.product_id);
  IF v_pid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.products p
     SET rating = COALESCE((
           SELECT ROUND(AVG(r.rating::NUMERIC), 2)
             FROM public.reviews r
            WHERE r.product_id::TEXT = v_pid::TEXT
         ), 0),
         review_count = COALESCE((
           SELECT COUNT(*)::INTEGER
             FROM public.reviews r
            WHERE r.product_id::TEXT = v_pid::TEXT
         ), 0)
   WHERE p.id::TEXT = v_pid::TEXT;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_refresh_product ON public.reviews;
CREATE TRIGGER trg_reviews_refresh_product
  AFTER INSERT OR UPDATE OF rating OR DELETE
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_refresh_product_rating_from_reviews();

-- ------------------------------------------------------------
-- DB-05: messages.display_id — MSG00001 (ensure base table exists)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name  TEXT,
  sender_email TEXT NOT NULL DEFAULT '',
  subject      TEXT,
  body         TEXT,
  status       TEXT DEFAULT 'unseen',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS display_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_display_id
  ON public.messages (display_id)
  WHERE display_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_generate_message_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_last INTEGER;
BEGIN
  IF NEW.display_id IS NOT NULL AND NEW.display_id <> '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    MAX(NULLIF(REGEXP_REPLACE(COALESCE(m.display_id, ''), '\D', '', 'g'), '')::INTEGER),
    0
  )
    INTO v_last
    FROM public.messages m
   WHERE m.display_id IS NOT NULL;

  NEW.display_id := 'MSG' || LPAD((v_last + 1)::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_display_id ON public.messages;
CREATE TRIGGER trg_messages_display_id
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_message_display_id();

-- ------------------------------------------------------------
-- DB-15: wishlist_items (+ migrate legacy wishlist table name)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wishlist'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wishlist_items'
  ) THEN
    ALTER TABLE public.wishlist RENAME TO wishlist_items;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_items_select_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_select_own"
  ON public.wishlist_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wishlist_items_insert_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_insert_own"
  ON public.wishlist_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wishlist_items_delete_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_delete_own"
  ON public.wishlist_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- DB-16: message_threads (admin / user replies)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_threads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  sender     TEXT NOT NULL CHECK (lower(sender) IN ('user', 'admin', 'staff')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_message_id ON public.message_threads (message_id);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_threads_select_participants" ON public.message_threads;
CREATE POLICY "message_threads_select_participants"
  ON public.message_threads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = message_threads.message_id
        AND (
          lower(m.sender_email) = lower(p.email)
          OR lower(coalesce(p.role::TEXT, '')) IN ('admin', 'staff')
        )
    )
  );

DROP POLICY IF EXISTS "message_threads_insert_user" ON public.message_threads;
CREATE POLICY "message_threads_insert_user"
  ON public.message_threads FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = message_threads.message_id
        AND lower(m.sender_email) = lower(p.email)
        AND lower(message_threads.sender) = 'user'
    )
  );

DROP POLICY IF EXISTS "message_threads_insert_admin" ON public.message_threads;
CREATE POLICY "message_threads_insert_admin"
  ON public.message_threads FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(coalesce(p.role::TEXT, '')) IN ('admin', 'staff')
    )
    AND lower(message_threads.sender) IN ('admin', 'staff')
  );

COMMIT;
