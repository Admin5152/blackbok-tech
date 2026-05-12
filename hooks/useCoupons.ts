import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

export interface AppliedCoupon extends Coupon {
  discountAmount: number;
}

export interface UseCouponsResult {
  appliedCoupon: AppliedCoupon | null;
  discountAmount: number;
  loading: boolean;
  error: string | null;
  validateCoupon: (code: string, orderTotal: number) => Promise<AppliedCoupon | null>;
  clearCoupon: () => void;
}

/** Round a money amount to 2 decimal places without floating-point drift. */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Coupon validation for checkout. Performs the same set of checks the
 * server-side `place_order` RPC will repeat, so the user gets fast feedback.
 * Does NOT insert into `coupon_uses` — that happens inside `useCheckout`.
 */
export function useCoupons(): UseCouponsResult {
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const validateCoupon = useCallback(async (
    code: string,
    orderTotal: number,
  ): Promise<AppliedCoupon | null> => {
    const trimmed = (code ?? '').trim();
    if (!trimmed) {
      setError('Enter a coupon code.');
      setAppliedCoupon(null);
      return null;
    }
    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      setError('Add items to your cart before applying a coupon.');
      setAppliedCoupon(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();

      // 1. Look up the coupon. The `.or(...)` keeps coupons with no
      //    expiry date AND those whose `valid_until` is still in the future.
      const { data: rows, error: qErr } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', trimmed)
        .eq('is_active', true)
        .or(`valid_until.is.null,valid_until.gt.${nowIso}`)
        .limit(1);
      if (qErr) throw qErr;

      const coupon = ((rows ?? [])[0]) as Coupon | undefined;
      if (!coupon) {
        setError('Invalid or expired coupon.');
        setAppliedCoupon(null);
        return null;
      }

      // 2. Usage cap (global).
      if (coupon.max_uses !== null && Number(coupon.used_count) >= Number(coupon.max_uses)) {
        setError('This coupon has reached its usage limit.');
        setAppliedCoupon(null);
        return null;
      }

      // 3. Minimum order value.
      const minOrderValue = Number(coupon.min_order_value ?? 0);
      if (orderTotal < minOrderValue) {
        setError(`Minimum order of ${minOrderValue} required to use this coupon.`);
        setAppliedCoupon(null);
        return null;
      }

      // 4. Per-user usage check.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to apply a coupon.');
        setAppliedCoupon(null);
        return null;
      }

      const { data: uses, error: usesErr } = await supabase
        .from('coupon_uses')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .limit(1);
      if (usesErr) throw usesErr;
      if (uses && uses.length > 0) {
        setError('You have already used this coupon.');
        setAppliedCoupon(null);
        return null;
      }

      // 5. Compute discount, clamped to the order total.
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = (Number(coupon.discount_value) / 100) * orderTotal;
      } else {
        discountAmount = Math.min(Number(coupon.discount_value), orderTotal);
      }
      discountAmount = roundCurrency(Math.max(0, Math.min(orderTotal, discountAmount)));

      const applied: AppliedCoupon = { ...coupon, discountAmount };
      setAppliedCoupon(applied);
      return applied;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to validate coupon';
      setError(message);
      setAppliedCoupon(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCoupon = useCallback((): void => {
    setAppliedCoupon(null);
    setError(null);
  }, []);

  return {
    appliedCoupon,
    discountAmount: appliedCoupon?.discountAmount ?? 0,
    loading,
    error,
    validateCoupon,
    clearCoupon,
  };
}
