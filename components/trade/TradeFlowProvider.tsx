/**
 * TradeFlowProvider — wraps /trade/* with wizard state.
 *
 * Context + useTradeFlow live in lib/tradeFlowContext.tsx (hook-only file)
 * so Vite Fast Refresh does not invalidate the Provider and orphan screens.
 */
import React, { useEffect, useReducer, type ReactNode } from 'react';
import {
  TradeFlowContext,
} from '../../lib/tradeFlowContext';
import {
  initialTradeFlowState,
  loadTradeFlowState,
  persistTradeFlowState,
  tradeFlowReducer,
  type TradeFlowState,
} from '../../lib/tradeFlowState';

const TRADE_PDP_SEED_KEY = 'trade_v2_pdp_target_seed';

function consumePdpTargetSeed<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(TRADE_PDP_SEED_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(TRADE_PDP_SEED_KEY);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function initTradeFlowState(): TradeFlowState {
  return loadTradeFlowState() ?? { ...initialTradeFlowState };
}

/**
 * @param children - route Outlet tree under /trade
 */
export function TradeFlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    tradeFlowReducer,
    undefined,
    initTradeFlowState,
  );

  useEffect(() => {
    persistTradeFlowState(state);
  }, [state]);

  // PDP trade banner deep-link: seed target SKU once, then clear
  useEffect(() => {
    const seed = consumePdpTargetSeed<{
      productId: string | null;
      variantId: string | null;
      productName: string | null;
      storage: string | null;
      simType: string | null;
      color: string | null;
      ram: string | null;
      effectivePrice: number | null;
      displayImage: string | null;
      cashOnly: boolean;
    }>();
    if (!seed?.productId && !seed?.cashOnly) return;
    dispatch({
      type: 'LOCK_TARGET',
      lock: {
        productId: seed.productId,
        variantId: seed.variantId,
        productName: seed.productName,
        storage: seed.storage,
        simType: seed.simType,
        color: seed.color,
        ram: seed.ram ?? null,
        effectivePrice: seed.effectivePrice,
        displayImage: seed.displayImage,
        cashOnly: Boolean(seed.cashOnly),
      },
    });
  }, []);

  return (
    <TradeFlowContext.Provider value={{ state, dispatch }}>
      {children}
    </TradeFlowContext.Provider>
  );
}
