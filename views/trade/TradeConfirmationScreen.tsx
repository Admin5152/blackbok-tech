/**
 * Spec Screen 9 — Confirmation after submit.
 *
 * Shows server display_id (TRD…), SLA + store location from trade_config, and
 * 3-step next path (review → offer → bring to BlackBox / D9). Clears wizard
 * state on leave. Admin edits to ops keys appear without deploy.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2, MapPin } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { useAppContext } from '../../lib/appContext';
import { getTradeConfigValue } from '../../lib/tradeApi';
import { formatGhs } from '../../lib/money';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { clearTradeFlowState } from '../../lib/tradeFlowState';

export function TradeConfirmationScreen() {
  const { theme } = useAppContext();
  const isLight = theme === 'light';
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();
  const [slaHours, setSlaHours] = useState('24');
  const [storeLocation, setStoreLocation] = useState<string>(TRADE_COPY.details.storeLocation);
  const result = state.submittedTrade;

  useEffect(() => {
    if (!result) {
      void navigate({ to: '/trade/type', replace: true });
    }
  }, [result, navigate]);

  useEffect(() => {
    getTradeConfigValue('offer_sla_hours', '24')
      .then(setSlaHours)
      .catch(() => setSlaHours('24'));
    getTradeConfigValue('store_location', TRADE_COPY.details.storeLocation)
      .then(setStoreLocation)
      .catch(() => setStoreLocation(TRADE_COPY.details.storeLocation));
  }, []);

  if (!result) return null;

  const leave = (to: string) => {
    clearTradeFlowState();
    dispatch({ type: 'RESET' });
    void navigate({ to });
  };

  return (
    <section className="space-y-8 text-center py-6">
      <CheckCircle2 size={56} className="mx-auto text-[#CDA032]" aria-hidden />
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          {TRADE_COPY.confirmation.heading}
        </h1>
        <p className={`mt-3 text-sm leading-relaxed max-w-md mx-auto ${isLight ? 'text-black/60' : 'text-white/55'}`}>
          {TRADE_COPY.confirmation.estimateOnlyNote}
        </p>
        <p className={`mt-4 text-sm ${isLight ? 'text-black/50' : 'text-white/45'}`}>
          {TRADE_COPY.confirmation.referenceLabel}
        </p>
        <p className="mt-1 text-3xl font-black tracking-[0.15em] text-[#CDA032]">
          {result.displayId}
        </p>
      </div>

      {result.topUpAmount != null && result.topUpAmount > 0 && (
        <p className="text-sm">
          {TRADE_COPY.summary.youTopUp}:{' '}
          <span className="font-black tabular-nums">{formatGhs(result.topUpAmount)}</span>
          <span className={`block text-xs mt-1 ${isLight ? 'text-black/40' : 'text-white/35'}`}>
            {/* TODO(D8) */}
            {TRADE_COPY.summary.topUpPayableAtBlackBox}
          </span>
        </p>
      )}

      {result.expiresAt && (
        <p className={`text-xs ${isLight ? 'text-black/45' : 'text-white/40'}`}>
          {TRADE_COPY.confirmation.expiresPrefix}{' '}
          {new Date(result.expiresAt).toLocaleDateString('en-GB')}
        </p>
      )}

      <p className={`text-sm ${isLight ? 'text-black/55' : 'text-white/50'}`}>
        {TRADE_COPY.confirmation.slaPrefix} {slaHours}{' '}
        {TRADE_COPY.confirmation.slaSuffix}
      </p>

      <div
        className={`text-left rounded-2xl border p-5 space-y-2 max-w-md mx-auto flex gap-3 ${
          isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <MapPin className="text-[#CDA032] shrink-0 mt-0.5" size={20} aria-hidden />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032]">
            {TRADE_COPY.confirmation.storeCardHeading}
          </p>
          <p className="text-sm font-bold mt-1">{TRADE_COPY.details.storeName}</p>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-black/50' : 'text-white/45'}`}>
            {storeLocation}
          </p>
        </div>
      </div>

      <div
        className={`text-left rounded-2xl border p-5 space-y-3 max-w-md mx-auto ${
          isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032]">
          {TRADE_COPY.confirmation.nextStepsHeading}
        </p>
        <ol className="space-y-2 text-sm list-decimal list-inside">
          <li>{TRADE_COPY.confirmation.step1}</li>
          <li>{TRADE_COPY.confirmation.step2}</li>
          <li>{TRADE_COPY.confirmation.step3}</li>
        </ol>
      </div>

      <p className={`text-xs ${isLight ? 'text-black/40' : 'text-white/35'}`}>
        {TRADE_COPY.confirmation.trackingHint}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={() => leave('/account/trade-ins')}
          className="rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-4"
        >
          {TRADE_COPY.confirmation.viewMyTrades}
        </button>
        <button
          type="button"
          onClick={() => leave('/trade/type')}
          className={`rounded-xl border font-black uppercase tracking-[0.2em] text-xs px-8 py-4 ${
            isLight ? 'border-black/15' : 'border-white/15'
          }`}
        >
          {TRADE_COPY.confirmation.startAnother}
        </button>
      </div>
    </section>
  );
}
