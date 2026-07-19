/**
 * Customer tracking page — /tracking/$type/$id
 *
 * Resolves order / repair / trade by UUID or display_id. Fetches from Supabase
 * when App context has not hydrated yet (common after History / Profile links).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  ArrowLeftRight,
  FileText,
  AlertCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from '@tanstack/react-router';
import { useAppContext } from '../App';
import { formatCurrency } from '../lib/utils';
import {
  getTradeRequestByRef,
  updateRepairRequest,
} from '../lib/api';
import { formatCustomerStatusShort } from '../lib/customerStatusLabels';
import { PageBackButton } from '../components/PageBackButton';
import { tradeOfferAmount } from '../lib/tradeOffer';
import { TRADE_COPY } from '../lib/tradeCopy';
import { TradeOfferRespondButtons } from '../components/TradeOfferRespondButtons';
import type { TradeRequest } from '../types';

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  date?: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: typeof Package;
}

function matchByRef<T extends { id?: string; display_id?: string }>(
  rows: T[],
  ref: string,
): T | undefined {
  const key = String(ref || '').trim();
  if (!key) return undefined;
  return rows.find(
    (r) =>
      r.id === key ||
      String(r.display_id || '').toLowerCase() === key.toLowerCase(),
  );
}

export const Tracking: React.FC = () => {
  const { type, id } = useParams({ from: '/tracking/$type/$id' });
  const {
    theme,
    orders = [],
    repairs = [],
    trades = [],
    setTrades,
    setRepairs,
    notify,
  } = useAppContext();
  const isLight = theme === 'light';

  const [fetchedTrade, setFetchedTrade] = useState<TradeRequest | null>(null);
  const [tradeLookupDone, setTradeLookupDone] = useState(type !== 'trade');
  const [tradeLookupError, setTradeLookupError] = useState(false);

  const contextTrade = useMemo(
    () => (type === 'trade' ? matchByRef(trades, id) : undefined),
    [type, id, trades],
  );

  const trade = contextTrade || fetchedTrade || undefined;

  const tradesRef = React.useRef(trades);
  tradesRef.current = trades;

  useEffect(() => {
    if (type !== 'trade') {
      setTradeLookupDone(true);
      return;
    }
    if (contextTrade) {
      setFetchedTrade(null);
      setTradeLookupDone(true);
      setTradeLookupError(false);
      return;
    }

    let cancelled = false;
    setTradeLookupDone(false);
    setTradeLookupError(false);
    void (async () => {
      try {
        const row = await getTradeRequestByRef(id);
        if (cancelled) return;
        if (row) {
          setFetchedTrade(row);
          const list = Array.isArray(tradesRef.current) ? tradesRef.current : [];
          if (list.some((t) => t.id === row.id)) {
            setTrades(list.map((t) => (t.id === row.id ? row : t)));
          } else {
            setTrades([row, ...list]);
          }
        } else {
          setFetchedTrade(null);
          setTradeLookupError(true);
        }
      } catch {
        if (!cancelled) {
          setFetchedTrade(null);
          setTradeLookupError(true);
        }
      } finally {
        if (!cancelled) setTradeLookupDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [type, id, contextTrade, setTrades]);

  const trackingData = useMemo(() => {
    if (type === 'order') {
      const order = matchByRef(orders, id);
      if (!order) return null;

      const ost = order.status;
      const steps: TimelineStep[] = [
        {
          id: '1',
          label: 'Order placed',
          description: 'We received your order.',
          date: order.date,
          status: 'completed',
          icon: FileText,
        },
        {
          id: '2',
          label: 'Preparing order',
          description: 'We are getting your items ready.',
          status:
            ost === 'Pending' || ost === 'Processing' ? 'current' : 'completed',
          icon: Package,
        },
        {
          id: '3',
          label: 'On the way',
          description: 'Your package is heading to you.',
          status:
            ost === 'Shipped'
              ? 'current'
              : ost === 'Delivered'
                ? 'completed'
                : 'upcoming',
          icon: Truck,
        },
        {
          id: '4',
          label: 'Delivered',
          description: 'Your order has been delivered.',
          status: ost === 'Delivered' ? 'completed' : 'upcoming',
          icon: CheckCircle2,
        },
      ];

      return {
        title: `Order #${order.display_id || id}`,
        subtitle: 'Shipment Tracking',
        mainIcon: Package,
        steps,
        details: [
          { label: 'Status', value: formatCustomerStatusShort('order', ost) },
          { label: 'Carrier', value: 'BlackBox Logistics' },
          { label: 'Method', value: order.shipping_method || 'Standard Express' },
          { label: 'Address', value: order.shipping_address || 'Customer Pick-up' },
        ],
        originalData: order,
        entityId: order.id,
      };
    }

    if (type === 'repair') {
      const repair = matchByRef(repairs, id);
      if (!repair) return null;

      const st = repair.status;
      const pastDiag = [
        'Estimate Sent',
        'In Repair',
        'Ready',
        'Completed',
        'Rejected',
      ].includes(st);
      const pastEstimate = ['In Repair', 'Ready', 'Completed', 'Rejected'].includes(
        st,
      );

      const steps: TimelineStep[] = [
        {
          id: '1',
          label: 'Ticket Created',
          description: 'Repair request logged.',
          date: repair.date,
          status: 'completed',
          icon: FileText,
        },
        {
          id: '2',
          label: 'Diagnosis',
          description: 'Technicians review your device and reported issues.',
          status:
            st === 'Diagnosing'
              ? 'current'
              : st === 'Pending'
                ? 'upcoming'
                : pastDiag
                  ? 'completed'
                  : 'upcoming',
          icon: ArrowLeftRight,
        },
        {
          id: '3',
          label: 'Repair estimate ready',
          description:
            'Diagnosis is complete and your official quote is ready. Approve or decline on the Repair page.',
          status: st === 'Estimate Sent' ? 'current' : pastEstimate ? 'completed' : 'upcoming',
          icon: ShieldCheck,
        },
        {
          id: '4',
          label: 'Repair & pickup',
          description: 'Work in progress or ready for collection.',
          status:
            st === 'In Repair' || st === 'Ready'
              ? 'current'
              : st === 'Completed'
                ? 'completed'
                : 'upcoming',
          icon: Wrench,
        },
        {
          id: '5',
          label: 'Repair complete',
          description: 'Repair finished — thank you for trusting BlackBox.',
          status: st === 'Completed' ? 'completed' : 'upcoming',
          icon: CheckCircle2,
        },
      ];

      if (st === 'Rejected') {
        const ec = (repair as { estimated_cost?: number }).estimated_cost;
        const hadQuote = typeof ec === 'number' && ec > 0;
        if (hadQuote) {
          steps[2] = {
            id: '3',
            label: 'Estimate declined',
            description: 'You declined the repair quote.',
            status: 'completed',
            icon: XCircle,
          };
          steps[3] = {
            id: '4',
            label: 'Ticket closed',
            description: 'No further work on this ticket.',
            status: 'current',
            icon: AlertCircle,
          };
          steps.splice(4, 1);
        } else {
          steps[1] = {
            id: '2',
            label: 'Request not approved',
            description: 'This repair request was closed.',
            status: 'current',
            icon: AlertCircle,
          };
          steps.splice(2, 3);
        }
      }

      return {
        title: `Repair #${repair.display_id || id}`,
        subtitle: 'Service Status',
        mainIcon: Wrench,
        steps,
        details: [
          { label: 'Device', value: repair.device },
          { label: 'Status', value: formatCustomerStatusShort('repair', st) },
          { label: 'Estimate', value: repair.estimatedCost || 'TBD' },
          { label: 'Technician', value: 'Senior Engineer X' },
        ],
        originalData: repair,
        entityId: repair.id,
      };
    }

    if (type === 'trade') {
      if (!trade) return null;

      const offerSentStatuses = ['Offer sent', 'Offer Made', 'Awaiting User'];
      const st = trade.status;
      const offerAmt = tradeOfferAmount(trade);
      const estimateAmt = Number(trade.estimatedValue ?? trade.estimated_value) || 0;
      const refLabel = trade.display_id || trade.id;

      const steps: TimelineStep[] = [
        {
          id: '1',
          label: 'Request submitted',
          description: 'You started the trade-in process.',
          date: trade.date,
          status: 'completed',
          icon: FileText,
        },
        {
          id: '2',
          label: 'Inspecting device',
          description: 'Our lab checks condition before we send a cash offer.',
          status:
            st === 'Inspecting' ? 'current' : st === 'Pending' ? 'upcoming' : 'completed',
          icon: ArrowLeftRight,
        },
        {
          id: '3',
          label: 'Offer ready',
          description: 'Your cash offer is ready — accept or decline in Trade-In.',
          status: offerSentStatuses.includes(st)
            ? 'current'
            : st === 'Accepted' || st === 'Completed'
              ? 'completed'
              : 'upcoming',
          icon: ShieldCheck,
        },
        {
          id: '4',
          label: 'Offer accepted',
          description:
            'You accepted our offer. We will contact you to arrange bringing your device or pickup.',
          status: st === 'Accepted' ? 'current' : st === 'Completed' ? 'completed' : 'upcoming',
          icon: CheckCircle2,
        },
        {
          id: '5',
          label: 'Trade-in complete',
          description: 'Trade-in finished — value applied to your account.',
          status: st === 'Completed' ? 'completed' : 'upcoming',
          icon: CheckCircle2,
        },
      ];

      if (st === 'Rejected') {
        steps[2] = {
          id: '3',
          label: 'Offer declined',
          description: 'The trade-in offer was declined.',
          status: 'completed',
          icon: XCircle,
        };
        steps[3] = {
          id: '4',
          label: 'Trade closed',
          description: 'This trade-in was closed.',
          status: 'current',
          icon: AlertCircle,
        };
        steps.length = 4;
      }

      return {
        title: `Trade-In #${refLabel}`,
        subtitle: 'Valuation Tracking',
        mainIcon: RefreshCw,
        steps,
        details: [
          { label: 'Item', value: trade.device },
          { label: 'Condition', value: trade.condition },
          { label: 'Status', value: formatCustomerStatusShort('trade', st) },
          {
            label: TRADE_COPY.history.offerLabel,
            value: offerAmt != null ? formatCurrency(offerAmt) : TRADE_COPY.history.offerPending,
          },
          {
            label: TRADE_COPY.history.estimateLabel,
            value: formatCurrency(estimateAmt),
          },
        ],
        originalData: trade,
        entityId: trade.id,
      };
    }

    return null;
  }, [type, id, orders, repairs, trade]);

  if (type === 'trade' && !tradeLookupDone) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center px-4 ${
          isLight ? 'bg-[#F0F0F0]' : 'bg-gradient-to-b from-[#050508] to-[#08080f]'
        }`}
      >
        <p className={`text-sm font-bold ${isLight ? 'text-black/40' : 'text-white/40'}`}>
          {TRADE_COPY.states.loading}
        </p>
      </div>
    );
  }

  if (!trackingData || (type === 'trade' && tradeLookupError && !trade)) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center px-4 ${
          isLight ? 'bg-[#F0F0F0]' : 'bg-gradient-to-b from-[#050508] to-[#08080f]'
        }`}
      >
        <div className="text-center space-y-6">
          <AlertCircle size={64} className="mx-auto text-red-500 opacity-20" />
          <h2
            className={`text-3xl font-black italic uppercase ${
              isLight ? 'text-black/40' : 'text-white/40'
            }`}
          >
            Reference Not Found
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/account/trade-ins"
              className={`inline-flex px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors border ${
                isLight
                  ? 'bg-white border-black/10 text-black hover:bg-black/5'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              {TRADE_COPY.confirmation.viewMyTrades}
            </Link>
            <Link
              to="/history"
              className={`inline-flex px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors border ${
                isLight
                  ? 'bg-white border-black/10 text-black hover:bg-black/5'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              Return to History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const entityId = trackingData.entityId || id;

  return (
    <div
      className={`min-h-screen pt-32 pb-20 px-4 md:px-8 transition-colors duration-500 ${
        isLight
          ? 'bg-[#FAFAFA]'
          : 'bg-gradient-to-b from-[#050508] via-[#08080f] to-[#050508]'
      }`}
    >
      <div className="max-w-4xl mx-auto space-y-12">
        <PageBackButton
          isLight={isLight}
          fallbackTo={type === 'trade' ? '/account/trade-ins' : '/history'}
          label="Back"
        />

        <div className="grid md:grid-cols-2 gap-12 items-end">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#CDA032]/20 flex items-center justify-center text-[#CDA032]">
                <trackingData.mainIcon size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                {trackingData.subtitle}
              </span>
            </div>
            <h1
              className={`text-4xl md:text-6xl font-black italic tracking-tighter uppercase ${
                isLight ? 'text-black' : 'text-white'
              }`}
            >
              {trackingData.title}
            </h1>
          </div>

          <div
            className={`p-6 rounded-3xl border ${
              isLight
                ? 'bg-white border-black/5 shadow-sm'
                : 'bg-[#16161f]/90 border-white/[0.07] shadow-lg shadow-black/30 ring-1 ring-inset ring-white/[0.04]'
            }`}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {trackingData.details.map((detail, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                    {detail.label}
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      detail.label.includes('Offer') ||
                      detail.label.includes('estimate') ||
                      detail.label.includes('Estimate') ||
                      detail.label.includes('Value')
                        ? 'text-[#CDA032]'
                        : isLight
                          ? 'text-black'
                          : 'text-white'
                    }`}
                  >
                    {detail.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`p-8 md:p-12 rounded-[3rem] border backdrop-blur-3xl overflow-hidden relative ${
            isLight
              ? 'bg-white border-black/5 shadow-xl'
              : 'bg-[#12121a]/90 border-white/[0.08] shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/[0.04]'
          }`}
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <trackingData.mainIcon size={180} />
          </div>

          <div className="relative space-y-12">
            {trackingData.steps.map((step, index) => (
              <div key={step.id} className="relative flex gap-8 group">
                {index !== trackingData.steps.length - 1 && (
                  <div
                    className={`absolute left-7 top-14 bottom-[-3rem] w-1 transition-all duration-1000 ${
                      step.status === 'completed'
                        ? 'bg-[#CDA032]'
                        : isLight
                          ? 'bg-black/10'
                          : 'bg-white/10'
                    }`}
                  />
                )}

                <div
                  className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                    step.status === 'completed'
                      ? 'bg-[#CDA032] border-[#CDA032] text-black scale-110 shadow-lg shadow-[#CDA032]/20'
                      : step.status === 'current'
                        ? `${
                            isLight
                              ? 'bg-black/5 border-[#CDA032] text-[#CDA032]'
                              : 'bg-white/10 border-[#CDA032] text-[#CDA032]'
                          } animate-pulse`
                        : isLight
                          ? 'bg-black/[0.04] border-black/10 text-black/25'
                          : 'bg-white/5 border-white/5 text-white/20'
                  }`}
                >
                  <step.icon size={24} />
                </div>

                <div className="space-y-2 pt-1 flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h3
                      className={`text-xl font-black italic tracking-tight uppercase ${
                        step.status === 'upcoming' ? 'opacity-20' : ''
                      } ${isLight ? 'text-black' : 'text-white'}`}
                    >
                      {step.label}
                    </h3>
                    {step.date && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] bg-[#CDA032]/10 px-3 py-1 rounded-full">
                        {new Date(step.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs font-medium leading-relaxed max-w-md ${
                      step.status === 'upcoming'
                        ? 'opacity-10'
                        : isLight
                          ? 'text-black/55'
                          : 'opacity-40'
                    }`}
                  >
                    {step.description}
                  </p>

                  {(step.label === 'Offer ready' ||
                    step.label === 'Offer sent' ||
                    step.label === 'Offer Made') &&
                    step.status === 'current' &&
                    type === 'trade' &&
                    trade && (
                      <div className="pt-4 max-w-md">
                        <TradeOfferRespondButtons
                          trade={trade}
                          trades={trades}
                          setTrades={(next) => {
                            setTrades(next);
                            const updated = next.find((t) => t.id === trade.id);
                            if (updated) setFetchedTrade(updated);
                          }}
                          notify={notify}
                          isLight={isLight}
                        />
                      </div>
                    )}

                  {step.label === 'Repair estimate ready' &&
                    step.status === 'current' &&
                    type === 'repair' && (
                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateRepairRequest(String(entityId), {
                                status: 'In Repair',
                              });
                              const updated = repairs.map((r) =>
                                r.id === entityId ? { ...r, status: 'In Repair' } : r,
                              );
                              setRepairs(updated as typeof repairs);
                              notify('Estimate approved.', 'success');
                            } catch (e: unknown) {
                              const msg =
                                e instanceof Error ? e.message : 'Update failed';
                              notify(msg, 'error');
                            }
                          }}
                          className="px-6 py-2.5 bg-[#CDA032] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-[#CDA032]/20"
                        >
                          Approve estimate
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateRepairRequest(String(entityId), {
                                status: 'Rejected',
                              });
                              const updated = repairs.map((r) =>
                                r.id === entityId ? { ...r, status: 'Rejected' } : r,
                              );
                              setRepairs(updated as typeof repairs);
                              notify('Estimate declined.', 'info');
                            } catch (e: unknown) {
                              const msg =
                                e instanceof Error ? e.message : 'Update failed';
                              notify(msg, 'error');
                            }
                          }}
                          className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                            isLight
                              ? 'bg-black/5 text-black hover:bg-black/10'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
