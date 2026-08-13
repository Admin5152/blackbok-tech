-- =====================================================================
-- BlackBox Ghana — Android phones August retail catalogue seed
-- Migration: 20260813000400_android_phones_catalogue_seed.sql
--
-- Source: ANDROID PHONES PRICELIST AUGUST-2.pdf
-- Taxonomy: Android phones → Brand (Samsung / Google / Motorola) → Series
-- Skipped blank price rows (Fold 7 16GB/1TB, A35 6GB/128GB).
-- Idempotent upserts — safe to re-run in the Supabase SQL editor.
--
-- Verify:
--   SELECT brand, subcategory, name, price FROM products
--   WHERE specifications->>'catalog' = 'android'
--   ORDER BY brand, subcategory, name;
-- =====================================================================

BEGIN;

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
      'Switch', 'Steam Deck', 'DualSense',
      -- Android phone series (August pricelist)
      'A06',
      'A07',
      'A17',
      'A26',
      'A36',
      'A55',
      'A56',
      'Flip 7',
      'Flip 7 FE',
      'Fold 7',
      'Moto G 2024',
      'Moto G 2025',
      'Pixel 10 Pro XL',
      'Pixel 7',
      'Pixel 8',
      'Pixel 9 Pro XL',
      'S25 FE',
      'S25 Ultra',
      'S26 Ultra',
      'Samsung', 'Google', 'Motorola'
    )
  ) NOT VALID;

-- Product: Galaxy Z Fold 7 (Samsung / Fold 7)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy Z Fold 7', 'samsung-galaxy-z-fold-7-new', 'Samsung', 'Android phones',
  'Fold 7', 'new', 'active', 16499, 'GHS', 0,
  'Samsung Galaxy Z Fold 7 — brand new',
  '{"catalog":"android","series":"Fold 7","series_name":"Fold 7","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['256GB', '512GB']::TEXT[], ARRAY['12GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-FOLD7-12GB-256GB-NEW', NULL, '256GB', '12GB', NULL, NULL,
  16499, 0, true, NULL, '{"status":"active","catalog":"android","series":"Fold 7","model_slug":"samsung-galaxy-z-fold-7-new","source_sku":"ANDROID-SAMSUNG-FOLD7-12GB-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-z-fold-7-new'
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
INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ANDROID-SAMSUNG-FOLD7-12GB-512GB-NEW', NULL, '512GB', '12GB', NULL, NULL,
  17499, 0, true, NULL, '{"status":"active","catalog":"android","series":"Fold 7","model_slug":"samsung-galaxy-z-fold-7-new","source_sku":"ANDROID-SAMSUNG-FOLD7-12GB-512GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-z-fold-7-new'
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
-- Product: Galaxy Z Flip 7 (Samsung / Flip 7)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy Z Flip 7', 'samsung-galaxy-z-flip-7-new', 'Samsung', 'Android phones',
  'Flip 7', 'new', 'active', 10199, 'GHS', 0,
  'Samsung Galaxy Z Flip 7 — brand new',
  '{"catalog":"android","series":"Flip 7","series_name":"Flip 7","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['256GB']::TEXT[], ARRAY['12GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-FLIP7-12GB-256GB-NEW', NULL, '256GB', '12GB', NULL, NULL,
  10199, 0, true, NULL, '{"status":"active","catalog":"android","series":"Flip 7","model_slug":"samsung-galaxy-z-flip-7-new","source_sku":"ANDROID-SAMSUNG-FLIP7-12GB-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-z-flip-7-new'
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
-- Product: Galaxy Z Flip 7 FE (Samsung / Flip 7 FE)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy Z Flip 7 FE', 'samsung-galaxy-z-flip-7-fe-new', 'Samsung', 'Android phones',
  'Flip 7 FE', 'new', 'active', 7999, 'GHS', 0,
  'Samsung Galaxy Z Flip 7 FE — brand new',
  '{"catalog":"android","series":"Flip 7 FE","series_name":"Flip 7 FE","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB']::TEXT[], ARRAY['8GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-FLIP7FE-8GB-128GB-NEW', NULL, '128GB', '8GB', NULL, NULL,
  7999, 0, true, NULL, '{"status":"active","catalog":"android","series":"Flip 7 FE","model_slug":"samsung-galaxy-z-flip-7-fe-new","source_sku":"ANDROID-SAMSUNG-FLIP7FE-8GB-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-z-flip-7-fe-new'
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
-- Product: Galaxy S26 Ultra (Samsung / S26 Ultra)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy S26 Ultra', 'samsung-galaxy-s26-ultra-new', 'Samsung', 'Android phones',
  'S26 Ultra', 'new', 'active', 12499, 'GHS', 0,
  'Samsung Galaxy S26 Ultra — brand new',
  '{"catalog":"android","series":"S26 Ultra","series_name":"S26 Ultra","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['256GB']::TEXT[], ARRAY['12GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-S26ULTRA-12GB-256GB-NEW', NULL, '256GB', '12GB', NULL, NULL,
  12499, 0, true, NULL, '{"status":"active","catalog":"android","series":"S26 Ultra","model_slug":"samsung-galaxy-s26-ultra-new","source_sku":"ANDROID-SAMSUNG-S26ULTRA-12GB-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-s26-ultra-new'
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
-- Product: Galaxy S25 Ultra (Samsung / S25 Ultra)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy S25 Ultra', 'samsung-galaxy-s25-ultra-new', 'Samsung', 'Android phones',
  'S25 Ultra', 'new', 'active', 9999, 'GHS', 0,
  'Samsung Galaxy S25 Ultra — brand new',
  '{"catalog":"android","series":"S25 Ultra","series_name":"S25 Ultra","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['256GB']::TEXT[], ARRAY['12GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-S25ULTRA-12GB-256GB-NEW', NULL, '256GB', '12GB', NULL, NULL,
  9999, 0, true, NULL, '{"status":"active","catalog":"android","series":"S25 Ultra","model_slug":"samsung-galaxy-s25-ultra-new","source_sku":"ANDROID-SAMSUNG-S25ULTRA-12GB-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-s25-ultra-new'
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
-- Product: Galaxy S25 FE (Samsung / S25 FE)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy S25 FE', 'samsung-galaxy-s25-fe-new', 'Samsung', 'Android phones',
  'S25 FE', 'new', 'active', 7499, 'GHS', 0,
  'Samsung Galaxy S25 FE — brand new',
  '{"catalog":"android","series":"S25 FE","series_name":"S25 FE","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['256GB']::TEXT[], ARRAY['8GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-S25FE-8GB-256GB-NEW', NULL, '256GB', '8GB', NULL, NULL,
  7499, 0, true, NULL, '{"status":"active","catalog":"android","series":"S25 FE","model_slug":"samsung-galaxy-s25-fe-new","source_sku":"ANDROID-SAMSUNG-S25FE-8GB-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-s25-fe-new'
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
-- Product: Galaxy A06 (Samsung / A06)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy A06', 'samsung-galaxy-a06-new', 'Samsung', 'Android phones',
  'A06', 'new', 'active', 1349, 'GHS', 0,
  'Samsung Galaxy A06 — brand new',
  '{"catalog":"android","series":"A06","series_name":"A06","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['64GB', '128GB']::TEXT[], ARRAY['4GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-A06-4GB-64GB-NEW', NULL, '64GB', '4GB', NULL, NULL,
  1349, 0, true, NULL, '{"status":"active","catalog":"android","series":"A06","model_slug":"samsung-galaxy-a06-new","source_sku":"ANDROID-SAMSUNG-A06-4GB-64GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a06-new'
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
INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ANDROID-SAMSUNG-A06-4GB-128GB-NEW', NULL, '128GB', '4GB', NULL, NULL,
  1599, 0, true, NULL, '{"status":"active","catalog":"android","series":"A06","model_slug":"samsung-galaxy-a06-new","source_sku":"ANDROID-SAMSUNG-A06-4GB-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a06-new'
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
-- Product: Galaxy A07 (Samsung / A07)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy A07', 'samsung-galaxy-a07-new', 'Samsung', 'Android phones',
  'A07', 'new', 'active', 1529, 'GHS', 0,
  'Samsung Galaxy A07 — brand new',
  '{"catalog":"android","series":"A07","series_name":"A07","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['64GB', '128GB']::TEXT[], ARRAY['4GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-A07-4GB-64GB-NEW', NULL, '64GB', '4GB', NULL, NULL,
  1529, 0, true, NULL, '{"status":"active","catalog":"android","series":"A07","model_slug":"samsung-galaxy-a07-new","source_sku":"ANDROID-SAMSUNG-A07-4GB-64GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a07-new'
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
INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ANDROID-SAMSUNG-A07-4GB-128GB-NEW', NULL, '128GB', '4GB', NULL, NULL,
  1649, 0, true, NULL, '{"status":"active","catalog":"android","series":"A07","model_slug":"samsung-galaxy-a07-new","source_sku":"ANDROID-SAMSUNG-A07-4GB-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a07-new'
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
-- Product: Galaxy A17 (Samsung / A17)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy A17', 'samsung-galaxy-a17-new', 'Samsung', 'Android phones',
  'A17', 'new', 'active', 2399, 'GHS', 0,
  'Samsung Galaxy A17 — brand new',
  '{"catalog":"android","series":"A17","series_name":"A17","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB', '256GB']::TEXT[], ARRAY['4GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-A17-4GB-128GB-NEW', NULL, '128GB', '4GB', NULL, NULL,
  2399, 0, true, NULL, '{"status":"active","catalog":"android","series":"A17","model_slug":"samsung-galaxy-a17-new","source_sku":"ANDROID-SAMSUNG-A17-4GB-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a17-new'
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
INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ANDROID-SAMSUNG-A17-4GB-256GB-NEW', NULL, '256GB', '4GB', NULL, NULL,
  2649, 0, true, NULL, '{"status":"active","catalog":"android","series":"A17","model_slug":"samsung-galaxy-a17-new","source_sku":"ANDROID-SAMSUNG-A17-4GB-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a17-new'
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
-- Product: Galaxy A26 (Samsung / A26)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy A26', 'samsung-galaxy-a26-new', 'Samsung', 'Android phones',
  'A26', 'new', 'active', 2899, 'GHS', 0,
  'Samsung Galaxy A26 — brand new',
  '{"catalog":"android","series":"A26","series_name":"A26","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB', '256GB']::TEXT[], ARRAY['6GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-A26-6GB-128GB-NEW', NULL, '128GB', '6GB', NULL, NULL,
  2899, 0, true, NULL, '{"status":"active","catalog":"android","series":"A26","model_slug":"samsung-galaxy-a26-new","source_sku":"ANDROID-SAMSUNG-A26-6GB-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a26-new'
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
INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ANDROID-SAMSUNG-A26-6GB-256GB-NEW', NULL, '256GB', '6GB', NULL, NULL,
  3199, 0, true, NULL, '{"status":"active","catalog":"android","series":"A26","model_slug":"samsung-galaxy-a26-new","source_sku":"ANDROID-SAMSUNG-A26-6GB-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a26-new'
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
-- Product: Galaxy A36 (Samsung / A36)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy A36', 'samsung-galaxy-a36-new', 'Samsung', 'Android phones',
  'A36', 'new', 'active', 3649, 'GHS', 0,
  'Samsung Galaxy A36 — brand new',
  '{"catalog":"android","series":"A36","series_name":"A36","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB', '256GB']::TEXT[], ARRAY['6GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-A36-6GB-128GB-NEW', NULL, '128GB', '6GB', NULL, NULL,
  3649, 0, true, NULL, '{"status":"active","catalog":"android","series":"A36","model_slug":"samsung-galaxy-a36-new","source_sku":"ANDROID-SAMSUNG-A36-6GB-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a36-new'
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
INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ANDROID-SAMSUNG-A36-6GB-256GB-NEW', NULL, '256GB', '6GB', NULL, NULL,
  4049, 0, true, NULL, '{"status":"active","catalog":"android","series":"A36","model_slug":"samsung-galaxy-a36-new","source_sku":"ANDROID-SAMSUNG-A36-6GB-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a36-new'
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
-- Product: Galaxy A55 (Samsung / A55)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy A55', 'samsung-galaxy-a55-new', 'Samsung', 'Android phones',
  'A55', 'new', 'active', 4649, 'GHS', 0,
  'Samsung Galaxy A55 — brand new',
  '{"catalog":"android","series":"A55","series_name":"A55","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB']::TEXT[], ARRAY['6GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-A55-6GB-128GB-NEW', NULL, '128GB', '6GB', NULL, NULL,
  4649, 0, true, NULL, '{"status":"active","catalog":"android","series":"A55","model_slug":"samsung-galaxy-a55-new","source_sku":"ANDROID-SAMSUNG-A55-6GB-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a55-new'
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
-- Product: Galaxy A56 (Samsung / A56)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Galaxy A56', 'samsung-galaxy-a56-new', 'Samsung', 'Android phones',
  'A56', 'new', 'active', 5049, 'GHS', 0,
  'Samsung Galaxy A56 — brand new',
  '{"catalog":"android","series":"A56","series_name":"A56","brand_line":"Samsung"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB', '256GB']::TEXT[], ARRAY['6GB']::TEXT[]
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
  p.id, 'ANDROID-SAMSUNG-A56-6GB-128GB-NEW', NULL, '128GB', '6GB', NULL, NULL,
  5049, 0, true, NULL, '{"status":"active","catalog":"android","series":"A56","model_slug":"samsung-galaxy-a56-new","source_sku":"ANDROID-SAMSUNG-A56-6GB-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a56-new'
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
INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ANDROID-SAMSUNG-A56-6GB-256GB-NEW', NULL, '256GB', '6GB', NULL, NULL,
  5649, 0, true, NULL, '{"status":"active","catalog":"android","series":"A56","model_slug":"samsung-galaxy-a56-new","source_sku":"ANDROID-SAMSUNG-A56-6GB-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'samsung-galaxy-a56-new'
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
-- Product: Pixel 10 Pro XL (Google / Pixel 10 Pro XL)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Pixel 10 Pro XL', 'google-pixel-10-pro-xl-new', 'Google', 'Android phones',
  'Pixel 10 Pro XL', 'new', 'active', 12000, 'GHS', 0,
  'Google Pixel 10 Pro XL — brand new',
  '{"catalog":"android","series":"Pixel 10 Pro XL","series_name":"Pixel 10 Pro XL","brand_line":"Google"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['256GB']::TEXT[], ARRAY[]::TEXT[]
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
  p.id, 'ANDROID-GOOGLE-PIXEL10PROXL-256GB-NEW', NULL, '256GB', NULL, NULL, NULL,
  12000, 0, true, NULL, '{"status":"active","catalog":"android","series":"Pixel 10 Pro XL","model_slug":"google-pixel-10-pro-xl-new","source_sku":"ANDROID-GOOGLE-PIXEL10PROXL-256GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'google-pixel-10-pro-xl-new'
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
-- Product: Pixel 9 Pro XL (Google / Pixel 9 Pro XL)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Pixel 9 Pro XL', 'google-pixel-9-pro-xl-new', 'Google', 'Android phones',
  'Pixel 9 Pro XL', 'new', 'active', 6999, 'GHS', 0,
  'Google Pixel 9 Pro XL — brand new',
  '{"catalog":"android","series":"Pixel 9 Pro XL","series_name":"Pixel 9 Pro XL","brand_line":"Google"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB']::TEXT[], ARRAY[]::TEXT[]
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
  p.id, 'ANDROID-GOOGLE-PIXEL9PROXL-128GB-NEW', NULL, '128GB', NULL, NULL, NULL,
  6999, 0, true, NULL, '{"status":"active","catalog":"android","series":"Pixel 9 Pro XL","model_slug":"google-pixel-9-pro-xl-new","source_sku":"ANDROID-GOOGLE-PIXEL9PROXL-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'google-pixel-9-pro-xl-new'
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
-- Product: Pixel 8 (Google / Pixel 8)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Pixel 8', 'google-pixel-8-new', 'Google', 'Android phones',
  'Pixel 8', 'new', 'active', 4999, 'GHS', 0,
  'Google Pixel 8 — brand new',
  '{"catalog":"android","series":"Pixel 8","series_name":"Pixel 8","brand_line":"Google"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB']::TEXT[], ARRAY[]::TEXT[]
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
  p.id, 'ANDROID-GOOGLE-PIXEL8-128GB-NEW', NULL, '128GB', NULL, NULL, NULL,
  4999, 0, true, NULL, '{"status":"active","catalog":"android","series":"Pixel 8","model_slug":"google-pixel-8-new","source_sku":"ANDROID-GOOGLE-PIXEL8-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'google-pixel-8-new'
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
-- Product: Pixel 7 (Google / Pixel 7)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Pixel 7', 'google-pixel-7-new', 'Google', 'Android phones',
  'Pixel 7', 'new', 'active', 3999, 'GHS', 0,
  'Google Pixel 7 — brand new',
  '{"catalog":"android","series":"Pixel 7","series_name":"Pixel 7","brand_line":"Google"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB']::TEXT[], ARRAY[]::TEXT[]
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
  p.id, 'ANDROID-GOOGLE-PIXEL7-128GB-NEW', NULL, '128GB', NULL, NULL, NULL,
  3999, 0, true, NULL, '{"status":"active","catalog":"android","series":"Pixel 7","model_slug":"google-pixel-7-new","source_sku":"ANDROID-GOOGLE-PIXEL7-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'google-pixel-7-new'
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
-- Product: Moto G (2024) (Motorola / Moto G 2024)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Moto G (2024)', 'motorola-moto-g-2024-new', 'Motorola', 'Android phones',
  'Moto G 2024', 'new', 'active', 1899, 'GHS', 0,
  'Motorola Moto G (2024) — brand new',
  '{"catalog":"android","series":"Moto G 2024","series_name":"Moto G 2024","brand_line":"Motorola"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB']::TEXT[], ARRAY[]::TEXT[]
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
  p.id, 'ANDROID-MOTOROLA-MOTOG2024-128GB-NEW', NULL, '128GB', NULL, NULL, NULL,
  1899, 0, true, NULL, '{"status":"active","catalog":"android","series":"Moto G 2024","model_slug":"motorola-moto-g-2024-new","source_sku":"ANDROID-MOTOROLA-MOTOG2024-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'motorola-moto-g-2024-new'
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
-- Product: Moto G (2025) (Motorola / Moto G 2025)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Moto G (2025)', 'motorola-moto-g-2025-new', 'Motorola', 'Android phones',
  'Moto G 2025', 'new', 'active', 2099, 'GHS', 0,
  'Motorola Moto G (2025) — brand new',
  '{"catalog":"android","series":"Moto G 2025","series_name":"Moto G 2025","brand_line":"Motorola"}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['128GB']::TEXT[], ARRAY[]::TEXT[]
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
  p.id, 'ANDROID-MOTOROLA-MOTOG2025-128GB-NEW', NULL, '128GB', NULL, NULL, NULL,
  2099, 0, true, NULL, '{"status":"active","catalog":"android","series":"Moto G 2025","model_slug":"motorola-moto-g-2025-new","source_sku":"ANDROID-MOTOROLA-MOTOG2025-128GB"}'::jsonb
FROM public.products p
WHERE p.slug = 'motorola-moto-g-2025-new'
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
WHERE p.specifications->>'catalog' = 'android';

COMMIT;
