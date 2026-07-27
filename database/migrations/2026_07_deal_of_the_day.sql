-- ============================================================
-- BlackBox: Deal of the Day fields on products
-- Idempotent. Reuses existing products.discount as % off.
--
-- After running this migration, expose the columns on the
-- storefront view (if not already present), e.g. in Supabase SQL:
--
--   -- Add to the SELECT list of public.v_product_page:
--   p.is_deal_of_the_day,
--   p.promo_text,
--
-- Then:
--   NOTIFY pgrst, 'reload schema';
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_deal_of_the_day BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promo_text TEXT;

CREATE INDEX IF NOT EXISTS idx_products_deal_of_the_day
  ON public.products (is_deal_of_the_day)
  WHERE is_deal_of_the_day = TRUE;

COMMENT ON COLUMN public.products.is_deal_of_the_day IS
  'When true, product appears in the homepage Deal of the Day section.';
COMMENT ON COLUMN public.products.promo_text IS
  'Optional marketing line for Deal of the Day (e.g. Limited Time Offer).';
COMMENT ON COLUMN public.products.discount IS
  'Discount percentage (0–100). Discounted price is calculated as price * (1 - discount/100).';

-- Remind operators to expose new columns on the storefront view if needed.
DO $$
BEGIN
  IF to_regclass('public.v_product_page') IS NULL THEN
    RAISE NOTICE 'Deal fields added on products. v_product_page not found.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'v_product_page'
      AND column_name = 'is_deal_of_the_day'
  ) THEN
    RAISE NOTICE 'v_product_page already exposes is_deal_of_the_day.';
  ELSE
    RAISE NOTICE
      'Add p.is_deal_of_the_day and p.promo_text to v_product_page SELECT, then NOTIFY pgrst, ''reload schema'';';
  END IF;
END;
$$;
