-- ============================================================
-- BlackBox: Production-Ready Pass
-- - Roles: app_role enum + user_roles + has_role()
-- - Products: stock, is_new, featured, display_id columns
-- - RPC: decrement_product_stock (atomic; called on placeOrder)
-- - Seed: products from constants.ts INITIAL_PRODUCTS
-- - Grant admin role to BlackBox@gmail.com if profile exists
--
-- Idempotent. Run once in Supabase SQL editor.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. ROLES
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'staff', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer role check (avoids RLS recursion).
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- 2. PRODUCTS: ensure columns the app already references exist
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_new     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS display_id TEXT;

-- ------------------------------------------------------------
-- 3. STOCK DECREMENT RPC (atomic, RLS-safe via SECURITY DEFINER)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  _product_id TEXT,
  _quantity   INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.products
     SET stock = GREATEST(0, COALESCE(stock,0) - _quantity)
   WHERE id = _product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_product_stock(TEXT, INTEGER)
  TO authenticated, anon;

-- ------------------------------------------------------------
-- 4. SEED PRODUCTS (from constants.ts INITIAL_PRODUCTS)
--    Upsert by id so re-running doesn't duplicate.
-- ------------------------------------------------------------
INSERT INTO public.products
  (id, name, description, price, image_url, category, rating, review_count, discount, is_new, stock, featured)
VALUES
  ('BB-101','iPhone 14 Midnight Black Unlocked','Advanced dual-camera system. A15 Bionic chip. Ceramic Shield.',7999,'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?auto=format&fit=crop&q=80&w=800','iPhone',4.2,678,16,FALSE,15,TRUE),
  ('BB-102','Apple Pencil (2nd Generation)','Precision performance for iPad Pro, iPad Air, and iPad mini.',1299,'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=800','Accessories',4.5,678,NULL,FALSE,50,FALSE),
  ('BB-103','AirPods Pro (2nd Generation)','Active Noise Cancellation and Adaptive Transparency.',2499,'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?auto=format&fit=crop&q=80&w=800','Accessories',4.3,589,11,FALSE,30,TRUE),
  ('BB-104','PlayStation 5 Console','Experience lightning-fast loading and deeper immersion.',5499,'https://images.unsplash.com/photo-1606813907291-d86ebb9474ad?auto=format&fit=crop&q=80&w=800','Gaming',4.8,512,NULL,TRUE,12,TRUE),
  ('BB-105','MacBook Air 15" M2 Chip','The worlds best 15-inch laptop.',12999,'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=1200','Laptop',4.7,421,NULL,FALSE,8,TRUE),
  ('BB-106','Nintendo Switch OLED','Vivid colors and crisp contrast on a larger OLED screen.',4500,'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&q=80&w=1200','Gaming',4.9,942,11,TRUE,15,FALSE),
  ('BB-107','MacBook Pro 14" M3 Chip','The most advanced chips ever built for a personal computer.',18499,'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=1200','Laptop',4.8,312,NULL,TRUE,5,TRUE),
  ('BB-108','MacBook Pro 16" M3 Max','Extreme performance for pro workflows.',34999,'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=1200','Laptop',4.9,156,NULL,TRUE,3,FALSE),
  ('BB-109','AirPods Max - Space Gray','High-fidelity audio with Active Noise Cancellation.',4999,'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?auto=format&fit=crop&q=80&w=800','Audio',4.7,234,NULL,FALSE,12,FALSE),
  ('BB-110','Sony WH-1000XM5 Wireless Headphones','Industry-leading noise cancellation. Exceptional sound quality.',3499,'https://images.unsplash.com/photo-1618366712277-722626e13e0e?auto=format&fit=crop&q=80&w=800','Audio',4.8,456,NULL,FALSE,20,TRUE),
  ('BB-111','iPad Pro 12.9" M2 Chip','Astonishing performance. Incredibly advanced displays.',15999,'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=1200','Accessories',4.8,289,NULL,TRUE,10,FALSE),
  ('BB-112','Dell XPS 15 Laptop','Stunning 4K OLED display and powerful performance.',21999,'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=1200','Laptop',4.6,167,NULL,FALSE,6,FALSE),
  ('BB-113','Logitech MX Master 3S','Ultrafast scrolling, ergonomic design, and silent clicks.',999,'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=800','Accessories',4.9,850,NULL,FALSE,45,FALSE),
  ('BB-114','Keychron K2 Mechanical Keyboard','Compact 75% layout with RGB backlighting and wireless connectivity.',899,'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=800','Accessories',4.7,420,NULL,FALSE,25,FALSE),
  ('BB-115','Samsung Galaxy Buds2 Pro','Ultimate 24-bit Hi-Fi sound and Intelligent ANC.',1899,'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800','Audio',4.6,310,NULL,FALSE,18,FALSE),
  ('BB-116','Razer Blade 16 Gaming Laptop','Incredible performance with RTX 4090 and Mini-LED display.',35999,'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=1200','Laptop',4.8,95,NULL,TRUE,4,TRUE)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  price        = EXCLUDED.price,
  image_url    = EXCLUDED.image_url,
  category     = EXCLUDED.category,
  rating       = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  discount     = EXCLUDED.discount,
  is_new       = EXCLUDED.is_new,
  stock        = EXCLUDED.stock,
  featured     = EXCLUDED.featured;

-- ------------------------------------------------------------
-- 5. GRANT ADMIN to seed account if it has signed up
-- ------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE LOWER(email) = LOWER('BlackBox@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
