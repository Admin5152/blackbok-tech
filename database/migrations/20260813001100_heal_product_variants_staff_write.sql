-- =============================================================================
-- Ensure staff can WRITE product_variants (stock / price / SKUs)
-- Migration: 20260813001100_heal_product_variants_staff_write.sql
--
-- Deadlock-safe: only touches the manage policy (does not drop/recreate SELECT
-- policies under live traffic). Takes parent+child locks in a fixed order and
-- uses a short lock_timeout so a busy DB fails fast instead of deadlocking.
--
-- If this still errors with lock_timeout / deadlock: pause admin stock edits +
-- checkout for ~10s and re-run once.
-- =============================================================================

SET lock_timeout = '8s';
SET statement_timeout = '60s';

-- Fixed lock order (products → product_variants) avoids cross-lock with
-- storefront / place_order / sync_product_stock_from_variants traffic.
LOCK TABLE public.products, public.product_variants IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Staff / admin INSERT UPDATE DELETE (stock qty, prices, etc.)
DROP POLICY IF EXISTS "Staff and admins manage product variants" ON public.product_variants;
CREATE POLICY "Staff and admins manage product variants"
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.fn_is_staff()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
    OR public.fn_is_staff()
  );

RESET lock_timeout;
RESET statement_timeout;
