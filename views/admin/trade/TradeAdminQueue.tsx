/**
 * Trade Admin queue — status tabs, search, flag badges.
 * Extends the AdminTrades queue UX with v7 fields (is_expired, flags).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle, Flag, RefreshCcw, ShieldAlert, Clock,
} from 'lucide-react';
import { Badge, EmptyState, SearchInput, TableWrapper, Td, Th } from '../adminUtils';
import {
  getAdminTradeQueue,
  tradeAdminErrorMessage,
  type AdminTradeQueueItem,
} from '../../../lib/tradeAdminApi';
import { formatGhs } from '../../../lib/money';
import { supabase } from '../../../lib/supabase';
import {
  TRADE_ADMIN_STATUS_TABS,
  toDbTradeStatus,
  tradeAdminStatusLabel,
} from './tradeAdminShared';

interface Props {
  /** When true, open detail in-page callback instead of route navigation */
  embedMode?: boolean;
  onSelectRequest?: (id: string) => void;
}

export const TradeAdminQueue: React.FC<Props> = ({ embedMode, onSelectRequest }) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminTradeQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState<string>('All');

  const reload = useCallback(async () => {
    setError(null);
    try {
      const data = await getAdminTradeQueue();
      setRows(data);
    } catch (e) {
      setError(tradeAdminErrorMessage(e));
      setRows([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('trade-admin-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_in_requests' },
        () => { void reload(); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  const tabCount = (s: string) => {
    if (s === 'All') return rows.length;
    if (s === 'below_threshold') {
      return rows.filter((t) => Boolean(t.below_threshold)).length;
    }
    if (s === 'expired') {
      return rows.filter(
        (t) => toDbTradeStatus(t.status) === 'expired' || Boolean(t.is_expired),
      ).length;
    }
    return rows.filter((t) => toDbTradeStatus(t.status) === s).length;
  };

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((t) => {
      let matchS = true;
      if (statusF === 'below_threshold') {
        matchS = Boolean(t.below_threshold);
      } else if (statusF === 'expired') {
        matchS = toDbTradeStatus(t.status) === 'expired' || Boolean(t.is_expired);
      } else if (statusF !== 'All') {
        matchS = toDbTradeStatus(t.status) === statusF;
      }
      if (!matchS) return false;
      if (!ql) return true;
      const hay = [
        t.display_id,
        t.device,
        t.resolved_name,
        t.resolved_email,
        t.resolved_phone,
        t.userName,
        t.userEmail,
        t.contactPhone,
        t.imei_serial,
        t.imei_masked,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(ql);
    });
  }, [rows, q, statusF]);

  const openDetail = (id: string) => {
    if (embedMode && onSelectRequest) {
      onSelectRequest(id);
      return;
    }
    void navigate({ to: '/admin/trade/$requestId', params: { requestId: id } as any });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', val: rows.length, col: '#B38B21', filter: 'All' },
          {
            label: 'Needs verify',
            val: rows.filter((t) => t.needs_verification).length,
            col: '#f59e0b',
            filter: null as string | null,
          },
          {
            label: 'Below threshold',
            val: rows.filter((t) => t.below_threshold).length,
            col: '#ef4444',
            filter: 'below_threshold',
          },
          {
            label: 'Expired',
            val: rows.filter((t) => t.is_expired).length,
            col: '#a855f7',
            filter: 'expired',
          },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={!s.filter}
            onClick={() => s.filter && setStatusF(s.filter)}
            className={`bg-[#0a0a0a] border border-white/5 rounded-xl p-4 text-left transition-colors ${
              s.filter && statusF === s.filter ? 'ring-1 ring-[#B38B21]/50' : ''
            } ${s.filter ? 'hover:border-white/15 cursor-pointer' : 'cursor-default'}`}
          >
            <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-2xl font-black" style={{ color: s.col }}>{s.val}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusF('below_threshold')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
              statusF === 'below_threshold'
                ? 'bg-red-500 text-black'
                : 'bg-red-500/15 text-red-300 hover:text-red-200'
            }`}
          >
            Lead follow-up{' '}
            <span className="opacity-60">({tabCount('below_threshold')})</span>
          </button>
          {TRADE_ADMIN_STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusF(s)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                statusF === s
                  ? 'bg-[#B38B21] text-black'
                  : 'bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              {s === 'All' ? 'All' : tradeAdminStatusLabel(s)}{' '}
              <span className="opacity-60">({tabCount(s)})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search ID / IMEI / phone / name…"
          />
          <button
            type="button"
            onClick={() => { setLoading(true); void reload().finally(() => setLoading(false)); }}
            className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-white"
            title="Refresh"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/30 text-sm">Loading trade queue…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
          <button
            type="button"
            className="ml-3 text-[10px] font-black uppercase text-[#B38B21]"
            onClick={() => { setLoading(true); void reload().finally(() => setLoading(false)); }}
          >
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<RefreshCcw size={40} />} message="No trade-in requests yet" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<RefreshCcw size={40} />} message="No requests match your filters" />
      ) : (
        <TableWrapper>
          <thead>
            <tr>
              <Th>Ref</Th>
              <Th>Device</Th>
              <Th>Customer</Th>
              <Th>Est.</Th>
              <Th>Flags</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.02] transition-all">
                <Td>
                  <p className="text-xs font-black text-[#B38B21]">
                    {t.display_id || t.id.slice(0, 8)}
                  </p>
                  {t.is_expired && (
                    <span className="inline-flex items-center gap-0.5 mt-1 text-[8px] font-black uppercase text-purple-300 bg-purple-500/15 px-1.5 py-0.5 rounded">
                      <Clock size={9} /> Expired
                    </span>
                  )}
                </Td>
                <Td>
                  <p className="text-xs font-black text-white">{t.device || '—'}</p>
                  <p className="text-[9px] text-white/30">{t.imei_masked || '—'}</p>
                </Td>
                <Td>
                  <p className="text-xs font-black text-white">{t.resolved_name || '—'}</p>
                  <p className="text-[10px] text-white/30">{t.resolved_phone || t.resolved_email || '—'}</p>
                </Td>
                <Td>
                  <p className="text-xs font-black text-[#B38B21]">
                    {t.estimatedValue != null || t.estimated_value != null
                      ? formatGhs(Number(t.estimated_value ?? t.estimatedValue))
                      : '—'}
                  </p>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {t.needs_verification && (
                      <span title="Needs verification" className="text-amber-400"><ShieldAlert size={14} /></span>
                    )}
                    {t.answers_edited && (
                      <span title="Answers edited" className="text-sky-400"><Flag size={14} /></span>
                    )}
                    {t.below_threshold && (
                      <span title="Below threshold" className="text-red-400"><AlertTriangle size={14} /></span>
                    )}
                    {!t.needs_verification && !t.answers_edited && !t.below_threshold && (
                      <span className="text-white/20 text-[10px]">—</span>
                    )}
                  </div>
                </Td>
                <Td><Badge status={tradeAdminStatusLabel(t.status)} /></Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => openDetail(t.id)}
                    className="text-[10px] font-black text-[#B38B21] hover:text-[#D4AF37] uppercase"
                  >
                    Open
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </div>
  );
};
