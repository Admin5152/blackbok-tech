/**
 * My trade-ins — /account/trade-ins
 *
 * Own-row select of trade_in_requests. Status chips for legacy + v7 vocabulary.
 * Expired badge when past expires_at. awaiting_user / offer_made: show final
 * offer beside original estimate (never overwrite) with Accept / Decline.
 * RLS blocks completed/scheduled updates — surface a friendly error.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAppContext } from '../../lib/appContext';
import { getTradeRequests } from '../../lib/api';
import {
  formatCustomerStatusShort,
  customerStatusBadgeClasses,
} from '../../lib/customerStatusLabels';
import { formatGhs } from '../../lib/money';
import { saveReturnTo } from '../../lib/returnTo';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { tradeFriendlyError } from '../../lib/tradeErrors';
import { tradeOfferAmount } from '../../lib/tradeOffer';
import { tradeNeedsOfferResponse } from '../../lib/tradeOfferRespond';
import type { TradeRequest } from '../../types';
import { PageBackButton } from '../../components/PageBackButton';
import { TradeOfferRespondButtons } from '../../components/TradeOfferRespondButtons';
import { CancelRequestButton } from '../../components/CancelRequestButton';
import { canCancelTrade } from '../../lib/customerCancel';
import { PAGE_SIZES, usePagination } from '../../lib/pagination';
import { Pagination } from '../../components/Pagination';

function isExpired(t: TradeRequest): boolean {
  if (!t.expires_at) return false;
  const raw = String(t.status || '').toLowerCase();
  if (raw === 'expired') return true;
  if (['completed', 'cancelled', 'rejected', 'accepted', 'scheduled'].includes(raw)) {
    return false;
  }
  return new Date(t.expires_at).getTime() < Date.now();
}

export function MyTradeInsPage() {
  const { theme, user, authReady, notify, setTrades, trades } = useAppContext();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [rows, setRows] = useState<TradeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getTradeRequests(user.id);
      setRows(data);
      setTrades(data);
    } catch (e) {
      console.warn(e);
      notify(tradeFriendlyError(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, setTrades, notify]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [authReady, user, load]);

  const tradesPaging = usePagination(rows, PAGE_SIZES.list, rows.length);

  return (
    <div
      className={`min-h-[70vh] px-4 py-6 sm:px-6 sm:py-10 max-w-3xl mx-auto ${
        isLight ? 'text-black' : 'text-white'
      }`}
    >
      <div className="mb-6 flex items-center gap-3">
        <PageBackButton isLight={isLight} fallbackTo="/" label="Back" />
        <h1 className="text-2xl font-black tracking-tight">{TRADE_COPY.myTrades.heading}</h1>
      </div>

      {!authReady || loading ? (
        <p className="text-sm text-[color:var(--bb-muted)] py-12 text-center">
          {TRADE_COPY.states.loading}
        </p>
      ) : !user ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-sm">{TRADE_COPY.myTrades.signIn}</p>
          <button
            type="button"
            onClick={() => {
              saveReturnTo('/account/trade-ins');
              void navigate({
                to: '/auth',
                search: { returnTo: '/account/trade-ins' } as any,
              });
            }}
            className="rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-3"
          >
            Sign in
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-sm text-[color:var(--bb-muted)]">{TRADE_COPY.myTrades.empty}</p>
          <button
            type="button"
            onClick={() => void navigate({ to: '/trade/type' })}
            className="rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-3"
          >
            {TRADE_COPY.myTrades.reRun}
          </button>
        </div>
      ) : (
        <>
        <ul className="space-y-4">
          {tradesPaging.pageItems.map((t) => {
            const expired = isExpired(t);
            const estimate = Number(t.estimated_value ?? t.estimatedValue) || 0;
            const finalOffer = tradeOfferAmount(t);
            const hasOffer = finalOffer != null;
            const showRespond = tradeNeedsOfferResponse(t) && !expired;

            return (
              <li
                key={t.id}
                className={`rounded-2xl border p-4 sm:p-5 ${
                  isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black tracking-wide text-[#CDA032]">
                      {t.display_id || t.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm font-bold mt-0.5">
                      {t.device || t.device_name || 'Device'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {expired && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-red-500/15 text-red-500">
                        {TRADE_COPY.myTrades.expired}
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${customerStatusBadgeClasses(
                        t.status,
                        'trade',
                        isLight,
                      )}`}
                    >
                      {formatCustomerStatusShort('trade', t.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div
                    className={`rounded-xl border p-3 ${
                      isLight ? 'border-black/8 bg-black/[0.02]' : 'border-white/8 bg-white/[0.02]'
                    }`}
                  >
                    <p
                      className={`text-[10px] uppercase tracking-wider ${
                        isLight ? 'text-black/40' : 'text-white/35'
                      }`}
                    >
                      {TRADE_COPY.myTrades.originalEstimate}
                    </p>
                    <p className="font-bold tabular-nums mt-1">{formatGhs(estimate)}</p>
                  </div>
                  <div
                    className={`rounded-xl border p-3 ${
                      hasOffer
                        ? 'border-[#CDA032]/40 bg-[#CDA032]/10'
                        : isLight
                          ? 'border-black/8 bg-black/[0.02]'
                          : 'border-white/8 bg-white/[0.02]'
                    }`}
                  >
                    <p
                      className={`text-[10px] uppercase tracking-wider ${
                        hasOffer ? 'text-[#CDA032]' : isLight ? 'text-black/40' : 'text-white/35'
                      }`}
                    >
                      {TRADE_COPY.myTrades.finalOffer}
                    </p>
                    <p
                      className={`font-black tabular-nums mt-1 ${
                        hasOffer ? 'text-[#CDA032] text-lg' : ''
                      }`}
                    >
                      {hasOffer ? formatGhs(finalOffer) : TRADE_COPY.myTrades.finalOfferPending}
                    </p>
                    {hasOffer && (
                      <p
                        className={`text-[10px] mt-1 leading-snug ${
                          isLight ? 'text-black/45' : 'text-white/40'
                        }`}
                      >
                        {TRADE_COPY.myTrades.finalOfferHint}
                      </p>
                    )}
                  </div>
                  {t.top_up_amount != null && Number(t.top_up_amount) > 0 && (
                    <div>
                      <p
                        className={`text-[10px] uppercase tracking-wider ${
                          isLight ? 'text-black/40' : 'text-white/35'
                        }`}
                      >
                        {TRADE_COPY.myTrades.topUp}
                      </p>
                      <p className="font-bold tabular-nums">
                        {formatGhs(Number(t.top_up_amount))}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <Link
                    to={`/tracking/trade/${t.id}` as any}
                    className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] hover:underline"
                  >
                    {TRADE_COPY.myTrades.viewTracking}
                  </Link>
                  {canCancelTrade(t) && (
                    <CancelRequestButton
                      kind="trade"
                      trade={t}
                      isLight={isLight}
                      notify={notify}
                      onCancelled={(id) => {
                        const next = (trades.length ? trades : rows).map((row) =>
                          row.id === id ? { ...row, status: 'Cancelled' } : row,
                        );
                        setTrades(next);
                        setRows((prev) =>
                          prev.map((r) => (r.id === id ? { ...r, status: 'Cancelled' } : r)),
                        );
                      }}
                    />
                  )}
                </div>

                {showRespond && (
                  <TradeOfferRespondButtons
                    trade={t}
                    trades={trades.length ? trades : rows}
                    setTrades={(next) => {
                      setTrades(next);
                      setRows((prev) =>
                        prev.map((r) => {
                          const updated = next.find((n) => n.id === r.id);
                          return updated ? { ...r, ...updated } : r;
                        }),
                      );
                    }}
                    notify={notify}
                    isLight={isLight}
                    className="mt-4"
                  />
                )}

                {expired && (
                  <button
                    type="button"
                    onClick={() => void navigate({ to: '/trade/type' })}
                    className="mt-4 w-full rounded-xl border border-[#CDA032]/40 text-[#CDA032] font-black uppercase tracking-widest text-[10px] py-3"
                  >
                    {TRADE_COPY.myTrades.reRun}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <Pagination
          page={tradesPaging.page}
          pageCount={tradesPaging.pageCount}
          onPageChange={tradesPaging.setPage}
          total={tradesPaging.total}
          pageSize={PAGE_SIZES.list}
          isLight={isLight}
        />
        </>
      )}
    </div>
  );
}
