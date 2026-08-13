-- =====================================================================
-- BlackBox Ghana — MacBooks & Other Macs August retail catalogue seed
-- Migration: 20260813000200_macbooks_other_macs_catalogue_seed.sql
--
-- Source: MACBOOKS & OTHER MACS PRICING AUGUST.pdf
-- Structure mirrors Laptops seed (products + single SKU variants,
-- KEY-style specifications: processor/chip, year, storage, memory, display).
-- Idempotent upserts — safe to re-run in the Supabase SQL editor.
--
-- Verify:
--   SELECT name, subcategory, condition, price, storage, ram
--   FROM products WHERE specifications->>'catalog' = 'macbook'
--   ORDER BY subcategory, name, price;
--   SELECT sku, storage, ram, display_size, price
--   FROM product_variants
--   WHERE attributes->>'catalog' = 'macbook' ORDER BY sku;
-- =====================================================================

BEGIN;

-- Widen subcategory check for Mac series (incl. neo). NOT VALID skips legacy-row recheck.
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

-- Product: MacBook Pro 14" M5 (2025) (512GB/16GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 14" M5 (2025)', 'apple-macbook-pro-14-m5-2025-new-512gb', 'Apple', 'MacBooks',
  'pro', 'new', 'active', 20499, 'GHS', 0,
  'Apple MacBook Pro 14" M5 (2025) · 512GB / 16GB · 14" — brand new',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"M5","generation":"2025","storage_label":"512GB","memory":"16GB RAM","display":"14\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M5","year":2025}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['512GB']::TEXT[], ARRAY['16GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-14-M5-2025-512GB-16GB-NEW', NULL, '512GB', '16GB', NULL, '14"',
  20499, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-14-m5-2025-new-512gb","source_sku":"APPLE-MACBOOKPRO-14-M5-2025-512GB-16GB","chip":"M5","year":2025}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-14-m5-2025-new-512gb'
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
-- Product: MacBook Pro 14" M5 (2025) (1TB/16GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 14" M5 (2025)', 'apple-macbook-pro-14-m5-2025-new-1tb', 'Apple', 'MacBooks',
  'pro', 'new', 'active', 22499, 'GHS', 0,
  'Apple MacBook Pro 14" M5 (2025) · 1TB / 16GB · 14" — brand new',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"M5","generation":"2025","storage_label":"1TB","memory":"16GB RAM","display":"14\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M5","year":2025}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['1TB']::TEXT[], ARRAY['16GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-14-M5-2025-1TB-16GB-NEW', NULL, '1TB', '16GB', NULL, '14"',
  22499, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-14-m5-2025-new-1tb","source_sku":"APPLE-MACBOOKPRO-14-M5-2025-1TB-16GB","chip":"M5","year":2025}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-14-m5-2025-new-1tb'
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
-- Product: MacBook Pro 14" M5 Pro (2026) (1TB/24GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 14" M5 Pro (2026)', 'apple-macbook-pro-14-m5pro-2026-new-1tb', 'Apple', 'MacBooks',
  'pro', 'new', 'active', 29499, 'GHS', 0,
  'Apple MacBook Pro 14" M5 Pro (2026) · 1TB / 24GB · 14" — brand new',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"M5 Pro","generation":"2026","storage_label":"1TB","memory":"24GB RAM","display":"14\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M5 Pro","year":2026}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['1TB']::TEXT[], ARRAY['24GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-14-M5PRO-2026-1TB-24GB-NEW', NULL, '1TB', '24GB', NULL, '14"',
  29499, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-14-m5pro-2026-new-1tb","source_sku":"APPLE-MACBOOKPRO-14-M5PRO-2026-1TB-24GB","chip":"M5 Pro","year":2026}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-14-m5pro-2026-new-1tb'
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
-- Product: MacBook Pro 14" M5 Pro (2026) (2TB/24GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 14" M5 Pro (2026)', 'apple-macbook-pro-14-m5pro-2026-new-2tb', 'Apple', 'MacBooks',
  'pro', 'new', 'active', 31999, 'GHS', 0,
  'Apple MacBook Pro 14" M5 Pro (2026) · 2TB / 24GB · 14" — brand new',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"M5 Pro","generation":"2026","storage_label":"2TB","memory":"24GB RAM","display":"14\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M5 Pro","year":2026}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['2TB']::TEXT[], ARRAY['24GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-14-M5PRO-2026-2TB-24GB-NEW', NULL, '2TB', '24GB', NULL, '14"',
  31999, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-14-m5pro-2026-new-2tb","source_sku":"APPLE-MACBOOKPRO-14-M5PRO-2026-2TB-24GB","chip":"M5 Pro","year":2026}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-14-m5pro-2026-new-2tb'
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
-- Product: MacBook Pro 16" M5 Pro (2026) (1TB/24GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 16" M5 Pro (2026)', 'apple-macbook-pro-16-m5pro-2026-new-1tb', 'Apple', 'MacBooks',
  'pro', 'new', 'active', 34999, 'GHS', 0,
  'Apple MacBook Pro 16" M5 Pro (2026) · 1TB / 24GB · 16" — brand new',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"M5 Pro","generation":"2026","storage_label":"1TB","memory":"24GB RAM","display":"16\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M5 Pro","year":2026}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['1TB']::TEXT[], ARRAY['24GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-16-M5PRO-2026-1TB-24GB-NEW', NULL, '1TB', '24GB', NULL, '16"',
  34999, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-16-m5pro-2026-new-1tb","source_sku":"APPLE-MACBOOKPRO-16-M5PRO-2026-1TB-24GB","chip":"M5 Pro","year":2026}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-16-m5pro-2026-new-1tb'
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
-- Product: MacBook Pro 16" M5 Pro (2026) (2TB/24GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 16" M5 Pro (2026)', 'apple-macbook-pro-16-m5pro-2026-new-2tb', 'Apple', 'MacBooks',
  'pro', 'new', 'active', 37999, 'GHS', 0,
  'Apple MacBook Pro 16" M5 Pro (2026) · 2TB / 24GB · 16" — brand new',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"M5 Pro","generation":"2026","storage_label":"2TB","memory":"24GB RAM","display":"16\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M5 Pro","year":2026}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['2TB']::TEXT[], ARRAY['24GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-16-M5PRO-2026-2TB-24GB-NEW', NULL, '2TB', '24GB', NULL, '16"',
  37999, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-16-m5pro-2026-new-2tb","source_sku":"APPLE-MACBOOKPRO-16-M5PRO-2026-2TB-24GB","chip":"M5 Pro","year":2026}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-16-m5pro-2026-new-2tb'
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
-- Product: MacBook Pro 14" M1 Pro (2021) (256GB/16GB, preowned)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 14" M1 Pro (2021)', 'apple-macbook-pro-14-m1pro-2021-preowned-256gb', 'Apple', 'MacBooks',
  'pro', 'preowned', 'active', 11799, 'GHS', 0,
  'Apple MacBook Pro 14" M1 Pro (2021) · 256GB / 16GB · 14" — pre-owned',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"M1 Pro","generation":"2021","storage_label":"256GB","memory":"16GB RAM","display":"14\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M1 Pro","year":2021}'::jsonb, false, false,
  ARRAY[]::TEXT[], ARRAY['256GB']::TEXT[], ARRAY['16GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-14-M1PRO-2021-256GB-16GB-PREOWNED', NULL, '256GB', '16GB', NULL, '14"',
  11799, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-14-m1pro-2021-preowned-256gb","source_sku":"APPLE-MACBOOKPRO-14-M1PRO-2021-256GB-16GB","chip":"M1 Pro","year":2021}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-14-m1pro-2021-preowned-256gb'
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
-- Product: MacBook Pro 13" i5 (2020) (256GB/8GB, preowned)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 13" i5 (2020)', 'apple-macbook-pro-13-i5-2020-preowned-256gb', 'Apple', 'MacBooks',
  'pro', 'preowned', 'active', 6599, 'GHS', 0,
  'Apple MacBook Pro 13" i5 (2020) · 256GB / 8GB · 13" — pre-owned',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"i5","generation":"2020","storage_label":"256GB","memory":"8GB RAM","display":"13\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"i5","year":2020}'::jsonb, false, false,
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
  p.id, 'APPLE-MACBOOKPRO-13-I5-2020-256GB-8GB-PREOWNED', NULL, '256GB', '8GB', NULL, '13"',
  6599, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-13-i5-2020-preowned-256gb","source_sku":"APPLE-MACBOOKPRO-13-I5-2020-256GB-8GB","chip":"i5","year":2020}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-13-i5-2020-preowned-256gb'
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
-- Product: MacBook Pro 13" i5 (2020) (512GB/8GB, preowned)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 13" i5 (2020)', 'apple-macbook-pro-13-i5-2020-preowned-512gb', 'Apple', 'MacBooks',
  'pro', 'preowned', 'active', 7199, 'GHS', 0,
  'Apple MacBook Pro 13" i5 (2020) · 512GB / 8GB · 13" — pre-owned',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"i5","generation":"2020","storage_label":"512GB","memory":"8GB RAM","display":"13\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"i5","year":2020}'::jsonb, false, false,
  ARRAY[]::TEXT[], ARRAY['512GB']::TEXT[], ARRAY['8GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-13-I5-2020-512GB-8GB-PREOWNED', NULL, '512GB', '8GB', NULL, '13"',
  7199, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-13-i5-2020-preowned-512gb","source_sku":"APPLE-MACBOOKPRO-13-I5-2020-512GB-8GB","chip":"i5","year":2020}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-13-i5-2020-preowned-512gb'
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
-- Product: MacBook Pro i9 (2019) (1TB/16GB, preowned)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro i9 (2019)', 'apple-macbook-pro-i9-2019-preowned-1tb', 'Apple', 'MacBooks',
  'pro', 'preowned', 'active', 7899, 'GHS', 0,
  'Apple MacBook Pro i9 (2019) · 1TB / 16GB — pre-owned',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"i9","generation":"2019","storage_label":"1TB","memory":"16GB RAM","display":null,"graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"i9","year":2019}'::jsonb, false, false,
  ARRAY[]::TEXT[], ARRAY['1TB']::TEXT[], ARRAY['16GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-I9-2019-1TB-16GB-PREOWNED', NULL, '1TB', '16GB', NULL, NULL,
  7899, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-i9-2019-preowned-1tb","source_sku":"APPLE-MACBOOKPRO-I9-2019-1TB-16GB","chip":"i9","year":2019}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-i9-2019-preowned-1tb'
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
-- Product: MacBook Pro 16" i7 (2019) (512GB/16GB, preowned)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 16" i7 (2019)', 'apple-macbook-pro-16-i7-2019-preowned-512gb-16gb', 'Apple', 'MacBooks',
  'pro', 'preowned', 'active', 7499, 'GHS', 0,
  'Apple MacBook Pro 16" i7 (2019) · 512GB / 16GB · 16" — pre-owned',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"i7","generation":"2019","storage_label":"512GB","memory":"16GB RAM","display":"16\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"i7","year":2019}'::jsonb, false, false,
  ARRAY[]::TEXT[], ARRAY['512GB']::TEXT[], ARRAY['16GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-16-I7-2019-512GB-16GB-PREOWNED', NULL, '512GB', '16GB', NULL, '16"',
  7499, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-16-i7-2019-preowned-512gb-16gb","source_sku":"APPLE-MACBOOKPRO-16-I7-2019-512GB-16GB","chip":"i7","year":2019}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-16-i7-2019-preowned-512gb-16gb'
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
-- Product: MacBook Pro 16" i7 (2019) (512GB/32GB, preowned)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 16" i7 (2019)', 'apple-macbook-pro-16-i7-2019-preowned-512gb-32gb', 'Apple', 'MacBooks',
  'pro', 'preowned', 'active', 8199, 'GHS', 0,
  'Apple MacBook Pro 16" i7 (2019) · 512GB / 32GB · 16" — pre-owned',
  '{"catalog":"macbook","series":"pro","series_name":"MacBook Pro","processor":"i7","generation":"2019","storage_label":"512GB","memory":"32GB RAM","display":"16\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"i7","year":2019}'::jsonb, false, false,
  ARRAY[]::TEXT[], ARRAY['512GB']::TEXT[], ARRAY['32GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKPRO-16-I7-2019-512GB-32GB-PREOWNED', NULL, '512GB', '32GB', NULL, '16"',
  8199, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"pro","model_slug":"apple-macbook-pro-16-i7-2019-preowned-512gb-32gb","source_sku":"APPLE-MACBOOKPRO-16-I7-2019-512GB-32GB","chip":"i7","year":2019}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-pro-16-i7-2019-preowned-512gb-32gb'
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
-- Product: MacBook Air 13" M5 (2026) (512GB/16GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Air 13" M5 (2026)', 'apple-macbook-air-13-m5-2026-new-512gb', 'Apple', 'MacBooks',
  'air', 'new', 'active', 14899, 'GHS', 0,
  'Apple MacBook Air 13" M5 (2026) · 512GB / 16GB · 13" — brand new',
  '{"catalog":"macbook","series":"air","series_name":"MacBook Air","processor":"M5","generation":"2026","storage_label":"512GB","memory":"16GB RAM","display":"13\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M5","year":2026}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['512GB']::TEXT[], ARRAY['16GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKAIR-13-M5-2026-512GB-16GB-NEW', NULL, '512GB', '16GB', NULL, '13"',
  14899, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"air","model_slug":"apple-macbook-air-13-m5-2026-new-512gb","source_sku":"APPLE-MACBOOKAIR-13-M5-2026-512GB-16GB","chip":"M5","year":2026}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-air-13-m5-2026-new-512gb'
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
-- Product: MacBook Air 13" M5 (2026) (1TB/16GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Air 13" M5 (2026)', 'apple-macbook-air-13-m5-2026-new-1tb', 'Apple', 'MacBooks',
  'air', 'new', 'active', 16899, 'GHS', 0,
  'Apple MacBook Air 13" M5 (2026) · 1TB / 16GB · 13" — brand new',
  '{"catalog":"macbook","series":"air","series_name":"MacBook Air","processor":"M5","generation":"2026","storage_label":"1TB","memory":"16GB RAM","display":"13\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M5","year":2026}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['1TB']::TEXT[], ARRAY['16GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKAIR-13-M5-2026-1TB-16GB-NEW', NULL, '1TB', '16GB', NULL, '13"',
  16899, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"air","model_slug":"apple-macbook-air-13-m5-2026-new-1tb","source_sku":"APPLE-MACBOOKAIR-13-M5-2026-1TB-16GB","chip":"M5","year":2026}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-air-13-m5-2026-new-1tb'
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
-- Product: MacBook Air 13" M4 (2025) (256GB/16GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Air 13" M4 (2025)', 'apple-macbook-air-13-m4-2025-new-256gb', 'Apple', 'MacBooks',
  'air', 'new', 'active', 11999, 'GHS', 0,
  'Apple MacBook Air 13" M4 (2025) · 256GB / 16GB · 13" — brand new',
  '{"catalog":"macbook","series":"air","series_name":"MacBook Air","processor":"M4","generation":"2025","storage_label":"256GB","memory":"16GB RAM","display":"13\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M4","year":2025}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['256GB']::TEXT[], ARRAY['16GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKAIR-13-M4-2025-256GB-16GB-NEW', NULL, '256GB', '16GB', NULL, '13"',
  11999, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"air","model_slug":"apple-macbook-air-13-m4-2025-new-256gb","source_sku":"APPLE-MACBOOKAIR-13-M4-2025-256GB-16GB","chip":"M4","year":2025}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-air-13-m4-2025-new-256gb'
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
-- Product: MacBook Air 13" M1 (2020) (256GB/8GB, preowned)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Air 13" M1 (2020)', 'apple-macbook-air-13-m1-2020-preowned-256gb', 'Apple', 'MacBooks',
  'air', 'preowned', 'active', 6499, 'GHS', 0,
  'Apple MacBook Air 13" M1 (2020) · 256GB / 8GB · 13" — pre-owned',
  '{"catalog":"macbook","series":"air","series_name":"MacBook Air","processor":"M1","generation":"2020","storage_label":"256GB","memory":"8GB RAM","display":"13\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M1","year":2020}'::jsonb, false, false,
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
  p.id, 'APPLE-MACBOOKAIR-13-M1-2020-256GB-8GB-PREOWNED', NULL, '256GB', '8GB', NULL, '13"',
  6499, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"air","model_slug":"apple-macbook-air-13-m1-2020-preowned-256gb","source_sku":"APPLE-MACBOOKAIR-13-M1-2020-256GB-8GB","chip":"M1","year":2020}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-air-13-m1-2020-preowned-256gb'
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
-- Product: MacBook Neo 13" A18 Pro (2026) (256GB/8GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Neo 13" A18 Pro (2026)', 'apple-macbook-neo-13-a18pro-2026-new-256gb', 'Apple', 'MacBooks',
  'neo', 'new', 'active', 7999, 'GHS', 0,
  'Apple MacBook Neo 13" A18 Pro (2026) · 256GB / 8GB · 13" — brand new',
  '{"catalog":"macbook","series":"neo","series_name":"MacBook Neo","processor":"A18 Pro","generation":"2026","storage_label":"256GB","memory":"8GB RAM","display":"13\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"A18 Pro","year":2026}'::jsonb, true, false,
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
  p.id, 'APPLE-MACBOOKNEO-13-A18PRO-2026-256GB-8GB-NEW', NULL, '256GB', '8GB', NULL, '13"',
  7999, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"neo","model_slug":"apple-macbook-neo-13-a18pro-2026-new-256gb","source_sku":"APPLE-MACBOOKNEO-13-A18PRO-2026-256GB-8GB","chip":"A18 Pro","year":2026}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-neo-13-a18pro-2026-new-256gb'
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
-- Product: MacBook Neo 13" A18 Pro (2026) (512GB/8GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Neo 13" A18 Pro (2026)', 'apple-macbook-neo-13-a18pro-2026-new-512gb', 'Apple', 'MacBooks',
  'neo', 'new', 'active', 9499, 'GHS', 0,
  'Apple MacBook Neo 13" A18 Pro (2026) · 512GB / 8GB · 13" — brand new',
  '{"catalog":"macbook","series":"neo","series_name":"MacBook Neo","processor":"A18 Pro","generation":"2026","storage_label":"512GB","memory":"8GB RAM","display":"13\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"A18 Pro","year":2026}'::jsonb, true, false,
  ARRAY[]::TEXT[], ARRAY['512GB']::TEXT[], ARRAY['8GB']::TEXT[]
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
  p.id, 'APPLE-MACBOOKNEO-13-A18PRO-2026-512GB-8GB-NEW', NULL, '512GB', '8GB', NULL, '13"',
  9499, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"neo","model_slug":"apple-macbook-neo-13-a18pro-2026-new-512gb","source_sku":"APPLE-MACBOOKNEO-13-A18PRO-2026-512GB-8GB","chip":"A18 Pro","year":2026}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-macbook-neo-13-a18pro-2026-new-512gb'
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
-- Product: iMac 24" M3 (2024) (256GB/8GB, new)
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iMac 24" M3 (2024)', 'apple-imac-24-m3-2024-new-256gb', 'Apple', 'MacBooks',
  'other', 'new', 'active', 17499, 'GHS', 0,
  'Apple iMac 24" M3 (2024) · 256GB / 8GB · 24" — brand new',
  '{"catalog":"macbook","series":"other","series_name":"iMac","processor":"M3","generation":"2024","storage_label":"256GB","memory":"8GB RAM","display":"24\"","graphics":null,"battery":null,"os":"macOS","extras":null,"chip":"M3","year":2024}'::jsonb, true, false,
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
  p.id, 'APPLE-IMAC-24-M3-2024-256GB-8GB-NEW', NULL, '256GB', '8GB', NULL, '24"',
  17499, 0, true, NULL, '{"status":"active","catalog":"macbook","series":"other","model_slug":"apple-imac-24-m3-2024-new-256gb","source_sku":"APPLE-IMAC-24-M3-2024-256GB-8GB","chip":"M3","year":2024}'::jsonb
FROM public.products p
WHERE p.slug = 'apple-imac-24-m3-2024-new-256gb'
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

-- Refresh base price / stock from variants for seeded MacBook catalogue rows
UPDATE public.products p SET
  price = COALESCE((SELECT MIN(pv.price) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.is_active AND pv.price > 0), p.price),
  stock = COALESCE((SELECT SUM(pv.stock) FROM public.product_variants pv WHERE pv.product_id = p.id), p.stock),
  updated_at = NOW()
WHERE p.specifications->>'catalog' = 'macbook';

COMMIT;
