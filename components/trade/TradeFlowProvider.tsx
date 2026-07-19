/**
 * TradeFlowProvider — context + reducer for the v2 trade-in wizard.
 *
 * Role in flow: wraps /trade/* routes so every screen reads/writes the same
 * TradeFlowState. Persists to sessionStorage (`trade_v2_state`) on each change
 * so refresh and browser-back restore progress.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import {
  initialTradeFlowState,
  loadTradeFlowState,
  persistTradeFlowState,
  tradeFlowReducer,
  type TradeFlowAction,
  type TradeFlowState,
} from '../../lib/tradeFlowState';
import { consumeTradeTargetSeed } from '../../lib/catalogApi';

interface TradeFlowContextValue {
  state: TradeFlowState;
  dispatch: Dispatch<TradeFlowAction>;
}

const TradeFlowContext = createContext<TradeFlowContextValue | null>(null);

/** Lazy init from sessionStorage so refresh restores before first paint */
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

  // Persist after every change (init already hydrated — no empty overwrite race)
  useEffect(() => {
    persistTradeFlowState(state);
  }, [state]);

  // PDP trade banner deep-link: seed target SKU once, then clear
  useEffect(() => {
    const seed = consumeTradeTargetSeed<{
      productId: string | null;
      variantId: string | null;
      productName: string | null;
      storage: string | null;
      simType: string | null;
      color: string | null;
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

/**
 * Access trade wizard state + dispatch.
 * @throws if used outside TradeFlowProvider
 */
export function useTradeFlow(): TradeFlowContextValue {
  const ctx = useContext(TradeFlowContext);
  if (!ctx) {
    throw new Error('useTradeFlow must be used within TradeFlowProvider');
  }
  return ctx;
}
