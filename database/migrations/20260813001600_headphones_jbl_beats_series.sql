-- =============================================================================
-- Headphones: ensure JBL / Beats / Sony show under brand filters
-- Migration: 20260813001600_headphones_jbl_beats_series.sql
--
-- Live rows often have subcategory = 'JBL' / 'Beats' (brand tag) instead of
-- series Tune / Solo, or brand blank on "Tune …" / "Solo …" names. Storefront
-- Brand → Series then looked empty. Normalize Headphones rows.
-- =============================================================================

SET lock_timeout = '8s';
SET statement_timeout = '60s';

-- JBL headphones → brand JBL + Tune series (exclude portable speakers)
UPDATE public.products
SET
  brand = 'JBL',
  category = 'Headphones',
  subcategory = 'Tune',
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object(
      'series', 'Tune',
      'catalog', 'audio',
      'audio_type', 'headphones'
    ),
  updated_at = NOW()
WHERE category IN ('Headphones', 'Audio')
  AND (
    brand ILIKE 'jbl'
    OR subcategory ILIKE 'jbl'
    OR subcategory ILIKE 'tune'
    OR name ILIKE 'jbl %'
    OR name ILIKE '%tune %'
    OR name ILIKE 'tune %'
  )
  AND name NOT ILIKE '%flip%'
  AND name NOT ILIKE '%charge%'
  AND name NOT ILIKE '%boombox%'
  AND name NOT ILIKE '% go %'
  AND name !~* '\ygo\s*[0-9]'
  AND name NOT ILIKE '%homepod%'
  AND name NOT ILIKE '%airpod%'
  AND name NOT ILIKE '%earpod%';

-- Beats headphones → brand Beats + Solo series (exclude Pill speakers)
UPDATE public.products
SET
  brand = 'Beats',
  category = 'Headphones',
  subcategory = 'Solo',
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object(
      'series', 'Solo',
      'catalog', 'audio',
      'audio_type', 'headphones'
    ),
  updated_at = NOW()
WHERE category IN ('Headphones', 'Audio')
  AND (
    brand ILIKE 'beats'
    OR subcategory ILIKE 'beats'
    OR subcategory ILIKE 'solo'
    OR name ILIKE 'beats %'
    OR name ILIKE '%solo %'
    OR name ILIKE 'solo %'
  )
  AND name NOT ILIKE '%pill%'
  AND name NOT ILIKE '%homepod%'
  AND name NOT ILIKE '%airpod%'
  AND name NOT ILIKE '%earpod%'
  AND name NOT ILIKE '%tune %';

-- Sony headphones → brand Sony + Sony series tag
UPDATE public.products
SET
  brand = 'Sony',
  category = 'Headphones',
  subcategory = 'Sony',
  specifications = COALESCE(specifications, '{}'::jsonb)
    || jsonb_build_object(
      'series', 'Sony',
      'catalog', 'audio',
      'audio_type', 'headphones'
    ),
  updated_at = NOW()
WHERE category IN ('Headphones', 'Audio')
  AND (
    brand ILIKE 'sony'
    OR subcategory ILIKE 'sony'
    OR name ILIKE 'sony %'
    OR name ILIKE '%wh-1000%'
    OR name ILIKE '%wf-1000%'
  )
  AND name NOT ILIKE '%homepod%'
  AND name NOT ILIKE '%airpod%'
  AND name NOT ILIKE '%pill%'
  AND name NOT ILIKE '%flip%'
  AND name NOT ILIKE '%charge%';

RESET lock_timeout;
RESET statement_timeout;
