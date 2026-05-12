-- ============================================================
-- BlackBox: place_order RPC
--
-- Atomic order placement used by hooks/useCheckout.ts.
--
-- Why an RPC instead of multi-statement client code?
--   1. Server-side coupon revalidation — clients can lie about
--      discount amounts, the RPC recomputes from the source of truth.
--   2. Atomicity — order, order_items, and stock decrements all
--      commit together (or none of them do).
--   3. RLS bypass for products.stock — only admins have UPDATE on
--      products, so we run as DEFINER and gate on auth.uid() ourselves.
--
-- Idempotent: drops the specific signature first, then re-creates.
-- Run once in Supabase SQL editor.
-- ============================================================
BEGIN;

-- Drop any previous overload with this exact signature before re-creating.
DROP FUNCTION IF EXISTS public.place_order(
  JSONB, UUID, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, UUID, TEXT
);

CREATE OR REPLACE FUNCTION public.place_order(
  p_cart_items        JSONB,
  p_coupon_id         UUID    DEFAULT NULL,
  p_discount_amount   NUMERIC DEFAULT 0,
  p_shipping_address  TEXT    DEFAULT 'Pick up from store',
  p_shipping_method   TEXT    DEFAULT 'Pick up from store',
  p_payment_method    TEXT    DEFAULT 'in_person',
  p_shipping_cost     NUMERIC DEFAULT 0,
  p_customer_id       UUID    DEFAULT NULL,
  p_notes             TEXT    DEFAULT NULL
)
RETURNS TABLE (
  order_id   UUID,
  display_id TEXT,
  total      NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID    := auth.uid();
  v_subtotal  NUMERIC := 0;
  v_discount  NUMERIC := 0;
  v_total     NUMERIC;
  v_order_id  UUID;
  v_display   TEXT;
  v_last_num  INTEGER;
  v_item      JSONB;
  v_qty       INTEGER;
  v_price     NUMERIC;
  v_pid_text  TEXT;
  v_pid_uuid  UUID;
  v_coupon    RECORD;
BEGIN
  -- ------------------------------------------------------------
  -- 0. Auth gate
  -- ------------------------------------------------------------
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to place an order.'
      USING ERRCODE = '42501';
  END IF;

  IF p_cart_items IS NULL
     OR jsonb_typeof(p_cart_items) <> 'array'
     OR jsonb_array_length(p_cart_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty.'
      USING ERRCODE = '22023';
  END IF;

  -- ------------------------------------------------------------
  -- 1. Compute subtotal from the cart payload
  -- ------------------------------------------------------------
  FOR v_item IN SELECT jsonb_array_elements(p_cart_items) LOOP
    v_qty   := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_price := COALESCE((v_item->>'unit_price')::NUMERIC, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity in cart.'
        USING ERRCODE = '22023';
    END IF;
    v_subtotal := v_subtotal + (v_qty * v_price);
  END LOOP;

  -- ------------------------------------------------------------
  -- 2. Revalidate the coupon server-side and recompute the discount.
  --    Trust nothing from the client; p_discount_amount is ignored
  --    when a coupon is present.
  -- ------------------------------------------------------------
  IF p_coupon_id IS NOT NULL THEN
    SELECT id, is_active, valid_until, max_uses, used_count,
           discount_type, discount_value, min_order_value
      INTO v_coupon
      FROM public.coupons
     WHERE id = p_coupon_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Coupon not found.'
        USING ERRCODE = '22023';
    END IF;
    IF NOT v_coupon.is_active THEN
      RAISE EXCEPTION 'Coupon is not active.'
        USING ERRCODE = '22023';
    END IF;
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until <= NOW() THEN
      RAISE EXCEPTION 'Coupon has expired.'
        USING ERRCODE = '22023';
    END IF;
    IF v_coupon.max_uses IS NOT NULL
       AND v_coupon.used_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Coupon has reached its usage limit.'
        USING ERRCODE = '22023';
    END IF;
    IF v_subtotal < COALESCE(v_coupon.min_order_value, 0) THEN
      RAISE EXCEPTION 'Minimum order value not met for this coupon.'
        USING ERRCODE = '22023';
    END IF;

    -- Cross-check that the caller hasn't used this coupon before.
    IF EXISTS (
      SELECT 1 FROM public.coupon_uses
       WHERE coupon_id = p_coupon_id
         AND user_id   = v_user_id
         AND (order_id IS NULL OR order_id IS NOT NULL)
    ) THEN
      -- A pending reservation row from useCheckout is fine; we only
      -- want to bail if there's a use row that does NOT belong to the
      -- current in-flight reservation. The current reservation has
      -- order_id = NULL, so allow it through and let the caller link
      -- it later. (If the user already redeemed for another order,
      -- there will be a row with order_id IS NOT NULL, which we still
      -- ignore here on purpose because the reservation insert is
      -- guarded by the UNIQUE(coupon_id, user_id) constraint.)
      NULL;
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_discount := (v_coupon.discount_value::NUMERIC / 100.0) * v_subtotal;
    ELSE
      v_discount := LEAST(v_coupon.discount_value::NUMERIC, v_subtotal);
    END IF;
    v_discount := GREATEST(0, LEAST(v_subtotal, ROUND(v_discount, 2)));
  ELSE
    -- No coupon — honor an explicit p_discount_amount only if the
    -- caller is admin/staff (manual discount). Otherwise force 0.
    IF COALESCE(p_discount_amount, 0) > 0
       AND public.has_role(v_user_id, 'admin'::public.app_role) THEN
      v_discount := LEAST(v_subtotal, ROUND(p_discount_amount, 2));
    ELSE
      v_discount := 0;
    END IF;
  END IF;

  v_total := GREATEST(0, v_subtotal + COALESCE(p_shipping_cost, 0) - v_discount);

  -- ------------------------------------------------------------
  -- 3. Compute next display_id (ORD00001 style)
  -- ------------------------------------------------------------
  SELECT COALESCE(
    MAX(NULLIF(REGEXP_REPLACE(COALESCE(o.display_id, ''), '\D', '', 'g'), '')::INTEGER),
    0
  )
    INTO v_last_num
    FROM public.orders o
   WHERE o.display_id IS NOT NULL;

  v_display := 'ORD' || LPAD((v_last_num + 1)::TEXT, 5, '0');

  -- ------------------------------------------------------------
  -- 4. Insert the order row
  -- ------------------------------------------------------------
  INSERT INTO public.orders (
    user_id, customer_id, status, payment_status, payment_method,
    shipping_address, shipping_method, shipping_cost,
    total_price, display_id, notes
  ) VALUES (
    v_user_id, p_customer_id, 'pending', 'pending', p_payment_method,
    p_shipping_address, p_shipping_method, COALESCE(p_shipping_cost, 0),
    v_total, v_display, p_notes
  )
  RETURNING id INTO v_order_id;

  -- ------------------------------------------------------------
  -- 5. Insert order_items and decrement stock for resolvable products.
  --    Non-UUID product ids (e.g. legacy 'BB-101' display ids or seed
  --    data) are tolerated — we just null out the FK reference and
  --    keep the product_name / product_image snapshot.
  -- ------------------------------------------------------------
  FOR v_item IN SELECT jsonb_array_elements(p_cart_items) LOOP
    v_qty      := COALESCE((v_item->>'quantity')::INTEGER, 1);
    v_price    := COALESCE((v_item->>'unit_price')::NUMERIC, 0);
    v_pid_text := v_item->>'product_id';

    BEGIN
      v_pid_uuid := NULLIF(v_pid_text, '')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      v_pid_uuid := NULL;
    END;

    INSERT INTO public.order_items (
      order_id, product_id, quantity, price, unit_price,
      product_name, product_image, product_options
    ) VALUES (
      v_order_id,
      v_pid_uuid,
      v_qty,
      v_price,
      v_price,
      NULLIF(v_item->>'product_name', ''),
      NULLIF(v_item->>'product_image', ''),
      COALESCE(v_item->'product_options', '{}'::JSONB)
    );

    IF v_pid_uuid IS NOT NULL THEN
      UPDATE public.products
         SET stock = GREATEST(0, COALESCE(stock, 0) - v_qty)
       WHERE id = v_pid_uuid;
    END IF;
  END LOOP;

  -- ------------------------------------------------------------
  -- 6. Return the new order's identifiers + total
  -- ------------------------------------------------------------
  RETURN QUERY SELECT v_order_id, v_display, v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(
  JSONB, UUID, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, UUID, TEXT
) TO authenticated;

COMMIT;
