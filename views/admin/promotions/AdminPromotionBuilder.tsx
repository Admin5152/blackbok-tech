/**
 * Admin promotion builder — create flow UI.
 * Frontend-only layout; submits via existing promo_create_batch / promo_publish.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useAppContext } from '../../../lib/appContext';
import { supabase } from '../../../lib/supabase';
import {
  formatGHS,
  ghsToPesewas,
  pesewasToGhs,
  promoCreateBatch,
  promoPublish,
  useProductCategories,
  usePromoDenominations,
  usePromoPresetLimits,
  usePromoSettings,
  type PromoAppliesTo,
  type PromoDiscountType,
  type PromoUsagePreset,
} from '../../../lib/promotions';
import { hairlineCard, promoRpcErrorMessage } from './promoAdminShared';

type ChipMode = 'cash' | 'percentage';
type AppliesChoice = 'order' | 'product' | 'category' | 'services' | 'audience';
type ServiceKind = 'repair' | 'tradein_topup' | 'delivery';
type UsageChoice = 'single' | 'unlimited' | 'early_bird' | 'bulk';
type AudienceUsage = 'once' | 'reusable';
type DurationMode = 'range' | 'quick';
type CodeMode = 'manual' | 'auto';

const CASH_QUICK_VALUES = [20, 50, 100, 150, 200];
const PCT_QUICK_VALUES = [5, 10, 15, 20, 25];

const CODE_WORDS = ['SUMMER', 'CAMPUS', 'FLASH', 'WELCOME', 'SAVE', 'TECH', 'BOX', 'VIP', 'DEAL'];

/** Promo-style codes like SUMMER15 / BOX7K2A — readable, not random noise. */
function randomPromoCode(): string {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const num = String(Math.floor(10 + Math.random() * 89));
  return `${word}${num}`;
}

function makeBulkCode(prefix: string, index: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const clean = (prefix.trim() || 'BBX').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  let n = (index + 1) * 7919 + 104729;
  let suffix = '';
  for (let k = 0; k < 4; k += 1) {
    suffix = alphabet[n % alphabet.length] + suffix;
    n = Math.floor(n / alphabet.length) + (index + 3) * (k + 5);
  }
  return `${clean}${suffix}`;
}

/** Parse "30 minutes", "2h", "1 day", "90" (minutes default). Returns minutes or null. */
function parseQuickDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/,/g, '');
  if (!s) return null;
  const m = s.match(
    /^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)?$/,
  );
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2] || 'm';
  if (unit.startsWith('h')) return Math.round(n * 60);
  if (unit.startsWith('d')) return Math.round(n * 1440);
  return Math.round(n);
}

function formatQuickDuration(minutes: number): string {
  if (minutes % 1440 === 0) {
    const d = minutes / 1440;
    return `${d} ${d === 1 ? 'day' : 'days'}`;
  }
  if (minutes % 60 === 0 && minutes >= 60) {
    const h = minutes / 60;
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function downloadCodesCsv(codes: string[], filename: string): void {
  const header = 'code,status';
  const rows = codes.map((c) => `"${c.replace(/"/g, '""')}","unused"`);
  const blob = new Blob([[header, ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PREVIEW_DENS: import('../../../lib/promotions').PromoDenomination[] = [
  ...CASH_QUICK_VALUES.map((ghs, i) => ({
    id: `d-fixed-${ghs}`,
    kind: 'fixed' as const,
    value_pesewas: ghs * 100,
    percent: null,
    label: `GH₵ ${ghs}`,
    sort_order: i + 1,
    recommended_min_order_pesewas: ghs * 600,
    recommended_max_discount_pesewas: null,
    is_active: true,
    is_default: ghs === 50,
    is_preset: true,
    created_at: '',
  })),
  ...PCT_QUICK_VALUES.map((pct, i) => ({
    id: `d-pct-${pct}`,
    kind: 'percentage' as const,
    value_pesewas: null,
    percent: pct,
    label: `${pct}%`,
    sort_order: i + 1,
    recommended_min_order_pesewas: 0,
    recommended_max_discount_pesewas: pct <= 15 ? 15000 : 20000,
    is_active: true,
    is_default: pct === 15,
    is_preset: true,
    created_at: '',
  })),
];

const PREVIEW_CATEGORIES = [
  { id: 'cat-phones', name: 'Phones' },
  { id: 'cat-laptops', name: 'Laptops' },
  { id: 'cat-accessories', name: 'Accessories' },
  { id: 'cat-audio', name: 'Audio' },
];

const PREVIEW_PRODUCTS = [
  { id: 'p1', name: 'iPhone 14 Pro 128GB' },
  { id: 'p2', name: 'Samsung Galaxy S24' },
  { id: 'p3', name: 'MacBook Air M2' },
  { id: 'p4', name: 'AirPods Pro 2' },
  { id: 'p5', name: 'iPad Air 11"' },
];

const PREVIEW_CUSTOMERS = [
  { id: 'u1', label: 'Ama Mensah · ama@example.com · user' },
  { id: 'u2', label: 'Kwame Boateng · kwame@example.com · user' },
  { id: 'u3', label: 'Staff Desk · staff@blackbox.gh · staff' },
];

type BuilderProps = {
  /** Public UI-only preview — no auth, no API writes. */
  previewMode?: boolean;
};

export const AdminPromotionBuilder: React.FC<BuilderProps> = ({ previewMode = false }) => {
  const { theme, notify } = useAppContext();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  const { data: liveDens = [] } = usePromoDenominations(true, { enabled: !previewMode });
  const { data: liveSettings } = usePromoSettings({ enabled: !previewMode });
  const { data: liveCategories = [] } = useProductCategories({ enabled: !previewMode });

  const denominations = previewMode ? PREVIEW_DENS : liveDens;
  const settings = previewMode
    ? {
        id: true,
        fixed_min_order_multiple: 6,
        require_percentage_cap: true,
        liability_review_pesewas: 500000,
        updated_at: '',
      }
    : liveSettings;
  const productCategories = previewMode ? PREVIEW_CATEGORIES : liveCategories;

  // —— Page header ——
  const [name, setName] = useState('');
  const [codeMode, setCodeMode] = useState<CodeMode>('auto');
  const [codePrefix, setCodePrefix] = useState(() => randomPromoCode());
  const [mode, setMode] = useState<ChipMode>('percentage');
  const [selectedDenomId, setSelectedDenomId] = useState<string | null>(null);
  const [cashGhs, setCashGhs] = useState('');
  const [percent, setPercent] = useState<number | null>(15);
  const [maxDiscountGhs, setMaxDiscountGhs] = useState('150');
  const [minOrderGhs, setMinOrderGhs] = useState('50');
  const [bypassReason, setBypassReason] = useState('');

  // —— Applies to ——
  const [appliesChoice, setAppliesChoice] = useState<AppliesChoice>('order');
  const [serviceKind, setServiceKind] = useState<ServiceKind>('repair');
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [targetLabels, setTargetLabels] = useState<Record<string, string>>({});
  const [targetSearch, setTargetSearch] = useState('');
  const [productOptions, setProductOptions] = useState<{ id: string; name: string }[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [audienceStaff, setAudienceStaff] = useState(false);
  const [audienceCustomers, setAudienceCustomers] = useState(true);
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const [assignedLabel, setAssignedLabel] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerHits, setCustomerHits] = useState<{ id: string; label: string }[]>([]);
  const [audienceUsage, setAudienceUsage] = useState<AudienceUsage>('once');

  // —— Usage limits ——
  const [usageChoice, setUsageChoice] = useState<UsageChoice>('unlimited');
  const [earlyBirdN, setEarlyBirdN] = useState(50);
  const [codesCount, setCodesCount] = useState(10);
  const [bulkPrefix, setBulkPrefix] = useState('BBX');
  const [restrictPerCustomer, setRestrictPerCustomer] = useState(true);
  const [doNotStack, setDoNotStack] = useState(false);

  // —— Duration ——
  const [durationMode, setDurationMode] = useState<DurationMode>('range');
  const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date()));
  const [endsAt, setEndsAt] = useState('');
  const [quickDurationText, setQuickDurationText] = useState('2 hours');
  const [quickMinutes, setQuickMinutes] = useState(120);

  // —— Simulator ——
  const [simSubtotalGhs, setSimSubtotalGhs] = useState('200');

  const [submitting, setSubmitting] = useState(false);

  const fixedDens = useMemo(() => {
    const sorted = denominations
      .filter((d) => d.kind === 'fixed')
      .sort((a, b) => a.sort_order - b.sort_order);
    return CASH_QUICK_VALUES.map((ghs) => {
      const match = sorted.find((d) => pesewasToGhs(d.value_pesewas ?? 0) === ghs);
      if (match) return match;
      return {
        id: `fallback-cash-${ghs}`,
        kind: 'fixed' as const,
        value_pesewas: ghs * 100,
        percent: null,
        label: `GH₵ ${ghs}`,
        sort_order: ghs,
        recommended_min_order_pesewas: ghs * 600,
        recommended_max_discount_pesewas: null,
        is_active: true,
        is_default: ghs === 50,
        is_preset: true,
        created_at: '',
      };
    });
  }, [denominations]);

  const pctDens = useMemo(() => {
    const sorted = denominations
      .filter((d) => d.kind === 'percentage')
      .sort((a, b) => a.sort_order - b.sort_order);
    return PCT_QUICK_VALUES.map((pct) => {
      const match = sorted.find((d) => Number(d.percent) === pct);
      if (match) return match;
      return {
        id: `fallback-pct-${pct}`,
        kind: 'percentage' as const,
        value_pesewas: null,
        percent: pct,
        label: `${pct}%`,
        sort_order: pct,
        recommended_min_order_pesewas: 0,
        recommended_max_discount_pesewas: pct <= 15 ? 15000 : 20000,
        is_active: true,
        is_default: pct === 15,
        is_preset: true,
        created_at: '',
      };
    });
  }, [denominations]);

  const appliesTo: PromoAppliesTo = useMemo(() => {
    if (appliesChoice === 'product') return 'product';
    if (appliesChoice === 'category') return 'category';
    if (appliesChoice === 'services') return serviceKind;
    return 'order';
  }, [appliesChoice, serviceKind]);

  const isAudience = appliesChoice === 'audience';
  const isBulk = !isAudience && usageChoice === 'bulk';

  const preset: PromoUsagePreset = useMemo(() => {
    if (isAudience) return 'personal';
    if (usageChoice === 'single') return 'single';
    if (usageChoice === 'early_bird') return 'first_n';
    if (usageChoice === 'bulk') return 'batch';
    return restrictPerCustomer ? 'public_once' : 'public_open';
  }, [isAudience, usageChoice, restrictPerCustomer]);

  const effectiveCount = useMemo(() => {
    if (isAudience || usageChoice === 'single' || usageChoice === 'unlimited') return 1;
    if (usageChoice === 'early_bird') return Math.max(1, earlyBirdN);
    return Math.max(1, codesCount);
  }, [isAudience, usageChoice, earlyBirdN, codesCount]);

  const effectivePrefix = useMemo(() => {
    if (isBulk) return (bulkPrefix.trim() || 'BBX').toUpperCase();
    return (codePrefix.trim() || 'SAVE15').toUpperCase();
  }, [isBulk, bulkPrefix, codePrefix]);

  const previewBulkCodes = useMemo(() => {
    if (!isBulk) return [] as string[];
    const n = Math.min(Math.max(1, codesCount), 200);
    return Array.from({ length: n }, (_, i) => makeBulkCode(effectivePrefix, i));
  }, [isBulk, codesCount, effectivePrefix]);

  const { data: liveLimits } = usePromoPresetLimits(preset, effectiveCount, {
    enabled: !previewMode,
  });
  const limits = useMemo(() => {
    if (!previewMode) return liveLimits;
    switch (preset) {
      case 'single':
        return { code_max: 1, promo_max: 1, per_user: 1, codes: 1 };
      case 'personal':
        return {
          code_max: 1,
          promo_max: audienceUsage === 'once' ? 1 : null,
          per_user: audienceUsage === 'once' ? 1 : null,
          codes: 1,
        };
      case 'public_once':
        return { code_max: 1, promo_max: null, per_user: 1, codes: 1 };
      case 'public_open':
        return { code_max: 1, promo_max: null, per_user: null, codes: 1 };
      case 'first_n':
        return {
          code_max: 1,
          promo_max: effectiveCount,
          per_user: 1,
          codes: 1,
        };
      case 'batch':
        return {
          code_max: effectiveCount,
          promo_max: effectiveCount,
          per_user: 1,
          codes: effectiveCount,
        };
      default:
        return { code_max: null, promo_max: null, per_user: null, codes: 1 };
    }
  }, [previewMode, liveLimits, preset, effectiveCount, audienceUsage]);

  useEffect(() => {
    const defFixed = fixedDens.find((d) => d.is_default) || fixedDens[0];
    if (defFixed && !cashGhs && mode === 'cash' && !selectedDenomId) {
      setSelectedDenomId(defFixed.id);
      setCashGhs(String(pesewasToGhs(defFixed.value_pesewas ?? 0)));
      setMinOrderGhs(String(pesewasToGhs(defFixed.recommended_min_order_pesewas)));
    }
    const defPct = pctDens.find((d) => d.is_default) || pctDens[0];
    if (defPct && mode === 'percentage' && percent == null) {
      setPercent(Number(defPct.percent));
      if (defPct.recommended_max_discount_pesewas != null) {
        setMaxDiscountGhs(String(pesewasToGhs(defPct.recommended_max_discount_pesewas)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once dens load
  }, [fixedDens, pctDens]);

  useEffect(() => {
    if (durationMode !== 'quick') return;
    const start = startsAt ? new Date(startsAt) : new Date();
    if (Number.isNaN(start.getTime())) return;
    const mins = quickMinutes > 0 ? quickMinutes : 120;
    const end = new Date(start.getTime() + mins * 60_000);
    setEndsAt(toLocalInput(end));
  }, [durationMode, quickMinutes, startsAt]);

  useEffect(() => {
    setTargetIds([]);
    setTargetLabels({});
    setTargetSearch('');
    setCategoryFilter('');
    setProductOptions([]);
  }, [appliesChoice]);

  const cashPesewas = ghsToPesewas(Number(cashGhs) || 0);
  const matchingFixed = fixedDens.find((d) => d.value_pesewas === cashPesewas);
  const multiple = settings?.fixed_min_order_multiple;
  const floorPesewas =
    mode === 'cash' && cashPesewas > 0 && multiple != null
      ? Math.ceil(cashPesewas * Number(multiple))
      : 0;
  const minOrderPesewas = ghsToPesewas(Number(minOrderGhs) || 0);
  const maxDiscountPesewas = ghsToPesewas(Number(maxDiscountGhs) || 0);
  const unitDiscountPesewas = mode === 'cash' ? cashPesewas : maxDiscountPesewas;
  const promoMax =
    isAudience && audienceUsage === 'once' ? 1 : (limits?.promo_max ?? null);
  const perUser =
    isAudience && audienceUsage === 'once' ? 1 : (limits?.per_user ?? null);
  const totalCostPesewas = promoMax == null ? null : promoMax * unitDiscountPesewas;
  const belowFloor =
    mode === 'cash' && floorPesewas > 0 && minOrderPesewas < floorPesewas;

  const filteredCategories = useMemo(() => {
    const q = categoryFilter.trim().toLowerCase();
    if (!q) return productCategories;
    return productCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [productCategories, categoryFilter]);

  // —— Live cart simulation (frontend-only math) ——
  const sim = useMemo(() => {
    const subtotal = Math.max(0, Number(simSubtotalGhs) || 0);
    const subtotalPesewas = ghsToPesewas(subtotal);
    const codePreview = isBulk
      ? previewBulkCodes[0] || `${effectivePrefix}A7K2`
      : effectivePrefix;

    if (subtotalPesewas < minOrderPesewas) {
      return {
        codePreview,
        eligible: false,
        discountPesewas: 0,
        newTotalPesewas: subtotalPesewas,
        note: `Needs at least ${formatGHS(minOrderPesewas)} subtotal`,
      };
    }

    let discountPesewas = 0;
    if (mode === 'cash') {
      discountPesewas = Math.min(cashPesewas, subtotalPesewas);
    } else {
      const raw = Math.round(subtotalPesewas * ((percent ?? 0) / 100));
      discountPesewas = maxDiscountPesewas > 0 ? Math.min(raw, maxDiscountPesewas) : raw;
    }
    discountPesewas = Math.min(discountPesewas, subtotalPesewas);

    return {
      codePreview,
      eligible: true,
      discountPesewas,
      newTotalPesewas: subtotalPesewas - discountPesewas,
      note: null as string | null,
    };
  }, [
    simSubtotalGhs,
    minOrderPesewas,
    mode,
    cashPesewas,
    percent,
    maxDiscountPesewas,
    effectivePrefix,
    isBulk,
    previewBulkCodes,
  ]);

  const discountSummary =
    mode === 'cash'
      ? `${formatGHS(cashPesewas)} OFF`
      : `${percent ?? 0}% OFF`;

  const muted = isLight ? 'text-black/50' : 'text-white/50';
  const fg = isLight ? 'text-black' : 'text-white';
  const inputCls = `w-full rounded-lg border px-2.5 py-2 text-[13px] font-medium ${
    isLight
      ? 'border-black/10 bg-white text-black placeholder:text-black/35'
      : 'border-white/10 bg-black/40 text-white placeholder:text-white/35'
  }`;
  const sectionCard = `${hairlineCard(isLight)} p-3.5 sm:p-4 space-y-3.5`;
  const sectionTitle = `text-[13px] font-semibold tracking-tight ${fg}`;
  const sectionHint = `text-[11px] leading-relaxed ${muted}`;
  const labelCls = `text-[11px] font-medium ${muted}`;

  const radioRow = (selected: boolean) =>
    `flex items-start gap-2.5 w-full text-left rounded-lg border px-3 py-2 transition-colors ${
      selected
        ? 'border-[#B38B21] bg-[#B38B21]/08'
        : isLight
          ? 'border-black/10 hover:border-black/20 bg-white'
          : 'border-white/10 hover:border-white/20 bg-black/20'
    }`;

  const radioDot = (selected: boolean) =>
    `mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center ${
      selected ? 'border-[#B38B21]' : isLight ? 'border-black/25' : 'border-white/30'
    }`;

  const checkBox = (on: boolean) =>
    `h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center text-[9px] font-bold ${
      on
        ? 'border-[#B38B21] bg-[#B38B21] text-black'
        : isLight
          ? 'border-black/25 bg-white'
          : 'border-white/30 bg-transparent'
    }`;

  const togglePill = (on: boolean) =>
    `rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
      on
        ? 'bg-[#B38B21] text-black'
        : isLight
          ? 'bg-black/[0.05] text-black/55 hover:bg-black/[0.08]'
          : 'bg-white/[0.06] text-white/55 hover:bg-white/[0.1]'
    }`;

  const nowBtnCls = `shrink-0 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${
    isLight
      ? 'border-black/10 text-black/65 hover:bg-black/[0.04]'
      : 'border-white/10 text-white/65 hover:bg-white/[0.06]'
  }`;

  const applyQuickDurationText = (raw: string) => {
    setQuickDurationText(raw);
    const mins = parseQuickDuration(raw);
    if (mins != null) {
      setQuickMinutes(mins);
      setQuickDurationText(formatQuickDuration(mins));
    }
  };

  const setStartsNow = () => setStartsAt(toLocalInput(new Date()));

  const searchProducts = async (q: string) => {
    setTargetSearch(q);
    if (q.trim().length < 2) {
      setProductOptions([]);
      return;
    }
    if (previewMode) {
      const needle = q.trim().toLowerCase();
      setProductOptions(
        PREVIEW_PRODUCTS.filter((p) => p.name.toLowerCase().includes(needle)),
      );
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
    if (previewMode) {
      const needle = q.trim().toLowerCase();
      setCustomerHits(
        PREVIEW_CUSTOMERS.filter((c) => {
          if (audienceStaff && !audienceCustomers) {
            return c.label.includes('staff') && c.label.toLowerCase().includes(needle);
          }
          return c.label.toLowerCase().includes(needle);
        }),
      );
      return;
    }
    let query = supabase
      .from('profiles')
      .select('id, email, name, role')
      .or(`email.ilike.%${q.trim()}%,name.ilike.%${q.trim()}%`)
      .limit(10);

    if (audienceStaff && !audienceCustomers) {
      query = query.in('role', ['staff', 'admin']);
    }

    const { data } = await query;
    setCustomerHits(
      (data || []).map((r: { id: string; email?: string; name?: string; role?: string }) => ({
        id: String(r.id),
        label: [r.name, r.email, r.role].filter(Boolean).join(' · ') || r.id,
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

  const selectPctChip = (p: number) => {
    setPercent(p);
    const d = pctDens.find((x) => Number(x.percent) === p);
    if (d?.recommended_max_discount_pesewas != null) {
      setMaxDiscountGhs(String(pesewasToGhs(d.recommended_max_discount_pesewas)));
    }
  };

  const addTarget = (id: string, label: string) => {
    setTargetIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setTargetLabels((m) => ({ ...m, [id]: label }));
  };

  const removeTarget = (id: string) => {
    setTargetIds((ids) => ids.filter((x) => x !== id));
  };

  const buildArgs = () => {
    const denomination_id =
      mode === 'cash'
        ? matchingFixed?.id ?? selectedDenomId
        : pctDens.find((d) => Number(d.percent) === percent)?.id ?? null;

    return {
      name:
        name.trim() ||
        `${mode === 'cash' ? formatGHS(cashPesewas) : `${percent}%`} promotion`,
      usage_preset: preset,
      count: effectiveCount,
      denomination_id: denomination_id || null,
      discount_type: (mode === 'cash' ? 'fixed' : 'percentage') as PromoDiscountType,
      amount_off_pesewas: mode === 'cash' && !denomination_id ? cashPesewas : null,
      percent_off: mode === 'percentage' && !denomination_id ? percent : null,
      max_discount_pesewas: mode === 'percentage' ? maxDiscountPesewas || null : null,
      min_order_pesewas: minOrderPesewas,
      applies_to: appliesTo,
      target_ids: appliesChoice === 'product' || appliesChoice === 'category' ? targetIds : [],
      campus_ids: [],
      prefix: effectivePrefix,
      starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      assigned_user_id: preset === 'personal' ? assignedUserId : null,
      code_expires_at: endsAt ? new Date(endsAt).toISOString() : null,
      bypass_reason: belowFloor && bypassReason.trim() ? bypassReason.trim() : null,
    };
  };

  const saveDraft = async (alsoPublish: boolean) => {
    if (previewMode) {
      if (isBulk && previewBulkCodes.length > 0) {
        downloadCodesCsv(
          previewBulkCodes,
          `${(name.trim() || 'promo').replace(/\s+/g, '-').toLowerCase()}-codes.csv`,
        );
      }
      notify(
        alsoPublish
          ? 'Preview only — publish is disabled here.'
          : isBulk
            ? 'Preview only — sample CSV downloaded, nothing saved.'
            : 'Preview only — draft is not saved.',
        'success',
      );
      return;
    }
    if (!name.trim()) {
      notify('Give this campaign a name.', 'error');
      return;
    }
    if (mode === 'percentage' && (percent == null || percent <= 0)) {
      notify('Enter a discount percentage.', 'error');
      return;
    }
    if (mode === 'percentage' && !maxDiscountPesewas) {
      notify('Set a max savings ceiling for percentage discounts.', 'error');
      return;
    }
    if (mode === 'cash' && cashPesewas <= 0) {
      notify('Enter a discount amount.', 'error');
      return;
    }
    if (belowFloor && !bypassReason.trim()) {
      notify('Minimum spend is lower than the usual rule. Add a short reason.', 'error');
      return;
    }
    if (
      (appliesChoice === 'product' || appliesChoice === 'category') &&
      targetIds.length === 0
    ) {
      notify(
        appliesChoice === 'product'
          ? 'Select at least one product.'
          : 'Select at least one category.',
        'error',
      );
      return;
    }
    if (appliesChoice === 'audience' && !assignedUserId) {
      notify('Search and select a customer (or staff member) for this promo.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await promoCreateBatch(buildArgs());

      if (isBulk && result.codes?.length) {
        downloadCodesCsv(
          result.codes,
          `${(name.trim() || 'promo').replace(/\s+/g, '-').toLowerCase()}-codes.csv`,
        );
      }

      if (doNotStack) {
        try {
          await supabase
            .from('promotions')
            .update({ stackable: false })
            .eq('id', result.promotion_id);
        } catch {
          // Column may be RLS-protected; ignore — core create still succeeded.
        }
      }

      if (alsoPublish) {
        try {
          await promoPublish(result.promotion_id);
          notify('Published — codes are now active.', 'success');
        } catch (pubErr) {
          notify(promoRpcErrorMessage(pubErr), 'error');
          void navigate({
            to: '/admin/promotions/$promoId' as any,
            params: { promoId: result.promotion_id } as any,
          });
          return;
        }
      } else {
        notify('Draft saved.', 'success');
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

  const downloadBulkCsv = () => {
    if (previewBulkCodes.length === 0) {
      notify('Set a quantity and prefix first.', 'error');
      return;
    }
    downloadCodesCsv(
      previewBulkCodes,
      `${(name.trim() || 'promo').replace(/\s+/g, '-').toLowerCase()}-codes.csv`,
    );
    notify(
      previewMode
        ? `Downloaded ${previewBulkCodes.length} sample codes.`
        : `Downloaded ${previewBulkCodes.length} code previews. Final codes generate on save.`,
      'success',
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start pb-8">
      <div className="flex-1 min-w-0 space-y-3.5">
        <div>
          {previewMode ? (
            <p className={`text-xs font-medium mb-2 ${muted}`}>UI preview · no login required</p>
          ) : (
            <Link
              to="/admin/promotions"
              className={`inline-flex items-center gap-1.5 text-xs font-medium mb-2 ${muted} hover:text-[#B38B21]`}
            >
              <ArrowLeft size={14} /> Back to promotions
            </Link>
          )}
          <h2 className={`text-lg font-semibold tracking-tight ${fg}`}>New promotion</h2>
          <p className={`mt-0.5 text-[12px] ${muted}`}>
            Name it, set the deal, choose who it covers — watch the summary update live.
          </p>
        </div>

        {/* ── PAGE HEADER ── */}
        <section className={sectionCard}>
          <div>
            <h3 className={sectionTitle}>Campaign details</h3>
            <p className={sectionHint}>The basics shoppers and staff will recognize.</p>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls} htmlFor="promo-name">
              Campaign / promotion name
            </label>
            <input
              id="promo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Summer campus sale"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className={labelCls}>Promo code</label>
              <div
                className={`flex gap-1 p-0.5 rounded-lg border ${
                  isLight ? 'border-black/10' : 'border-white/10'
                }`}
              >
                <button
                  type="button"
                  className={togglePill(codeMode === 'manual')}
                  onClick={() => setCodeMode('manual')}
                >
                  Manual
                </button>
                <button
                  type="button"
                  className={togglePill(codeMode === 'auto')}
                  onClick={() => {
                    setCodeMode('auto');
                    setCodePrefix(randomPromoCode());
                  }}
                >
                  Auto-generate
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={codePrefix}
                onChange={(e) => {
                  setCodeMode('manual');
                  setCodePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12));
                }}
                className={`${inputCls} font-mono tracking-wider`}
                placeholder="SUMMER15"
                disabled={codeMode === 'auto'}
              />
              {codeMode === 'auto' && (
                <button
                  type="button"
                  onClick={() => setCodePrefix(randomPromoCode())}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${
                    isLight
                      ? 'border-black/10 text-black/70 hover:bg-black/[0.04]'
                      : 'border-white/10 text-white/70 hover:bg-white/[0.06]'
                  }`}
                  title="Generate another"
                >
                  <Sparkles size={14} /> New
                </button>
              )}
            </div>
            <p className={`text-[11px] ${muted}`}>
              {isBulk
                ? 'Bulk codes use the prefix in Usage limits below.'
                : 'Shoppers will type this code at checkout.'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className={labelCls}>Discount value</label>
              <div
                className={`flex gap-1 p-0.5 rounded-lg border ${
                  isLight ? 'border-black/10' : 'border-white/10'
                }`}
              >
                <button
                  type="button"
                  className={togglePill(mode === 'cash')}
                  onClick={() => setMode('cash')}
                >
                  GH₵
                </button>
                <button
                  type="button"
                  className={togglePill(mode === 'percentage')}
                  onClick={() => setMode('percentage')}
                >
                  %
                </button>
              </div>
            </div>

            {mode === 'cash' ? (
              <div className="space-y-3">
                <div className="relative max-w-[220px]">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${muted}`}>
                    GH₵
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={cashGhs}
                    onChange={(e) => {
                      setCashGhs(e.target.value);
                      setSelectedDenomId(null);
                    }}
                    className={`${inputCls} pl-12`}
                    placeholder="50"
                  />
                </div>
                {fixedDens.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {fixedDens.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => selectCashChip(d.id)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium border ${
                          selectedDenomId === d.id || matchingFixed?.id === d.id
                            ? 'border-[#B38B21] text-[#B38B21] bg-[#B38B21]/10'
                            : isLight
                              ? 'border-black/10 text-black/55'
                              : 'border-white/10 text-white/55'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative max-w-[160px]">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={percent ?? ''}
                    onChange={(e) => setPercent(Number(e.target.value) || null)}
                    className={`${inputCls} pr-8`}
                    placeholder="15"
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${muted}`}>
                    %
                  </span>
                </div>
                {pctDens.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pctDens.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => selectPctChip(Number(d.percent))}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium border ${
                          percent === Number(d.percent)
                            ? 'border-[#B38B21] text-[#B38B21] bg-[#B38B21]/10'
                            : isLight
                              ? 'border-black/10 text-black/55'
                              : 'border-white/10 text-white/55'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {mode === 'percentage' && (
            <div className="space-y-1.5">
              <label className={labelCls} htmlFor="max-savings">
                Max savings ceiling <span className={muted}>(optional but recommended)</span>
              </label>
              <div className="relative max-w-[220px]">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${muted}`}>
                  GH₵
                </span>
                <input
                  id="max-savings"
                  type="number"
                  min={0}
                  value={maxDiscountGhs}
                  onChange={(e) => setMaxDiscountGhs(e.target.value)}
                  className={`${inputCls} pl-12`}
                  placeholder="150"
                />
              </div>
              <p className={`text-[11px] ${muted}`}>
                e.g. “Up to GH₵ {maxDiscountGhs || '150'} max savings”
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelCls} htmlFor="min-order">
              Minimum order value (GH₵)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative max-w-[220px] flex-1">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${muted}`}>
                  GH₵
                </span>
                <input
                  id="min-order"
                  type="number"
                  min={0}
                  value={minOrderGhs}
                  onChange={(e) => setMinOrderGhs(e.target.value)}
                  className={`${inputCls} pl-12`}
                  placeholder="50"
                />
              </div>
              {mode === 'cash' && floorPesewas > 0 && (
                <button
                  type="button"
                  onClick={() => setMinOrderGhs(String(pesewasToGhs(floorPesewas)))}
                  className="rounded-lg border border-[#B38B21]/40 px-3 py-2 text-xs font-medium text-[#B38B21]"
                >
                  Use usual minimum
                </button>
              )}
            </div>
            {belowFloor && (
              <input
                value={bypassReason}
                onChange={(e) => setBypassReason(e.target.value)}
                placeholder="Reason for a lower minimum…"
                className={inputCls}
              />
            )}
          </div>
        </section>

        {/* ── APPLIES TO ── */}
        <section className={sectionCard}>
          <div>
            <h3 className={sectionTitle}>Applies to</h3>
            <p className={sectionHint}>What (or who) this discount covers.</p>
          </div>

          <div className="space-y-2">
            {(
              [
                {
                  id: 'order' as const,
                  title: 'Everything',
                  desc: 'Whole cart — products, delivery, repairs, trade-in top-ups.',
                },
                {
                  id: 'product' as const,
                  title: 'Specific products',
                  desc: 'Only the products you search and select.',
                },
                {
                  id: 'category' as const,
                  title: 'Specific categories',
                  desc: 'Only items in the categories you choose.',
                },
                {
                  id: 'services' as const,
                  title: 'Services',
                  desc: 'Repairs, trade-ins, or delivery fee only.',
                },
                {
                  id: 'audience' as const,
                  title: 'Specific targeted audience',
                  desc: 'A personal code for staff or a selected customer.',
                },
              ] as const
            ).map((opt) => {
              const on = appliesChoice === opt.id;
              return (
                <div key={opt.id} className="space-y-2">
                  <button
                    type="button"
                    className={radioRow(on)}
                    onClick={() => setAppliesChoice(opt.id)}
                  >
                    <span className={radioDot(on)}>
                      {on && <span className="h-2 w-2 rounded-full bg-[#B38B21]" />}
                    </span>
                    <span>
                      <span className={`block text-sm font-medium ${fg}`}>{opt.title}</span>
                      <span className={`block text-[12px] mt-0.5 ${muted}`}>{opt.desc}</span>
                    </span>
                  </button>

                  {on && opt.id === 'product' && (
                    <div
                      className={`ml-7 space-y-2 rounded-xl border p-3 ${
                        isLight ? 'border-black/8 bg-black/[0.02]' : 'border-white/8 bg-white/[0.03]'
                      }`}
                    >
                      <input
                        value={targetSearch}
                        onChange={(e) => void searchProducts(e.target.value)}
                        placeholder="Search & select products…"
                        className={inputCls}
                      />
                      {productOptions.length > 0 && (
                        <ul className="space-y-1 max-h-36 overflow-y-auto">
                          {productOptions.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                className={`text-xs ${muted} hover:text-[#B38B21]`}
                                onClick={() => addTarget(p.id, p.name)}
                              >
                                + {p.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {targetIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {targetIds.map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => removeTarget(id)}
                              className="rounded-md bg-[#B38B21]/15 text-[#8A6A18] px-2 py-1 text-[11px] font-medium"
                            >
                              {targetLabels[id] || id} ×
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {on && opt.id === 'category' && (
                    <div
                      className={`ml-7 space-y-2 rounded-xl border p-3 ${
                        isLight ? 'border-black/8 bg-black/[0.02]' : 'border-white/8 bg-white/[0.03]'
                      }`}
                    >
                      <input
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        placeholder="Filter categories…"
                        className={inputCls}
                      />
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {filteredCategories.map((c) => {
                          const selected = targetIds.includes(c.id);
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                className="flex items-center gap-2 w-full text-left text-xs py-1"
                                onClick={() =>
                                  selected ? removeTarget(c.id) : addTarget(c.id, c.name)
                                }
                              >
                                <span className={checkBox(selected)}>{selected ? '✓' : ''}</span>
                                <span className={selected ? 'text-[#B38B21]' : muted}>{c.name}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {on && opt.id === 'services' && (
                    <div
                      className={`ml-7 flex flex-wrap gap-3 rounded-xl border p-3 ${
                        isLight ? 'border-black/8 bg-black/[0.02]' : 'border-white/8 bg-white/[0.03]'
                      }`}
                    >
                      {(
                        [
                          { id: 'repair' as const, label: 'Repairs' },
                          { id: 'tradein_topup' as const, label: 'Trade-ins' },
                          { id: 'delivery' as const, label: 'Delivery' },
                        ] as const
                      ).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="inline-flex items-center gap-2 text-xs font-medium"
                          onClick={() => setServiceKind(s.id)}
                        >
                          <span className={checkBox(serviceKind === s.id)}>
                            {serviceKind === s.id ? '✓' : ''}
                          </span>
                          <span className={fg}>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {on && opt.id === 'audience' && (
                    <div
                      className={`ml-7 space-y-3 rounded-xl border p-3 ${
                        isLight ? 'border-black/8 bg-black/[0.02]' : 'border-white/8 bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex flex-wrap gap-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-xs font-medium"
                          onClick={() => {
                            setAudienceStaff((v) => !v);
                            if (!audienceStaff) setAudienceCustomers(false);
                          }}
                        >
                          <span className={checkBox(audienceStaff)}>{audienceStaff ? '✓' : ''}</span>
                          <span className={fg}>Staff</span>
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-xs font-medium"
                          onClick={() => {
                            setAudienceCustomers((v) => !v);
                            if (!audienceCustomers) setAudienceStaff(false);
                          }}
                        >
                          <span className={checkBox(audienceCustomers)}>
                            {audienceCustomers ? '✓' : ''}
                          </span>
                          <span className={fg}>Select customers</span>
                        </button>
                      </div>
                      <input
                        value={customerQuery}
                        onChange={(e) => void searchCustomers(e.target.value)}
                        placeholder={
                          audienceStaff && !audienceCustomers
                            ? 'Search staff by name or email…'
                            : 'Search customers by name or email…'
                        }
                        className={inputCls}
                      />
                      {customerHits.length > 0 && (
                        <ul className="space-y-1 max-h-36 overflow-y-auto">
                          {customerHits.map((h) => (
                            <li key={h.id}>
                              <button
                                type="button"
                                className={`text-xs ${
                                  assignedUserId === h.id ? 'text-[#B38B21] font-medium' : muted
                                } hover:text-[#B38B21]`}
                                onClick={() => {
                                  setAssignedUserId(h.id);
                                  setAssignedLabel(h.label);
                                }}
                              >
                                {assignedUserId === h.id ? '✓ ' : '+ '}
                                {h.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {assignedUserId && (
                        <p className={`text-[12px] ${fg}`}>
                          Assigned to: <span className="text-[#B38B21]">{assignedLabel}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── USAGE LIMITS ── */}
        <section className={sectionCard}>
          <div>
            <h3 className={sectionTitle}>Usage limits</h3>
            <p className={sectionHint}>
              {isAudience
                ? 'Choose how the selected person can redeem their personal code.'
                : 'How widely this code can be redeemed.'}
            </p>
          </div>

          {isAudience ? (
            <div className="space-y-2">
              {(
                [
                  {
                    id: 'once' as const,
                    title: 'One use for this person',
                    desc: 'Personal code — expires after a single redemption.',
                  },
                  {
                    id: 'reusable' as const,
                    title: 'Reusable by this person',
                    desc: 'Same person can redeem again while the promo is live.',
                  },
                ] as const
              ).map((opt) => {
                const on = audienceUsage === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={radioRow(on)}
                    onClick={() => setAudienceUsage(opt.id)}
                  >
                    <span className={radioDot(on)}>
                      {on && <span className="h-1.5 w-1.5 rounded-full bg-[#B38B21]" />}
                    </span>
                    <span>
                      <span className={`block text-[13px] font-medium ${fg}`}>{opt.title}</span>
                      <span className={`block text-[11px] mt-0.5 ${muted}`}>{opt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {(
                [
                  {
                    id: 'single' as const,
                    title: 'Single-use',
                    desc: '1 person total — one code, one redemption.',
                  },
                  {
                    id: 'unlimited' as const,
                    title: 'Unlimited public code',
                    desc: 'Everyone can use the same shareable code.',
                  },
                  {
                    id: 'early_bird' as const,
                    title: 'Early bird',
                    desc: 'First N customers, then the offer stops.',
                  },
                  {
                    id: 'bulk' as const,
                    title: 'Bulk code generator',
                    desc: 'Many unique one-time codes — download CSV anytime.',
                  },
                ] as const
              ).map((opt) => {
                const on = usageChoice === opt.id;
                return (
                  <div key={opt.id} className="space-y-1.5">
                    <button
                      type="button"
                      className={radioRow(on)}
                      onClick={() => setUsageChoice(opt.id)}
                    >
                      <span className={radioDot(on)}>
                        {on && <span className="h-1.5 w-1.5 rounded-full bg-[#B38B21]" />}
                      </span>
                      <span>
                        <span className={`block text-[13px] font-medium ${fg}`}>{opt.title}</span>
                        <span className={`block text-[11px] mt-0.5 ${muted}`}>{opt.desc}</span>
                      </span>
                    </button>

                    {on && opt.id === 'early_bird' && (
                      <div className="ml-6 max-w-[160px]">
                        <label className={labelCls}>First N customers</label>
                        <input
                          type="number"
                          min={1}
                          value={earlyBirdN}
                          onChange={(e) =>
                            setEarlyBirdN(Math.max(1, Number(e.target.value) || 1))
                          }
                          className={`${inputCls} mt-1`}
                        />
                      </div>
                    )}

                    {on && opt.id === 'bulk' && (
                      <div className="ml-6 grid sm:grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>Quantity</label>
                          <input
                            type="number"
                            min={1}
                            value={codesCount}
                            onChange={(e) =>
                              setCodesCount(Math.max(1, Number(e.target.value) || 1))
                            }
                            className={`${inputCls} mt-1`}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Prefix</label>
                          <input
                            value={bulkPrefix}
                            onChange={(e) =>
                              setBulkPrefix(
                                e.target.value
                                  .toUpperCase()
                                  .replace(/[^A-Z0-9]/g, '')
                                  .slice(0, 8),
                              )
                            }
                            className={`${inputCls} mt-1 font-mono`}
                            placeholder="BBX"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-1.5 pt-0.5">
            {!isAudience && (
              <button
                type="button"
                disabled={usageChoice !== 'unlimited'}
                className="flex items-center gap-2 text-left disabled:opacity-40"
                onClick={() => setRestrictPerCustomer((v) => !v)}
              >
                <span className={checkBox(restrictPerCustomer && usageChoice === 'unlimited')}>
                  {restrictPerCustomer && usageChoice === 'unlimited' ? '✓' : ''}
                </span>
                <span className={`text-[12px] ${fg}`}>
                  Restrict to 1 use per customer email / account
                </span>
              </button>
            )}
            <button
              type="button"
              className="flex items-center gap-2 text-left"
              onClick={() => setDoNotStack((v) => !v)}
            >
              <span className={checkBox(doNotStack)}>{doNotStack ? '✓' : ''}</span>
              <span className={`text-[12px] ${fg}`}>Do not stack with other discounts</span>
            </button>
          </div>
        </section>

        {/* ── DURATION ── */}
        <section className={sectionCard}>
          <div>
            <h3 className={sectionTitle}>Duration & scheduling</h3>
            <p className={sectionHint}>When the offer goes live and when it ends.</p>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              className={radioRow(durationMode === 'range')}
              onClick={() => setDurationMode('range')}
            >
              <span className={radioDot(durationMode === 'range')}>
                {durationMode === 'range' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B38B21]" />
                )}
              </span>
              <span className={`text-[13px] font-medium ${fg}`}>
                Start date/time → End date/time
              </span>
            </button>
            {durationMode === 'range' && (
              <div className="ml-6 grid sm:grid-cols-2 gap-2">
                <label className={`block ${labelCls}`}>
                  Starts
                  <div className="mt-1 flex gap-1.5">
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className={inputCls}
                    />
                    <button type="button" className={nowBtnCls} onClick={setStartsNow}>
                      Now
                    </button>
                  </div>
                </label>
                <label className={`block ${labelCls}`}>
                  Ends
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className={`${inputCls} mt-1`}
                  />
                </label>
              </div>
            )}

            <button
              type="button"
              className={radioRow(durationMode === 'quick')}
              onClick={() => setDurationMode('quick')}
            >
              <span className={radioDot(durationMode === 'quick')}>
                {durationMode === 'quick' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B38B21]" />
                )}
              </span>
              <span className={`text-[13px] font-medium ${fg}`}>Quick duration</span>
            </button>
            {durationMode === 'quick' && (
              <div className="ml-6 space-y-2">
                <label className={`block ${labelCls} max-w-sm`}>
                  How long should it run?
                  <input
                    value={quickDurationText}
                    onChange={(e) => setQuickDurationText(e.target.value)}
                    onBlur={(e) => applyQuickDurationText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyQuickDurationText(quickDurationText);
                      }
                    }}
                    className={`${inputCls} mt-1`}
                    placeholder="e.g. 30 minutes, 2 hours, 1 day"
                  />
                </label>
                <p className={`text-[11px] ${muted}`}>
                  Type a duration like <span className={fg}>30 minutes</span>,{' '}
                  <span className={fg}>2h</span>, or <span className={fg}>1 day</span>, then press
                  Enter.
                </p>
                <label className={`block ${labelCls} max-w-sm`}>
                  Starts
                  <div className="mt-1 flex gap-1.5">
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className={inputCls}
                    />
                    <button type="button" className={nowBtnCls} onClick={setStartsNow}>
                      Now
                    </button>
                  </div>
                </label>
                {endsAt && (
                  <p className={`text-[11px] ${muted}`}>
                    Ends at{' '}
                    <span className={fg}>
                      {new Date(endsAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {quickMinutes > 0 ? ` · ${formatQuickDuration(quickMinutes)}` : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── SUMMARY & LIVE SIMULATION (sticky right) ── */}
      <aside className="w-full lg:w-[280px] xl:w-[300px] shrink-0 lg:sticky lg:top-4 space-y-2.5">
        <div className={`${hairlineCard(isLight)} overflow-hidden`}>
          <div
            className={`px-3 py-2 border-b ${
              isLight ? 'border-black/8 bg-black/[0.02]' : 'border-white/8 bg-white/[0.03]'
            }`}
          >
            <h3 className={`text-[12px] font-semibold ${fg}`}>Summary & live simulation</h3>
          </div>

          <div
            className={`divide-y ${isLight ? 'divide-black/8' : 'divide-white/8'}`}
          >
            <div className="px-3 py-2.5 space-y-1.5">
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>
                Summary
              </p>
              <dl className="space-y-1 text-[12px]">
                <div className="flex justify-between gap-2">
                  <dt className={muted}>Discount</dt>
                  <dd className={`font-medium text-right ${fg}`}>{discountSummary}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className={muted}>Min order</dt>
                  <dd className={`font-medium text-right ${fg}`}>
                    {formatGHS(minOrderPesewas)}
                  </dd>
                </div>
                {mode === 'percentage' && maxDiscountPesewas > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className={muted}>Max savings</dt>
                    <dd className={`font-medium text-right ${fg}`}>
                      {formatGHS(maxDiscountPesewas)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className={muted}>Max exposure</dt>
                  <dd className={`font-medium text-right ${fg}`}>
                    {totalCostPesewas == null ? 'No limit' : formatGHS(totalCostPesewas)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className={muted}>Code</dt>
                  <dd className="font-mono text-[11px] font-medium text-right text-[#B38B21]">
                    {sim.codePreview}
                  </dd>
                </div>
                {isBulk && (
                  <div className="flex justify-between gap-2">
                    <dt className={muted}>Codes</dt>
                    <dd className={`font-medium text-right ${fg}`}>{codesCount}</dd>
                  </div>
                )}
                {isAudience && (
                  <div className="flex justify-between gap-2">
                    <dt className={muted}>Audience use</dt>
                    <dd className={`font-medium text-right ${fg}`}>
                      {audienceUsage === 'once' ? '1×' : 'Reusable'}
                    </dd>
                  </div>
                )}
                {perUser != null && !isAudience && (
                  <div className="flex justify-between gap-2">
                    <dt className={muted}>Per customer</dt>
                    <dd className={`font-medium text-right ${fg}`}>{perUser}</dd>
                  </div>
                )}
              </dl>
              {isBulk && (
                <button
                  type="button"
                  onClick={downloadBulkCsv}
                  className="mt-1.5 w-full rounded-lg border border-[#B38B21]/45 py-1.5 text-[11px] font-semibold text-[#B38B21] hover:bg-[#B38B21]/10"
                >
                  Download CSV ({Math.min(codesCount, 200)} codes)
                </button>
              )}
            </div>

            <div className="px-3 py-2.5 space-y-2">
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>
                Cart simulator
              </p>
              <label className={`block ${labelCls}`}>
                Test subtotal
                <div className="relative mt-1">
                  <span
                    className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] ${muted}`}
                  >
                    GH₵
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={simSubtotalGhs}
                    onChange={(e) => setSimSubtotalGhs(e.target.value)}
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </label>
              <dl className="space-y-1 text-[12px]">
                <div className="flex justify-between gap-2">
                  <dt className={muted}>Applied code</dt>
                  <dd className={`font-mono text-[11px] font-medium ${fg}`}>
                    {sim.codePreview}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className={muted}>Discount</dt>
                  <dd className={`font-medium ${sim.eligible ? 'text-emerald-600' : muted}`}>
                    {sim.eligible ? `− ${formatGHS(sim.discountPesewas)}` : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 items-baseline">
                  <dt className={muted}>New total</dt>
                  <dd className={`text-[15px] font-semibold ${fg}`}>
                    {formatGHS(sim.newTotalPesewas)}
                  </dd>
                </div>
              </dl>
              {sim.note && (
                <p
                  className={`text-[10px] rounded-md px-2 py-1.5 ${
                    isLight ? 'bg-amber-50 text-amber-800' : 'bg-amber-500/15 text-amber-200'
                  }`}
                >
                  {sim.note}
                </p>
              )}
            </div>
          </div>

          <div
            className={`px-3 py-2.5 border-t space-y-1.5 ${
              isLight ? 'border-black/8' : 'border-white/8'
            }`}
          >
            <button
              type="button"
              disabled={submitting}
              onClick={() => void saveDraft(false)}
              className={`w-full rounded-lg border py-2 text-[11px] font-semibold disabled:opacity-50 ${
                isLight
                  ? 'border-black/15 text-black/70 hover:bg-black/5'
                  : 'border-white/15 text-white/60 hover:bg-white/5'
              }`}
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void saveDraft(true)}
              className="w-full rounded-lg bg-[#B38B21] py-2 text-[11px] font-semibold text-black hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? 'Working…' : 'Publish promo'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
