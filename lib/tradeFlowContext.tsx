/**
 * Trade wizard context + hook only (no Provider component).
 *
 * WHY split from TradeFlowProvider: Vite Fast Refresh breaks when a file
 * exports both components and hooks — that remounted /trade screens against
 * a dead context and threw "useTradeFlow must be used within TradeFlowProvider"
 * (Error Code 500). Same pattern as lib/appContext.tsx.
 */
import { createContext, useContext, type Dispatch } from 'react';
import type { TradeFlowAction, TradeFlowState } from './tradeFlowState';

export interface TradeFlowContextValue {
  state: TradeFlowState;
  dispatch: Dispatch<TradeFlowAction>;
}

export const TradeFlowContext = createContext<TradeFlowContextValue | null>(null);

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
