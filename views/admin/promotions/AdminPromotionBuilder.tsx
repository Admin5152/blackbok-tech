/**
 * Admin promotion builder — Appendix B §3.
 * One page; sections match server validation order.
 * Denominations from promo_denominations; limits from promo_preset_limits.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../../lib/appContext';
import { supabase } from '../../../lib/supabase';
import {
  formatGHS,
  ghsToPesewas,
  pesewasToGhs,
  promoCreateBatch,
  promoPublish,
  useCampuses,
  useProductCategories,
  usePromoDenominations,
  usePromoPresetLimits,
  usePromoSettings,
  type PromoAppliesTo,
  type PromoDiscountType,
  type PromoUsagePreset,
} from '../../../lib/promotions';
import { hairlineCard, appliesToHint, promoRpcErrorMessage } from './promoAdminShared';

const APPLIES_OPTIONS: { id: PromoAppliesTo; label: string }[] = [
  { id: 'order', label: 'Everything' },
  { id: 'product', label: 'Specific products' },
  { id: 'category', label: 'Product categories' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'repair', label: 'Repair' },
  { id: 'tradein_topup', label: 'Trade-in top-up' },
];

const PRESET_CARDS: {
  id: PromoUsagePreset;
  title: string;
  second: string;
}[] = [
  { id: 'single', title: 'Single-use voucher', second: '1 code, 1 person, 1 time' },
  { id: 'personal', title: 'Personal code', second: 'One account, reusable' },
  { id: 'public_once', title: 'Public, once per customer', second: 'Shareable, 1 use each' },
  { id: 'public_open', title: 'Public, unlimited', second: 'No caps at all' },
  { id: 'batch', title: 'Bulk voucher batch', second: 'N unique single-use codes' },
  { id: 'first_n', title: 'First N customers', second: 'Stops after N redemptions' },
];

type ChipMode = 'cash' | 'percentage';

export const AdminPromotionBuilder: React.FC = () => {
  const { theme, notify } = useAppContext();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  const { data: denominations = [] } = usePromoDenominations(true);
  const { data: settings } = usePromoSettings();
  const { data: campuses = [] } = useCampuses(true);
  const { data: productCategories = [] } = useProductCategories();

  const [name, setName] = useState('');
  const [mode, setMode] = useState<ChipMode>('cash');
  const [selectedDenomId, setSelectedDenomId] = useState<string | null>(null);
  const [cashGhs, setCashGhs] = useState('');
  const [percent, setPercent] = useState<number | null>(null);
  const [maxDiscountGhs, setMaxDiscountGhs] = useState('');
  const [minOrderGhs, setMinOrderGhs] = useState('');
  const [appliesTo, setAppliesTo] = useState<PromoAppliesTo>('order');
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [productOptions, setProductOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [scopeGlobal, setScopeGlobal] = useState(true);
  const [campusIds, setCampusIds] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState('');
  const [preset, setPreset] = useState<PromoUsagePreset>('batch');
  const [codesCount, setCodesCount] = useState(10);
  const [advanced, setAdvanced] = useState(false);
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerHits, setCustomerHits] = useState<
    { id: string; label: string }[]
  >([]);
  const [bypassReason, setBypassReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fixedDens = useMemo(
    () => denominations.filter((d) => d.kind === 'fixed').sort((a, b) => a.sort_order - b.sort_order),
    [denominations],
  );
  const pctDens = useMemo(
    () =>
      denominations
        .filter((d) => d.kind === 'percentage')
        .sort((a, b) => a.sort_order - b.sort_order),
    [denominations],
  );

  const { data: limits } = usePromoPresetLimits(preset, codesCount);

  useEffect(() => {
    if (!limits) return;
    if (limits.codes != null && Number.isFinite(limits.codes)) {
      // Only auto-default when switching presets if count still matches old default pattern
    }
  }, [limits]);

  useEffect(() => {
    const defFixed = fixedDens.find((d) => d.is_default) || fixedDens[0];
    if (defFixed && !cashGhs && mode === 'cash' && !selectedDenomId) {
      setSelectedDenomId(defFixed.id);
      setCashGhs(String(pesewasToGhs(defFixed.value_pesewas ?? 0)));
      setMinOrderGhs(String(pesewasToGhs(defFixed.recommended_min_order_pesewas)));
    }
    const defPct = pctDens.find((d) => d.is_default) || pctDens[0];
    if (defPct && percent == null && mode === 'percentage') {
      setPercent(Number(defPct.percent));
      if (defPct.recommended_max_discount_pesewas != null) {
        setMaxDiscountGhs(String(pesewasToGhs(defPct.recommended_max_discount_pesewas)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once dens load
  }, [fixedDens, pctDens]);

  useEffect(() => {
    if (limits?.codes != null && limits.codes > 0) {
      setCodesCount(limits.codes);
    }
  }, [preset]); // when preset changes, reset count from limits on next render

  useEffect(() => {
    if (!limits) return;
    if (limits.codes != null && limits.codes > 0) setCodesCount(limits.codes);
  }, [limits?.codes, preset]);

  const cashPesewas = ghsToPesewas(Number(cashGhs) || 0);
  const matchingFixed = fixedDens.find((d) => d.value_pesewas === cashPesewas);
  const isPresetCash = Boolean(matchingFixed);
  const multiple = settings?.fixed_min_order_multiple;
  const floorPesewas =
    mode === 'cash' && cashPesewas > 0 && multiple != null
      ? Math.ceil(cashPesewas * Number(multiple))
      : 0;
  const minOrderPesewas = ghsToPesewas(Number(minOrderGhs) || 0);
  const maxDiscountPesewas = ghsToPesewas(Number(maxDiscountGhs) || 0);

  const unitDiscountPesewas =
    mode === 'cash' ? cashPesewas : maxDiscountPesewas;
  const promoMax = limits?.promo_max ?? null;
  const perUser = limits?.per_user ?? null;

  const totalCostPesewas =
    promoMax == null ? null : promoMax * unitDiscountPesewas;
  const biggestPct =
    minOrderPesewas > 0 && unitDiscountPesewas > 0
      ? Math.round((unitDiscountPesewas / minOrderPesewas) * 100)
      : 0;

  const reviewThreshold = settings?.liability_review_pesewas ?? null;
  const belowFloor =
    mode === 'cash' && floorPesewas > 0 && minOrderPesewas < floorPesewas;
  const noBudget = promoMax == null;
  const noPerAccount = perUser == null;
  const highPct = biggestPct > 25;
  const aboveReview =
    reviewThreshold != null &&
    totalCostPesewas != null &&
    totalCostPesewas > reviewThreshold;

  const muted = isLight ? 'text-black/50' : 'text-white/50';
  const fg = isLight ? 'text-black' : 'text-white';
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm font-medium ${
    isLight ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black/40 text-white'
  }`;
  const chipBase = 'rounded-xl px-3 py-2 text-xs font-medium transition-colors';
  const chipSelected = 'border-2 border-[#B38B21] p-[calc(0.5rem-1px)]';
  const chipIdle = `border-[0.5px] ${isLight ? 'border-black/10' : 'border-white/10'} p-2`;

  const floorHelper =
    mode === 'cash' && multiple != null
      ? `Floor for a ${formatGHS(cashPesewas || 0)} discount is ${formatGHS(floorPesewas)} (${multiple}x).`
      : mode === 'cash'
        ? 'Floor loads from promo settings.'
        : 'No floor required for percentage discounts.';

  const filteredCategories = useMemo(() => {
    const q = categoryFilter.trim().toLowerCase();
    if (!q) return productCategories;
    return productCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [productCategories, categoryFilter]);

  useEffect(() => {
    setTargetIds([]);
    setTargetSearch('');
    setCategoryFilter('');
    setProductOptions([]);
  }, [appliesTo]);

  const searchProducts = async (q: string) => {
    setTargetSearch(q);
    if (q.trim().length < 2) {
      setProductOptions([]);
      return;
    }
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', `%${q.trim()}%`)
      .limit(12);
    setProductOptions(
      (data || []).map((r: { id: string; name: string }) => ({
        id: String(r.id),
        name: String(r.name),
      })),
    );
  };

  const searchCustomers = async (q: string) => {
    setCustomerQuery(q);
    if (q.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, name')
      .or(`email.ilike.%${q.trim()}%,name.ilike.%${q.trim()}%`)
      .limit(8);
    setCustomerHits(
      (data || []).map((r: { id: string; email?: string; name?: string }) => ({
        id: String(r.id),
        label: [r.name, r.email].filter(Boolean).join(' · ') || r.id,
      })),
    );
  };

  const selectCashChip = (id: string) => {
    const d = fixedDens.find((x) => x.id === id);
    if (!d) return;
    setSelectedDenomId(id);
    setCashGhs(String(pesewasToGhs(d.value_pesewas ?? 0)));
    setMinOrderGhs(String(pesewasToGhs(d.recommended_min_order_pesewas)));
  };

  const onCashType = (v: string) => {
    setCashGhs(v);
    setSelectedDenomId(null);
  };

  const selectPctChip = (p: number) => {
    setPercent(p);
    const d = pctDens.find((x) => Number(x.percent) === p);
    if (d?.recommended_max_discount_pesewas != null) {
      setMaxDiscountGhs(String(pesewasToGhs(d.recommended_max_discount_pesewas)));
    }
  };

  const useFloor = () => {
    if (floorPesewas > 0) setMinOrderGhs(String(pesewasToGhs(floorPesewas)));
  };

  const buildArgs = () => {
    const denomination_id =
      mode === 'cash'
        ? matchingFixed?.id ?? selectedDenomId
        : pctDens.find((d) => Number(d.percent) === percent)?.id ?? null;

    return {
      name: name.trim() || `${mode === 'cash' ? formatGHS(cashPesewas) : `${percent}%`} promotion`,
      usage_preset: preset,
      count: Math.max(1, codesCount),
      denomination_id: denomination_id || null,
      discount_type: (mode === 'cash' ? 'fixed' : 'percentage') as PromoDiscountType,
      amount_off_pesewas: mode === 'cash' && !denomination_id ? cashPesewas : null,
      percent_off: mode === 'percentage' && !denomination_id ? percent : null,
      max_discount_pesewas:
        mode === 'percentage' ? maxDiscountPesewas || null : null,
      min_order_pesewas: minOrderPesewas,
      applies_to: appliesTo,
      target_ids: targetIds,
      campus_ids: scopeGlobal ? [] : campusIds,
      starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      assigned_user_id: preset === 'personal' ? assignedUserId : null,
      code_expires_at: codeExpiresAt
        ? new Date(codeExpiresAt).toISOString()
        : null,
      bypass_reason: belowFloor && bypassReason.trim() ? bypassReason.trim() : null,
    };
  };

  const saveDraft = async (alsoPublish: boolean) => {
    if (mode === 'percentage' && !maxDiscountPesewas) {
      notify('Percentage promos need a maximum discount cap.', 'error');
      return;
    }
    if (belowFloor && !bypassReason.trim()) {
      notify('Minimum order is below the 6x floor. Needs bypass with a reason.', 'error');
      return;
    }
    if (preset === 'personal' && !assignedUserId) {
      notify('Personal code needs a customer account.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const result = await promoCreateBatch(buildArgs());
      if (alsoPublish) {
        try {
          await promoPublish(result.promotion_id);
        } catch (pubErr) {
          notify(promoRpcErrorMessage(pubErr), 'error');
          void navigate({
            to: '/admin/promotions/$promoId' as any,
            params: { promoId: result.promotion_id } as any,
          });
          return;
        }
      }
      void navigate({
        to: '/admin/promotions/$promoId' as any,
        params: { promoId: result.promotion_id } as any,
      });
    } catch (err) {
      notify(promoRpcErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const warningBlocks: { tone: 'danger' | 'warning' | 'accent' | 'success'; copy: string }[] =
    [];
  if (belowFloor) {
    warningBlocks.push({
      tone: 'danger',
      copy: 'Minimum order is below the 6x floor. Needs bypass with a reason.',
    });
  }
  if (noBudget) {
    warningBlocks.push({
      tone: 'warning',
      copy: 'No campaign budget set. One promo can cost an unlimited amount.',
    });
  }
  if (noPerAccount) {
    warningBlocks.push({
      tone: 'warning',
      copy: 'No per-account limit. One customer can redeem repeatedly.',
    });
  }
  if (highPct) {
    warningBlocks.push({
      tone: 'warning',
      copy: `Gives ${biggestPct}% off. Check the margin on low-value baskets.`,
    });
  }
  if (aboveReview && reviewThreshold != null) {
    warningBlocks.push({
      tone: 'accent',
      copy: `Above the ${formatGHS(reviewThreshold)} review threshold. Needs super admin to publish.`,
    });
  }
  if (warningBlocks.length === 0) {
    warningBlocks.push({
      tone: 'success',
      copy: 'Passes every guard. Safe to publish.',
    });
  }

  const toneCls = (tone: string) => {
    switch (tone) {
      case 'danger':
        return isLight
          ? 'bg-red-50 text-red-700'
          : 'bg-red-500/15 text-red-300';
      case 'warning':
        return isLight
          ? 'bg-amber-50 text-amber-800'
          : 'bg-amber-500/15 text-amber-200';
      case 'accent':
        return isLight
          ? 'bg-[#B38B21]/10 text-[#8A6A18]'
          : 'bg-[#B38B21]/15 text-[#CDA032]';
      case 'success':
      default:
        return isLight
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-emerald-500/15 text-emerald-200';
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-6">
        <div>
          <Link
            to="/admin/promotions"
            className={`inline-flex items-center gap-1.5 text-xs font-medium mb-2 ${muted} hover:text-[#B38B21]`}
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <h2 className={`text-lg font-medium ${fg}`}>New promotion</h2>
        </div>

        <section className="space-y-2">
          <label className={`text-[13px] ${muted}`}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Campus fresher voucher"
          />
        </section>

        {/* 3.1 Discount type */}
        <section className="space-y-2">
          <p className={`text-[13px] font-medium ${fg}`}>Discount type</p>
          <div className="flex gap-2">
            {(
              [
                { id: 'cash' as const, label: 'Cash amount' },
                { id: 'percentage' as const, label: 'Percentage' },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setMode(c.id)}
                className={`${chipBase} ${mode === c.id ? chipSelected : chipIdle} ${fg}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* 3.2 Cash */}
        {mode === 'cash' && (
          <section className="space-y-3">
            <p className={`text-[13px] font-medium ${fg}`}>
              Value — quick pick or type your own
            </p>
            <div className="flex flex-wrap gap-2">
              {fixedDens.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => selectCashChip(d.id)}
                  className={`${chipBase} ${
                    selectedDenomId === d.id || matchingFixed?.id === d.id
                      ? chipSelected
                      : chipIdle
                  } ${fg}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${muted}`}>GHS</span>
              <input
                type="number"
                min={0}
                step={1}
                value={cashGhs}
                onChange={(e) => onCashType(e.target.value)}
                className={`${inputCls} max-w-[160px]`}
              />
              <span className={`text-[11px] ${muted}`}>
                {isPresetCash ? 'preset' : 'custom'}
              </span>
            </div>
          </section>
        )}

        {/* 3.3 Percentage */}
        {mode === 'percentage' && (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {pctDens.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => selectPctChip(Number(d.percent))}
                  className={`${chipBase} ${
                    percent === Number(d.percent) ? chipSelected : chipIdle
                  } ${fg}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <label className={`block text-[13px] ${muted}`}>
              Max discount GHS
              <input
                type="number"
                min={0}
                value={maxDiscountGhs}
                onChange={(e) => setMaxDiscountGhs(e.target.value)}
                className={`${inputCls} mt-1 max-w-[200px]`}
                required
              />
            </label>
          </section>
        )}

        {/* 3.4 Minimum order */}
        <section className="space-y-2">
          <label className={`text-[13px] font-medium ${fg}`}>
            Minimum order (GHS)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              value={minOrderGhs}
              onChange={(e) => setMinOrderGhs(e.target.value)}
              className={`${inputCls} max-w-[160px]`}
            />
            <button
              type="button"
              onClick={useFloor}
              className="rounded-xl border border-[#B38B21]/40 px-3 py-2 text-xs font-medium text-[#B38B21]"
            >
              Use the floor
            </button>
          </div>
          <p className={`text-[13px] ${muted}`}>{floorHelper}</p>
          {belowFloor && (
            <input
              value={bypassReason}
              onChange={(e) => setBypassReason(e.target.value)}
              placeholder="Bypass reason"
              className={inputCls}
            />
          )}
        </section>

        {/* 3.5 Applies to, scope, dates */}
        <section className="space-y-3">
          <p className={`text-[13px] font-medium ${fg}`}>Applies to</p>
          <div className="flex flex-wrap gap-2">
            {APPLIES_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setAppliesTo(o.id)}
                className={`${chipBase} ${appliesTo === o.id ? chipSelected : chipIdle} ${fg}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className={`text-[13px] ${muted}`}>{appliesToHint(appliesTo)}</p>
          {(appliesTo === 'product' || appliesTo === 'category') && (
            <div className="space-y-2">
              {appliesTo === 'product' ? (
                <>
                  <input
                    value={targetSearch}
                    onChange={(e) => void searchProducts(e.target.value)}
                    placeholder="Search products"
                    className={inputCls}
                  />
                  <ul className="space-y-1">
                    {productOptions.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`text-xs ${muted} hover:text-[#B38B21]`}
                          onClick={() =>
                            setTargetIds((ids) =>
                              ids.includes(p.id) ? ids : [...ids, p.id],
                            )
                          }
                        >
                          + {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <input
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    placeholder="Filter categories"
                    className={inputCls}
                  />
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {filteredCategories.map((c) => {
                      const on = targetIds.includes(c.id);
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            className={`text-xs ${on ? 'text-[#B38B21]' : muted} hover:text-[#B38B21]`}
                            onClick={() =>
                              setTargetIds((ids) =>
                                on ? ids.filter((x) => x !== c.id) : [...ids, c.id],
                              )
                            }
                          >
                            {on ? '✓ ' : '+ '}
                            {c.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {targetIds.length > 0 && (
                <p className={`text-[12px] ${muted}`}>
                  Targets: {targetIds.length} selected
                </p>
              )}
            </div>
          )}

          <p className={`text-[13px] font-medium ${fg}`}>Where</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setScopeGlobal(true);
                setCampusIds([]);
              }}
              className={`${chipBase} ${scopeGlobal ? chipSelected : chipIdle} ${fg}`}
            >
              Global
            </button>
            <button
              type="button"
              onClick={() => setScopeGlobal(false)}
              className={`${chipBase} ${!scopeGlobal ? chipSelected : chipIdle} ${fg}`}
            >
              Campus
            </button>
          </div>
          {!scopeGlobal && (
            <div className="flex flex-wrap gap-2">
              {campuses.map((c) => {
                const on = campusIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setCampusIds((ids) =>
                        on ? ids.filter((x) => x !== c.id) : [...ids, c.id],
                      )
                    }
                    className={`${chipBase} ${on ? chipSelected : chipIdle} ${fg}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
          {(scopeGlobal || campusIds.length === 0) && (
            <p className={`text-[13px] ${muted}`}>Applies at every campus.</p>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            <label className={`text-[13px] ${muted}`}>
              Start
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={`${inputCls} mt-1`}
              />
            </label>
            <label className={`text-[13px] ${muted}`}>
              End
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={`${inputCls} mt-1`}
              />
            </label>
            <label className={`text-[13px] ${muted}`}>
              Per-code expiry
              <input
                type="datetime-local"
                value={codeExpiresAt}
                onChange={(e) => setCodeExpiresAt(e.target.value)}
                className={`${inputCls} mt-1`}
              />
            </label>
          </div>
        </section>

        {/* 3.6 Usage limits */}
        <section className="space-y-3">
          <p className={`text-[13px] font-medium ${fg}`}>Usage limits</p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}
          >
            {PRESET_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setPreset(card.id)}
                className={`text-left rounded-[12px] ${
                  preset === card.id ? chipSelected : chipIdle
                }`}
              >
                <p className={`text-[15px] font-medium ${fg}`}>{card.title}</p>
                <p className={`text-[12px] mt-1 ${muted}`}>{card.second}</p>
              </button>
            ))}
          </div>
          <label className={`text-[13px] ${muted}`}>
            Codes to generate
            <input
              type="number"
              min={1}
              value={codesCount}
              onChange={(e) => setCodesCount(Math.max(1, Number(e.target.value) || 1))}
              className={`${inputCls} mt-1 max-w-[140px]`}
            />
          </label>
          <button
            type="button"
            className={`text-xs font-medium ${muted}`}
            onClick={() => setAdvanced((v) => !v)}
          >
            Advanced
          </button>
          {advanced && limits && (
            <div className={`text-[13px] ${muted} space-y-1`}>
              <p>code_max: {limits.code_max ?? 'null'}</p>
              <p>promo_max: {limits.promo_max ?? 'null'}</p>
              <p>per_user: {limits.per_user ?? 'null'}</p>
            </div>
          )}
          {preset === 'personal' && (
            <div className="space-y-2">
              <input
                value={customerQuery}
                onChange={(e) => void searchCustomers(e.target.value)}
                placeholder="Search customer"
                className={inputCls}
              />
              <ul className="space-y-1">
                {customerHits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className={`text-xs ${
                        assignedUserId === h.id ? 'text-[#B38B21]' : muted
                      }`}
                      onClick={() => setAssignedUserId(h.id)}
                    >
                      {h.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* 3.7 Summary panel */}
      <aside
        className={`w-full xl:w-[340px] shrink-0 sticky top-6 ${hairlineCard(isLight)} p-4 space-y-4`}
      >
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-[12px] px-3 py-3 ${isLight ? 'bg-black/[0.03]' : 'bg-white/[0.04]'}`}>
            <p className={`text-[13px] ${muted}`}>Total cost if every code is used</p>
            <p className={`text-[24px] font-medium mt-1 ${fg}`}>
              {totalCostPesewas == null ? 'Unbounded' : formatGHS(totalCostPesewas)}
            </p>
          </div>
          <div className={`rounded-[12px] px-3 py-3 ${isLight ? 'bg-black/[0.03]' : 'bg-white/[0.04]'}`}>
            <p className={`text-[13px] ${muted}`}>Biggest discount on a single order</p>
            <p className={`text-[24px] font-medium mt-1 ${fg}`}>{biggestPct}%</p>
            <p className={`text-[11px] leading-snug mt-2 ${muted}`}>
              How much of the minimum order one use can take off. Example: GHS 50 off with a
              GHS 300 minimum ≈ 17%.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {warningBlocks.map((w) => (
            <div
              key={w.copy}
              className={`rounded-[12px] px-3 py-2.5 text-[13px] font-medium ${toneCls(w.tone)}`}
            >
              {w.copy}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void saveDraft(false)}
            className="w-full rounded-xl bg-[#B38B21] py-3 text-xs font-medium text-black hover:brightness-110 disabled:opacity-50"
          >
            Save as draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void saveDraft(true)}
            className={`w-full rounded-xl border py-2.5 text-xs font-medium disabled:opacity-50 ${
              isLight
                ? 'border-black/15 text-black/55 hover:bg-black/5'
                : 'border-white/15 text-white/50 hover:bg-white/5'
            }`}
          >
            Publish
          </button>
        </div>
      </aside>
    </div>
  );
};
