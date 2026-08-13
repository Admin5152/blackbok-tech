-- =====================================================================
-- Heal products.condition ↔ is_new so shop/trade show Pre-owned correctly
-- Migration: 20260813000500_heal_product_condition_is_new.sql
--
-- - condition preowned/refurbished → is_new = false
-- - condition new → is_new = true
-- - legacy "used" label → preowned
-- - is_new = false with blank condition → preowned
-- Idempotent.
-- =====================================================================

BEGIN;

UPDATE public.products
SET condition = 'preowned'
WHERE lower(trim(COALESCE(condition, ''))) IN ('used', 'pre-owned', 'pre_owned');

UPDATE public.products
SET is_new = false
WHERE condition IN ('preowned', 'refurbished')
  AND is_new IS DISTINCT FROM false;

UPDATE public.products
SET is_new = true
WHERE condition = 'new'
  AND is_new IS DISTINCT FROM true;

UPDATE public.products
SET condition = 'preowned'
WHERE is_new = false
  AND (condition IS NULL OR btrim(condition) = '');

UPDATE public.products
SET condition = 'new'
WHERE is_new = true
  AND (condition IS NULL OR btrim(condition) = '');

COMMIT;
