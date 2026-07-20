-- ============================================================
-- Customer cancel: pending orders + pre-schedule trade-ins
--
-- cancel_own_order  — owner only, status pending → cancelled + restock
-- cancel_own_trade  — owner only, until scheduled → cancelled
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- Orders: cancel + restore stock
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_own_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_order RECORD;
  r       RECORD;
  v_opts  JSONB;
  v_cand  UUID;
  v_hit   INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT id, user_id, status
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_order.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You can only cancel your own orders.'
      USING ERRCODE = '42501';
  END IF;

  IF lower(btrim(coalesce(v_order.status, ''))) <> 'pending' THEN
    RAISE EXCEPTION 'This order can no longer be cancelled (already being processed).'
      USING ERRCODE = 'P0001';
  END IF;

  -- Restock each line (mirror of fn_order_items_decrement_stock)
  FOR r IN
    SELECT product_id, quantity, COALESCE(product_options, '{}'::JSONB) AS product_options
      FROM public.order_items
     WHERE order_id = p_order_id
  LOOP
    IF r.product_id IS NULL OR r.quantity IS NULL OR r.quantity <= 0 THEN
      CONTINUE;
    END IF;

    v_opts := r.product_options - 'configuration';
    v_cand := NULL;

    IF (v_opts ? 'Color') OR (v_opts ? 'Storage') OR (v_opts ? 'RAM') THEN
      SELECT pv.id
        INTO v_cand
        FROM public.product_variants pv
       WHERE pv.product_id::TEXT = r.product_id::TEXT
         AND (
           NOT (v_opts ? 'Color')
           OR (
             pv.color IS NOT NULL
             AND lower(btrim(pv.color::TEXT)) = lower(btrim(v_opts->>'Color'))
           )
         )
         AND (
           NOT (v_opts ? 'Storage')
           OR (
             pv.storage IS NOT NULL
             AND lower(btrim(pv.storage::TEXT)) = lower(btrim(v_opts->>'Storage'))
           )
         )
         AND (
           NOT (v_opts ? 'RAM')
           OR (
             pv.ram IS NOT NULL
             AND lower(btrim(pv.ram::TEXT)) = lower(btrim(v_opts->>'RAM'))
           )
         )
       ORDER BY pv.id
       LIMIT 1;

      IF v_cand IS NOT NULL THEN
        UPDATE public.product_variants pv
           SET stock = COALESCE(pv.stock, 0) + r.quantity::INTEGER
         WHERE pv.id = v_cand;
        GET DIAGNOSTICS v_hit = ROW_COUNT;
        IF v_hit > 0 THEN
          CONTINUE;
        END IF;
      END IF;
    END IF;

    UPDATE public.products p
       SET stock = COALESCE(p.stock, 0) + r.quantity::INTEGER
     WHERE p.id::TEXT = r.product_id::TEXT;
  END LOOP;

  UPDATE public.orders
     SET status = 'cancelled'
   WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_own_order(UUID) TO authenticated;

-- Optional narrow UPDATE policy (RPC is primary path)
DROP POLICY IF EXISTS "Users cancel own pending orders" ON public.orders;
CREATE POLICY "Users cancel own pending orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND lower(btrim(coalesce(status, ''))) = 'pending'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND lower(btrim(coalesce(status, ''))) = 'cancelled'
  );

-- ------------------------------------------------------------
-- Trades: cancel until scheduled
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_own_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_trade RECORD;
  v_st    TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT id, user_id, status
    INTO v_trade
    FROM public.trade_in_requests
   WHERE id = p_trade_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade-in not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_trade.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You can only cancel your own trade-in.'
      USING ERRCODE = '42501';
  END IF;

  v_st := lower(btrim(coalesce(v_trade.status, '')));

  IF v_st IN (
    'scheduled', 'completed', 'rejected', 'cancelled', 'canceled', 'expired'
  ) THEN
    RAISE EXCEPTION 'This trade-in can no longer be cancelled.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_st NOT IN (
    'submitted', 'pending', 'inspecting', 'under_review',
    'offer_made', 'awaiting_user', 'accepted'
  ) THEN
    RAISE EXCEPTION 'This trade-in can no longer be cancelled.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.trade_in_requests
     SET status = 'cancelled',
         updated_at = COALESCE(NOW(), updated_at)
   WHERE id = p_trade_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_own_trade(UUID) TO authenticated;

-- Tighten customer write guard: block customer → scheduled/completed from cancel path is fine;
-- also block setting scheduled/completed (already blocks completed).
CREATE OR REPLACE FUNCTION public.fn_trade_in_requests_customer_write_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff BOOLEAN;
  v_new   TEXT;
  v_old   TEXT;
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

  v_new := lower(btrim(coalesce(NEW.status, '')));
  v_old := lower(btrim(coalesce(OLD.status, '')));

  IF v_new = 'completed' THEN
    RAISE EXCEPTION 'Only staff can mark a trade as completed.'
      USING ERRCODE = '42501';
  END IF;

  IF v_new = 'scheduled' AND v_old IS DISTINCT FROM 'scheduled' THEN
    RAISE EXCEPTION 'Only staff can schedule a trade-in visit.'
      USING ERRCODE = '42501';
  END IF;

  -- Customers may set cancelled only from pre-schedule states
  IF v_new = 'cancelled' AND v_old IN (
    'scheduled', 'completed', 'rejected', 'cancelled', 'canceled', 'expired'
  ) THEN
    RAISE EXCEPTION 'This trade-in can no longer be cancelled.'
      USING ERRCODE = 'P0001';
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

COMMIT;
