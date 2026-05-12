import React, { useState } from 'react';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { useCoupons, type AppliedCoupon } from '../../hooks/useCoupons';
import { formatCurrency } from '../../lib/utils';

interface CouponInputProps {
  orderTotal: number;
  onCouponApplied: (coupon: AppliedCoupon | null) => void;
  /** Optional — defaults to 'dark' to match the Checkout page palette. */
  theme?: 'light' | 'dark';
}

/**
 * Coupon entry field for the checkout page.
 *
 * Self-contained: owns the text input + validation flow via `useCoupons`,
 * and notifies the parent of every state transition via `onCouponApplied`.
 * The parent is the source of truth for "is a coupon applied?" — this
 * component just drives the UX around adding/removing it.
 */
export const CouponInput: React.FC<CouponInputProps> = ({
  orderTotal,
  onCouponApplied,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const { appliedCoupon, loading, error, validateCoupon, clearCoupon } = useCoupons();
  const [code, setCode] = useState<string>('');

  const handleApply = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || loading) return;
    const result = await validateCoupon(trimmed, orderTotal);
    onCouponApplied(result);
  };

  const handleRemove = (): void => {
    clearCoupon();
    setCode('');
    onCouponApplied(null);
  };

  // ----- Applied state -----------------------------------------------------
  if (appliedCoupon) {
    return (
      <div
        className={`rounded-xl border p-4 flex items-start gap-3 ${
          isLight
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-emerald-500/10 border-emerald-500/20'
        }`}
      >
        <div
          className={`shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${
            isLight ? 'bg-emerald-100' : 'bg-emerald-500/20'
          }`}
        >
          <Check
            size={16}
            className={isLight ? 'text-emerald-700' : 'text-emerald-300'}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <p
              className={`text-[11px] font-black uppercase tracking-widest ${
                isLight ? 'text-emerald-700' : 'text-emerald-300'
              }`}
            >
              {appliedCoupon.code}
            </p>
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${
                isLight ? 'text-emerald-700/60' : 'text-emerald-300/70'
              }`}
            >
              applied
            </span>
          </div>

          {appliedCoupon.description && (
            <p
              className={`text-xs mt-1 ${
                isLight ? 'text-emerald-800/80' : 'text-emerald-200/80'
              }`}
            >
              {appliedCoupon.description}
            </p>
          )}

          <p
            className={`mt-1 text-sm font-black ${
              isLight ? 'text-emerald-700' : 'text-emerald-300'
            }`}
          >
            −{formatCurrency(appliedCoupon.discountAmount)}
            <span
              className={`ml-2 text-[10px] font-bold uppercase tracking-widest ${
                isLight ? 'text-emerald-700/60' : 'text-emerald-300/60'
              }`}
            >
              {appliedCoupon.discount_type === 'percentage'
                ? `${appliedCoupon.discount_value}% off`
                : 'flat discount'}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove coupon"
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
            isLight
              ? 'text-emerald-700/70 hover:text-emerald-900 hover:bg-emerald-100'
              : 'text-emerald-300/70 hover:text-emerald-100 hover:bg-emerald-500/20'
          }`}
        >
          <X size={11} /> Remove
        </button>
      </div>
    );
  }

  // ----- Entry state -------------------------------------------------------
  return (
    <form onSubmit={handleApply} className="space-y-2">
      <label
        htmlFor="coupon-code"
        className={`block text-[10px] font-black uppercase tracking-[0.25em] ${
          isLight ? 'text-black/50' : 'text-white/50'
        }`}
      >
        Promo code
      </label>

      <div className="flex items-stretch gap-2">
        <div
          className={`relative flex-1 flex items-center rounded-lg border transition-colors ${
            isLight
              ? 'bg-white border-black/10 focus-within:border-black/40'
              : 'bg-black/50 border-white/20 focus-within:border-[#B38B21]'
          }`}
        >
          <Tag
            size={14}
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              isLight ? 'text-black/30' : 'text-white/30'
            }`}
          />
          <input
            id="coupon-code"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Enter code"
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
            className={`w-full bg-transparent pl-9 pr-3 py-3 text-sm outline-none uppercase tracking-wider ${
              isLight
                ? 'text-black placeholder-black/30'
                : 'text-white placeholder-white/30'
            } disabled:opacity-60`}
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.trim().length === 0}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors min-w-[90px] ${
            loading || code.trim().length === 0
              ? isLight
                ? 'bg-black/10 text-black/40 cursor-not-allowed'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
              : 'bg-[#B38B21] text-black hover:bg-[#D4AF37]'
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span className="sr-only">Validating</span>
            </>
          ) : (
            <>Apply</>
          )}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className={`text-xs font-bold ${
            isLight ? 'text-red-600' : 'text-red-400'
          }`}
        >
          {error}
        </p>
      )}
    </form>
  );
};
