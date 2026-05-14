-- ============================================================
-- Phase 1 (repeat): Trade completion inventory — only set
-- target_inventory_applied_at when a product row was updated.
--
-- Phase 2: Prevent non-staff from marking trades completed or
-- changing target_product_id after it is set; tighten RLS
-- WITH CHECK on customer self-updates.
--
-- Run after: 2026_05_trade_in_requests.sql,
--            2026_05_trade_in_requests_admin_rls.sql,
--            2026_05_inventory_decrement_orders_and_trades.sql
-- Requires: public.profiles, public.user_roles (staff/admin).
-- Idempotent.
-- ============================================================
BEGIN;

-- -----------------------------------------------------------------
-- Phase 1: Trade target stock — ROW_COUNT guard
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_trade_target_inventory_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid UUID;
  v_hit INTEGER;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.target_inventory_applied_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF lower(btrim(COALESCE(NEW.status, ''))) <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF lower(btrim(COALESCE(OLD.status, ''))) = 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.target_product_id IS NULL OR btrim(NEW.target_product_id) = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_pid := btrim(NEW.target_product_id)::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NEW;
  END;

  UPDATE public.products p
     SET stock = GREATEST(0, COALESCE(p.stock, 0) - 1)
   WHERE p.id = v_pid;

  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit > 0 THEN
    NEW.target_inventory_applied_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------
-- Phase 2a: BEFORE UPDATE guard (session user still visible)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_trade_in_requests_customer_write_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff BOOLEAN;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id = auth.uid()
       AND lower(coalesce(p.role::text, '')) IN ('admin', 'staff')
  )
  OR EXISTS (
    SELECT 1
      FROM public.user_roles ur
     WHERE ur.user_id = auth.uid()
       AND lower(ur.role::text) IN ('admin', 'staff')
  )
  INTO v_staff;

  IF COALESCE(v_staff, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  IF lower(btrim(coalesce(NEW.status, ''))) = 'completed' THEN
    RAISE EXCEPTION 'Only staff can mark a trade as completed.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.target_product_id IS NOT NULL
     AND NEW.target_product_id IS DISTINCT FROM OLD.target_product_id THEN
    RAISE EXCEPTION 'Trade target product cannot be changed.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.target_variant_id IS NOT NULL
     AND NEW.target_variant_id IS DISTINCT FROM OLD.target_variant_id THEN
    RAISE EXCEPTION 'Trade target variant cannot be changed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_in_requests_customer_write_guard ON public.trade_in_requests;
CREATE TRIGGER trg_trade_in_requests_customer_write_guard
  BEFORE UPDATE ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trade_in_requests_customer_write_guard();

-- -----------------------------------------------------------------
-- Phase 2b: RLS — customers cannot set status to completed
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "trade_in_requests_update_own" ON public.trade_in_requests;

CREATE POLICY "trade_in_requests_update_own"
  ON public.trade_in_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND lower(btrim(coalesce(status, ''))) <> 'completed'
  );

COMMIT;
