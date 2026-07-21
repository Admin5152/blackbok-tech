/**
 * Admin promotion detail — Appendix B §4.
 * Tabs: Overview | Codes | Redemptions | Settings.
 */
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  Calendar,
  Download,
  Pause,
  Play,
  Printer,
  Share2,
  Copy,
} from 'lucide-react';
import { useAppContext } from '../../../lib/appContext';
import {
  formatGHS,
  useCampuses,
  usePromotion,
  usePromotionCampuses,
  usePromotionCodes,
  usePromotionRedemptions,
  usePromoPublish,
  usePromoSetCodesExpiry,
  usePromoSpend,
  useUpdatePromotionStatus,
} from '../../../lib/promotions';
import {
  codeStatusTone,
  deriveCodeStatus,
  downloadPromoCodesCsv,
  effectiveCodeExpiry,
  formatPromoDate,
  hairlineCard,
  promoRpcErrorMessage,
  promoStatusTone,
  promoValueLabel,
  statusBadgeClass,
} from './promoAdminShared';
import { sharePromoCodeOnWhatsApp } from './PromoVoucherPrint';

type TabId = 'overview' | 'codes' | 'redemptions' | 'settings';

export const AdminPromotionDetail: React.FC = () => {
  const { theme, notify } = useAppContext();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { promoId?: string };
  const promoId = params.promoId;

  const [tab, setTab] = useState<TabId>('overview');
  const [codeQuery, setCodeQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkExpiry, setBulkExpiry] = useState('');
  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [editExpiryValue, setEditExpiryValue] = useState('');

  const { data: promo, isLoading, error, refetch } = usePromotion(promoId);
  const { data: codes = [], refetch: refetchCodes } = usePromotionCodes(promoId);
  const { data: campusesForPromo = [] } = usePromotionCampuses(promoId);
  const { data: campuses = [] } = useCampuses(false);
  const { data: redemptions = [] } = usePromotionRedemptions(promoId);
  const { data: spendRows = [] } = usePromoSpend(promoId);

  const publishMut = usePromoPublish();
  const statusMut = useUpdatePromotionStatus();
  const expiryMut = usePromoSetCodesExpiry();

  const spend = spendRows[0];
  const campusNames = useMemo(() => {
    const map = new Map(campuses.map((c) => [c.id, c.name]));
    return campusesForPromo.map((r) => map.get(r.campus_id) || 'Campus').filter(Boolean);
  }, [campuses, campusesForPromo]);

  const filteredCodes = useMemo(() => {
    const q = codeQuery.trim().toUpperCase();
    if (!q) return codes;
    return codes.filter((c) => c.code.includes(q));
  }, [codes, codeQuery]);

  const unusedCount = useMemo(() => {
    if (!promo) return 0;
    return codes.filter((c) => deriveCodeStatus(c, promo.ends_at) === 'unused').length;
  }, [codes, promo]);

  const redeemedCount = spend?.applied_count ?? 0;
  const givenAway = spend?.spent_pesewas ?? 0;

  const muted = isLight ? 'text-black/50' : 'text-white/50';
  const fg = isLight ? 'text-black' : 'text-white';
  const border = isLight ? 'border-black/10' : 'border-white/10';
  const inputCls = `rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
    isLight ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black/40 text-white'
  }`;

  const subtitle = useMemo(() => {
    if (!promo) return '';
    const parts: string[] = [];
    parts.push(`${codes.length} codes`);
    if (promo.scope_type === 'campus' && campusNames.length) {
      parts.push(`${campusNames.join(', ')} only`);
    } else {
      parts.push('Global');
    }
    parts.push(`min order ${formatGHS(promo.min_order_pesewas)}`);
    return parts.join(' · ');
  }, [promo, codes.length, campusNames]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const warnExpiryAfterCampaign = (expiresAtIso: string): boolean => {
    if (!promo?.ends_at) return false;
    return new Date(expiresAtIso).getTime() > new Date(promo.ends_at).getTime();
  };

  const applyExpiry = async (codeIds: string[], expiresAt: string | null) => {
    if (!promoId) return;
    if (expiresAt && warnExpiryAfterCampaign(expiresAt)) {
      notify('The campaign ends first, so this date has no effect.', 'info');
    }
    try {
      await expiryMut.mutateAsync({
        promotion_id: promoId,
        code_ids: codeIds,
        expires_at: expiresAt,
      });
      await refetchCodes();
      setEditingExpiryId(null);
      setBulkExpiry('');
      setSelectedIds(new Set());
    } catch (err) {
      notify(promoRpcErrorMessage(err), 'error');
    }
  };

  const onPauseOrResume = async () => {
    if (!promo) return;
    const next = promo.status === 'paused' ? 'active' : 'paused';
    try {
      await statusMut.mutateAsync({ promotionId: promo.id, status: next });
      await refetch();
    } catch (err) {
      notify(promoRpcErrorMessage(err), 'error');
    }
  };

  const onPublish = async () => {
    if (!promo) return;
    try {
      await publishMut.mutateAsync(promo.id);
      await refetch();
      notify('Published.', 'success');
    } catch (err) {
      notify(promoRpcErrorMessage(err), 'error');
    }
  };

  const onShare = () => {
    if (!promo) return;
    const pool = selectedIds.size
      ? codes.filter((c) => selectedIds.has(c.id))
      : codes.filter((c) => deriveCodeStatus(c, promo.ends_at) === 'unused');
    const code = pool[0] ?? codes[0];
    if (!code) {
      notify('No codes to share.', 'info');
      return;
    }
    const expiryIso = effectiveCodeExpiry(code, promo.ends_at);
    sharePromoCodeOnWhatsApp({
      code: code.code,
      valueLabel: promoValueLabel(promo),
      minOrderPesewas: promo.min_order_pesewas,
      expiryLabel: formatPromoDate(expiryIso),
    });
  };

  if (isLoading) return <p className={`text-sm ${muted}`}>Loading…</p>;
  if (error || !promo) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : 'Promotion not found.'}
        </p>
        <Link to="/admin/promotions" className="text-xs font-medium text-[#B38B21]">
          Back to list
        </Link>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'codes', label: 'Codes' },
    { id: 'redemptions', label: 'Redemptions' },
    { id: 'settings', label: 'Settings' },
  ];

  const metricTile = (label: string, value: string) => (
    <div
      className={`rounded-[12px] px-4 py-3 ${
        isLight ? 'bg-black/[0.03]' : 'bg-white/[0.04]'
      }`}
    >
      <p className={`text-[13px] ${muted}`}>{label}</p>
      <p className={`text-[24px] font-medium leading-tight mt-1 ${fg}`}>{value}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/admin/promotions"
            className={`inline-flex items-center gap-1.5 text-xs font-medium mb-2 ${muted} hover:text-[#B38B21]`}
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-lg font-medium ${fg}`}>{promo.name}</h2>
            <span className={statusBadgeClass(promoStatusTone(promo.status), isLight)}>
              {promo.status}
            </span>
          </div>
          <p className={`text-[13px] mt-1 ${muted}`}>{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(promo.status === 'active' || promo.status === 'paused') && (
            <button
              type="button"
              onClick={() => void onPauseOrResume()}
              disabled={statusMut.isPending}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
                isLight
                  ? 'border-black/10 text-black/70 hover:bg-black/5'
                  : 'border-white/10 text-white/70 hover:bg-white/5'
              }`}
            >
              {promo.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
              {promo.status === 'paused' ? 'Resume' : 'Pause'}
            </button>
          )}
          {promo.status === 'draft' && (
            <button
              type="button"
              onClick={() => void onPublish()}
              disabled={publishMut.isPending}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
                isLight
                  ? 'border-black/15 text-black/60 hover:bg-black/5'
                  : 'border-white/15 text-white/55 hover:bg-white/5'
              }`}
            >
              Publish
            </button>
          )}
        </div>
      </div>

      <div className={`flex gap-1 border-b ${border}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-[#B38B21] text-[#B38B21]'
                : `border-transparent ${muted} hover:text-[#B38B21]`
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {metricTile('Unused', String(unusedCount))}
            {metricTile('Redeemed', String(redeemedCount))}
            {metricTile('Given away', formatGHS(givenAway))}
          </div>
          <div className={`${hairlineCard(isLight)} p-4`}>
            <p className={`text-[13px] font-medium mb-3 ${fg}`}>Redemptions over time</p>
            {redemptions.length === 0 ? (
              <p className={`text-[13px] ${muted}`}>No redemptions yet.</p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {redemptions.slice(0, 40).map((r) => (
                  <li
                    key={r.id}
                    className={`flex justify-between gap-2 text-[13px] border-b ${border} pb-2 last:border-0`}
                  >
                    <span className={muted}>
                      {formatPromoDate(r.applied_at || r.reserved_at)} · {r.status}
                    </span>
                    <span className={`font-medium ${fg}`}>
                      {formatGHS(r.amount_discounted_pesewas)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'codes' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value.toUpperCase())}
              placeholder="KNUST-7K4M2Q"
              className={`flex-1 min-w-[160px] ${inputCls} font-mono`}
            />
            <button
              type="button"
              onClick={() =>
                void navigate({
                  to: '/admin/promotions/$promoId/print' as any,
                  params: { promoId: promo.id } as any,
                })
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
                isLight
                  ? 'border-black/10 hover:bg-black/5'
                  : 'border-white/10 hover:bg-white/5'
              } ${fg}`}
            >
              <Printer size={14} /> Print sheet
            </button>
            <button
              type="button"
              onClick={onShare}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
                isLight
                  ? 'border-black/10 hover:bg-black/5'
                  : 'border-white/10 hover:bg-white/5'
              } ${fg}`}
            >
              <Share2 size={14} /> Share
            </button>
            <button
              type="button"
              onClick={() =>
                downloadPromoCodesCsv(
                  codes,
                  (c) => deriveCodeStatus(c, promo.ends_at),
                  `${promo.name.replace(/\s+/g, '-').toLowerCase()}-codes.csv`,
                )
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
                isLight
                  ? 'border-black/10 hover:bg-black/5'
                  : 'border-white/10 hover:bg-white/5'
              } ${fg}`}
            >
              <Download size={14} /> CSV
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className={`flex flex-wrap items-center gap-2 ${hairlineCard(isLight)} p-3`}>
              <span className={`text-[13px] ${muted}`}>{selectedIds.size} selected</span>
              <input
                type="date"
                value={bulkExpiry}
                onChange={(e) => setBulkExpiry(e.target.value)}
                className={inputCls}
              />
              <button
                type="button"
                disabled={!bulkExpiry || expiryMut.isPending}
                onClick={() => {
                  const iso = new Date(`${bulkExpiry}T23:59:59`).toISOString();
                  void applyExpiry([...selectedIds], iso);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-[#B38B21] px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
              >
                <Calendar size={13} /> Set expiry
              </button>
            </div>
          )}

          <ul className={`${hairlineCard(isLight)} divide-y ${isLight ? 'divide-black/8' : 'divide-white/8'}`}>
            {filteredCodes.map((code) => {
              const status = deriveCodeStatus(code, promo.ends_at);
              const expiryIso = effectiveCodeExpiry(code, promo.ends_at);
              const selected = selectedIds.has(code.id);
              return (
                <li
                  key={code.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(code.id)}
                    aria-label={`Select ${code.code}`}
                  />
                  <span
                    className={`font-mono text-[13px] font-medium flex-1 min-w-[120px] ${fg}`}
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                  >
                    {code.code}
                  </span>
                  <span className={statusBadgeClass(codeStatusTone(status), isLight)}>
                    {status}
                  </span>
                  <span className={`text-[13px] ${muted} ml-auto`}>
                    {formatPromoDate(expiryIso)}
                  </span>
                  <button
                    type="button"
                    aria-label="Edit expiry"
                    onClick={() => {
                      setEditingExpiryId(code.id);
                      setEditExpiryValue(
                        code.expires_at
                          ? code.expires_at.slice(0, 10)
                          : '',
                      );
                    }}
                    className={`p-1.5 rounded-lg ${muted} hover:text-[#B38B21]`}
                  >
                    <Calendar size={14} />
                  </button>
                </li>
              );
            })}
          </ul>

          {editingExpiryId && (
            <div className={`${hairlineCard(isLight)} p-3 flex flex-wrap items-center gap-2`}>
              <span className={`text-[13px] ${muted}`}>Edit expiry</span>
              <input
                type="date"
                value={editExpiryValue}
                onChange={(e) => setEditExpiryValue(e.target.value)}
                className={inputCls}
              />
              <button
                type="button"
                className="rounded-lg bg-[#B38B21] px-3 py-1.5 text-xs font-medium text-black"
                onClick={() => {
                  const iso = editExpiryValue
                    ? new Date(`${editExpiryValue}T23:59:59`).toISOString()
                    : null;
                  void applyExpiry([editingExpiryId], iso);
                }}
              >
                Save
              </button>
              <button
                type="button"
                className={`text-xs ${muted}`}
                onClick={() => setEditingExpiryId(null)}
              >
                Cancel
              </button>
            </div>
          )}

          <p className={`text-[13px] ${muted}`}>
            Showing {filteredCodes.length} of {codes.length} codes.
          </p>
        </div>
      )}

      {tab === 'redemptions' && (
        <div className={`${hairlineCard(isLight)} overflow-x-auto`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className={`border-b ${border} text-left ${muted}`}>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Timestamps</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-3 py-6 ${muted}`}>
                    No redemptions yet.
                  </td>
                </tr>
              )}
              {redemptions.map((r) => (
                <tr key={r.id} className={`border-b ${border} last:border-0`}>
                  <td className={`px-3 py-2 font-mono text-[12px] ${fg}`}>
                    {r.order_id.slice(0, 8)}…
                  </td>
                  <td className={`px-3 py-2 ${muted}`}>
                    {r.user_id
                      ? `${r.user_id.slice(0, 8)}…`
                      : r.guest_phone || '—'}
                  </td>
                  <td className={`px-3 py-2 font-medium ${fg}`}>
                    {formatGHS(r.amount_discounted_pesewas)}
                  </td>
                  <td className={`px-3 py-2 capitalize ${muted}`}>{r.status}</td>
                  <td className={`px-3 py-2 ${muted}`}>
                    <div>Reserved {formatPromoDate(r.reserved_at)}</div>
                    {r.applied_at && <div>Applied {formatPromoDate(r.applied_at)}</div>}
                    {r.reversed_at && <div>Reversed {formatPromoDate(r.reversed_at)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'settings' && (
        <div className={`${hairlineCard(isLight)} p-4 space-y-4`}>
          <div>
            <p className={`text-[13px] font-medium ${fg}`}>Campaign window</p>
            <p className={`text-[13px] mt-1 ${muted}`}>
              Starts {formatPromoDate(promo.starts_at)} · Ends {formatPromoDate(promo.ends_at)}
            </p>
          </div>
          <div>
            <p className={`text-[13px] font-medium ${fg}`}>Caps</p>
            <p className={`text-[13px] mt-1 ${muted}`}>
              Campaign max{' '}
              {promo.max_redemptions == null ? 'Unbounded' : promo.max_redemptions}
              {' · '}
              Per account{' '}
              {promo.max_redemptions_per_user == null
                ? 'Unbounded'
                : promo.max_redemptions_per_user}
            </p>
          </div>
          <div>
            <p className={`text-[13px] font-medium ${fg}`}>Scope</p>
            <p className={`text-[13px] mt-1 ${muted}`}>
              {campusNames.length
                ? campusNames.join(', ')
                : 'Applies at every campus.'}
            </p>
          </div>
          <div>
            <p className={`text-[13px] font-medium ${fg}`}>Discount</p>
            <p className={`text-[13px] mt-1 ${muted}`}>
              {promoValueLabel(promo)} — not editable after publish. Changing it would
              silently alter what already-issued codes are worth.
            </p>
            <button
              type="button"
              onClick={() =>
                void navigate({
                  to: '/admin/promotions/new' as any,
                  search: { duplicateFrom: promo.id } as any,
                })
              }
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#B38B21]/40 px-3 py-2 text-xs font-medium text-[#B38B21] hover:bg-[#B38B21]/10"
            >
              <Copy size={14} /> Duplicate into a new promotion
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
