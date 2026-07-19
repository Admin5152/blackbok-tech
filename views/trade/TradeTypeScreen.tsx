/**
 * Spec Screen 1 — Device type cards (Repair “What can we help you with?” pattern).
 * TODO(iPad-prices): iPad gated until active priced rows exist.
 *
 * iPhone shows immediately; iPad appears when the catalog check resolves
 * (no full-page wait). Prefetch warms series/model cache for the next steps.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Smartphone, Tablet } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { hasActiveIpadDevices } from '../../lib/tradeApi';
import {
  getPricedActiveModelsCached,
  prefetchTradeCatalog,
} from '../../lib/tradeCatalogCache';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { TRADE_CARD_TYPE, tradeCardSelected } from '../../lib/tradeUi';
import type { TradeDeviceType } from '../../types/supabase';

export function TradeTypeScreen() {
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();
  const [ipadAvailable, setIpadAvailable] = useState(false);

  useEffect(() => {
    prefetchTradeCatalog();
    let cancelled = false;
    (async () => {
      try {
        const hasIpad = await hasActiveIpadDevices();
        if (!cancelled) setIpadAvailable(hasIpad);
      } catch {
        /* keep iPhone-only if check fails */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pick = (deviceType: TradeDeviceType) => {
    // Warm this type before navigation so series screen is often instant
    void getPricedActiveModelsCached(deviceType);
    dispatch({ type: 'SET_DEVICE_TYPE', deviceType });
    void navigate({ to: '/trade/category' });
  };

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
