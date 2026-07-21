/**
 * Global promo codes registry — all codes across campaigns with usage.
 */
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { useAppContext } from '../../../lib/appContext';
import { useAllPromotionCodes } from '../../../lib/promotions';
import {
  codeStatusTone,
  deriveCodeStatus,
  effectiveCodeExpiry,
  formatCodeUsage,
  formatPromoDate,
  hairlineCard,
  promoValueLabel,
  statusBadgeClass,
  type CodeDerivedStatus,
} from './promoAdminShared';

const STATUS_FILTERS: Array<'all' | CodeDerivedStatus> = [
  'all',
  'unused',
  'redeemed',
  'expired',
];

export const AdminPromoCodesRegistry: React.FC = () => {
  const { theme, notify } = useAppContext();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  const [codeQuery, setCodeQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CodeDerivedStatus>('all');
  const [promoFilter, setPromoFilter] = useState<string>('all');

  const { data: rows = [], isLoading, error } = useAllPromotionCodes();

  const promoOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.promotion.id, row.promotion.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = codeQuery.trim().toUpperCase();
    return rows.filter((row) => {
      if (promoFilter !== 'all' && row.promotion_id !== promoFilter) return false;
      const status = deriveCodeStatus(row, row.promotion.ends_at);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (q && !row.code.includes(q)) return false;
      return true;
    });
  }, [rows, codeQuery, statusFilter, promoFilter]);

  const summary = useMemo(() => {
    let unused = 0;
    let redeemed = 0;
    let expired = 0;
    for (const row of rows) {
      const s = deriveCodeStatus(row, row.promotion.ends_at);
      if (s === 'unused') unused += 1;
      else if (s === 'redeemed') redeemed += 1;
      else expired += 1;
    }
    return { total: rows.length, unused, redeemed, expired };
  }, [rows]);

  const muted = isLight ? 'text-black/50' : 'text-white/50';
  const fg = isLight ? 'text-black' : 'text-white';
  const border = isLight ? 'border-black/10' : 'border-white/10';
  const inputCls = `rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
    isLight
      ? 'border-black/10 bg-white text-black'
      : 'border-white/10 bg-black/40 text-white'
  }`;
  const chipBase = 'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors';
  const chipSelected = 'border-2 border-[#B38B21] p-[calc(0.375rem-1px)]';
  const chipIdle = `border-[0.5px] ${isLight ? 'border-black/10' : 'border-white/10'} p-1.5`;

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notify('Code copied', 'success');
    } catch {
      notify('Could not copy code', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <button
            type="button"
            onClick={() => void navigate({ to: '/admin/promotions' as any })}
            className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${muted} hover:text-[#B38B21]`}
            aria-label="Back to promotions"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h2 className={`text-sm font-medium ${fg}`}>All promo codes</h2>
            <p className={`text-[13px] mt-0.5 ${muted}`}>
              {summary.total} codes · {summary.unused} unused · {summary.redeemed} redeemed ·{' '}
              {summary.expired} expired
            </p>
          </div>
        </div>
        <Link
          to="/admin/promotions/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#B38B21] px-3.5 py-2 text-xs font-medium text-black hover:brightness-110"
        >
          New promotion
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="search"
          value={codeQuery}
          onChange={(e) => setCodeQuery(e.target.value.toUpperCase())}
          placeholder="Search code"
          className={`flex-1 min-w-[160px] ${inputCls} font-mono`}
        />
        <label className={`text-[13px] ${muted} flex items-center gap-1.5`}>
          Campaign
          <select
            value={promoFilter}
            onChange={(e) => setPromoFilter(e.target.value)}
            className={inputCls}
          >
            <option value="all">All campaigns</option>
            {promoOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`${chipBase} ${statusFilter === s ? chipSelected : chipIdle} ${fg} capitalize`}
          >
            {s === 'all' ? 'All statuses' : s}
          </button>
        ))}
      </div>

      {isLoading && <p className={`text-sm ${muted}`}>Loading codes…</p>}
      {error && (
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : 'Failed to load codes.'}
        </p>
      )}

      {!isLoading && !error && (
        <div className={`${hairlineCard(isLight)} overflow-x-auto`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className={`border-b ${border} text-left ${muted}`}>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Campaign</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="px-3 py-2 font-medium">Usage</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Expires</th>
                <th className="px-3 py-2 font-medium w-[88px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-3 py-6 text-center ${muted}`}>
                    No codes match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const status = deriveCodeStatus(row, row.promotion.ends_at);
                  const expiryIso = effectiveCodeExpiry(row, row.promotion.ends_at);
                  return (
                    <tr
                      key={row.id}
                      className={`border-b last:border-0 ${isLight ? 'border-black/6' : 'border-white/6'}`}
                    >
                      <td className="px-3 py-2.5">
                        <span
                          className={`font-mono font-medium ${fg}`}
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          }}
                        >
                          {row.code}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 ${fg}`}>
                        <button
                          type="button"
                          onClick={() =>
                            void navigate({
                              to: '/admin/promotions/$promoId' as any,
                              params: { promoId: row.promotion_id } as any,
                            })
                          }
                          className="text-left hover:text-[#B38B21] hover:underline"
                        >
                          {row.promotion.name}
                        </button>
                      </td>
                      <td className={`px-3 py-2.5 ${muted}`}>
                        {promoValueLabel(row.promotion)}
                      </td>
                      <td className={`px-3 py-2.5 ${muted}`}>{formatCodeUsage(row)}</td>
                      <td className="px-3 py-2.5">
                        <span className={statusBadgeClass(codeStatusTone(status), isLight)}>
                          {status}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 ${muted}`}>
                        {formatPromoDate(expiryIso)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Copy ${row.code}`}
                            onClick={() => void copyCode(row.code)}
                            className={`p-1.5 rounded-lg ${muted} hover:text-[#B38B21]`}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Open campaign"
                            onClick={() =>
                              void navigate({
                                to: '/admin/promotions/$promoId' as any,
                                params: { promoId: row.promotion_id } as any,
                                search: { tab: 'codes' } as any,
                              })
                            }
                            className={`p-1.5 rounded-lg ${muted} hover:text-[#B38B21]`}
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <p className={`text-[13px] ${muted}`}>
          Showing {filtered.length} of {rows.length} codes.
        </p>
      )}
    </div>
  );
};
