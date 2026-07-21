/**
 * Admin promotions list — name, value, scope, status, redemption progress, spend, end date.
 */
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Plus, Tag, Ticket } from 'lucide-react';
import { useAppContext } from '../../../lib/appContext';
import {
  formatGHS,
  usePromotionsList,
  usePromoSpend,
  type PromoScopeType,
  type PromoStatus,
} from '../../../lib/promotions';
import {
  formatPromoDate,
  hairlineCard,
  promoStatusTone,
  promoValueLabel,
  statusBadgeClass,
} from './promoAdminShared';

const STATUS_OPTIONS: Array<'all' | PromoStatus> = [
  'all',
  'draft',
  'active',
  'paused',
  'expired',
  'archived',
];

const SCOPE_OPTIONS: Array<'all' | PromoScopeType> = ['all', 'global', 'campus'];

export const AdminPromotionsList: React.FC = () => {
  const { theme } = useAppContext();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | PromoStatus>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | PromoScopeType>('all');

  const listFilters = useMemo(
    () => ({
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(scopeFilter !== 'all' ? { scope_type: scopeFilter } : {}),
    }),
    [statusFilter, scopeFilter],
  );

  const { data: promos = [], isLoading, error } = usePromotionsList(listFilters);
  const { data: spendRows = [] } = usePromoSpend();

  const spendById = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of spendRows) m.set(row.promotion_id, row.spent_pesewas);
    return m;
  }, [spendRows]);

  const muted = isLight ? 'text-black/50' : 'text-white/50';
  const fg = isLight ? 'text-black' : 'text-white';
  const border = isLight ? 'border-black/10' : 'border-white/10';
  const inputCls = `rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
    isLight
      ? 'border-black/10 bg-white text-black'
      : 'border-white/10 bg-black/40 text-white'
  }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-sm font-medium ${fg}`}>Promotions</h2>
          <p className={`text-[13px] mt-0.5 ${muted}`}>
            Campaigns, codes, and spend
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/promotions/codes"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium ${
              isLight
                ? 'border-black/10 hover:bg-black/5 text-black'
                : 'border-white/10 hover:bg-white/5 text-white'
            }`}
          >
            <Ticket size={14} />
            All codes
          </Link>
          <button
            type="button"
            onClick={() => void navigate({ to: '/admin/promotions/new' as any })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#B38B21] px-3.5 py-2 text-xs font-medium text-black hover:brightness-110"
          >
            <Plus size={14} />
            New promotion
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className={`text-[13px] ${muted} flex items-center gap-1.5`}>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={inputCls}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All' : s}
              </option>
            ))}
          </select>
        </label>
        <label className={`text-[13px] ${muted} flex items-center gap-1.5`}>
          Scope
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as typeof scopeFilter)}
            className={inputCls}
          >
            {SCOPE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All' : s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && (
        <p className={`text-sm ${muted}`}>Loading promotions…</p>
      )}
      {error && (
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : 'Failed to load promotions.'}
        </p>
      )}

      {!isLoading && !error && promos.length === 0 && (
        <div className={`${hairlineCard(isLight)} py-16 text-center`}>
          <Tag size={28} className={`mx-auto mb-3 opacity-30 ${fg}`} />
          <p className={`text-sm ${muted}`}>No promotions yet.</p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {promos.map((p) => {
          const spent = spendById.get(p.id) ?? 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: '/admin/promotions/$promoId' as any,
                    params: { promoId: p.id } as any,
                  })
                }
                className={`w-full text-left ${hairlineCard(isLight)} px-4 py-3.5 transition-colors hover:border-[#B38B21]/40`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-medium truncate ${fg}`}>{p.name}</span>
                      <span className={statusBadgeClass(promoStatusTone(p.status), isLight)}>
                        {p.status}
                      </span>
                    </div>
                    <p className={`text-[13px] mt-1 ${muted}`}>
                      {promoValueLabel(p)}
                      {' · '}
                      {p.scope_type === 'campus' ? 'Campus' : 'Global'}
                      {' · '}
                      Spend {formatGHS(spent)}
                    </p>
                    {p.max_redemptions != null && p.max_redemptions > 0 && (
                      <div className="mt-2 max-w-xs">
                        <div
                          className={`h-1.5 rounded-full overflow-hidden ${
                            isLight ? 'bg-black/10' : 'bg-white/10'
                          }`}
                        >
                          <div
                            className="h-full rounded-full bg-[#B38B21]"
                            style={{
                              width: `${Math.min(
                                100,
                                (p.times_redeemed / p.max_redemptions) * 100,
                              )}%`,
                            }}
                          />
                        </div>
                        <p className={`text-[11px] mt-1 ${muted}`}>
                          {p.times_redeemed}/{p.max_redemptions}
                        </p>
                      </div>
                    )}
                    {(p.max_redemptions == null || p.max_redemptions <= 0) && (
                      <p className={`text-[11px] mt-1 ${muted}`}>
                        Redeemed {p.times_redeemed}
                      </p>
                    )}
                  </div>
                  <div className={`text-[13px] shrink-0 ${muted}`}>
                    Ends {formatPromoDate(p.ends_at)}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Keep Link available for deep-link tooling without a builder route yet */}
      <Link to="/admin/promotions" className="sr-only">
        Promotions
      </Link>
    </div>
  );
};
