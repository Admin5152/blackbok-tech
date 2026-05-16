-- ============================================================
-- Fix: btrim(uuid) on trade_in_requests updates (admin Accepted, etc.)
--
-- Some databases store target_product_id as UUID; trigger functions
-- used btrim(NEW.target_product_id) which only accepts text.
-- Cast via ::TEXT before btrim everywhere.
--
-- Idempotent: CREATE OR REPLACE functions only.
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_trade_target_inventory_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_new TEXT;
  v_status_old TEXT;
  v_target_text TEXT;
  v_pid UUID;
  v_hit INTEGER;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.target_inventory_applied_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_status_new := lower(btrim(COALESCE(NEW.status::TEXT, '')));
  v_status_old := lower(btrim(COALESCE(OLD.status::TEXT, '')));

  IF v_status_new <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF v_status_old = 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.target_product_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_target_text := btrim(NEW.target_product_id::TEXT);
  IF v_target_text = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_pid := v_target_text::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NEW;
  END;

  IF NEW.target_variant_id IS NOT NULL THEN
    UPDATE public.product_variants pv
       SET stock = COALESCE(pv.stock, 0) - 1
     WHERE pv.id = NEW.target_variant_id
       AND pv.product_id = v_pid
       AND COALESCE(pv.stock, 0) >= 1;

    GET DIAGNOSTICS v_hit = ROW_COUNT;
    IF v_hit = 0 THEN
      RAISE EXCEPTION 'Cannot complete trade: target variant is out of stock or does not match the target product.'
        USING ERRCODE = 'P0001';
    END IF;

    NEW.target_inventory_applied_at := NOW();
    RETURN NEW;
  END IF;

  UPDATE public.products p
     SET stock = COALESCE(p.stock, 0) - 1
   WHERE p.id = v_pid
     AND COALESCE(p.stock, 0) >= 1;

  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit = 0 THEN
    RAISE EXCEPTION 'Cannot complete trade: target product is out of stock.'
      USING ERRCODE = 'P0001';
  END IF;

  NEW.target_inventory_applied_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_target_inventory_on_complete ON public.trade_in_requests;
CREATE TRIGGER trg_trade_target_inventory_on_complete
  BEFORE UPDATE OF status ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trade_target_inventory_on_complete();

CREATE OR REPLACE FUNCTION public.fn_trade_in_requests_customer_write_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff BOOLEAN;
  v_status_new TEXT;
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

  v_status_new := lower(btrim(coalesce(NEW.status::TEXT, '')));

  IF v_status_new = 'completed' THEN
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

DROP POLICY IF EXISTS "trade_in_requests_update_own" ON public.trade_in_requests;

CREATE POLICY "trade_in_requests_update_own"
  ON public.trade_in_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND lower(btrim(coalesce(status::TEXT, ''))) <> 'completed'
  );

COMMIT;
