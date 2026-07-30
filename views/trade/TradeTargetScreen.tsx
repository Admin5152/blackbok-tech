/**
 * Spec Screen 5 — Target device picker (live shop SKUs from v_trade_targets).
 *
 * Drilldown: category → model card → (New/Pre-owned if both) → storage → SIM → RAM → colour.
 * Each step only lists options that exist on in-stock SKU rows for that product
 * (e.g. iPhone 17 → only real 256GB / eSIM / RAM / colours).
 *
 * Out-of-stock colours are HIDDEN (Decision Sheet D11: no stock reservation —
 * first come, first served; stock confirmed at BlackBox visit).
 *
 * "Cash trade-in only" sets targetLock with variantId=null.
 *
 * LOUD: effective_price shown here is a DISPLAY SNAPSHOT only. On submit the
 * server trigger fn_trade_snapshot_target_price re-derives price + top-up.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Banknote, Search, Smartphone, X } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { TradePhasePills } from '../../components/trade/TradePhasePills';
import { PageBackButton } from '../../components/PageBackButton';
import { Pagination } from '../../components/Pagination';
import { usePagination } from '../../lib/pagination';
import { getTradeTargets } from '../../lib/tradeApi';
import { getProductPageRow } from '../../lib/catalogApi';
import { displayImageForColorSelection } from '../../lib/productColorImages';
import { formatGhs } from '../../lib/money';
import { TRADE_COPY, simVariantLabel } from '../../lib/tradeCopy';
import {
  filterTradeTargetRowsByUpgradePicks,
  loadUpgradeProductIds,
  TRADE_UPGRADE_PICKS_UPDATED_EVENT,
} from '../../lib/tradeUpgradePicks';
import {
  conditionsInGroup,
  distinctTargetCategories,
  distinctTargetRam,
  distinctTargetSims,
  distinctTargetStorage,
  filterInStockTargets,
  findTargetSku,
  formatTargetConditionLabel,
  formatTargetSelectionSummary,
  groupTargetsByModel,
  orderTargetModelGroupsByAllowlist,
  selectionHasStock,
  summaryFromConditionMember,
  targetColorRows,
  type TargetModelGroup,
  type TargetProductSummary,
} from '../../lib/tradeTargetHelpers';
import type { TradeTargetLock } from '../../lib/tradeFlowState';
import { useAppContext } from '../../lib/appContext';
import type { TradeTargetRow } from '../../types/supabase';

type Phase = 'browse' | 'condition' | 'configure' | 'review';

export function TradeTargetScreen() {
  const { theme, notify } = useAppContext();
  const isLight = theme === 'light';
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();

  /** All active SKUs (incl. OOS) — so customers can pick the version they want */
  const [allRows, setAllRows] = useState<TradeTargetRow[]>([]);
  const [allowIds, setAllowIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productDetail, setProductDetail] = useState<{
    description: string;
    specs: string[];
  } | null>(null);

  const [phase, setPhase] = useState<Phase>('browse');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<TargetModelGroup | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<TargetProductSummary | null>(null);
  const [storage, setStorage] = useState<string | null>(null);
  const [sim, setSim] = useState<string | null>(null);
  const [ram, setRam] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  // Guard: need deviceLock from Screen 4
  useEffect(() => {
    if (!state.deviceLock) {
      void navigate({ to: '/trade/config', replace: true });
    }
  }, [state.deviceLock, navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Load all active variants so storage / eSIM choices stay visible;
        // browse cards still require at least one in-stock SKU (D11).
        // Staff allowlist (upgrade targets) filters which products appear.
        const [data, loaded] = await Promise.all([
          getTradeTargets({ inStockOnly: false }),
          loadUpgradeProductIds(),
        ]);
        if (!cancelled) {
          setAllRows(data);
          setAllowIds(loaded.ids);
        }
      } catch {
        if (!cancelled) setError(TRADE_COPY.states.errorPricing);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onPicks = () => {
      void loadUpgradeProductIds().then((loaded) => {
        if (!cancelled) setAllowIds(loaded.ids);
      });
    };
    window.addEventListener(TRADE_UPGRADE_PICKS_UPDATED_EVENT, onPicks);

    return () => {
      cancelled = true;
      window.removeEventListener(TRADE_UPGRADE_PICKS_UPDATED_EVENT, onPicks);
    };
  }, []);

  const scopedRows = useMemo(
    () => filterTradeTargetRowsByUpgradePicks(allRows, allowIds),
    [allRows, allowIds],
  );

  const stockRows = useMemo(() => filterInStockTargets(scopedRows), [scopedRows]);

  /**
   * Browse cards: when staff set an allowlist, show those products even if
   * currently OOS (customer can still state preference). Without an allowlist,
   * keep D11 in-stock-only browse.
   */
  const browseSourceRows = useMemo(
    () => (allowIds?.length ? scopedRows : stockRows),
    [allowIds, scopedRows, stockRows],
  );

  const categories = useMemo(
    () => distinctTargetCategories(browseSourceRows),
    [browseSourceRows],
  );

  // Drop stale category chip if staff removed every product in that category
  useEffect(() => {
    if (categoryFilter && !categories.includes(categoryFilter)) {
      setCategoryFilter(null);
    }
  }, [categories, categoryFilter]);

  const modelGroups = useMemo(() => {
    const filtered = categoryFilter
      ? browseSourceRows.filter((r) => r.category === categoryFilter)
      : browseSourceRows;
    const grouped = groupTargetsByModel(filtered);
    const ordered = orderTargetModelGroupsByAllowlist(grouped, allowIds);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((g) => {
      const hay = `${g.name} ${g.category ?? ''} ${g.tradeModel ?? ''} ${g.members
        .map((m) => m.name)
        .join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [browseSourceRows, categoryFilter, allowIds, searchQuery]);

  const targetPaging = usePagination(
    modelGroups,
    36,
    `${categoryFilter ?? 'all'}|${searchQuery.trim()}|${modelGroups.length}`,
  );

  const productHasStock = useMemo(() => {
    const set = new Set<string>();
    for (const r of stockRows) set.add(r.product_id);
    return set;
  }, [stockRows]);

  const groupHasStock = (g: TargetModelGroup) =>
    g.members.some((m) => productHasStock.has(m.productId));

  const groupConditions = useMemo(
    () => (selectedGroup ? conditionsInGroup(selectedGroup) : []),
    [selectedGroup],
  );

  const groupNeedsConditionPick = groupConditions.length >= 2;

  /** Configure against all variants for this product (incl. OOS prefs) */
  const productRows = useMemo(() => {
    if (!selectedProduct) return [];
    return scopedRows.filter((r) => r.product_id === selectedProduct.productId);
  }, [scopedRows, selectedProduct]);

  const storageOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return distinctTargetStorage(productRows, selectedProduct.productId);
  }, [productRows, selectedProduct]);

  /** Products with no storage chip (e.g. accessories) skip the storage step */
  const storageResolved =
    storageOptions.length === 0 || storage != null;

  const storageFilter =
    selectedProduct && storageOptions.length > 0 ? storage : null;

  const simOptions = useMemo(() => {
    if (!selectedProduct || !storageResolved) return [];
    return distinctTargetSims(productRows, selectedProduct.productId, storageFilter);
  }, [productRows, selectedProduct, storageFilter, storageResolved]);

  const simResolved = simOptions.length === 0 || sim != null;

  // Auto-skip SIM when only one (or none / single)
  useEffect(() => {
    if (!selectedProduct || !storageResolved) return;
    if (simOptions.length === 0) {
      if (sim !== null) setSim(null);
      return;
    }
    if (simOptions.length === 1 && sim !== simOptions[0]) {
      setSim(simOptions[0]);
    }
  }, [selectedProduct, storageResolved, simOptions, sim]);

  const ramOptions = useMemo(() => {
    if (!selectedProduct || !storageResolved || !simResolved) return [];
    return distinctTargetRam(
      productRows,
      selectedProduct.productId,
      storageFilter,
      simOptions.length > 0 ? sim : null,
    );
  }, [
    productRows,
    selectedProduct,
    storageFilter,
    sim,
    simOptions.length,
    storageResolved,
    simResolved,
  ]);

  /** Show RAM picker only when more than one RAM exists for this path */
  const showRamPicker = ramOptions.length > 1;
  const ramResolved =
    !showRamPicker || ram != null || ramOptions.length === 0;

  // Auto-pick sole RAM (or clear when none)
  useEffect(() => {
    if (!selectedProduct || !storageResolved || !simResolved) return;
    if (ramOptions.length === 0) {
      if (ram !== null) setRam(null);
      return;
    }
    if (ramOptions.length === 1 && ram !== ramOptions[0]) {
      setRam(ramOptions[0]);
    }
  }, [selectedProduct, storageResolved, simResolved, ramOptions, ram]);

  const colorOptions = useMemo(() => {
    if (!selectedProduct || !storageResolved || !simResolved) return [];
    if (showRamPicker && !ram) return [];
    const rows = targetColorRows(
      productRows,
      selectedProduct.productId,
      storageFilter,
      simOptions.length > 0 ? sim : null,
      showRamPicker ? ram : ramOptions[0] ?? null,
    );
    // In-stock colours first; OOS still listed so customers can state preference
    return [...rows].sort((a, b) => {
      const as = (a.variant_stock ?? 0) > 0 ? 1 : 0;
      const bs = (b.variant_stock ?? 0) > 0 ? 1 : 0;
      return bs - as;
    });
  }, [
    productRows,
    selectedProduct,
    storageFilter,
    sim,
    ram,
    simOptions.length,
    ramOptions,
    showRamPicker,
    storageResolved,
    simResolved,
  ]);

  const selectedSku = useMemo(() => {
    if (!selectedProduct || !storageResolved || !simResolved) return null;
    if (showRamPicker && !ram) return null;
    if (colorOptions.length === 1 && color == null) {
      return colorOptions[0];
    }
    if (colorOptions.length > 1 && color == null) return null;
    // No colour dimension — resolve by storage/SIM/RAM alone
    if (colorOptions.length === 0 && storageResolved && simResolved && ramResolved) {
      return findTargetSku(
        productRows,
        selectedProduct.productId,
        storageFilter,
        simOptions.length > 0 ? sim : null,
        null,
        showRamPicker ? ram : ramOptions[0] ?? null,
      );
    }
    return findTargetSku(
      productRows,
      selectedProduct.productId,
      storageFilter,
      simOptions.length > 0 ? sim : null,
      color,
      showRamPicker ? ram : ramOptions[0] ?? null,
    );
  }, [
    productRows,
    selectedProduct,
    storageFilter,
    sim,
    ram,
    color,
    simOptions.length,
    ramOptions,
    showRamPicker,
    colorOptions,
    storageResolved,
    simResolved,
    ramResolved,
  ]);

  const canConfirm =
    Boolean(selectedProduct) &&
    storageResolved &&
    simResolved &&
    ramResolved &&
    (colorOptions.length === 0
      ? storageOptions.length === 0 || storage != null || sim != null
      : color != null || colorOptions.length === 1);

  // Auto-select the only colour / sole SKU
  useEffect(() => {
    if (colorOptions.length === 1 && color == null) {
      setColor(colorOptions[0].color);
    }
  }, [colorOptions, color]);

  const selectionSummary = formatTargetSelectionSummary({
    storage: selectedSku?.storage ?? storage,
    sim: selectedSku?.sim_type ?? sim,
    ram: selectedSku?.ram ?? ram,
    color: selectedSku?.color ?? color,
  });

  const inStockSelection = selectionHasStock(selectedSku);

  /** Image swaps with colour — variant row, colour SKU photo, or product default */
  const previewImage = useMemo(() => {
    const colorRow = color ? colorOptions.find((r) => r.color === color) : null;
    return displayImageForColorSelection({
      color,
      variantImage: selectedSku?.display_image ?? colorRow?.display_image,
      productImage: selectedProduct?.image,
    });
  }, [color, colorOptions, selectedSku?.display_image, selectedProduct?.image]);

  const chipClass = (selected: boolean) =>
    `rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
      selected
        ? 'border-[#CDA032] bg-[#CDA032]/15 text-[#CDA032]'
        : isLight
          ? 'border-black/10 bg-white hover:border-[#CDA032]/40'
          : 'border-white/10 bg-white/[0.03] hover:border-[#CDA032]/40'
    }`;

  const filterChipClass = (selected: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
      selected
        ? 'border-[#CDA032] bg-[#CDA032]/15 text-[#CDA032]'
        : isLight
          ? 'border-black/10 bg-white hover:border-[#CDA032]/40'
          : 'border-white/10 bg-white/[0.04] hover:border-[#CDA032]/40'
    }`;

  const openConfigure = (p: TargetProductSummary, group: TargetModelGroup | null = selectedGroup) => {
    setSelectedGroup(group);
    setSelectedProduct(p);
    setStorage(null);
    setSim(null);
    setRam(null);
    setColor(null);
    setProductDetail(null);
    setPhase('configure');
    void getProductPageRow(p.productId)
      .then((prod) => {
        if (!prod) return;
        setProductDetail({
          description: String(prod.description || '').trim(),
          specs: Array.isArray(prod.specs)
            ? prod.specs.map(String).filter(Boolean)
            : [],
        });
      })
      .catch(() => {
        /* optional detail — configure still works */
      });
  };

  const openModelGroup = (g: TargetModelGroup) => {
    setSelectedGroup(g);
    setSelectedProduct(null);
    setStorage(null);
    setSim(null);
    setRam(null);
    setColor(null);
    setProductDetail(null);
    const conditions = conditionsInGroup(g);
    if (conditions.length >= 2) {
      setPhase('condition');
      return;
    }
    const only = g.members[0];
    if (only) openConfigure(summaryFromConditionMember(only), g);
  };

  const selectCondition = (condition: string) => {
    if (!selectedGroup) return;
    const member =
      selectedGroup.members.find((m) => m.condition === condition) ??
      selectedGroup.members[0];
    if (!member) return;
    openConfigure(summaryFromConditionMember(member), selectedGroup);
  };

  const backFromConfigure = () => {
    if (selectedGroup && conditionsInGroup(selectedGroup).length >= 2) {
      setSelectedProduct(null);
      setStorage(null);
      setSim(null);
      setRam(null);
      setColor(null);
      setProductDetail(null);
      setPhase('condition');
      return;
    }
    setSelectedGroup(null);
    setSelectedProduct(null);
    setPhase('browse');
  };

  const backFromCondition = () => {
    setSelectedGroup(null);
    setSelectedProduct(null);
    setPhase('browse');
  };

  const lockTarget = (lock: TradeTargetLock) => {
    dispatch({ type: 'LOCK_TARGET', lock });
    void navigate({ to: '/trade/condition' });
  };

  const handleCashOnly = () => {
    lockTarget({
      productId: null,
      variantId: null,
      productName: null,
      storage: null,
      simType: null,
      color: null,
      ram: null,
      effectivePrice: null,
      displayImage: null,
      cashOnly: true,
    });
  };

  const buildLock = (): TradeTargetLock | null => {
    if (!selectedProduct) return null;
    const sku = selectedSku;
    return {
      productId: selectedProduct.productId,
      variantId: sku?.variant_id ?? null,
      productName: selectedProduct.name,
      storage: sku?.storage ?? storage,
      simType: sku?.sim_type ?? sim,
      color: sku?.color ?? color,
      ram: sku?.ram ?? ram,
      effectivePrice:
        sku != null
          ? Number(sku.effective_price) || 0
          : selectedProduct.priceFrom,
      displayImage: sku?.display_image ?? selectedProduct.image,
      cashOnly: false,
    };
  };

  const handleReview = () => {
    if (!canConfirm || !selectedProduct) {
      notify(TRADE_COPY.states.errorPricing, 'error');
      return;
    }
    setPhase('review');
  };

  const handleConfirmSku = () => {
    const lock = buildLock();
    if (!lock) {
      notify(TRADE_COPY.states.errorPricing, 'error');
      return;
    }
    lockTarget(lock);
  };

  const detailRows = useMemo(() => {
    if (!selectedProduct) return [];
    const rows: Array<{ label: string; value: string }> = [];
    if (selectedProduct.condition) {
      rows.push({
        label: TRADE_COPY.target.detailCondition,
        value: formatTargetConditionLabel(selectedProduct.condition),
      });
    }
    const stor = selectedSku?.storage ?? storage;
    const r = selectedSku?.ram ?? ram;
    const s = selectedSku?.sim_type ?? sim;
    const c = selectedSku?.color ?? color;
    if (stor) rows.push({ label: TRADE_COPY.target.detailStorage, value: stor });
    if (r) rows.push({ label: TRADE_COPY.target.detailRam, value: r });
    if (s && s !== 'single') {
      rows.push({ label: TRADE_COPY.target.detailSim, value: simVariantLabel(s) });
    }
    if (c) rows.push({ label: TRADE_COPY.target.detailColor, value: c });
    const price =
      selectedSku != null
        ? Number(selectedSku.effective_price) || 0
        : selectedProduct.priceFrom;
    if (price > 0) {
      rows.push({ label: TRADE_COPY.target.detailPrice, value: formatGhs(price) });
    }
    rows.push({
      label: TRADE_COPY.target.detailAvailability,
      value: inStockSelection
        ? TRADE_COPY.target.availabilityInStock
        : TRADE_COPY.target.availabilityPreference,
    });
    return rows;
  }, [
    selectedProduct,
    selectedSku,
    storage,
    ram,
    sim,
    color,
    inStockSelection,
  ]);

  if (!state.deviceLock) return null;

  if (loading) {
    return (
      <p className="text-center py-16 text-sm text-[color:var(--bb-muted)]">
        {TRADE_COPY.states.loading}
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center py-16 text-sm text-red-500" role="alert">
        {error}
      </p>
    );
  }

  // ── Review / confirm details ──
  if (phase === 'review' && selectedProduct) {
    return (
      <section aria-labelledby="trade-target-review-heading" className="space-y-6">
        <TradePhasePills active="upgrade" maxReachable="upgrade" />
        <PageBackButton
          isLight={isLight}
          label={TRADE_COPY.target.changeConfig}
          onClick={() => setPhase('configure')}
        />

        <div className="space-y-2">
          <h1
            id="trade-target-review-heading"
            className="text-2xl font-black tracking-tight"
          >
            {TRADE_COPY.target.reviewHeading}
          </h1>
          <p className={`text-sm ${isLight ? 'text-black/55' : 'text-white/50'}`}>
            {TRADE_COPY.target.reviewSubheading}
          </p>
        </div>

        <div
          className={`rounded-2xl border-2 overflow-hidden ${
            isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-white/[0.03]'
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-5 p-5 sm:p-6">
            <div
              className={`w-full sm:w-36 aspect-square rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${
                isLight ? 'bg-black/[0.04]' : 'bg-white/[0.06]'
              }`}
            >
              {previewImage ? (
                <img
                  src={previewImage}
                  alt=""
                  className="w-full h-full object-contain p-3"
                />
              ) : (
                <Smartphone size={40} className="text-[#CDA032]/60" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#CDA032]">
                  {TRADE_COPY.target.reviewDetails}
                </p>
                <h2 className="text-xl font-black mt-1">{selectedProduct.name}</h2>
                {selectionSummary && (
                  <p
                    className={`text-sm mt-1 ${
                      isLight ? 'text-black/55' : 'text-white/50'
                    }`}
                  >
                    {selectionSummary}
                  </p>
                )}
              </div>

              <dl className="space-y-2.5">
                {detailRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-4 text-sm border-b border-[color:var(--bb-border)]/60 pb-2 last:border-0"
                  >
                    <dt
                      className={`font-medium ${
                        isLight ? 'text-black/45' : 'text-white/40'
                      }`}
                    >
                      {row.label}
                    </dt>
                    <dd className="font-bold text-right tabular-nums">{row.value}</dd>
                  </div>
                ))}
              </dl>

              {!inStockSelection && (
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  {TRADE_COPY.target.preferenceNote}
                </p>
              )}
            </div>
          </div>

          {(productDetail?.description || (productDetail?.specs?.length ?? 0) > 0) && (
            <div
              className={`px-5 sm:px-6 py-4 border-t space-y-3 ${
                isLight ? 'border-black/8 bg-black/[0.02]' : 'border-white/8 bg-white/[0.02]'
              }`}
            >
              {productDetail?.description ? (
                <p
                  className={`text-sm leading-relaxed ${
                    isLight ? 'text-black/60' : 'text-white/55'
                  }`}
                >
                  {productDetail.description.length > 280
                    ? `${productDetail.description.slice(0, 280).trim()}…`
                    : productDetail.description}
                </p>
              ) : null}
              {productDetail && productDetail.specs.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {productDetail.specs.slice(0, 8).map((spec) => (
                    <li
                      key={spec}
                      className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 ${
                        isLight
                          ? 'bg-black/[0.05] text-black/65'
                          : 'bg-white/[0.06] text-white/60'
                      }`}
                    >
                      {spec}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setPhase('configure')}
            className={`w-full sm:w-auto rounded-xl border-2 font-black uppercase tracking-[0.15em] text-xs px-6 py-4 ${
              isLight
                ? 'border-black/15 hover:border-[#CDA032]/50'
                : 'border-white/15 hover:border-[#CDA032]/50'
            }`}
          >
            {TRADE_COPY.target.changeConfig}
          </button>
          <button
            type="button"
            onClick={handleConfirmSku}
            className="w-full sm:flex-1 sm:max-w-sm rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-4 hover:brightness-105 transition-all"
          >
            {TRADE_COPY.target.confirmUpgrade}
          </button>
        </div>
      </section>
    );
  }

  // ── New / Pre-owned (only when model group has 2+ conditions) ──
  if (phase === 'condition' && selectedGroup && groupNeedsConditionPick) {
    return (
      <section aria-labelledby="trade-target-condition-heading" className="space-y-6">
        <TradePhasePills active="upgrade" maxReachable="upgrade" />
        <PageBackButton
          isLight={isLight}
          label={TRADE_COPY.back}
          onClick={backFromCondition}
        />

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div
            className={`w-full sm:w-40 aspect-square rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${
              isLight ? 'bg-black/[0.04]' : 'bg-white/[0.06]'
            }`}
          >
            {selectedGroup.image ? (
              <img
                src={selectedGroup.image}
                alt=""
                className="w-full h-full object-contain p-3"
              />
            ) : (
              <Smartphone size={40} className="text-[#CDA032]/60" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h1
              id="trade-target-condition-heading"
              className="text-xl sm:text-2xl font-black tracking-tight"
            >
              {selectedGroup.name}
            </h1>
            <p className={`text-sm ${isLight ? 'text-black/55' : 'text-white/50'}`}>
              {TRADE_COPY.target.askConditionHint}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
            {TRADE_COPY.target.askCondition}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groupConditions.map((cond) => {
              const member = selectedGroup.members.find((m) => m.condition === cond);
              if (!member) return null;
              const inStock = productHasStock.has(member.productId);
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() => selectCondition(cond)}
                  className={`flex flex-col items-start rounded-2xl border-2 p-4 sm:p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
                    isLight
                      ? 'border-black/10 bg-white hover:border-[#CDA032]/40'
                      : 'border-white/10 bg-white/[0.03] hover:border-[#CDA032]/40'
                  }`}
                >
                  <span className="text-sm font-black uppercase tracking-widest text-[#CDA032]">
                    {formatTargetConditionLabel(cond)}
                  </span>
                  <span className="mt-2 text-sm font-bold leading-snug">{member.name}</span>
                  <span className="mt-1.5 text-[11px] font-black tabular-nums text-[#CDA032]">
                    from {formatGhs(member.priceFrom)}
                  </span>
                  {!inStock && (
                    <span className="mt-1 text-[8px] font-black uppercase tracking-wider text-amber-500/90">
                      {TRADE_COPY.target.availabilityPreference}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ── Configure SKU phase ──
  if (phase === 'configure' && selectedProduct) {
    return (
      <section aria-labelledby="trade-target-config-heading" className="space-y-6">
        <TradePhasePills active="upgrade" maxReachable="upgrade" />
        <PageBackButton
          isLight={isLight}
          label={
            groupNeedsConditionPick
              ? TRADE_COPY.target.changeCondition
              : TRADE_COPY.back
          }
          onClick={backFromConfigure}
        />

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div
            className={`w-full sm:w-40 aspect-square rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${
              isLight ? 'bg-black/[0.04]' : 'bg-white/[0.06]'
            }`}
          >
            {previewImage ? (
              <img
                src={previewImage}
                alt=""
                className="w-full h-full object-contain p-3"
              />
            ) : (
              <Smartphone size={40} className="text-[#CDA032]/60" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1
              id="trade-target-config-heading"
              className="text-xl sm:text-2xl font-black tracking-tight"
            >
              {selectedProduct.name}
            </h1>
            {selectedProduct.condition ? (
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#CDA032]">
                {formatTargetConditionLabel(selectedProduct.condition)}
              </p>
            ) : null}
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#CDA032] mt-1">
              {TRADE_COPY.target.configureSku}
            </p>
            <p
              className={`mt-2 text-sm ${
                isLight ? 'text-black/50' : 'text-white/45'
              }`}
            >
              {TRADE_COPY.target.configureHint}
            </p>
            {selectionSummary && (
              <p className="mt-3 text-sm font-bold">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] block mb-1">
                  {TRADE_COPY.target.yourSelection}
                </span>
                {selectedProduct.name}
                {selectionSummary ? ` · ${selectionSummary}` : ''}
              </p>
            )}
            {/* DISPLAY-ONLY price — server re-derives on submit */}
            {selectedSku && (
              <p className="mt-3 text-2xl font-black tabular-nums text-[#CDA032]">
                {formatGhs(Number(selectedSku.effective_price) || 0)}
              </p>
            )}
            {selectedSku && !inStockSelection && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                {TRADE_COPY.target.preferenceNote}
              </p>
            )}
          </div>
        </div>

        {storageOptions.length === 0 &&
          simOptions.length === 0 &&
          productRows.every((r) => !r.storage && !r.sim_type) && (
            <p className={`text-sm ${isLight ? 'text-black/50' : 'text-white/45'}`}>
              {TRADE_COPY.target.noConfigOptions}
            </p>
          )}

        {/* Storage */}
        {storageOptions.length > 0 && (
          <fieldset>
            <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
              {TRADE_COPY.target.askStorage}
            </legend>
            <div className="flex flex-wrap gap-2">
              {storageOptions.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setStorage(tier);
                    setSim(null);
                    setRam(null);
                    setColor(null);
                  }}
                  className={chipClass(storage === tier)}
                >
                  {tier}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* SIM — Physical vs eSIM when both exist */}
        {storageResolved && simOptions.length > 0 && (
          <fieldset>
            <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
              {TRADE_COPY.target.askSim}
            </legend>
            <div className="flex flex-wrap gap-2">
              {simOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSim(s);
                    setRam(null);
                    setColor(null);
                  }}
                  className={chipClass(sim === s)}
                >
                  {simVariantLabel(s)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* RAM */}
        {storageResolved && simResolved && showRamPicker && (
          <fieldset>
            <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
              {TRADE_COPY.target.askRam}
            </legend>
            <div className="flex flex-wrap gap-2">
              {ramOptions.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setRam(tier);
                    setColor(null);
                  }}
                  className={chipClass(ram === tier)}
                >
                  {tier}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* Colour */}
        {storageResolved && simResolved && ramResolved && (
          <fieldset>
            <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
              {TRADE_COPY.target.askColor}
            </legend>
            {colorOptions.length === 0 ? (
              <p className={`text-sm ${isLight ? 'text-black/45' : 'text-white/40'}`}>
                {storage || sim
                  ? TRADE_COPY.target.preferenceNote
                  : TRADE_COPY.target.noStockInCategory}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((row) => {
                  const name = row.color ?? 'Standard';
                  const stocked = (row.variant_stock ?? 0) > 0;
                  const selected =
                    color === row.color ||
                    (colorOptions.length === 1 && selectedSku?.variant_id === row.variant_id);
                  return (
                    <button
                      key={row.variant_id ?? `${name}-${row.ram ?? ''}-${row.storage ?? ''}`}
                      type="button"
                      onClick={() => setColor(row.color)}
                      className={`inline-flex items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
                        selected
                          ? 'border-[#CDA032] bg-[#CDA032]/15'
                          : isLight
                            ? 'border-black/10 bg-white hover:border-[#CDA032]/40'
                            : 'border-white/10 bg-white/[0.03] hover:border-[#CDA032]/40'
                      }`}
                    >
                      {name}
                      <span className="text-[10px] font-black text-[#CDA032] tabular-nums">
                        {formatGhs(Number(row.effective_price) || 0)}
                      </span>
                      {!stocked && (
                        <span className="text-[9px] font-black uppercase tracking-wider opacity-50">
                          {TRADE_COPY.target.outOfStock}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}

        <button
          type="button"
          disabled={!canConfirm}
          onClick={handleReview}
          className="w-full sm:w-auto min-w-[12rem] rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-4 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 transition-all"
        >
          {TRADE_COPY.target.reviewUpgrade}
        </button>
      </section>
    );
  }

  // ── Browse phase ──
  return (
    <section aria-labelledby="trade-target-heading" className="space-y-4">
      <TradePhasePills active="upgrade" maxReachable="upgrade" />

      <div className="space-y-1">
        <h2
          id="trade-target-heading"
          className="text-xl sm:text-2xl font-bold tracking-tight"
        >
          {TRADE_COPY.target.heading}
        </h2>
        <p className={`text-xs sm:text-sm ${isLight ? 'text-black/55' : 'text-white/50'}`}>
          {TRADE_COPY.target.subheading}
          {state.deviceLock ? (
            <span className={isLight ? ' text-black/40' : ' text-white/35'}>
              {' '}
              · Trading in {state.deviceLock.model}
              {state.deviceLock.storage ? ` ${state.deviceLock.storage}` : ''}
            </span>
          ) : null}
        </p>
      </div>

      {/* Sticky filters — stay visible while scrolling the phone list */}
      <div
        className={`sticky top-0 z-20 -mx-1 px-1 py-2 space-y-2 backdrop-blur-md ${
          isLight ? 'bg-[color:var(--bb-bg)]/90' : 'bg-[color:var(--bb-bg)]/90'
        }`}
      >
        <div className="flex gap-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search upgrade devices</span>
            <Search
              size={15}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
                isLight ? 'text-black/35' : 'text-white/35'
              }`}
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search model…"
              autoComplete="off"
              enterKeyHint="search"
              className={`w-full rounded-xl border pl-9 pr-9 py-2.5 text-sm font-medium outline-none transition-colors focus:border-[#CDA032]/60 focus-visible:ring-2 focus-visible:ring-[#CDA032]/35 ${
                isLight
                  ? 'border-black/10 bg-white text-black placeholder:text-black/35'
                  : 'border-white/10 bg-white/[0.04] text-white placeholder:text-white/35'
              }`}
            />
            {searchQuery.trim() ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors ${
                  isLight
                    ? 'text-black/40 hover:bg-black/5 hover:text-black'
                    : 'text-white/40 hover:bg-white/10 hover:text-white'
                }`}
                aria-label="Clear search"
              >
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </label>

          <button
            type="button"
            onClick={handleCashOnly}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
              state.targetLock?.cashOnly
                ? 'border-[#CDA032] bg-[#CDA032]/15 text-[#CDA032]'
                : isLight
                  ? 'border-black/10 bg-white text-black/70 hover:border-[#CDA032]/40'
                  : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-[#CDA032]/40'
            }`}
            title={TRADE_COPY.target.cashOnlyHint}
          >
            <Banknote size={14} aria-hidden />
            Cash
          </button>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto bb-scrollbar pb-0.5 -mx-0.5 px-0.5">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={filterChipClass(categoryFilter === null)}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={filterChipClass(categoryFilter === cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {modelGroups.length === 0 ? (
        <div className="text-center py-10 space-y-2 px-4">
          <p className="text-sm text-[color:var(--bb-muted)]">
            {searchQuery.trim()
              ? `No upgrades match “${searchQuery.trim()}”.`
              : TRADE_COPY.states.emptyTargets}
          </p>
          {searchQuery.trim() ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-[#CDA032] underline"
            >
              Clear search
            </button>
          ) : (
            <p className="text-xs text-[color:var(--bb-muted)] max-w-md mx-auto leading-relaxed">
              Ask staff to link shop phones for trade-in upgrades, or choose Cash above.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032]">
              {TRADE_COPY.target.pickModel}
            </p>
            <p className={`text-[11px] tabular-nums ${isLight ? 'text-black/45' : 'text-white/40'}`}>
              {modelGroups.length === 1 ? '1 phone' : `${modelGroups.length} phones`}
              {searchQuery.trim() || categoryFilter ? ' match' : ''}
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
            {targetPaging.pageItems.map((g) => {
              const selected =
                state.targetLock &&
                !state.targetLock.cashOnly &&
                Boolean(
                  state.targetLock.productId &&
                    g.members.some((m) => m.productId === state.targetLock?.productId),
                );
              const inStock = groupHasStock(g);
              const conditions = conditionsInGroup(g);
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => openModelGroup(g)}
                  className={`flex flex-col items-stretch rounded-xl border p-2 sm:p-2.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
                    selected
                      ? 'border-[#CDA032] bg-[#CDA032]/10'
                      : isLight
                        ? 'border-black/10 bg-white hover:border-[#CDA032]/40'
                        : 'border-white/10 bg-white/[0.03] hover:border-[#CDA032]/40'
                  }`}
                >
                  <div
                    className={`w-full aspect-square rounded-lg mb-1.5 flex items-center justify-center overflow-hidden ${
                      isLight ? 'bg-black/[0.04]' : 'bg-white/[0.06]'
                    }`}
                  >
                    {g.image ? (
                      <img
                        src={g.image}
                        alt=""
                        className="w-full h-full object-contain p-1.5"
                        loading="lazy"
                      />
                    ) : (
                      <Smartphone size={22} className="text-[#CDA032]/60" aria-hidden />
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold leading-snug line-clamp-2 min-h-[2.4em]">
                    {g.name}
                  </span>
                  <span className="mt-1 text-[10px] sm:text-[11px] font-black tabular-nums text-[#CDA032]">
                    from {formatGhs(g.priceFrom)}
                  </span>
                  {conditions.length >= 2 ? (
                    <span
                      className={`mt-0.5 text-[8px] font-black uppercase tracking-wider ${
                        isLight ? 'text-black/45' : 'text-white/40'
                      }`}
                    >
                      New · Pre-owned
                    </span>
                  ) : !inStock ? (
                    <span className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-amber-500/90">
                      {TRADE_COPY.target.availabilityPreference}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {targetPaging.pageCount > 1 ? (
            <Pagination
              page={targetPaging.page}
              pageCount={targetPaging.pageCount}
              onPageChange={targetPaging.setPage}
              total={targetPaging.total}
              pageSize={36}
              isLight={isLight}
            />
          ) : null}
        </>
      )}

      {state.targetLock && !state.targetLock.cashOnly && (
        <p
          className={`text-center text-xs ${
            isLight ? 'text-black/45' : 'text-white/40'
          }`}
        >
          {TRADE_COPY.target.selectedLabel}: {state.targetLock.productName}
          {state.targetLock.storage ? ` · ${state.targetLock.storage}` : ''}
          {state.targetLock.ram ? ` · ${state.targetLock.ram}` : ''}
          {state.targetLock.simType && state.targetLock.simType !== 'single'
            ? ` · ${simVariantLabel(state.targetLock.simType)}`
            : ''}
          {state.targetLock.color ? ` · ${state.targetLock.color}` : ''}
          {' · '}
          {formatGhs(state.targetLock.effectivePrice ?? 0)}
        </p>
      )}
    </section>
  );
}
