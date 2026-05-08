-- ============================================================
-- BlackBox QA Sprint Migrations (run in Supabase SQL editor)
-- Project: crkmhpfgrvcnmqgiekjb
-- Order matters. Run top-to-bottom in a single transaction.
-- ============================================================
BEGIN;

-- 1. profiles: rename full_name -> name (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN full_name TO name;
  END IF;
END$$;

-- 2. profiles: add avatar_letter
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_letter TEXT;

-- Backfill avatar_letter from name/email
UPDATE public.profiles
SET avatar_letter = UPPER(LEFT(COALESCE(NULLIF(name, ''), email), 1))
WHERE avatar_letter IS NULL;

-- 3. repair_requests: add accessories text[]
ALTER TABLE public.repair_requests
  ADD COLUMN IF NOT EXISTS accessories TEXT[] DEFAULT '{}'::TEXT[];

-- 4. trade_in_requests: add accessories text[]
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS accessories TEXT[] DEFAULT '{}'::TEXT[];

-- 5. order_tracking view -> tracking_updates
CREATE OR REPLACE VIEW public.order_tracking AS
SELECT
  id,
  order_id,
  status,
  description,
  location,
  created_at
FROM public.tracking_updates;

-- ============================================================
-- Data hygiene fixes (referenced by STR-02/03/04)
-- Standardize products.category to canonical set
-- ============================================================
UPDATE public.products SET category = 'iPhone'
  WHERE LOWER(TRIM(category)) IN ('iphone', 'apple iphone', 'iphones', 'mobile phones', 'phone', 'phones');

UPDATE public.products SET category = 'Laptop'
  WHERE LOWER(TRIM(category)) IN ('laptop', 'laptops', 'macbook', 'notebook');

UPDATE public.products SET category = 'Accessories'
  WHERE LOWER(TRIM(category)) IN ('accessories', 'accessory', 'accessorie');

UPDATE public.products SET category = 'Gaming'
  WHERE LOWER(TRIM(category)) IN ('gaming', 'console', 'consoles', 'games');

UPDATE public.products SET category = 'Audio'
  WHERE LOWER(TRIM(category)) IN ('audio', 'headphones', 'earbuds', 'speakers');

-- CHECK constraint after cleanup (drop+recreate to stay idempotent)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_category_check
  CHECK (category IN ('iPhone', 'Laptop', 'Accessories', 'Gaming', 'Audio'));

COMMIT;
