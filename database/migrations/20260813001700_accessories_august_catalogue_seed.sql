-- =============================================================================
-- Accessories August catalogue seed (from ACCESSORIES PRICING AUGUST.pdf)
-- Migration: 20260813001700_accessories_august_catalogue_seed.sql
-- Manageable in Admin → Shop → Accessories (products + variants).
-- Chargers / Watch straps / Power banks / Keyboards / Mouse / Flash drives
-- are listed in the PDF outline without prices — add those via Admin when priced.
-- =============================================================================

SET lock_timeout = '8s';
SET statement_timeout = '120s';


-- Allow General series (Power banks / Keyboards / Mouse / Flash drives)
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
      'AirPods', 'AirPods Pro', 'AirPods Max',
      'JBL', 'Sony', 'EarPods', 'Beats',
      'HomePod', 'HarmanKardon', 'Apple',
      'PhoneCases', 'Covers', 'ScreenProtectors', 'Chargers',
      'AirTags', 'AppleWatchAccessories', 'MagicKeyboard', 'ApplePencil',
      'PowerBanks', 'Keyboards', 'Mouse', 'FlashDrives',
      'iPhone', 'MacBook', 'AppleWatch', 'Samsung', 'Laptops', 'iPad',
      'Straps', 'Single', 'PackOf4', 'Pro', 'Gen2', 'Gen1', 'USBC', 'General',
      'HP', 'Dell',
      'Tune', 'Solo', 'Flip', 'Charge', 'Boombox', 'Go', 'Onyx', 'Pill',
      'Omen', 'Envy', 'Victus', 'Alienware',
      'pro', 'air', 'mini', 'standard', 'other', 'neo',
      'iphone-17', 'iphone-16', 'iphone-15', 'iphone-14',
      'iphone-13', 'iphone-12', 'iphone-11', 'iphone-x',
      'iphone-se', 'iphone-older',
      'PlayStation 5', 'PlayStation Portal', 'Xbox Series',
      'Switch', 'Steam Deck', 'DualSense',
      'A06', 'A07', 'A17', 'A26', 'A36', 'A55', 'A56',
      'Flip 7', 'Flip 7 FE', 'Fold 7',
      'Moto G 2024', 'Moto G 2025',
      'Pixel 10 Pro XL', 'Pixel 7', 'Pixel 8', 'Pixel 9 Pro XL',
      'S25 FE', 'S25 Ultra', 'S26 Ultra',
      'Samsung', 'Google', 'Motorola'
    )
  ) NOT VALID;


-- Screen Protector iPhone 16–17 Pro Max Glass Clear
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPhone 16–17 Pro Max Glass Clear', 'acc-sp-iphone-16-17-pm-glass-clear', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 49, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPhone 16–17 Pro Max Glass Clear (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPhone","material":"Glass","transparency":"Clear","device_line":"16-17 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPHONE1617PMGLASSCLEAR-NEW', NULL, NULL, NULL, NULL, NULL,
  49, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"ScreenProtectors","model_slug":"acc-sp-iphone-16-17-pm-glass-clear"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-iphone-16-17-pm-glass-clear'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPhone 16–17 Pro Max Glass Privacy
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPhone 16–17 Pro Max Glass Privacy', 'acc-sp-iphone-16-17-pm-glass-privacy', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 49, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPhone 16–17 Pro Max Glass Privacy (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPhone","material":"Glass","transparency":"Privacy","device_line":"16-17 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPHONE1617PMGLASSPRIVACY-NEW', NULL, NULL, NULL, NULL, NULL,
  49, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"ScreenProtectors","model_slug":"acc-sp-iphone-16-17-pm-glass-privacy"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-iphone-16-17-pm-glass-privacy'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPhone 16–17 Pro Max Ceramic Clear
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPhone 16–17 Pro Max Ceramic Clear', 'acc-sp-iphone-16-17-pm-ceramic-clear', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 39, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPhone 16–17 Pro Max Ceramic Clear (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPhone","material":"Ceramic","transparency":"Clear","device_line":"16-17 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPHONE1617PMCERAMICCLEAR-NEW', NULL, NULL, NULL, NULL, NULL,
  39, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"ScreenProtectors","model_slug":"acc-sp-iphone-16-17-pm-ceramic-clear"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-iphone-16-17-pm-ceramic-clear'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPhone 16–17 Pro Max Ceramic Privacy
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPhone 16–17 Pro Max Ceramic Privacy', 'acc-sp-iphone-16-17-pm-ceramic-privacy', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 39, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPhone 16–17 Pro Max Ceramic Privacy (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPhone","material":"Ceramic","transparency":"Privacy","device_line":"16-17 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPHONE1617PMCERAMICPRIVACY-NEW', NULL, NULL, NULL, NULL, NULL,
  39, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"ScreenProtectors","model_slug":"acc-sp-iphone-16-17-pm-ceramic-privacy"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-iphone-16-17-pm-ceramic-privacy'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPhone XR–15 Pro Max Glass Clear
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPhone XR–15 Pro Max Glass Clear', 'acc-sp-iphone-xr-15-pm-glass-clear', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 29, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPhone XR–15 Pro Max Glass Clear (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPhone","material":"Glass","transparency":"Clear","device_line":"XR-15 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPHONEXR15PMGLASSCLEAR-NEW', NULL, NULL, NULL, NULL, NULL,
  29, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"ScreenProtectors","model_slug":"acc-sp-iphone-xr-15-pm-glass-clear"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-iphone-xr-15-pm-glass-clear'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPhone XR–15 Pro Max Glass Privacy
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPhone XR–15 Pro Max Glass Privacy', 'acc-sp-iphone-xr-15-pm-glass-privacy', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 29, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPhone XR–15 Pro Max Glass Privacy (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPhone","material":"Glass","transparency":"Privacy","device_line":"XR-15 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPHONEXR15PMGLASSPRIVACY-NEW', NULL, NULL, NULL, NULL, NULL,
  29, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"ScreenProtectors","model_slug":"acc-sp-iphone-xr-15-pm-glass-privacy"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-iphone-xr-15-pm-glass-privacy'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPhone XR–15 Pro Max Ceramic Clear
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPhone XR–15 Pro Max Ceramic Clear', 'acc-sp-iphone-xr-15-pm-ceramic-clear', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 24, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPhone XR–15 Pro Max Ceramic Clear (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPhone","material":"Ceramic","transparency":"Clear","device_line":"XR-15 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPHONEXR15PMCERAMICCLEAR-NEW', NULL, NULL, NULL, NULL, NULL,
  24, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"ScreenProtectors","model_slug":"acc-sp-iphone-xr-15-pm-ceramic-clear"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-iphone-xr-15-pm-ceramic-clear'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPhone XR–15 Pro Max Ceramic Privacy
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPhone XR–15 Pro Max Ceramic Privacy', 'acc-sp-iphone-xr-15-pm-ceramic-privacy', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 24, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPhone XR–15 Pro Max Ceramic Privacy (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPhone","material":"Ceramic","transparency":"Privacy","device_line":"XR-15 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPHONEXR15PMCERAMICPRIVACY-NEW', NULL, NULL, NULL, NULL, NULL,
  24, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"ScreenProtectors","model_slug":"acc-sp-iphone-xr-15-pm-ceramic-privacy"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-iphone-xr-15-pm-ceramic-privacy'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPad 10.9″/11″ Glass Clear
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPad 10.9″/11″ Glass Clear', 'acc-sp-ipad-109-11-glass-clear', 'Apple', 'Accessories',
  'iPad', 'new', 'active', 79, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPad 10.9″/11″ Glass Clear (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPad","material":"Glass","transparency":"Clear","device_line":"10.9/11"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPAD10911GLASSCLEAR-NEW', NULL, NULL, NULL, NULL, NULL,
  79, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPad","accessory_type":"ScreenProtectors","model_slug":"acc-sp-ipad-109-11-glass-clear"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-ipad-109-11-glass-clear'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPad 10.9″/11″ Glass Privacy
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPad 10.9″/11″ Glass Privacy', 'acc-sp-ipad-109-11-glass-privacy', 'Apple', 'Accessories',
  'iPad', 'new', 'active', 79, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPad 10.9″/11″ Glass Privacy (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPad","material":"Glass","transparency":"Privacy","device_line":"10.9/11"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPAD10911GLASSPRIVACY-NEW', NULL, NULL, NULL, NULL, NULL,
  79, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPad","accessory_type":"ScreenProtectors","model_slug":"acc-sp-ipad-109-11-glass-privacy"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-ipad-109-11-glass-privacy'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPad 12.9″/13″ Glass Clear
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPad 12.9″/13″ Glass Clear', 'acc-sp-ipad-129-13-glass-clear', 'Apple', 'Accessories',
  'iPad', 'new', 'active', 99, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPad 12.9″/13″ Glass Clear (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPad","material":"Glass","transparency":"Clear","device_line":"12.9/13"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPAD12913GLASSCLEAR-NEW', NULL, NULL, NULL, NULL, NULL,
  99, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPad","accessory_type":"ScreenProtectors","model_slug":"acc-sp-ipad-129-13-glass-clear"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-ipad-129-13-glass-clear'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPad 12.9″/13″ Glass Privacy
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPad 12.9″/13″ Glass Privacy', 'acc-sp-ipad-129-13-glass-privacy', 'Apple', 'Accessories',
  'iPad', 'new', 'active', 99, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPad 12.9″/13″ Glass Privacy (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPad","material":"Glass","transparency":"Privacy","device_line":"12.9/13"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPAD12913GLASSPRIVACY-NEW', NULL, NULL, NULL, NULL, NULL,
  99, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPad","accessory_type":"ScreenProtectors","model_slug":"acc-sp-ipad-129-13-glass-privacy"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-ipad-129-13-glass-privacy'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Screen Protector iPad 8.3″ Glass Clear
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Screen Protector iPad 8.3″ Glass Clear', 'acc-sp-ipad-83-glass-clear', 'Apple', 'Accessories',
  'iPad', 'new', 'active', 79, 'GHS', 0,
  'BlackBox Accessories — Screen Protector iPad 8.3″ Glass Clear (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ScreenProtectors","series":"iPad","material":"Glass","transparency":"Clear","device_line":"8.3"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCSPIPAD83GLASSCLEAR-NEW', NULL, NULL, NULL, NULL, NULL,
  79, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPad","accessory_type":"ScreenProtectors","model_slug":"acc-sp-ipad-83-glass-clear"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-sp-ipad-83-glass-clear'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- iPhone 17 Series Silicon Cover
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iPhone 17 Series Silicon Cover', 'acc-cover-iphone-17-silicon', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 59, 'GHS', 0,
  'BlackBox Accessories — iPhone 17 Series Silicon Cover (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"iPhone","material":"Silicon","device_line":"17 Series"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERIPHONE17SILICON-NEW', NULL, NULL, NULL, NULL, NULL,
  59, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"Covers","model_slug":"acc-cover-iphone-17-silicon"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-iphone-17-silicon'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- iPhone 17 Series MagSafe Cover
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iPhone 17 Series MagSafe Cover', 'acc-cover-iphone-17-magsafe', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 69, 'GHS', 0,
  'BlackBox Accessories — iPhone 17 Series MagSafe Cover (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"iPhone","material":"MagSafe","device_line":"17 Series"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERIPHONE17MAGSAFE-NEW', NULL, NULL, NULL, NULL, NULL,
  69, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"Covers","model_slug":"acc-cover-iphone-17-magsafe"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-iphone-17-magsafe'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- iPhone 17 Series Beats Cover
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iPhone 17 Series Beats Cover', 'acc-cover-iphone-17-beats', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 199, 'GHS', 0,
  'BlackBox Accessories — iPhone 17 Series Beats Cover (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"iPhone","material":"Beats","device_line":"17 Series"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERIPHONE17BEATS-NEW', NULL, NULL, NULL, NULL, NULL,
  199, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"Covers","model_slug":"acc-cover-iphone-17-beats"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-iphone-17-beats'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- iPhone XR–16 Pro Max Silicon Cover
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iPhone XR–16 Pro Max Silicon Cover', 'acc-cover-iphone-xr-16-silicon', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 49, 'GHS', 0,
  'BlackBox Accessories — iPhone XR–16 Pro Max Silicon Cover (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"iPhone","material":"Silicon","device_line":"XR-16 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERIPHONEXR16SILICON-NEW', NULL, NULL, NULL, NULL, NULL,
  49, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"Covers","model_slug":"acc-cover-iphone-xr-16-silicon"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-iphone-xr-16-silicon'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- iPhone XR–16 Pro Max MagSafe Cover
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iPhone XR–16 Pro Max MagSafe Cover', 'acc-cover-iphone-xr-16-magsafe', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 49, 'GHS', 0,
  'BlackBox Accessories — iPhone XR–16 Pro Max MagSafe Cover (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"iPhone","material":"MagSafe","device_line":"XR-16 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERIPHONEXR16MAGSAFE-NEW', NULL, NULL, NULL, NULL, NULL,
  49, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"Covers","model_slug":"acc-cover-iphone-xr-16-magsafe"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-iphone-xr-16-magsafe'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- iPhone XR–16 Pro Max Beats Cover
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iPhone XR–16 Pro Max Beats Cover', 'acc-cover-iphone-xr-16-beats', 'Apple', 'Accessories',
  'iPhone', 'new', 'active', 179, 'GHS', 0,
  'BlackBox Accessories — iPhone XR–16 Pro Max Beats Cover (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"iPhone","material":"Beats","device_line":"XR-16 Pro Max"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERIPHONEXR16BEATS-NEW', NULL, NULL, NULL, NULL, NULL,
  179, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPhone","accessory_type":"Covers","model_slug":"acc-cover-iphone-xr-16-beats"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-iphone-xr-16-beats'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- iPad 10.9″/11″ Leather Book Cover
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iPad 10.9″/11″ Leather Book Cover', 'acc-cover-ipad-109-11-leather', 'Apple', 'Accessories',
  'iPad', 'new', 'active', 249, 'GHS', 0,
  'BlackBox Accessories — iPad 10.9″/11″ Leather Book Cover (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"iPad","material":"Leather Book Cover","device_line":"10.9/11"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERIPAD10911LEATHER-NEW', NULL, NULL, NULL, NULL, NULL,
  249, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPad","accessory_type":"Covers","model_slug":"acc-cover-ipad-109-11-leather"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-ipad-109-11-leather'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- iPad 12.9″/13″ Leather Book Cover
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iPad 12.9″/13″ Leather Book Cover', 'acc-cover-ipad-129-13-leather', 'Apple', 'Accessories',
  'iPad', 'new', 'active', 299, 'GHS', 0,
  'BlackBox Accessories — iPad 12.9″/13″ Leather Book Cover (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"iPad","material":"Leather Book Cover","device_line":"12.9/13"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERIPAD12913LEATHER-NEW', NULL, NULL, NULL, NULL, NULL,
  299, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPad","accessory_type":"Covers","model_slug":"acc-cover-ipad-129-13-leather"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-ipad-129-13-leather'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- iPad 8.3″ Leather Book Cover
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'iPad 8.3″ Leather Book Cover', 'acc-cover-ipad-83-leather', 'Apple', 'Accessories',
  'iPad', 'new', 'active', 249, 'GHS', 0,
  'BlackBox Accessories — iPad 8.3″ Leather Book Cover (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"iPad","material":"Leather Book Cover","device_line":"8.3"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERIPAD83LEATHER-NEW', NULL, NULL, NULL, NULL, NULL,
  249, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPad","accessory_type":"Covers","model_slug":"acc-cover-ipad-83-leather"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-ipad-83-leather'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- MacBook Pro M1–M5 16″ Hard Shell Case
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro M1–M5 16″ Hard Shell Case', 'acc-cover-mbp-m1-m5-16-hard', 'Apple', 'Accessories',
  'MacBook', 'new', 'active', 549, 'GHS', 0,
  'BlackBox Accessories — MacBook Pro M1–M5 16″ Hard Shell Case (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"MacBook","material":"Hard Shell Case","device_line":"Pro M1-M5 16"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERMBPM1M516HARD-NEW', NULL, NULL, NULL, NULL, NULL,
  549, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"MacBook","accessory_type":"Covers","model_slug":"acc-cover-mbp-m1-m5-16-hard"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-mbp-m1-m5-16-hard'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- MacBook Pro M1–M5 14″ Hard Shell Case
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro M1–M5 14″ Hard Shell Case', 'acc-cover-mbp-m1-m5-14-hard', 'Apple', 'Accessories',
  'MacBook', 'new', 'active', 499, 'GHS', 0,
  'BlackBox Accessories — MacBook Pro M1–M5 14″ Hard Shell Case (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"MacBook","material":"Hard Shell Case","device_line":"Pro M1-M5 14"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERMBPM1M514HARD-NEW', NULL, NULL, NULL, NULL, NULL,
  499, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"MacBook","accessory_type":"Covers","model_slug":"acc-cover-mbp-m1-m5-14-hard"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-mbp-m1-m5-14-hard'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- MacBook Air M1–M5 15″ Hard Shell Case
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Air M1–M5 15″ Hard Shell Case', 'acc-cover-mba-m1-m5-15-hard', 'Apple', 'Accessories',
  'MacBook', 'new', 'active', 549, 'GHS', 0,
  'BlackBox Accessories — MacBook Air M1–M5 15″ Hard Shell Case (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"MacBook","material":"Hard Shell Case","device_line":"Air M1-M5 15"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERMBAM1M515HARD-NEW', NULL, NULL, NULL, NULL, NULL,
  549, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"MacBook","accessory_type":"Covers","model_slug":"acc-cover-mba-m1-m5-15-hard"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-mba-m1-m5-15-hard'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- MacBook Air M1–M5 13″ Hard Shell Case
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Air M1–M5 13″ Hard Shell Case', 'acc-cover-mba-m1-m5-13-hard', 'Apple', 'Accessories',
  'MacBook', 'new', 'active', 499, 'GHS', 0,
  'BlackBox Accessories — MacBook Air M1–M5 13″ Hard Shell Case (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"MacBook","material":"Hard Shell Case","device_line":"Air M1-M5 13"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERMBAM1M513HARD-NEW', NULL, NULL, NULL, NULL, NULL,
  499, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"MacBook","accessory_type":"Covers","model_slug":"acc-cover-mba-m1-m5-13-hard"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-mba-m1-m5-13-hard'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- MacBook Pro 2017–2020 16″ Hard Shell Case
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 2017–2020 16″ Hard Shell Case', 'acc-cover-mbp-2017-2020-16-hard', 'Apple', 'Accessories',
  'MacBook', 'new', 'active', 449, 'GHS', 0,
  'BlackBox Accessories — MacBook Pro 2017–2020 16″ Hard Shell Case (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"MacBook","material":"Hard Shell Case","device_line":"Pro 2017-2020 16"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERMBP2017202016HARD-NEW', NULL, NULL, NULL, NULL, NULL,
  449, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"MacBook","accessory_type":"Covers","model_slug":"acc-cover-mbp-2017-2020-16-hard"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-mbp-2017-2020-16-hard'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- MacBook Pro 2017–2020 13″ Hard Shell Case
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Pro 2017–2020 13″ Hard Shell Case', 'acc-cover-mbp-2017-2020-13-hard', 'Apple', 'Accessories',
  'MacBook', 'new', 'active', 399, 'GHS', 0,
  'BlackBox Accessories — MacBook Pro 2017–2020 13″ Hard Shell Case (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"MacBook","material":"Hard Shell Case","device_line":"Pro 2017-2020 13"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERMBP2017202013HARD-NEW', NULL, NULL, NULL, NULL, NULL,
  399, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"MacBook","accessory_type":"Covers","model_slug":"acc-cover-mbp-2017-2020-13-hard"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-mbp-2017-2020-13-hard'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- MacBook Air 2017–2020 13″ Hard Shell Case
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'MacBook Air 2017–2020 13″ Hard Shell Case', 'acc-cover-mba-2017-2020-13-hard', 'Apple', 'Accessories',
  'MacBook', 'new', 'active', 399, 'GHS', 0,
  'BlackBox Accessories — MacBook Air 2017–2020 13″ Hard Shell Case (August pricelist)',
  '{"catalog":"accessories","accessory_type":"Covers","series":"MacBook","material":"Hard Shell Case","device_line":"Air 2017-2020 13"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCCOVERMBA2017202013HARD-NEW', NULL, NULL, NULL, NULL, NULL,
  399, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"MacBook","accessory_type":"Covers","model_slug":"acc-cover-mba-2017-2020-13-hard"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-cover-mba-2017-2020-13-hard'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- AirTag Single Pack
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'AirTag Single Pack', 'acc-airtag-single', 'Apple', 'Accessories',
  'Single', 'new', 'active', 349, 'GHS', 0,
  'BlackBox Accessories — AirTag Single Pack (August pricelist)',
  '{"catalog":"accessories","accessory_type":"AirTags","series":"Single","device_line":"Single"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCAIRTAGSINGLE-NEW', NULL, NULL, NULL, NULL, NULL,
  349, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"Single","accessory_type":"AirTags","model_slug":"acc-airtag-single"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-airtag-single'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- AirTag Pack of 4
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'AirTag Pack of 4', 'acc-airtag-pack-of-4', 'Apple', 'Accessories',
  'PackOf4', 'new', 'active', 1249, 'GHS', 0,
  'BlackBox Accessories — AirTag Pack of 4 (August pricelist)',
  '{"catalog":"accessories","accessory_type":"AirTags","series":"PackOf4","device_line":"Pack of 4"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCAIRTAGPACKOF4-NEW', NULL, NULL, NULL, NULL, NULL,
  1249, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"PackOf4","accessory_type":"AirTags","model_slug":"acc-airtag-pack-of-4"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-airtag-pack-of-4'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Apple Pencil Pro
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Pencil Pro', 'acc-pencil-pro', 'Apple', 'Accessories',
  'Pro', 'new', 'active', 1899, 'GHS', 0,
  'BlackBox Accessories — Apple Pencil Pro (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ApplePencil","series":"Pro","device_line":"Pro"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCPENCILPRO-NEW', NULL, NULL, NULL, NULL, NULL,
  1899, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"Pro","accessory_type":"ApplePencil","model_slug":"acc-pencil-pro"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-pencil-pro'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Apple Pencil Gen 2
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Pencil Gen 2', 'acc-pencil-gen2', 'Apple', 'Accessories',
  'Gen2', 'new', 'active', 1699, 'GHS', 0,
  'BlackBox Accessories — Apple Pencil Gen 2 (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ApplePencil","series":"Gen2","device_line":"Gen 2"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCPENCILGEN2-NEW', NULL, NULL, NULL, NULL, NULL,
  1699, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"Gen2","accessory_type":"ApplePencil","model_slug":"acc-pencil-gen2"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-pencil-gen2'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Apple Pencil Gen 1
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Pencil Gen 1', 'acc-pencil-gen1', 'Apple', 'Accessories',
  'Gen1', 'new', 'active', 1399, 'GHS', 0,
  'BlackBox Accessories — Apple Pencil Gen 1 (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ApplePencil","series":"Gen1","device_line":"Gen 1"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCPENCILGEN1-NEW', NULL, NULL, NULL, NULL, NULL,
  1399, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"Gen1","accessory_type":"ApplePencil","model_slug":"acc-pencil-gen1"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-pencil-gen1'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Apple Pencil USB-C
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Apple Pencil USB-C', 'acc-pencil-usbc', 'Apple', 'Accessories',
  'USBC', 'new', 'active', 1399, 'GHS', 0,
  'BlackBox Accessories — Apple Pencil USB-C (August pricelist)',
  '{"catalog":"accessories","accessory_type":"ApplePencil","series":"USBC","device_line":"USB-C"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCPENCILUSBC-NEW', NULL, NULL, NULL, NULL, NULL,
  1399, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"USBC","accessory_type":"ApplePencil","model_slug":"acc-pencil-usbc"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-pencil-usbc'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

-- Magic Keyboard 13″ M5/M4
INSERT INTO public.products (
  name, slug, brand, category, subcategory, condition, status, price, currency, stock,
  description, specifications, is_new, featured, colors, storage, ram
) VALUES (
  'Magic Keyboard 13″ M5/M4', 'acc-magic-keyboard-13-m5-m4', 'Apple', 'Accessories',
  'iPad', 'new', 'active', 5199, 'GHS', 0,
  'BlackBox Accessories — Magic Keyboard 13″ M5/M4 (August pricelist)',
  '{"catalog":"accessories","accessory_type":"MagicKeyboard","series":"iPad","device_line":"13 M5/M4"}'::jsonb, true, false,
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
  updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes
) SELECT
  p.id, 'ACCMAGICKEYBOARD13M5M4-NEW', NULL, NULL, NULL, NULL, NULL,
  5199, 0, true, NULL, '{"status":"active","catalog":"accessories","series":"iPad","accessory_type":"MagicKeyboard","model_slug":"acc-magic-keyboard-13-m5-m4"}'::jsonb
FROM public.products p
WHERE p.slug = 'acc-magic-keyboard-13-m5-m4'
ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

RESET lock_timeout;
RESET statement_timeout;
