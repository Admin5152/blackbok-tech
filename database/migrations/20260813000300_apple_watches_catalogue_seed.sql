-- =====================================================================
-- BlackBox Ghana — Apple Watches August retail catalogue seed
-- Migration: 20260813000300_apple_watches_catalogue_seed.sql
--
-- Source: IWATCHES PRICING AUGUST.pdf
-- Taxonomy: category Smart watches · subcategory Ultra | Series
-- Structure mirrors Laptops/MacBooks (products + SKU variants).
-- Idempotent upserts — safe to re-run in the Supabase SQL editor.
--
-- Verify:
--   SELECT name, subcategory, condition, price
--   FROM products WHERE specifications->>'catalog' = 'watches'
--   ORDER BY subcategory, name;
-- =====================================================================

BEGIN;

-- Ensure category + subcategory allow Apple Watches / Ultra / Series / neo
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.products'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ~* 'category'
      AND pg_get_constraintdef(c.oid) !~* 'subcategory'
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check
  CHECK (
    category IS NULL
    OR category IN (
      'iPhone', 'Android phones', 'iPad', 'MacBooks', 'Laptops',
      'Apple Watches', 'Smart watches',
      'Gaming', 'Headphones', 'Speakers', 'Accessories',
      'Consoles', 'Controllers',
      'Laptop', 'Audio', 'Tablet', 'Trades'
    )
  ) NOT VALID;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_subcategory_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_subcategory_check
  CHECK (
    subcategory IS NULL
    OR subcategory IN (
      'new', 'used', 'preowned', 'refurbished',
      'iWatches', 'Others',
      'Ultra', 'Series', 'Galaxy',
      'PlayStation', 'Xbox', 'Steam', 'Nintendo',
      'AirPods', 'JBL', 'Sony', 'EarPods', 'Beats',
      'HomePod', 'HarmanKardon',
      'PhoneCases', 'ScreenProtectors', 'Chargers',
      'HP', 'Dell',
      'Tune', 'Solo', 'Flip', 'Charge', 'Boombox', 'Go', 'Onyx', 'Pill',
      'Omen', 'Envy', 'Victus', 'Alienware',
      'pro', 'air', 'mini', 'standard', 'other', 'neo',
      'iphone-17', 'iphone-16', 'iphone-15', 'iphone-14',
      'iphone-13', 'iphone-12', 'iphone-11', 'iphone-x',
      'iphone-se', 'iphone-older',
      'PlayStation 5', 'PlayStation Portal', 'Xbox Series',
      'Switch', 'Steam Deck', 'DualSense'
    )
  ) NOT VALID;

-- Product: Apple Watch Ultra 3 (49mm) (new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Watch Ultra 3 (49mm)', 'apple-watch-ultra-3-49mm-new', 'Apple', 'Smart watches',
  'Ultra', 'new', 'active', 8499, 'GHS', 0,
  'Apple Apple Watch Ultra 3 (49mm) — brand new',
  '{"catalog":"watches","watch_group":"Ultra","series":"Ultra","generation":"3","display":"49mm","case_size":"49mm","os":"watchOS"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[]
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  condition = EXCLUDED.condition,
  status = EXCLUDED.status,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  specifications = EXCLUDED.specifications,
  is_new = EXCLUDED.is_new,
  colors = EXCLUDED.colors,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'APPLE-WATCHULTRA-3-49MM-NEW', NULL, NULL, NULL, NULL, '49mm',
  8499, 0, true, NULL, '{"status":"active","catalog":"watches","watch_group":"Ultra","series":"Ultra","generation":"3","model_slug":"apple-watch-ultra-3-49mm-new","source_sku":"APPLE-WATCHULTRA-3-49MM"}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-watch-ultra-3-49mm-new'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  color = EXCLUDED.color,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  sim_type = EXCLUDED.sim_type,
  display_size = EXCLUDED.display_size,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
  attributes = EXCLUDED.attributes,
  updated_at = NOW();
-- Product: Apple Watch Ultra 2 (49mm) (new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Watch Ultra 2 (49mm)', 'apple-watch-ultra-2-49mm-new', 'Apple', 'Smart watches',
  'Ultra', 'new', 'active', 6499, 'GHS', 0,
  'Apple Apple Watch Ultra 2 (49mm) — brand new',
  '{"catalog":"watches","watch_group":"Ultra","series":"Ultra","generation":"2","display":"49mm","case_size":"49mm","os":"watchOS"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[]
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  condition = EXCLUDED.condition,
  status = EXCLUDED.status,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  specifications = EXCLUDED.specifications,
  is_new = EXCLUDED.is_new,
  colors = EXCLUDED.colors,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'APPLE-WATCHULTRA-2-49MM-NEW', NULL, NULL, NULL, NULL, '49mm',
  6499, 0, true, NULL, '{"status":"active","catalog":"watches","watch_group":"Ultra","series":"Ultra","generation":"2","model_slug":"apple-watch-ultra-2-49mm-new","source_sku":"APPLE-WATCHULTRA-2-49MM"}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-watch-ultra-2-49mm-new'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  color = EXCLUDED.color,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  sim_type = EXCLUDED.sim_type,
  display_size = EXCLUDED.display_size,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
  attributes = EXCLUDED.attributes,
  updated_at = NOW();
-- Product: Apple Watch Series 11 (46mm) (new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Watch Series 11 (46mm)', 'apple-watch-series-11-46mm-new', 'Apple', 'Smart watches',
  'Series', 'new', 'active', 4999, 'GHS', 0,
  'Apple Apple Watch Series 11 (46mm) — brand new',
  '{"catalog":"watches","watch_group":"Series","series":"Series","generation":"11","display":"46mm","case_size":"46mm","os":"watchOS"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[]
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  condition = EXCLUDED.condition,
  status = EXCLUDED.status,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  specifications = EXCLUDED.specifications,
  is_new = EXCLUDED.is_new,
  colors = EXCLUDED.colors,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'APPLE-WATCHSERIES-11-46MM-NEW', NULL, NULL, NULL, NULL, '46mm',
  4999, 0, true, NULL, '{"status":"active","catalog":"watches","watch_group":"Series","series":"Series","generation":"11","model_slug":"apple-watch-series-11-46mm-new","source_sku":"APPLE-WATCHSERIES-11-46MM"}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-watch-series-11-46mm-new'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  color = EXCLUDED.color,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  sim_type = EXCLUDED.sim_type,
  display_size = EXCLUDED.display_size,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
  attributes = EXCLUDED.attributes,
  updated_at = NOW();
-- Product: Apple Watch Series 11 (42mm) (new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Watch Series 11 (42mm)', 'apple-watch-series-11-42mm-new', 'Apple', 'Smart watches',
  'Series', 'new', 'active', 4499, 'GHS', 0,
  'Apple Apple Watch Series 11 (42mm) — brand new',
  '{"catalog":"watches","watch_group":"Series","series":"Series","generation":"11","display":"42mm","case_size":"42mm","os":"watchOS"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[]
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  condition = EXCLUDED.condition,
  status = EXCLUDED.status,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  specifications = EXCLUDED.specifications,
  is_new = EXCLUDED.is_new,
  colors = EXCLUDED.colors,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'APPLE-WATCHSERIES-11-42MM-NEW', NULL, NULL, NULL, NULL, '42mm',
  4499, 0, true, NULL, '{"status":"active","catalog":"watches","watch_group":"Series","series":"Series","generation":"11","model_slug":"apple-watch-series-11-42mm-new","source_sku":"APPLE-WATCHSERIES-11-42MM"}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-watch-series-11-42mm-new'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  color = EXCLUDED.color,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  sim_type = EXCLUDED.sim_type,
  display_size = EXCLUDED.display_size,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
  attributes = EXCLUDED.attributes,
  updated_at = NOW();
-- Product: Apple Watch Series 8 (41mm) (new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Watch Series 8 (41mm)', 'apple-watch-series-8-41mm-new', 'Apple', 'Smart watches',
  'Series', 'new', 'active', 2699, 'GHS', 0,
  'Apple Apple Watch Series 8 (41mm) — brand new',
  '{"catalog":"watches","watch_group":"Series","series":"Series","generation":"8","display":"41mm","case_size":"41mm","os":"watchOS"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[]
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  condition = EXCLUDED.condition,
  status = EXCLUDED.status,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  specifications = EXCLUDED.specifications,
  is_new = EXCLUDED.is_new,
  colors = EXCLUDED.colors,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'APPLE-WATCHSERIES-8-41MM-NEW', NULL, NULL, NULL, NULL, '41mm',
  2699, 0, true, NULL, '{"status":"active","catalog":"watches","watch_group":"Series","series":"Series","generation":"8","model_slug":"apple-watch-series-8-41mm-new","source_sku":"APPLE-WATCHSERIES-8-41MM"}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-watch-series-8-41mm-new'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  color = EXCLUDED.color,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  sim_type = EXCLUDED.sim_type,
  display_size = EXCLUDED.display_size,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
  attributes = EXCLUDED.attributes,
  updated_at = NOW();
-- Product: Apple Watch Series 6 (44mm) (preowned)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Watch Series 6 (44mm)', 'apple-watch-series-6-44mm-preowned', 'Apple', 'Smart watches',
  'Series', 'preowned', 'active', 1649, 'GHS', 0,
  'Apple Apple Watch Series 6 (44mm) — pre-owned',
  '{"catalog":"watches","watch_group":"Series","series":"Series","generation":"6","display":"44mm","case_size":"44mm","os":"watchOS"}'::jsonb, false, false,
  ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[]
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  condition = EXCLUDED.condition,
  status = EXCLUDED.status,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  specifications = EXCLUDED.specifications,
  is_new = EXCLUDED.is_new,
  colors = EXCLUDED.colors,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'APPLE-WATCHSERIES-6-44MM-PREOWNED', NULL, NULL, NULL, NULL, '44mm',
  1649, 0, true, NULL, '{"status":"active","catalog":"watches","watch_group":"Series","series":"Series","generation":"6","model_slug":"apple-watch-series-6-44mm-preowned","source_sku":"APPLE-WATCHSERIES-6-44MM"}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-watch-series-6-44mm-preowned'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  color = EXCLUDED.color,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  sim_type = EXCLUDED.sim_type,
  display_size = EXCLUDED.display_size,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
  attributes = EXCLUDED.attributes,
  updated_at = NOW();
-- Product: Apple Watch Series 6 (40mm) (preowned)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Watch Series 6 (40mm)', 'apple-watch-series-6-40mm-preowned', 'Apple', 'Smart watches',
  'Series', 'preowned', 'active', 1449, 'GHS', 0,
  'Apple Apple Watch Series 6 (40mm) — pre-owned',
  '{"catalog":"watches","watch_group":"Series","series":"Series","generation":"6","display":"40mm","case_size":"40mm","os":"watchOS"}'::jsonb, false, false,
  ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[]
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  condition = EXCLUDED.condition,
  status = EXCLUDED.status,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  specifications = EXCLUDED.specifications,
  is_new = EXCLUDED.is_new,
  colors = EXCLUDED.colors,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'APPLE-WATCHSERIES-6-40MM-PREOWNED', NULL, NULL, NULL, NULL, '40mm',
  1449, 0, true, NULL, '{"status":"active","catalog":"watches","watch_group":"Series","series":"Series","generation":"6","model_slug":"apple-watch-series-6-40mm-preowned","source_sku":"APPLE-WATCHSERIES-6-40MM"}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-watch-series-6-40mm-preowned'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  color = EXCLUDED.color,
  storage = EXCLUDED.storage,
  ram = EXCLUDED.ram,
  sim_type = EXCLUDED.sim_type,
  display_size = EXCLUDED.display_size,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

UPDATE public.products p SET
  price = COALESCE((SELECT MIN(pv.price) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.is_active AND pv.price > 0), p.price),
  stock = COALESCE((SELECT SUM(pv.stock) FROM public.product_variants pv WHERE pv.product_id = p.id), p.stock),
  updated_at = NOW()
WHERE p.specifications->>'catalog' = 'watches';

COMMIT;
