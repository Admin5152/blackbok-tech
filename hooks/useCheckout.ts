import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AppliedCoupon } from './useCoupons';

/**
 * Shape of a single line-item handed to the `place_order` RPC.
 * Keep field names server-side friendly (snake_case) so the RPC can
 * `jsonb_array_elements_text` directly without renaming.
 */
export interface CheckoutCartItem {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  product_name?: string | null;
  product_image?: string | null;
  product_options?: Record<string, string> | null;
}

export interface PlaceOrderResult {
  order_id: string;
  display_id?: string | null;
  total?: number | null;
}

export interface UseCheckoutResult {
  loading: boolean;
  error: string | null;
  /**
   * Places an order via the `place_order` RPC.
   * Resolves with the new order id on success.
   * Rejects with an Error on failure — callers should wrap in try/catch.
   * The most recent failure message is also mirrored to the `error` state
   * for components that want to render a persistent banner.
   */
  placeOrder: (
    cartItems: CheckoutCartItem[],
    coupon?: AppliedCoupon | null,
  ) => Promise<PlaceOrderResult>;
}

function parseRpcReturn(rpcData: unknown): PlaceOrderResult | null {
  if (typeof rpcData === 'string' && rpcData.length > 0) {
    return { order_id: rpcData };
  }
  if (Array.isArray(rpcData) && rpcData.length > 0) {
    const first = rpcData[0] as Record<string, unknown>;
    const id = (first.order_id ?? first.id) as string | undefined;
    if (!id) return null;
    return {
      order_id: id,
      display_id: (first.display_id as string | null | undefined) ?? null,
      total: (first.total as number | null | undefined) ?? null,
    };
  }
  if (rpcData && typeof rpcData === 'object') {
    const obj = rpcData as Record<string, unknown>;
    const id = (obj.order_id ?? obj.id) as string | undefined;
    if (!id) return null;
    return {
      order_id: id,
      display_id: (obj.display_id as string | null | undefined) ?? null,
      total: (obj.total as number | null | undefined) ?? null,
    };
  }
  return null;
}

/**
 * Wraps the `place_order(p_cart_items, p_coupon_id, p_discount_amount)` RPC.
 *
 * If a coupon is applied, we:
 *   1. Re-validate it is still active and not expired (cheap server round-trip
 *      that mirrors the checks `useCoupons` already did).
 *   2. Insert a `coupon_uses` row with `order_id = null` to reserve the use.
 *   3. Call `place_order`. If the RPC fails we roll back the reservation.
 *   4. After the RPC succeeds, update `coupon_uses.order_id` to the new
 *      order id so the use is correctly attributed.
 */
export function useCheckout(): UseCheckoutResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const placeOrder = useCallback(async (
    cartItems: CheckoutCartItem[],
    coupon: AppliedCoupon | null = null,
  ): Promise<PlaceOrderResult> => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      const empty = new Error('Your cart is empty.');
      setError(empty.message);
      throw empty;
    }

    setLoading(true);
    setError(null);

    let reservationId: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be signed in to place an order.');
      }

      // 1. Coupon re-validation + reservation
      if (coupon) {
        const { data: revalidated, error: revErr } = await supabase
          .from('coupons')
          .select('id, is_active, valid_until, max_uses, used_count')
          .eq('id', coupon.id)
          .maybeSingle();
        if (revErr) throw revErr;
        if (!revalidated) {
          throw new Error('Coupon no longer exists.');
        }
        if (!revalidated.is_active) {
          throw new Error('Coupon is no longer active.');
        }
        if (
          revalidated.valid_until &&
          new Date(revalidated.valid_until).getTime() <= Date.now()
        ) {
          throw new Error('Coupon has expired.');
        }
        if (
          revalidated.max_uses !== null &&
          Number(revalidated.used_count) >= Number(revalidated.max_uses)
        ) {
          throw new Error('Coupon has reached its usage limit.');
        }

        const { data: useRow, error: useErr } = await supabase
          .from('coupon_uses')
          .insert({
            coupon_id: coupon.id,
            user_id: user.id,
            order_id: null,
          })
          .select('id')
          .single();
        if (useErr) throw useErr;
        reservationId = (useRow as { id: string }).id;
      }

      // 2. Call place_order RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc('place_order', {
        p_cart_items: cartItems,
        p_coupon_id: coupon?.id ?? null,
        p_discount_amount: coupon?.discountAmount ?? 0,
      });
      if (rpcErr) throw rpcErr;

      const result = parseRpcReturn(rpcData);
      if (!result) {
        throw new Error('place_order did not return an order id.');
      }

      // 3. Link coupon_uses to the freshly created order. Non-fatal: the
      //    order is already in the DB, so we surface a warning instead of
      //    failing checkout.
      if (reservationId) {
        const { error: linkErr } = await supabase
          .from('coupon_uses')
          .update({ order_id: result.order_id })
          .eq('id', reservationId);
        if (linkErr) {
          console.warn('useCheckout: failed to link coupon_uses to order', linkErr);
        }
      }

      return result;
    } catch (err: unknown) {
      // Roll back the coupon_uses reservation if we created one and the
      // RPC (or any later step) failed. Swallow rollback errors — the user
      // already has a meaningful error from the original failure.
      if (reservationId) {
        try {
          await supabase.from('coupon_uses').delete().eq('id', reservationId);
        } catch {
          /* swallow rollback failures */
        }
      }
      // Supabase RPC errors come back as PostgrestError (NOT instanceof
      // Error) but still expose a `message` field — pull it out either way.
      const rawMessage =
        (err as { message?: unknown } | null)?.message;
      const message =
        typeof rawMessage === 'string' && rawMessage.length > 0
          ? rawMessage
          : 'Failed to place order';
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    placeOrder,
  };
}
