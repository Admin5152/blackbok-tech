/**
 * Spec Screen 1 — Device type cards (Repair “What can we help you with?” pattern).
 * TODO(iPad-prices): iPad gated until active priced rows exist.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Smartphone, Tablet } from 'lucide-react';
import { useTradeFlow } from '../../components/trade/TradeFlowProvider';
import { hasActiveIpadDevices } from '../../lib/tradeApi';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { TRADE_CARD_TYPE, tradeCardSelected } from '../../lib/tradeUi';
import type { TradeDeviceType } from '../../types/supabase';

export function TradeTypeScreen() {
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();
  const [ipadAvailable, setIpadAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hasIpad = await hasActiveIpadDevices();
        if (!cancelled) setIpadAvailable(hasIpad);
      } catch {
        if (!cancelled) setError(TRADE_COPY.states.errorGeneric);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pick = (deviceType: TradeDeviceType) => {
    dispatch({ type: 'SET_DEVICE_TYPE', deviceType });
    void navigate({ to: '/trade/category' });
  };

  if (loading) {
    return (
      <p className="text-center py-12 text-sm text-[color:var(--bb-muted)]">
        {TRADE_COPY.states.loadingDevices}
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center py-12 text-sm text-red-500" role="alert">
        {error}
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">
        {TRADE_COPY.deviceType.heading}
      </h2>

      <div
        className={`grid gap-3 sm:gap-4 ${
          ipadAvailable ? 'grid-cols-2 md:grid-cols-3 max-w-2xl' : 'grid-cols-1 sm:grid-cols-2 max-w-md'
        }`}
      >
        <button
          type="button"
          onClick={() => pick('iphone')}
          className={`${TRADE_CARD_TYPE} ${tradeCardSelected(state.deviceType === 'iphone')}`}
        >
          <Smartphone
            size={36}
            strokeWidth={1.5}
            className={`mb-4 transition-colors ${
              state.deviceType === 'iphone' ? 'text-[#CDA032]' : 'opacity-60'
            }`}
            aria-hidden
          />
          <span
            className={`text-sm sm:text-base font-bold ${
              state.deviceType === 'iphone' ? 'text-[#CDA032]' : 'opacity-90'
            }`}
          >
            {TRADE_COPY.deviceType.iphone}
          </span>
        </button>

        {ipadAvailable && (
          <button
            type="button"
            onClick={() => pick('ipad')}
            className={`${TRADE_CARD_TYPE} ${tradeCardSelected(state.deviceType === 'ipad')}`}
          >
            <Tablet
              size={36}
              strokeWidth={1.5}
              className={`mb-4 transition-colors ${
                state.deviceType === 'ipad' ? 'text-[#CDA032]' : 'opacity-60'
              }`}
              aria-hidden
            />
            <span
              className={`text-sm sm:text-base font-bold ${
                state.deviceType === 'ipad' ? 'text-[#CDA032]' : 'opacity-90'
              }`}
            >
              {TRADE_COPY.deviceType.ipad}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
