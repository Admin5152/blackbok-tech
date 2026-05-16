import React, { useEffect, useMemo, useState } from 'react';
import {
  RotateCcw,
  Plus,
  X,
  Package,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useAppContext } from '../App';
import { useReturns, type ReturnStatus, type ReturnCondition, type RefundMethod, type Return } from '../hooks/useReturns';
import { formatCurrency } from '../lib/utils';
import { PageBackButton } from '../components/PageBackButton';

interface StatusMeta {
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
  badgeLight: string;
  badgeDark: string;
}

const STATUS_META: Record<ReturnStatus, StatusMeta> = {
  requested: {
    label: 'Requested',
    Icon: Clock,
    badgeLight: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    badgeDark: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  },
  approved: {
    label: 'Approved',
    Icon: CheckCircle2,
    badgeLight: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    badgeDark: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  },
  rejected: {
    label: 'Rejected',
    Icon: XCircle,
    badgeLight: 'bg-red-100 text-red-700 border-red-200',
    badgeDark: 'bg-red-500/10 text-red-300 border-red-500/20',
  },
  completed: {
    label: 'Completed',
    Icon: CheckCircle2,
    badgeLight: 'bg-blue-100 text-blue-700 border-blue-200',
    badgeDark: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  },
};

interface StatusBadgeProps {
  status: ReturnStatus;
  isLight: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isLight }) => {
  const meta = STATUS_META[status] ?? STATUS_META.requested;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
        isLight ? meta.badgeLight : meta.badgeDark
      }`}
    >
      <meta.Icon size={11} />
      {meta.label}
    </span>
  );
};

/** Formats `created_at` as a friendly date string. */
function formatReturnDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const ReturnsPage: React.FC = () => {
  const { theme, user, orders, navigateTo, notify } = useAppContext();
  const isLight = theme === 'light';
  const { returns, loading, error, submitReturn, refetch } = useReturns();

  const [isFormOpen, setIsFormOpen] = useState(false);

  // Eligible orders: delivered, and not yet referenced by an existing return.
  const eligibleOrders = useMemo(() => {
    const referenced = new Set(returns.map((r) => r.order_id));
    return (orders ?? []).filter((o) => {
      const status = String(o.status ?? '').toLowerCase();
      if (status !== 'delivered') return false;
      if (referenced.has(o.id)) return false;
      return true;
    });
  }, [orders, returns]);

  // Sign-in gate matches Profile.tsx pattern.
  if (!user) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 ${
          isLight ? 'bg-white' : 'bg-gradient-to-b from-[#050508] via-[#08080f] to-[#050508]'
        }`}
      >
        <div className="text-center space-y-6">
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center border ${
              isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
            }`}
          >
            <RotateCcw size={32} className={isLight ? 'text-gray-300' : 'text-white/20'} />
          </div>
          <div className="space-y-2">
            <h2
              className={`text-xl font-black uppercase tracking-tight italic ${
                isLight ? 'text-black' : 'text-white'
              }`}
            >
              Sign in required
            </h2>
            <p
              className={`text-sm leading-relaxed max-w-xs mx-auto ${
                isLight ? 'text-gray-600' : 'text-white/50'
              }`}
            >
              Returns are linked to your account. Sign in to view them, or Sign up if you are new.
            </p>
          </div>
          <button
            onClick={() => navigateTo('auth')}
            className="px-10 py-4 bg-gradient-to-r from-[#B38B21] to-[#D4AF37] text-black font-black rounded-full text-[10px] uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-[0_10px_40px_rgba(179,139,33,0.3)]"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isLight ? 'bg-[#F5F5F7] text-black' : 'bg-gradient-to-b from-[#050508] via-[#0a0a10] to-[#050508] text-white'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="mb-4">
              <PageBackButton isLight={isLight} fallbackTo="/profile" />
            </div>
            <p
              className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 ${
                isLight ? 'text-black/40' : 'text-[#CDA032]/80'
              }`}
            >
              Customer Service
            </p>
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight uppercase">
              Returns
            </h1>
            <p
              className={`mt-2 text-sm ${
                isLight ? 'text-black/60' : 'text-white/40'
              }`}
            >
              Request a refund or store credit for delivered orders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            disabled={eligibleOrders.length === 0}
            className={`shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all ${
              eligibleOrders.length === 0
                ? isLight
                  ? 'bg-black/5 text-black/30 cursor-not-allowed'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#B38B21] to-[#D4AF37] text-black hover:scale-[1.02] shadow-[0_10px_40px_rgba(179,139,33,0.3)]'
            }`}
          >
            <Plus size={14} /> Request Return
          </button>
        </div>

        {/* Body */}
        {loading && returns.length === 0 ? (
          <div className="py-24 text-center">
            <Loader2
              size={28}
              className={`mx-auto mb-3 animate-spin ${
                isLight ? 'text-black/30' : 'text-white/30'
              }`}
            />
            <p
              className={`text-[10px] font-black uppercase tracking-widest ${
                isLight ? 'text-black/40' : 'text-white/40'
              }`}
            >
              Loading your returns…
            </p>
          </div>
        ) : error ? (
          <div
            className={`p-6 rounded-2xl border ${
              isLight
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-red-500/20 bg-red-500/10 text-red-300'
            }`}
          >
            <p className="text-sm font-bold">{error}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 text-[11px] font-black uppercase tracking-widest underline"
            >
              Try again
            </button>
          </div>
        ) : returns.length === 0 ? (
          <div
            className={`py-20 px-8 text-center rounded-3xl border-2 border-dashed ${
              isLight
                ? 'border-black/10 bg-white text-black/40'
                : 'border-white/10 bg-white/[0.02] text-white/40'
            }`}
          >
            <div
              className={`mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center ${
                isLight ? 'bg-black/5' : 'bg-white/5'
              }`}
            >
              <RotateCcw size={26} />
            </div>
            <h3 className="text-base font-black uppercase tracking-widest mb-2">
              No returns yet
            </h3>
            <p className="text-xs max-w-md mx-auto leading-relaxed">
              {eligibleOrders.length === 0
                ? 'Once you have delivered orders eligible for return, you can request one here.'
                : "You haven't requested any returns yet. Click \u201CRequest Return\u201D above to start."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {returns.map((r) => (
              <ReturnRow key={r.id} item={r} isLight={isLight} />
            ))}
          </ul>
        )}
      </div>

      {isFormOpen && (
        <RequestReturnModal
          isLight={isLight}
          eligibleOrders={eligibleOrders}
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (payload) => {
            const result = await submitReturn(payload);
            if (result) {
              notify('Return request submitted', 'success');
              setIsFormOpen(false);
            } else {
              notify('Failed to submit return', 'error');
            }
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Return row
// ---------------------------------------------------------------------------

interface ReturnRowProps {
  item: Return;
  isLight: boolean;
}

const ReturnRow: React.FC<ReturnRowProps> = ({ item, isLight }) => {
  const refundLabel = item.refund_method === 'store_credit' ? 'Store credit' : 'Original payment';
  return (
    <li
      className={`rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${
        isLight
          ? 'bg-white border-black/10'
          : 'bg-white/[0.02] border-white/10'
      }`}
    >
      <div
        className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
          isLight ? 'bg-black/5' : 'bg-white/5'
        }`}
      >
        <Package size={20} className={isLight ? 'text-black/60' : 'text-white/60'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-widest">
            {item.display_id || item.id.slice(0, 8)}
          </p>
          <span className={`text-[10px] ${isLight ? 'text-black/30' : 'text-white/30'}`}>
            ·
          </span>
          <p className={`text-[11px] ${isLight ? 'text-black/50' : 'text-white/50'}`}>
            {formatReturnDate(item.created_at)}
          </p>
        </div>
        <p
          className={`mt-1 text-sm leading-snug line-clamp-2 ${
            isLight ? 'text-black/70' : 'text-white/70'
          }`}
        >
          {item.reason}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${
              isLight ? 'text-black/40' : 'text-white/40'
            }`}
          >
            Condition: {item.condition}
          </span>
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${
              isLight ? 'text-black/40' : 'text-white/40'
            }`}
          >
            Refund: {refundLabel}
          </span>
          {item.refund_amount !== null && item.refund_amount !== undefined && (
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${
                isLight ? 'text-emerald-700' : 'text-emerald-300'
              }`}
            >
              {formatCurrency(Number(item.refund_amount))}
            </span>
          )}
        </div>
        {item.admin_notes && (
          <p
            className={`mt-2 text-xs italic ${
              isLight ? 'text-black/50' : 'text-white/50'
            }`}
          >
            Admin note: {item.admin_notes}
          </p>
        )}
      </div>
      <div className="shrink-0">
        <StatusBadge status={item.status} isLight={isLight} />
      </div>
    </li>
  );
};

// ---------------------------------------------------------------------------
// Request form modal
// ---------------------------------------------------------------------------

export interface RequestReturnModalProps {
  isLight: boolean;
  eligibleOrders: Array<{ id: string; display_id?: string; date?: string; total?: number }>;
  /** When set, pre-select this order if it is still eligible. */
  initialOrderId?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    order_id: string;
    reason: string;
    condition: ReturnCondition;
    refund_method: RefundMethod;
  }) => Promise<void>;
}

export const RequestReturnModal: React.FC<RequestReturnModalProps> = ({
  isLight,
  eligibleOrders,
  initialOrderId,
  onClose,
  onSubmit,
}) => {
  const resolvedDefaultOrderId = useMemo(() => {
    if (initialOrderId && eligibleOrders.some((o) => o.id === initialOrderId)) return initialOrderId;
    return eligibleOrders[0]?.id ?? '';
  }, [initialOrderId, eligibleOrders]);

  const [orderId, setOrderId] = useState<string>(resolvedDefaultOrderId);
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState<ReturnCondition>('unopened');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('original_payment');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setOrderId(resolvedDefaultOrderId);
  }, [resolvedDefaultOrderId]);

  // Lock body scroll while modal is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [submitting, onClose]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setValidationError(null);
    if (!orderId) {
      setValidationError('Pick an order to return.');
      return;
    }
    if (reason.trim().length < 10) {
      setValidationError('Please describe the reason in at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        order_id: orderId,
        reason: reason.trim(),
        condition,
        refund_method: refundMethod,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request a return"
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => !submitting && onClose()}
      />
      <form
        onSubmit={handleSubmit}
        className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl ${
          isLight
            ? 'bg-white border-black/10 text-black'
            : 'bg-[#0F0F0F] border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-5 flex items-center justify-between border-b ${
            isLight ? 'border-black/5' : 'border-white/5'
          }`}
        >
          <div>
            <p
              className={`text-[10px] font-black uppercase tracking-[0.35em] ${
                isLight ? 'text-black/40' : 'text-[#CDA032]/80'
              }`}
            >
              New request
            </p>
            <h2 className="text-lg font-black italic uppercase tracking-tight mt-1">
              Request Return
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className={`p-2 rounded-full transition-colors ${
              isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
            }`}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {eligibleOrders.length === 0 ? (
            <div
              className={`p-4 rounded-xl border text-xs ${
                isLight
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                  : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
              }`}
            >
              <AlertCircle size={14} className="inline mr-2 -mt-0.5" />
              You don't have any delivered orders eligible for return.
            </div>
          ) : (
            <>
              {/* Order selector */}
              <div className="space-y-2">
                <label
                  htmlFor="return-order"
                  className={`block text-[10px] font-black uppercase tracking-[0.25em] ${
                    isLight ? 'text-black/50' : 'text-white/50'
                  }`}
                >
                  Order
                </label>
                <select
                  id="return-order"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors ${
                    isLight
                      ? 'bg-white border-black/10 focus:border-black/40 focus:outline-none'
                      : 'bg-black border-white/10 text-white focus:border-white/30 focus:outline-none'
                  }`}
                >
                  {eligibleOrders.map((o) => {
                    const label = o.display_id || o.id.slice(0, 8);
                    const date = o.date
                      ? formatReturnDate(o.date)
                      : '';
                    const total = typeof o.total === 'number' ? ` · ${formatCurrency(o.total)}` : '';
                    return (
                      <option key={o.id} value={o.id}>
                        {label}
                        {date ? ` · ${date}` : ''}
                        {total}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <label
                  htmlFor="return-reason"
                  className={`block text-[10px] font-black uppercase tracking-[0.25em] ${
                    isLight ? 'text-black/50' : 'text-white/50'
                  }`}
                >
                  Reason
                </label>
                <textarea
                  id="return-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Briefly describe what went wrong…"
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors resize-none ${
                    isLight
                      ? 'bg-white border-black/10 focus:border-black/40 focus:outline-none placeholder-black/30'
                      : 'bg-black border-white/10 text-white focus:border-white/30 focus:outline-none placeholder-white/30'
                  }`}
                />
              </div>

              {/* Condition */}
              <fieldset className="space-y-2">
                <legend
                  className={`block text-[10px] font-black uppercase tracking-[0.25em] mb-1 ${
                    isLight ? 'text-black/50' : 'text-white/50'
                  }`}
                >
                  Condition
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {(['unopened', 'opened', 'damaged'] as ReturnCondition[]).map(
                    (value) => {
                      const isActive = condition === value;
                      return (
                        <label
                          key={value}
                          className={`cursor-pointer text-center px-3 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                            isActive
                              ? 'border-[#CDA032] bg-[#CDA032]/15 text-[#CDA032]'
                              : isLight
                                ? 'border-black/10 hover:border-black/30 text-black/60'
                                : 'border-white/10 hover:border-white/30 text-white/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name="condition"
                            value={value}
                            checked={isActive}
                            onChange={() => setCondition(value)}
                            className="sr-only"
                          />
                          {value}
                        </label>
                      );
                    },
                  )}
                </div>
              </fieldset>

              {/* Refund method */}
              <fieldset className="space-y-2">
                <legend
                  className={`block text-[10px] font-black uppercase tracking-[0.25em] mb-1 ${
                    isLight ? 'text-black/50' : 'text-white/50'
                  }`}
                >
                  Refund method
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'original_payment', label: 'Original payment' },
                    { value: 'store_credit', label: 'Store credit' },
                  ] as Array<{ value: RefundMethod; label: string }>).map(
                    (opt) => {
                      const isActive = refundMethod === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={`cursor-pointer text-center px-3 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                            isActive
                              ? 'border-[#CDA032] bg-[#CDA032]/15 text-[#CDA032]'
                              : isLight
                                ? 'border-black/10 hover:border-black/30 text-black/60'
                                : 'border-white/10 hover:border-white/30 text-white/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name="refund_method"
                            value={opt.value}
                            checked={isActive}
                            onChange={() => setRefundMethod(opt.value)}
                            className="sr-only"
                          />
                          {opt.label}
                        </label>
                      );
                    },
                  )}
                </div>
              </fieldset>

              {validationError && (
                <p className="text-xs text-red-400 font-bold">{validationError}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-4 flex items-center justify-end gap-2 border-t ${
            isLight ? 'border-black/5' : 'border-white/5'
          }`}
        >
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
              isLight
                ? 'text-black/60 hover:text-black hover:bg-black/5'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || eligibleOrders.length === 0}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] transition-all ${
              submitting || eligibleOrders.length === 0
                ? isLight
                  ? 'bg-black/10 text-black/30 cursor-not-allowed'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#B38B21] to-[#D4AF37] text-black hover:scale-[1.02] shadow-[0_10px_40px_rgba(179,139,33,0.3)]'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Submitting…
              </>
            ) : (
              <>Submit request</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
