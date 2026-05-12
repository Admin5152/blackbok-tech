-- ============================================================
-- BlackBox: Gap-Fill Migration
-- Addresses: missing columns, structural gaps, security gaps,
-- missing tables, and logic gaps identified in schema audit.
-- Idempotent. Safe to run on existing production data.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. MISSING COLUMNS
-- ------------------------------------------------------------

-- 1a. Products: brand + specifications
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand          TEXT,
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}';

-- 1b. Orders: customer notes
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 1c. Profiles: country
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT;

-- 1d. Repair requests: assigned technician
ALTER TABLE public.repair_requests
  ADD COLUMN IF NOT EXISTS assigned_technician UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 2. STRUCTURAL GAPS
-- ------------------------------------------------------------

-- 2a. Link profiles <-> customers via FK
--     Only add if the column doesn't exist yet.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Backfill: match on email where possible
UPDATE public.profiles p
SET customer_id = c.id
FROM public.customers c
WHERE LOWER(p.email) = LOWER(c.email)
  AND p.customer_id IS NULL;

-- 2b. Product variants: add generic attributes jsonb
--     Keeps color/ram/storage columns but adds overflow for
--     non-phone products (keyboards, headphones, etc.)
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}';

-- ------------------------------------------------------------
-- 3. SECURITY GAPS
-- ------------------------------------------------------------

-- 3a. email_blocklist: add admin-only RLS
ALTER TABLE public.email_blocklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email blocklist" ON public.email_blocklist;
CREATE POLICY "Admins manage email blocklist" ON public.email_blocklist
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3b. email_logs: add admin-only RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view email logs" ON public.email_logs;
CREATE POLICY "Admins view email logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3c. Messages: DB-level rate limit (max 5 per email per hour)
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.messages
    WHERE sender_email = NEW.sender_email
      AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many messages from this email address.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_message_rate_limit ON public.messages;
CREATE TRIGGER enforce_message_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.check_message_rate_limit();

-- ------------------------------------------------------------
-- 4. MISSING TABLES
-- ------------------------------------------------------------

-- 4a. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',   -- info | order | repair | trade | promo
  reference_id UUID,                          -- optional FK to order/repair/trade
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4b. Coupons / discount codes
CREATE TABLE IF NOT EXISTS public.coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  description      TEXT,
  discount_type    TEXT NOT NULL DEFAULT 'percentage', -- percentage | fixed
  discount_value   NUMERIC NOT NULL,
  min_order_value  NUMERIC DEFAULT 0,
  max_uses         INTEGER,                            -- NULL = unlimited
  used_count       INTEGER NOT NULL DEFAULT 0,
  valid_from       TIMESTAMPTZ DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
CREATE POLICY "Anyone can read active coupons" ON public.coupons
  FOR SELECT TO authenticated, anon
  USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));

-- Track which user used which coupon
CREATE TABLE IF NOT EXISTS public.coupon_uses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id  UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id   UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (coupon_id, user_id)              -- one use per user per coupon
);

ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own coupon uses" ON public.coupon_uses;
CREATE POLICY "Users view own coupon uses" ON public.coupon_uses
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage coupon uses" ON public.coupon_uses;
CREATE POLICY "Admins manage coupon uses" ON public.coupon_uses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger: increment used_count on coupons when a use is recorded
CREATE OR REPLACE FUNCTION public.increment_coupon_used_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_coupon_use ON public.coupon_uses;
CREATE TRIGGER on_coupon_use
  AFTER INSERT ON public.coupon_uses
  FOR EACH ROW EXECUTE FUNCTION public.increment_coupon_used_count();

-- 4c. Returns
CREATE TABLE IF NOT EXISTS public.returns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id       TEXT,
  order_id         UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason           TEXT NOT NULL,
  condition        TEXT NOT NULL DEFAULT 'unopened', -- unopened | opened | damaged
  status           TEXT NOT NULL DEFAULT 'requested', -- requested | approved | rejected | completed
  refund_method    TEXT,                              -- original_payment | store_credit
  refund_amount    NUMERIC,
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own returns" ON public.returns;
CREATE POLICY "Users view own returns" ON public.returns
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users create own returns" ON public.returns;
CREATE POLICY "Users create own returns" ON public.returns
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage returns" ON public.returns;
CREATE POLICY "Admins manage returns" ON public.returns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto display_id for returns (RTN00001)
CREATE SEQUENCE IF NOT EXISTS return_display_seq;

CREATE OR REPLACE FUNCTION public.set_return_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.display_id := public.generate_readable_id('RTN', nextval('return_display_seq'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_return_display_id ON public.returns;
CREATE TRIGGER set_return_display_id
  BEFORE INSERT ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.set_return_display_id();

-- updated_at trigger for returns
DROP TRIGGER IF EXISTS set_returns_updated_at ON public.returns;
CREATE TRIGGER set_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4d. Product images (multi-image gallery)
CREATE TABLE IF NOT EXISTS public.product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt_text   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Images viewable by everyone" ON public.product_images;
CREATE POLICY "Images viewable by everyone" ON public.product_images
  FOR SELECT TO authenticated, anon USING (TRUE);

DROP POLICY IF EXISTS "Admins manage product images" ON public.product_images;
CREATE POLICY "Admins manage product images" ON public.product_images
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Backfill: migrate existing image_url into product_images
INSERT INTO public.product_images (product_id, url, is_primary, sort_order)
SELECT id, image_url, TRUE, 0
FROM public.products
WHERE image_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.product_images pi WHERE pi.product_id = products.id
  );

-- ------------------------------------------------------------
-- 5. LOGIC GAPS
-- ------------------------------------------------------------

-- 5a. Shipping cost validation against shipping method
CREATE OR REPLACE FUNCTION public.validate_shipping_cost()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Enforce expected shipping costs per method
  IF NEW.shipping_method = 'Standard Delivery' AND NEW.shipping_cost != 0 THEN
    RAISE EXCEPTION 'Standard Delivery must have shipping_cost = 0.';
  END IF;
  IF NEW.shipping_method = 'Express Delivery' AND (NEW.shipping_cost IS NULL OR NEW.shipping_cost <= 0) THEN
    RAISE EXCEPTION 'Express Delivery requires a positive shipping_cost.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_shipping_cost ON public.orders;
CREATE TRIGGER validate_shipping_cost
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_shipping_cost();

-- 5b. Verified purchase flag on reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: mark existing reviews as verified if user has a completed order
-- containing that product
UPDATE public.reviews r
SET verified_purchase = TRUE
WHERE EXISTS (
  SELECT 1
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.product_id = r.product_id
    AND o.user_id = r.user_id
    AND o.status = 'delivered'
);

-- Trigger: auto-set verified_purchase on new review insert
CREATE OR REPLACE FUNCTION public.set_verified_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.verified_purchase := EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = NEW.product_id
      AND o.user_id = NEW.user_id
      AND o.status = 'delivered'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_set_verified_purchase ON public.reviews;
CREATE TRIGGER auto_set_verified_purchase
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_verified_purchase();

-- 5c. Stock source of truth: when a product has variants,
--     keep products.stock in sync as sum of variant stocks.
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_variants()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock = (
    SELECT COALESCE(SUM(stock), 0)
    FROM public.product_variants
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_product_stock ON public.product_variants;
CREATE TRIGGER sync_product_stock
  AFTER INSERT OR UPDATE OF stock OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_variants();

-- ------------------------------------------------------------
-- 6. updated_at triggers for new tables
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS set_coupons_updated_at ON public.coupons;
CREATE TRIGGER set_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;