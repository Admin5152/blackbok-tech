import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import {
  formatGHS,
  promoQuote,
  useCampuses,
  type PromoEvaluateResult,
  type PromoQuoteItem,
} from '../../lib/promotions';
import {
  cartToPromoQuoteItems,
  loadPersistedPromoCode,
  persistPromoCode,
} from '../../lib/promoCart';
import type { CartItem } from '../../types';

export type AppliedPromoQuote = {
  code: string | null;
  name: string;
  discount_pesewas: number;
  promotion_id: string;
};

interface PromoCodeInputProps {
  cart: CartItem[];
  /** Fires whenever the applied quote changes (including clear / reject). */
  onAppliedChange: (applied: AppliedPromoQuote | null) => void;
  theme?: 'light' | 'dark';
  /** Compact layout for cart summary. */
  compact?: boolean;
}

/**
 * Promo code field backed by promo_quote only.
 * Rejection copy is always the server `message` — never paraphrased.
 */
export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  cart,
  onAppliedChange,
  theme = 'dark',
  compact = false,
}) => {
  const isLight = theme === 'light';
  const [draft, setDraft] = useState(() => loadPersistedPromoCode());
  const [activeCode, setActiveCode] = useState<string | null>(() => {
    const saved = loadPersistedPromoCode();
    return saved || null;
  });
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedPromoQuote | null>(null);

  const { data: campuses } = useCampuses(true);
  const campusId = campuses?.[0]?.id ?? null;

  const items: PromoQuoteItem[] = useMemo(() => cartToPromoQuoteItems(cart), [cart]);

  const applyQuoteResult = useCallback(
    (code: string | null, result: Awaited<ReturnType<typeof promoQuote>>) => {
      const winner = result.applied;
      if (winner?.ok && (winner.discount_pesewas ?? 0) > 0 && winner.promotion_id && winner.name) {
        const next: AppliedPromoQuote = {
          code,
          name: winner.name,
          discount_pesewas: winner.discount_pesewas ?? 0,
          promotion_id: winner.promotion_id,
        };
        setApplied(next);
        setServerMessage(null);
        onAppliedChange(next);
        return;
      }

      setApplied(null);
      onAppliedChange(null);

      // Prefer the typed-code failure message; else the soft evaluate message.
      const rejection: PromoEvaluateResult | null =
        result.code_result && result.code_result.ok === false
          ? result.code_result
          : winner && winner.ok === false
            ? winner
            : null;
      if (code && rejection?.message) {
        setServerMessage(rejection.message);
      } else if (code && !winner) {
        setServerMessage(result.code_result?.message ?? 'This code is not valid.');
      } else {
        setServerMessage(null);
      }
    },
    [onAppliedChange],
  );

  // Re-quote whenever the cart changes (and when a code is active).
  useEffect(() => {
    if (items.length === 0) {
      setApplied(null);
      onAppliedChange(null);
      setServerMessage(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const result = await promoQuote({
          items,
          code: activeCode,
          campus_id: campusId,
        });
        if (!cancelled) applyQuoteResult(activeCode, result);
      } catch (err: unknown) {
        if (!cancelled) {
          setApplied(null);
          onAppliedChange(null);
          // Network / RPC transport errors — not evaluate soft-fail copy.
          const message =
            err instanceof Error && err.message
              ? err.message
              : 'This code is not valid.';
          setServerMessage(activeCode ? message : null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [items, activeCode, campusId, applyQuoteResult, onAppliedChange]);

  const handleApply = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = draft.trim().toUpperCase();
    if (!trimmed || loading) return;
    persistPromoCode(trimmed);
    setActiveCode(trimmed);
  };

  const handleRemove = (): void => {
    persistPromoCode(null);
    setDraft('');
    setActiveCode(null);
    setApplied(null);
    setServerMessage(null);
    onAppliedChange(null);
  };

  if (applied) {
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
          <Check size={16} className={isLight ? 'text-emerald-700' : 'text-emerald-300'} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              isLight ? 'text-emerald-800' : 'text-emerald-200'
            }`}
          >
            {applied.name}
          </p>
          {applied.code && (
            <p
              className={`text-[11px] font-medium uppercase tracking-widest mt-0.5 ${
                isLight ? 'text-emerald-700/70' : 'text-emerald-300/70'
              }`}
            >
              {applied.code}
            </p>
          )}
          <p
            className={`mt-1 text-sm font-medium ${
              isLight ? 'text-emerald-700' : 'text-emerald-300'
            }`}
          >
            −{formatGHS(applied.discount_pesewas)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove promo code"
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-widest transition-colors ${
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

  return (
    <form onSubmit={handleApply} className={compact ? 'space-y-2' : 'space-y-2'}>
      {!compact && (
        <label
          htmlFor="promo-code"
          className={`block text-[10px] font-medium uppercase tracking-[0.25em] ${
            isLight ? 'text-black/50' : 'text-white/50'
          }`}
        >
          Promo code
        </label>
      )}
      <div
        className={
          compact
            ? 'flex bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full p-1.5 focus-within:ring-2 focus-within:ring-[#CDA032]/50 focus-within:border-[#CDA032] transition-all shadow-sm'
            : 'flex items-stretch gap-2'
        }
      >
        {compact ? (
          <>
            <input
              id="promo-code"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value.toUpperCase())}
              placeholder="PROMO CODE"
              disabled={loading || cart.length === 0}
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent px-4 py-2 text-xs sm:text-sm focus:outline-none uppercase font-medium tracking-widest text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
            />
            <button
              type="submit"
              disabled={loading || draft.trim().length === 0 || cart.length === 0}
              className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-full text-[10px] font-medium uppercase tracking-[0.2em] hover:bg-[#CDA032] hover:text-black dark:hover:bg-[#CDA032] transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-50"
            >
              {loading ? '…' : 'Apply'}
            </button>
          </>
        ) : (
          <>
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
                id="promo-code"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
                placeholder="Enter code"
                disabled={loading || cart.length === 0}
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
              disabled={loading || draft.trim().length === 0 || cart.length === 0}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-[11px] font-medium uppercase tracking-widest transition-colors min-w-[90px] ${
                loading || draft.trim().length === 0 || cart.length === 0
                  ? isLight
                    ? 'bg-black/10 text-black/40 cursor-not-allowed'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-[#B38B21] text-black hover:bg-[#D4AF37]'
              }`}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
            </button>
          </>
        )}
      </div>
      {serverMessage && (
        <p
          role="alert"
          className={`text-xs font-medium ${isLight ? 'text-red-600' : 'text-red-400'}`}
        >
          {serverMessage}
        </p>
      )}
    </form>
  );
};
