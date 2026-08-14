-- =============================================================================
-- Accessories 3-level browse: keep SKUs, rename leaf titles, remap charger series
-- Migration: 20260814000300_accessories_three_level_leaf_names.sql
--
-- Storefront path is Category → Type → Device → variant.
-- Product.name becomes the leaf label only (Glass Clear, Silicon, Pack of 4).
-- Slugs / SKUs are unchanged.
-- =============================================================================

SET lock_timeout = '8s';
SET statement_timeout = '60s';

-- Allow Apple as a chargers series tag on products.subcategory.
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

-- Screen protectors → Glass/Ceramic + Clear/Privacy
UPDATE public.products
SET
  name = concat_ws(
    ' ',
    nullif(specifications->>'material', ''),
    nullif(specifications->>'transparency', '')
  ),
  specifications = specifications || jsonb_build_object(
    'variant_name',
    concat_ws(
      ' ',
      nullif(specifications->>'material', ''),
      nullif(specifications->>'transparency', '')
    )
  )
WHERE category = 'Accessories'
  AND specifications->>'accessory_type' = 'ScreenProtectors'
  AND coalesce(specifications->>'material', '') <> '';

-- Covers → Silicon / MagSafe / Beats / Leather Book Cover / Hard Shell Case
UPDATE public.products
SET
  name = specifications->>'material',
  specifications = specifications || jsonb_build_object(
    'variant_name', specifications->>'material'
  )
WHERE category = 'Accessories'
  AND specifications->>'accessory_type' = 'Covers'
  AND coalesce(specifications->>'material', '') <> '';

-- AirTags
UPDATE public.products
SET
  name = CASE
    WHEN specifications->>'series' = 'PackOf4' THEN 'Pack of 4'
    ELSE 'Single Pack'
  END,
  specifications = specifications || jsonb_build_object(
    'variant_name',
    CASE
      WHEN specifications->>'series' = 'PackOf4' THEN 'Pack of 4'
      ELSE 'Single Pack'
    END
  )
WHERE category = 'Accessories'
  AND specifications->>'accessory_type' = 'AirTags';

-- Apple Pencil
UPDATE public.products
SET
  name = CASE specifications->>'series'
    WHEN 'Pro' THEN 'Pencil Pro'
    WHEN 'Gen2' THEN 'Gen 2'
    WHEN 'Gen1' THEN 'Gen 1'
    WHEN 'USBC' THEN 'Type C'
    ELSE name
  END,
  specifications = specifications || jsonb_build_object(
    'variant_name',
    CASE specifications->>'series'
      WHEN 'Pro' THEN 'Pencil Pro'
      WHEN 'Gen2' THEN 'Gen 2'
      WHEN 'Gen1' THEN 'Gen 1'
      WHEN 'USBC' THEN 'Type C'
      ELSE name
    END
  )
WHERE category = 'Accessories'
  AND specifications->>'accessory_type' = 'ApplePencil';

-- Magic Keyboard
UPDATE public.products
SET
  name = '13″ M5/M4',
  specifications = specifications || jsonb_build_object('variant_name', '13″ M5/M4')
WHERE category = 'Accessories'
  AND specifications->>'accessory_type' = 'MagicKeyboard'
  AND slug = 'acc-magic-keyboard-13-m5-m4';

-- Chargers: iPhone / MacBook / Watch become devices under Apple.
UPDATE public.products
SET
  subcategory = 'Apple',
  specifications = specifications
    || jsonb_build_object('series', 'Apple')
    || CASE
      WHEN coalesce(specifications->>'device_line', '') = ''
        THEN jsonb_build_object('device_line', specifications->>'series')
      ELSE '{}'::jsonb
    END
WHERE category = 'Accessories'
  AND specifications->>'accessory_type' = 'Chargers'
  AND specifications->>'series' IN ('iPhone', 'MacBook', 'AppleWatch');

NOTIFY pgrst, 'reload schema';

RESET lock_timeout;
RESET statement_timeout;
