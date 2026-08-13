-- =============================================================================
-- Headphones taxonomy: Apple brand + AirPods / Pro / Max series
-- Migration: 20260813001400_headphones_apple_airpods_series.sql
--
-- Storefront now shows Headphones → Apple / JBL / Beats / Sony, then Apple
-- series AirPods, AirPods Pro, AirPods Max. Live DB still has many rows with
-- subcategory = 'AirPods' for Pro/Max SKUs, and products_subcategory_check
-- does not yet allow 'AirPods Pro' / 'AirPods Max'.
-- =============================================================================

SET lock_timeout = '8s';
SET statement_timeout = '60s';

-- Widen subcategory allow-list (append new audio series; keep legacy tags)
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
      'A06', 'A07', 'A17', 'A26', 'A36', 'A55', 'A56',
      'Flip 7', 'Flip 7 FE', 'Fold 7',
      'Moto G 2024', 'Moto G 2025',
      'Pixel 10 Pro XL', 'Pixel 7', 'Pixel 8', 'Pixel 9 Pro XL',
      'S25 FE', 'S25 Ultra', 'S26 Ultra',
      'Samsung', 'Google', 'Motorola'
    )
  ) NOT VALID;

-- Ensure Apple brand on AirPods / EarPods / HomePod rows
UPDATE public.products
SET brand = 'Apple',
    updated_at = NOW()
WHERE category IN ('Headphones', 'Speakers', 'Audio')
  AND (
    name ILIKE '%airpod%'
    OR name ILIKE '%earpod%'
    OR name ILIKE '%homepod%'
    OR subcategory IN ('AirPods', 'AirPods Pro', 'AirPods Max', 'EarPods', 'HomePod')
  )
  AND (brand IS NULL OR btrim(brand) = '' OR lower(brand) IN ('airpods', 'earpods', 'homepod'));

-- Split series: AirPods Max
UPDATE public.products
SET
  subcategory = 'AirPods Max',
  brand = COALESCE(NULLIF(btrim(brand), ''), 'Apple'),
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object('series', 'AirPods Max', 'catalog', 'audio', 'audio_type', 'headphones'),
  updated_at = NOW()
WHERE category IN ('Headphones', 'Audio')
  AND (name ILIKE '%airpods max%' OR name ILIKE '%airpod max%');

-- Split series: AirPods Pro
UPDATE public.products
SET
  subcategory = 'AirPods Pro',
  brand = COALESCE(NULLIF(btrim(brand), ''), 'Apple'),
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object('series', 'AirPods Pro', 'catalog', 'audio', 'audio_type', 'headphones'),
  updated_at = NOW()
WHERE category IN ('Headphones', 'Audio')
  AND (name ILIKE '%airpods pro%' OR name ILIKE '%airpod pro%')
  AND name NOT ILIKE '%max%';

-- Remaining AirPods* (e.g. AirPods 4) stay on AirPods series
UPDATE public.products
SET
  subcategory = 'AirPods',
  brand = COALESCE(NULLIF(btrim(brand), ''), 'Apple'),
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object('series', 'AirPods', 'catalog', 'audio', 'audio_type', 'headphones'),
  updated_at = NOW()
WHERE category IN ('Headphones', 'Audio')
  AND (name ILIKE '%airpod%')
  AND name NOT ILIKE '%pro%'
  AND name NOT ILIKE '%max%'
  AND (subcategory IS NULL OR subcategory IN ('AirPods', 'Apple'));

-- JBL headphones stay under Headphones + brand JBL (Tune series)
UPDATE public.products
SET
  brand = 'JBL',
  category = 'Headphones',
  subcategory = COALESCE(NULLIF(btrim(subcategory), ''), 'Tune'),
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object('catalog', 'audio', 'audio_type', 'headphones'),
  updated_at = NOW()
WHERE (
    brand ILIKE 'jbl'
    OR name ILIKE 'jbl %'
    OR name ILIKE '%tune %'
  )
  AND category IN ('Headphones', 'Audio')
  AND name NOT ILIKE '%flip%'
  AND name NOT ILIKE '%charge%'
  AND name NOT ILIKE '%boombox%'
  AND name NOT ILIKE '% go %'
  AND name !~* '\ygo\s*[0-9]';

-- JBL portable speakers → Speakers + JBL (sound category)
UPDATE public.products
SET
  brand = 'JBL',
  category = 'Speakers',
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object('catalog', 'audio', 'audio_type', 'speakers'),
  updated_at = NOW()
WHERE (
    brand ILIKE 'jbl'
    OR name ILIKE 'jbl %'
  )
  AND (
    name ILIKE '%flip%'
    OR name ILIKE '%charge%'
    OR name ILIKE '%boombox%'
    OR name ILIKE '% go %'
    OR name ~* '\ygo\s*[0-9]'
  )
  AND category IN ('Headphones', 'Speakers', 'Audio');

-- HomePod under Speakers + Apple
UPDATE public.products
SET
  brand = 'Apple',
  category = 'Speakers',
  subcategory = 'HomePod',
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object('series', 'HomePod', 'catalog', 'audio', 'audio_type', 'speakers'),
  updated_at = NOW()
WHERE name ILIKE '%homepod%'
  AND category IN ('Headphones', 'Speakers', 'Audio');

RESET lock_timeout;
RESET statement_timeout;
