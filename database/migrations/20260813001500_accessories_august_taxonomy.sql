-- =============================================================================
-- Accessories taxonomy (August pricelist PDF)
-- Migration: 20260813001500_accessories_august_taxonomy.sql
--
-- Shop path: Accessories → Type → Device series
-- Types: Chargers, ScreenProtectors, Covers, AirTags, AppleWatchAccessories,
--        MagicKeyboard, ApplePencil, PowerBanks, Keyboards, Mouse, FlashDrives
-- Series examples: iPhone, MacBook, iPad, AppleWatch, Single, PackOf4, Pro, …
-- =============================================================================

SET lock_timeout = '8s';
SET statement_timeout = '60s';

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
      -- Accessories types (legacy + August PDF)
      'PhoneCases', 'Covers', 'ScreenProtectors', 'Chargers',
      'AirTags', 'AppleWatchAccessories', 'MagicKeyboard', 'ApplePencil',
      'PowerBanks', 'Keyboards', 'Mouse', 'FlashDrives',
      -- Accessories device / line series
      'iPhone', 'MacBook', 'AppleWatch', 'Samsung', 'Laptops', 'iPad',
      'Straps', 'Single', 'PackOf4', 'Pro', 'Gen2', 'Gen1', 'USBC',
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

-- Map legacy Phone Cases type → Covers + accessory_type
UPDATE public.products
SET
  subcategory = CASE
    WHEN subcategory IN ('PhoneCases', 'phonecases') THEN 'Covers'
    ELSE subcategory
  END,
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object(
      'catalog', 'accessories',
      'accessory_type',
        CASE
          WHEN subcategory IN ('PhoneCases', 'phonecases', 'Covers') THEN 'Covers'
          WHEN subcategory IN ('ScreenProtectors') THEN 'ScreenProtectors'
          WHEN subcategory IN ('Chargers') THEN 'Chargers'
          ELSE COALESCE(specifications->>'accessory_type', subcategory)
        END
    ),
  updated_at = NOW()
WHERE category = 'Accessories'
  AND (
    subcategory IN ('PhoneCases', 'phonecases', 'Covers', 'ScreenProtectors', 'Chargers')
    OR specifications->>'accessory_type' IN ('PhoneCases', 'phonecases')
  );

-- Normalize accessory_type PhoneCases → Covers in specs
UPDATE public.products
SET
  specifications = jsonb_set(
    COALESCE(specifications, '{}'::jsonb),
    '{accessory_type}',
    '"Covers"'
  ),
  updated_at = NOW()
WHERE category = 'Accessories'
  AND lower(COALESCE(specifications->>'accessory_type', '')) IN ('phonecases', 'phone cases');

RESET lock_timeout;
RESET statement_timeout;
