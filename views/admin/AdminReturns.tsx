import React, { useMemo, useState } from 'react';
import { RotateCcw, CheckCircle2, XCircle, Loader2, MoreHorizontal } from 'lucide-react';
import {
  Badge,
  EmptyState,
  Modal,
  ModalClose,
  SearchInput,
  TableWrapper,
  Td,
  Th,
} from './adminUtils';
import {
  useAdminReturns,
  type AdminReturn,
} from '../../hooks/useAdminReturns';
import type { ReturnStatus } from '../../hooks/useReturns';
import { formatCurrency } from '../../lib/utils';

interface Props {
  canEdit?: boolean;
}

type StatusTab = 'All' | 'Requested' | 'Approved' | 'Rejected' | 'Completed';

const TAB_TO_STATUS: Record<Exclude<StatusTab, 'All'>, ReturnStatus> = {
  Requested: 'requested',
  Approved: 'approved',
  Rejected: 'rejected',
  Completed: 'completed',
};

const STATUS_TO_DISPLAY: Record<ReturnStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

export const AdminReturns: React.FC<Props> = ({ canEdit = true }) => {
  const { returns, loading, error, updateReturn, refetch } = useAdminReturns();

  const [tab, setTab] = useState<StatusTab>('All');
  const [search, setSearch] = useState('');
  const [actionTarget, setActionTarget] = useState<{
    item: AdminReturn;
    mode: 'approve' | 'reject' | 'complete';
  } | null>(null);

  // Counts per status for the tab bar.
  const counts = useMemo(() => {
    const map: Record<StatusTab, number> = {
      All: returns.length,
      Requested: 0,
      Approved: 0,
      Rejected: 0,
      Completed: 0,
    };
    for (const r of returns) {
      const display = STATUS_TO_DISPLAY[r.status] as StatusTab | undefined;
      if (display && display in map) map[display] += 1;
    }
    return map;
  }, [returns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter((r) => {
      if (tab !== 'All') {
        if (r.status !== TAB_TO_STATUS[tab]) return false;
      }
      if (!q) return true;
      const haystack = [
        r.display_id,
        r.order_display_id,
        r.user_name,
        r.user_email,
        r.reason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [returns, tab, search]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">
            Return Requests
          </h2>
          <span className="text-[9px] font-black bg-white/5 text-white/30 px-2 py-0.5 rounded-full">
            {returns.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search returns…"
          />
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(['All', 'Requested', 'Approved', 'Rejected', 'Completed'] as StatusTab[]).map(
          (t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
                  isActive
                    ? 'bg-[#B38B21]/15 border-[#B38B21]/40 text-[#CDA032]'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                }`}
              >
                {t}
                <span
                  className={`text-[9px] rounded-full px-1.5 py-0.5 ${
                    isActive ? 'bg-[#CDA032]/20 text-[#CDA032]' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {counts[t]}
                </span>
              </button>
            );
          },
        )}
      </div>

      {/* Body */}
      {loading && returns.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl py-16 text-center">
          <Loader2 size={22} className="mx-auto mb-3 animate-spin text-white/30" />
          <p className="text-white/30 text-sm">Loading returns…</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-sm text-red-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<RotateCcw size={40} className="text-white" />}
          message={
            returns.length === 0
              ? 'No return requests yet.'
              : 'No returns match your filters.'
          }
        />
      ) : (
        <TableWrapper>
          <thead>
            <tr>
              <Th>Display ID</Th>
              <Th>Customer</Th>
              <Th>Order</Th>
              <Th>Reason</Th>
              <Th>Condition</Th>
              <Th>Status</Th>
              <Th>Refund</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                <Td>
                  <span className="text-[11px] font-black text-white">
                    {r.display_id || r.id.slice(0, 8)}
                  </span>
                </Td>
                <Td>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[180px]">
                      {r.user_name || '—'}
                    </p>
                    <p className="text-[10px] text-white/40 truncate max-w-[180px]">
                      {r.user_email || ''}
                    </p>
                  </div>
                </Td>
                <Td>
                  <span className="text-[11px] font-black text-white/70">
                    {r.order_display_id || r.order_id.slice(0, 8)}
                  </span>
                </Td>
                <Td>
                  <p
                    className="text-xs text-white/70 max-w-[260px] line-clamp-2"
                    title={r.reason}
                  >
                    {r.reason}
                  </p>
                </Td>
                <Td>
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/60">
                    {r.condition}
                  </span>
                </Td>
                <Td>
                  <Badge status={STATUS_TO_DISPLAY[r.status]} />
                </Td>
                <Td>
                  {r.refund_amount !== null && r.refund_amount !== undefined ? (
                    <span className="text-[11px] font-black text-emerald-300">
                      {formatCurrency(Number(r.refund_amount))}
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/30">—</span>
                  )}
                </Td>
                <Td>
                  <span className="text-[10px] text-white/40">
                    {formatDate(r.created_at)}
                  </span>
                </Td>
                <Td>
                  <RowActions
                    item={r}
                    canEdit={canEdit}
                    onAction={(mode) => setActionTarget({ item: r, mode })}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      )}

      {actionTarget && (
        <ActionModal
          target={actionTarget}
          onClose={() => setActionTarget(null)}
          onConfirm={async (payload) => {
            const updated = await updateReturn(
              actionTarget.item.id,
              payload.status,
              payload.refund_amount ?? null,
              payload.admin_notes ?? null,
            );
            if (updated) setActionTarget(null);
            return updated !== null;
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Row actions
// ---------------------------------------------------------------------------

interface RowActionsProps {
  item: AdminReturn;
  canEdit: boolean;
  onAction: (mode: 'approve' | 'reject' | 'complete') => void;
}

const RowActions: React.FC<RowActionsProps> = ({ item, canEdit, onAction }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!canEdit) {
    return <span className="text-[10px] text-white/30">—</span>;
  }

  const isRequested = item.status === 'requested';
  const isApproved = item.status === 'approved';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-44 bg-[#111] border border-white/10 rounded-xl shadow-2xl py-1.5 z-30"
        >
          <button
            type="button"
            role="menuitem"
            disabled={!isRequested}
            onClick={() => {
              setOpen(false);
              onAction('approve');
            }}
            className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${
              isRequested
                ? 'text-emerald-300 hover:bg-emerald-500/10'
                : 'text-white/20 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={12} /> Approve
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!isRequested}
            onClick={() => {
              setOpen(false);
              onAction('reject');
            }}
            className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${
              isRequested
                ? 'text-red-300 hover:bg-red-500/10'
                : 'text-white/20 cursor-not-allowed'
            }`}
          >
            <XCircle size={12} /> Reject
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!isApproved}
            onClick={() => {
              setOpen(false);
              onAction('complete');
            }}
            className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${
              isApproved
                ? 'text-blue-300 hover:bg-blue-500/10'
                : 'text-white/20 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={12} /> Mark complete
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Action modal (approve / reject / complete)
// ---------------------------------------------------------------------------

interface ActionModalProps {
  target: { item: AdminReturn; mode: 'approve' | 'reject' | 'complete' };
  onClose: () => void;
  onConfirm: (payload: {
    status: ReturnStatus;
    refund_amount?: number | null;
    admin_notes?: string | null;
  }) => Promise<boolean>;
}

const ActionModal: React.FC<ActionModalProps> = ({ target, onClose, onConfirm }) => {
  const { item, mode } = target;
  const [refundAmount, setRefundAmount] = useState<string>(
    item.refund_amount !== null && item.refund_amount !== undefined
      ? String(item.refund_amount)
      : '',
  );
  const [adminNotes, setAdminNotes] = useState<string>(item.admin_notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const title =
    mode === 'approve'
      ? 'Approve Return'
      : mode === 'reject'
        ? 'Reject Return'
        : 'Mark Return Complete';

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'approve') {
      const amount = Number(refundAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setErrorMessage('Enter a positive refund amount.');
        return;
      }
    }
    if (mode === 'reject' && adminNotes.trim().length < 5) {
      setErrorMessage('Add a short note explaining the rejection.');
      return;
    }

    setSubmitting(true);
    try {
      const payload =
        mode === 'approve'
          ? {
              status: 'approved' as ReturnStatus,
              refund_amount: Number(refundAmount),
              admin_notes: adminNotes.trim() || null,
            }
          : mode === 'reject'
            ? {
                status: 'rejected' as ReturnStatus,
                admin_notes: adminNotes.trim(),
              }
            : {
                status: 'completed' as ReturnStatus,
                admin_notes: adminNotes.trim() || null,
              };

      const ok = await onConfirm(payload);
      if (!ok) setErrorMessage('Update failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={() => !submitting && onClose()}>
      <ModalClose onClose={() => !submitting && onClose()} />
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#CDA032]/80">
            {item.display_id || item.id.slice(0, 8)} · {item.user_name || 'Customer'}
          </p>
          <h2 className="text-lg font-black italic uppercase tracking-tight text-white mt-1">
            {title}
          </h2>
        </div>

        <p className="text-xs text-white/60 leading-relaxed">{item.reason}</p>

        {mode === 'approve' && (
          <div className="space-y-2">
            <label
              htmlFor="refund-amount"
              className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/50"
            >
              Refund amount
            </label>
            <input
              id="refund-amount"
              type="number"
              min="0"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              required
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none"
            />
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="admin-notes"
            className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/50"
          >
            {mode === 'reject' ? 'Reason for rejection' : 'Admin notes (optional)'}
          </label>
          <textarea
            id="admin-notes"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder={
              mode === 'reject'
                ? 'Explain why this return is being rejected…'
                : 'Internal notes (not shown to customer)…'
            }
            className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none resize-none"
          />
        </div>

        {errorMessage && (
          <p className="text-xs text-red-400 font-bold">{errorMessage}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] transition-all ${
              submitting
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : mode === 'reject'
                  ? 'bg-red-500/90 text-white hover:bg-red-500'
                  : 'bg-gradient-to-r from-[#B38B21] to-[#D4AF37] text-black hover:scale-[1.02]'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : mode === 'approve' ? (
              <>Approve</>
            ) : mode === 'reject' ? (
              <>Reject</>
            ) : (
              <>Mark complete</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
