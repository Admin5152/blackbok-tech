/**
 * Trade Admin pricing — editable base values + fault deductions grids.
 *
 * Staff keep each phone’s offer market-current with **fixed GHS amounts**
 * (not percentages):
 * - Base values: model × storage × SIM — the trade-in base in GHS
 * - Deductions: model × fault (screen, battery, …) — flat GHS off the base
 *
 * Deep links: /admin/trade/pricing?model=iPhone%2015%20Pro&tab=deductions
 * Filters: type, model, storage, SIM, active, free-text.
 * Invalidates tradePricingStore on save so the live ticker reflects edits.
 *
 * TODO(D1a): iPhone 15 1TB seed (4650) stays inactive until client confirms —
 * activate the base_value row here when approved (no code deploy).
 * TODO(iPad-prices): same pattern for iPad base rows.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Plus, Copy, ArrowRightLeft, Trash2, Filter, X } from 'lucide-react';
import {
  cloneBaseValueForSim,
  copyDeductionsFromModel,
  createBaseValue,
  createDeduction,
  deleteBaseValue,
  deleteDeduction,
  getAdminBaseValues,
  getAdminDeductions,
  getAdminDevices,
  seedDefaultDeductionsForModel,
  tradeAdminErrorMessage,
  updateBaseValue,
  updateDeduction,
} from '../../../lib/tradeAdminApi';
import { formatGhs } from '../../../lib/money';
import { simVariantLabel } from '../../../lib/tradeCopy';
import { TRADE_COMPONENT_KEYS } from '../../../lib/tradeComponentKeys';
import { normalizeTradeModelKey } from '../../../data/tradeInPrices';
import type {
  TradeBaseValueRow,
  TradeDeviceRow,
  TradeDeviceType,
  TradeFaultDeductionRow,
} from '../../../types/supabase';
import { useAppContext } from '../../../lib/appContext';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';

type Tab = 'bases' | 'deductions';
type DeviceTypeFilter = '' | TradeDeviceType;
type ActiveFilter = '' | 'active' | 'inactive';
type PendingDelete =
  | { kind: 'base'; row: TradeBaseValueRow }
  | { kind: 'deduction'; row: TradeFaultDeductionRow };

/** Allowed sim_variant codes for trade_base_values (matches product_variants.sim_type). */
const SIM_OPTIONS = ['ps', 'es', 'single', 'wifi', 'cell_ps', 'cell_es'] as const;

const COMMON_STORAGE_TIERS = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'] as const;

const STORAGE_ORDER: Record<string, number> = {
  '64GB': 1,
  '128GB': 2,
  '256GB': 3,
  '512GB': 4,
  '1TB': 5,
  '2TB': 6,
};

const FAULT_LABELS: Record<string, string> = {
  screen: 'Screen',
  battery: 'Battery',
  backglass: 'Back glass',
  charging: 'Charging',
  front_camera: 'Front camera',
  back_camera: 'Back camera',
  face_id: 'Face ID / Touch ID',
};

function sortStorageTiers(tiers: string[]): string[] {
  return [...tiers].sort(
    (a, b) => (STORAGE_ORDER[a] ?? 99) - (STORAGE_ORDER[b] ?? 99) || a.localeCompare(b),
  );
}

function inferDeviceType(model: string): TradeDeviceType {
  return model.toLowerCase().includes('ipad') ? 'ipad' : 'iphone';
}

function modelsEqual(a: string, b: string): boolean {
  return normalizeTradeModelKey(a).toLowerCase() === normalizeTradeModelKey(b).toLowerCase();
}

function storageEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export const TradeAdminPricing: React.FC = () => {
  const { notify, theme } = useAppContext();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    model?: string;
    tab?: Tab;
    type?: string;
    storage?: string;
    sim?: string;
    active?: string;
  };

  const initialType: DeviceTypeFilter =
    search.type === 'iphone' || search.type === 'ipad' ? search.type : '';
  const initialActive: ActiveFilter =
    search.active === 'active' || search.active === 'inactive' ? search.active : '';

  const [tab, setTab] = useState<Tab>(search.tab === 'deductions' ? 'deductions' : 'bases');
  const [bases, setBases] = useState<TradeBaseValueRow[]>([]);
  const [deducs, setDeducs] = useState<TradeFaultDeductionRow[]>([]);
  const [devices, setDevices] = useState<TradeDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusModel, setFocusModel] = useState(search.model ?? '');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<DeviceTypeFilter>(initialType);
  const [storageFilter, setStorageFilter] = useState(search.storage ?? '');
  const [simFilter, setSimFilter] = useState(search.sim ?? '');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(initialActive);
  const [q, setQ] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newModel, setNewModel] = useState(search.model ?? '');
  const [newStorage, setNewStorage] = useState('128GB');
  const [newStorageCustom, setNewStorageCustom] = useState(false);
  const [newSim, setNewSim] = useState<string>('ps');
  const [newBase, setNewBase] = useState('');
  const [adding, setAdding] = useState(false);

  const [dedModel, setDedModel] = useState(search.model ?? '');
  const [dedCode, setDedCode] = useState<string>(TRADE_COMPONENT_KEYS[0] || 'screen');
  const [dedAmount, setDedAmount] = useState('');
  const [addingDed, setAddingDed] = useState(false);

  const [copyFrom, setCopyFrom] = useState('');
  const [copyOverwrite, setCopyOverwrite] = useState(true);
  const [copying, setCopying] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);

  const field = isLight
    ? 'bg-white border-black/15 text-black placeholder:text-black/35 focus:border-[#B38B21]/50 focus:outline-none'
    : 'bg-black/50 border-white/10 text-white placeholder:text-white/30 focus:border-[#B38B21]/50 focus:outline-none';
  const panel = isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-black/30';
  const muted = isLight ? 'text-black/50' : 'text-white/45';
  const title = isLight ? 'text-black' : 'text-white';
  const chipActive = 'bg-[#B38B21] text-black border-[#B38B21]';
  const chipIdle = isLight
    ? 'bg-black/[0.04] text-black/60 border-black/15 hover:bg-black/[0.08]'
    : 'bg-white/5 text-white/45 border-white/10 hover:bg-white/10 hover:text-white/70';

  const syncSearch = useCallback(
    (next: {
      model?: string;
      tab?: Tab;
      type?: DeviceTypeFilter;
      storage?: string;
      sim?: string;
      active?: ActiveFilter;
    }) => {
      void navigate({
        to: '/admin/trade/pricing',
        search: {
          model: next.model || undefined,
          tab: next.tab && next.tab !== 'bases' ? next.tab : undefined,
          type: next.type || undefined,
          storage: next.storage || undefined,
          sim: next.sim || undefined,
          active: next.active || undefined,
        } as never,
        replace: true,
      });
    },
    [navigate],
  );

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [b, d, dev] = await Promise.all([
        getAdminBaseValues(true),
        getAdminDeductions(true),
        getAdminDevices(true),
      ]);
      setBases(b);
      setDeducs(d);
      setDevices(dev);
    } catch (e) {
      setError(tradeAdminErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (search.model) {
      setFocusModel(search.model);
      setNewModel(search.model);
      setDedModel(search.model);
    }
    if (search.tab === 'deductions' || search.tab === 'bases') {
      setTab(search.tab);
    }
    if (search.type === 'iphone' || search.type === 'ipad') {
      setDeviceTypeFilter(search.type);
    } else if (search.type === undefined) {
      // keep local if URL cleared intentionally via our sync
    }
    if (typeof search.storage === 'string') setStorageFilter(search.storage);
    if (typeof search.sim === 'string') setSimFilter(search.sim);
    if (search.active === 'active' || search.active === 'inactive') {
      setActiveFilter(search.active);
    }
  }, [search.model, search.tab, search.type, search.storage, search.sim, search.active]);

  const deviceTypeByModel = useMemo(() => {
    const map = new Map<string, TradeDeviceType>();
    for (const d of devices) {
      map.set(normalizeTradeModelKey(d.model).toLowerCase(), d.device_type);
    }
    return map;
  }, [devices]);

  const resolveDeviceType = useCallback(
    (model: string): TradeDeviceType => {
      const key = normalizeTradeModelKey(model).toLowerCase();
      return deviceTypeByModel.get(key) ?? inferDeviceType(model);
    },
    [deviceTypeByModel],
  );

  const modelMatchesType = useCallback(
    (model: string, type: DeviceTypeFilter) => {
      if (!type) return true;
      return resolveDeviceType(model) === type;
    },
    [resolveDeviceType],
  );

  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of devices) set.add(d.model);
    for (const r of bases) set.add(r.model);
    for (const r of deducs) set.add(r.model);
    return [...set]
      .filter((m) => modelMatchesType(m, deviceTypeFilter))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [devices, bases, deducs, deviceTypeFilter, modelMatchesType]);

  const allModelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of devices) set.add(d.model);
    for (const r of bases) set.add(r.model);
    for (const r of deducs) set.add(r.model);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [devices, bases, deducs]);

  const storageOptions = useMemo(() => {
    const set = new Set<string>(COMMON_STORAGE_TIERS);
    for (const r of bases) {
      if (deviceTypeFilter && !modelMatchesType(r.model, deviceTypeFilter)) continue;
      if (focusModel && !modelsEqual(r.model, focusModel)) continue;
      if (r.storage?.trim()) set.add(r.storage.trim());
    }
    return sortStorageTiers([...set]);
  }, [bases, deviceTypeFilter, focusModel, modelMatchesType]);

  const simOptionsInData = useMemo(() => {
    const set = new Set<string>();
    for (const r of bases) {
      if (deviceTypeFilter && !modelMatchesType(r.model, deviceTypeFilter)) continue;
      if (focusModel && !modelsEqual(r.model, focusModel)) continue;
      if (storageFilter && !storageEqual(r.storage, storageFilter)) continue;
      if (r.sim_variant) set.add(r.sim_variant);
    }
    const ordered = SIM_OPTIONS.filter((s) => set.has(s));
    for (const s of set) {
      if (!ordered.includes(s as (typeof SIM_OPTIONS)[number])) ordered.push(s as (typeof SIM_OPTIONS)[number]);
    }
    return ordered.length > 0 ? ordered : [...SIM_OPTIONS];
  }, [bases, deviceTypeFilter, focusModel, storageFilter, modelMatchesType]);

  const activeDeviceModels = useMemo(
    () => devices.filter((d) => d.is_active).map((d) => d.model).sort(),
    [devices],
  );

  const marketModel = focusModel || newModel || dedModel;

  const ql = q.trim().toLowerCase();

  const filteredBases = useMemo(
    () =>
      bases
        .filter((r) => {
          if (deviceTypeFilter && !modelMatchesType(r.model, deviceTypeFilter)) return false;
          if (focusModel && !modelsEqual(r.model, focusModel)) return false;
          if (storageFilter && !storageEqual(r.storage, storageFilter)) return false;
          if (simFilter && String(r.sim_variant).toLowerCase() !== simFilter.toLowerCase()) {
            return false;
          }
          if (activeFilter === 'active' && !r.is_active) return false;
          if (activeFilter === 'inactive' && r.is_active) return false;
          if (
            ql &&
            !r.model.toLowerCase().includes(ql) &&
            !r.storage.toLowerCase().includes(ql) &&
            !String(r.sim_variant).toLowerCase().includes(ql) &&
            !simVariantLabel(r.sim_variant).toLowerCase().includes(ql)
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          const m = a.model.localeCompare(b.model, undefined, { numeric: true });
          if (m !== 0) return m;
          const s =
            (STORAGE_ORDER[a.storage] ?? 99) - (STORAGE_ORDER[b.storage] ?? 99) ||
            a.storage.localeCompare(b.storage);
          if (s !== 0) return s;
          return String(a.sim_variant).localeCompare(String(b.sim_variant));
        }),
    [bases, deviceTypeFilter, focusModel, storageFilter, simFilter, activeFilter, ql, modelMatchesType],
  );

  const filteredDeducs = useMemo(
    () =>
      deducs
        .filter((r) => {
          if (deviceTypeFilter && !modelMatchesType(r.model, deviceTypeFilter)) return false;
          if (focusModel && !modelsEqual(r.model, focusModel)) return false;
          if (activeFilter === 'active' && !r.is_active) return false;
          if (activeFilter === 'inactive' && r.is_active) return false;
          if (
            ql &&
            !r.model.toLowerCase().includes(ql) &&
            !r.fault_code.toLowerCase().includes(ql) &&
            !r.fault_label.toLowerCase().includes(ql)
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          const m = a.model.localeCompare(b.model, undefined, { numeric: true });
          if (m !== 0) return m;
          return (a.fault_label || a.fault_code).localeCompare(b.fault_label || b.fault_code);
        }),
    [deducs, deviceTypeFilter, focusModel, activeFilter, ql, modelMatchesType],
  );

  /** Models that have Physical SIM priced but no eSIM (or vice versa) for the same storage. */
  const simCoverageHints = useMemo(() => {
    const byKey = new Map<string, Set<string>>();
    for (const r of bases) {
      if (!r.is_active) continue;
      if (deviceTypeFilter && !modelMatchesType(r.model, deviceTypeFilter)) continue;
      if (focusModel && !modelsEqual(r.model, focusModel)) continue;
      if (storageFilter && !storageEqual(r.storage, storageFilter)) continue;
      const k = `${r.model}||${r.storage}`;
      const set = byKey.get(k) ?? new Set<string>();
      set.add(String(r.sim_variant || '').toLowerCase());
      byKey.set(k, set);
    }
    const hints: string[] = [];
    for (const [k, sims] of byKey) {
      const [model, storage] = k.split('||');
      const hasPs = sims.has('ps') || sims.has('single') || sims.has('cell_ps');
      const hasEs = sims.has('es') || sims.has('cell_es');
      if (hasPs && !hasEs) {
        hints.push(`${model} ${storage}: Physical SIM priced, no eSIM row`);
      } else if (hasEs && !hasPs) {
        hints.push(`${model} ${storage}: eSIM priced, no Physical SIM row`);
      }
    }
    return hints.slice(0, 8);
  }, [bases, focusModel, deviceTypeFilter, storageFilter, modelMatchesType]);

  const filtersActive = Boolean(
    deviceTypeFilter || focusModel || storageFilter || simFilter || activeFilter || q.trim(),
  );

  const pushFilters = (patch: {
    model?: string;
    tab?: Tab;
    type?: DeviceTypeFilter;
    storage?: string;
    sim?: string;
    active?: ActiveFilter;
  }) => {
    syncSearch({
      model: patch.model !== undefined ? patch.model : focusModel,
      tab: patch.tab !== undefined ? patch.tab : tab,
      type: patch.type !== undefined ? patch.type : deviceTypeFilter,
      storage: patch.storage !== undefined ? patch.storage : storageFilter,
      sim: patch.sim !== undefined ? patch.sim : simFilter,
      active: patch.active !== undefined ? patch.active : activeFilter,
    });
  };

  const selectTab = (id: Tab) => {
    setTab(id);
    pushFilters({ tab: id });
  };

  const selectDeviceType = (type: DeviceTypeFilter) => {
    setDeviceTypeFilter(type);
    let nextModel = focusModel;
    if (focusModel && type && !modelMatchesType(focusModel, type)) {
      nextModel = '';
      setFocusModel('');
    }
    setStorageFilter('');
    setSimFilter('');
    pushFilters({ type, model: nextModel, storage: '', sim: '' });
  };

  const selectFocusModel = (model: string) => {
    setFocusModel(model);
    if (model) {
      setNewModel(model);
      setDedModel(model);
      const t = resolveDeviceType(model);
      if (deviceTypeFilter && deviceTypeFilter !== t) {
        setDeviceTypeFilter(t);
      }
    }
    setStorageFilter('');
    setSimFilter('');
    pushFilters({
      model,
      storage: '',
      sim: '',
      type: model ? resolveDeviceType(model) : deviceTypeFilter,
    });
  };

  const selectStorage = (storage: string) => {
    setStorageFilter(storage);
    setSimFilter('');
    pushFilters({ storage, sim: '' });
  };

  const selectSim = (sim: string) => {
    setSimFilter(sim);
    pushFilters({ sim });
  };

  const selectActive = (active: ActiveFilter) => {
    setActiveFilter(active);
    pushFilters({ active });
  };

  const clearFilters = () => {
    setDeviceTypeFilter('');
    setFocusModel('');
    setStorageFilter('');
    setSimFilter('');
    setActiveFilter('');
    setQ('');
    syncSearch({ tab, model: '', type: '', storage: '', sim: '', active: '' });
  };

  const saveBase = async (
    id: string,
    patch: { base_value?: number; is_active?: boolean; sim_variant?: string },
  ) => {
    setSavingId(id);
    try {
      const row = await updateBaseValue(id, patch);
      setBases((prev) => prev.map((r) => (r.id === id ? row : r)));
      notify?.('Base value saved (GHS). Customer offer uses this figure.', 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
      await reload();
    } finally {
      setSavingId(null);
    }
  };

  const saveDeduc = async (id: string, patch: { deduction?: number; is_active?: boolean }) => {
    setSavingId(id);
    try {
      const row = await updateDeduction(id, patch);
      setDeducs((prev) => prev.map((r) => (r.id === id ? row : r)));
      notify?.('Deduction saved (fixed GHS). Quiz estimates update immediately.', 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setSavingId(null);
    }
  };

  const addBaseRow = async () => {
    if (!newModel.trim() || !newStorage.trim()) {
      notify?.('Model and storage are required.', 'error');
      return;
    }
    if (!devices.some((d) => modelsEqual(d.model, newModel.trim()))) {
      notify?.(
        'Add this model on the Devices tab first, then set pricing here.',
        'error',
      );
      return;
    }
    const n = Number(newBase);
    if (!Number.isFinite(n) || n < 0) {
      notify?.('Enter a valid base value (GHS).', 'error');
      return;
    }
    setAdding(true);
    try {
      const row = await createBaseValue({
        model: newModel.trim(),
        storage: newStorage.trim(),
        sim_variant: newSim,
        base_value: n,
      });
      await seedDefaultDeductionsForModel(row.model);
      await reload();
      setNewBase('');
      selectFocusModel(row.model);
      notify?.(
        `Added ${row.model} ${row.storage} ${simVariantLabel(row.sim_variant)}. Customers see it when the device is Listed.`,
        'success',
      );
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setAdding(false);
    }
  };

  const cloneAsSim = async (src: TradeBaseValueRow, sim: string) => {
    if (src.sim_variant === sim) return;
    const exists = bases.some(
      (r) =>
        modelsEqual(r.model, src.model) &&
        storageEqual(r.storage, src.storage) &&
        r.sim_variant === sim,
    );
    if (exists) {
      notify?.(`That ${simVariantLabel(sim)} row already exists.`, 'error');
      return;
    }
    setSavingId(src.id);
    try {
      const row = await cloneBaseValueForSim(src.id, sim);
      setBases((prev) => [...prev, row].sort((a, b) => a.model.localeCompare(b.model)));
      notify?.(`Cloned as ${simVariantLabel(sim)}.`, 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setSavingId(null);
    }
  };

  const removeBase = (row: TradeBaseValueRow) => {
    setPendingDelete({ kind: 'base', row });
  };

  const removeDeduction = (row: TradeFaultDeductionRow) => {
    setPendingDelete({ kind: 'deduction', row });
  };

  const confirmPendingDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === 'base') {
        const row = pendingDelete.row;
        const label = `${row.model} ${row.storage} ${simVariantLabel(row.sim_variant)}`;
        await deleteBaseValue(row.id);
        setBases((prev) => prev.filter((r) => r.id !== row.id));
        notify?.(`Deleted ${label}.`, 'success');
      } else {
        const row = pendingDelete.row;
        const label = `${row.model} · ${row.fault_label || row.fault_code}`;
        await deleteDeduction(row.id);
        setDeducs((prev) => prev.filter((r) => r.id !== row.id));
        notify?.(`Deleted ${label}.`, 'success');
      }
      setPendingDelete(null);
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const addDeductionRow = async () => {
    if (!dedModel.trim()) {
      notify?.('Pick a model.', 'error');
      return;
    }
    const n = Number(dedAmount);
    if (!Number.isFinite(n) || n < 0) {
      notify?.('Enter a valid deduction amount.', 'error');
      return;
    }
    setAddingDed(true);
    try {
      const row = await createDeduction({
        model: dedModel.trim(),
        fault_code: dedCode,
        fault_label: FAULT_LABELS[dedCode] || dedCode,
        deduction: n,
      });
      setDeducs((prev) => [...prev, row]);
      setDedAmount('');
      notify?.('Deduction row added.', 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setAddingDed(false);
    }
  };

  const runCopyDeductions = async () => {
    if (!copyFrom.trim() || !marketModel.trim()) {
      notify?.('Pick source and target models.', 'warning');
      return;
    }
    setCopying(true);
    try {
      const result = await copyDeductionsFromModel({
        sourceModel: copyFrom,
        targetModel: marketModel,
        overwrite: copyOverwrite,
      });
      await reload();
      setTab('deductions');
      setFocusModel(marketModel);
      setDedModel(marketModel);
      pushFilters({ model: marketModel, tab: 'deductions' });
      notify?.(
        `Copied GHS amounts from ${copyFrom}: ${result.inserted} new, ${result.updated} updated. Edit any figure as needed.`,
        'success',
      );
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return (
      <div className={`text-center py-16 text-sm ${muted}`}>Loading pricing…</div>
    );
  }
  if (error) {
    return (
      <div
        className={`rounded-xl border p-4 text-sm ${
          isLight
            ? 'border-red-500/40 bg-red-50 text-red-700'
            : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}
      >
        {error}
      </div>
    );
  }

  const resultCount = tab === 'bases' ? filteredBases.length : filteredDeducs.length;
  const totalCount = tab === 'bases' ? bases.length : deducs.length;

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border p-3 text-[11px] leading-relaxed ${
          isLight
            ? 'border-[#B38B21]/30 bg-[#B38B21]/8 text-black/70'
            : 'border-[#B38B21]/25 bg-[#B38B21]/5 text-white/70'
        }`}
      >
        <p className="font-bold text-[#B38B21] text-xs mb-1">Pricing & deductions (GHS figures)</p>
        Edit <span className={`font-semibold ${title}`}>actual cedis amounts</span> per phone —
        not percentages. Base value is the trade-in start price; each fault (battery, screen, …)
        is a fixed GHS deduction you set for that model. Customer estimates update as soon as you
        save. Manage listed models on{' '}
        <Link to="/admin/trade/devices" className="text-[#B38B21] font-bold underline">
          Devices
        </Link>
        .
        {activeDeviceModels.length === 0 && (
          <span className={`block mt-1 ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
            No devices are Listed yet — add or activate models on Devices first.
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1">
        {(
          [
            ['bases', 'Starting prices'],
            ['deductions', 'Condition deductions'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-colors ${
              tab === id ? chipActive : chipIdle
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className={`rounded-xl border p-3 sm:p-4 space-y-3 ${panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${muted}`}>
            <Filter size={12} aria-hidden /> Filter pricing
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${muted}`}>
              Showing <span className={`font-bold ${title}`}>{resultCount}</span> of {totalCount}
            </span>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${chipIdle}`}
              >
                <X size={11} aria-hidden /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['', 'All devices'],
              ['iphone', 'iPhone'],
              ['ipad', 'iPad'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id || 'all'}
              type="button"
              onClick={() => selectDeviceType(id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-colors ${
                deviceTypeFilter === id ? chipActive : chipIdle
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
          <label className="block min-w-0">
            <span className={`text-[9px] uppercase tracking-widest block mb-1 ${muted}`}>Model</span>
            <select
              value={focusModel}
              onChange={(e) => selectFocusModel(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-xs border ${field}`}
            >
              <option value="">All models</option>
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          {tab === 'bases' && (
            <>
              <label className="block min-w-0">
                <span className={`text-[9px] uppercase tracking-widest block mb-1 ${muted}`}>
                  Storage
                </span>
                <select
                  value={storageFilter}
                  onChange={(e) => selectStorage(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border ${field}`}
                >
                  <option value="">All storage</option>
                  {storageOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className={`text-[9px] uppercase tracking-widest block mb-1 ${muted}`}>SIM</span>
                <select
                  value={simFilter}
                  onChange={(e) => selectSim(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border ${field}`}
                >
                  <option value="">All SIM types</option>
                  {simOptionsInData.map((s) => (
                    <option key={s} value={s}>
                      {simVariantLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="block min-w-0">
            <span className={`text-[9px] uppercase tracking-widest block mb-1 ${muted}`}>Shown</span>
            <select
              value={activeFilter}
              onChange={(e) => selectActive(e.target.value as ActiveFilter)}
              className={`w-full rounded-xl px-3 py-2 text-xs border ${field}`}
            >
              <option value="">All rows</option>
              <option value="active">Shown only</option>
              <option value="inactive">Hidden only</option>
            </select>
          </label>

          <label className={`block min-w-0 ${tab === 'bases' ? 'sm:col-span-2 xl:col-span-2' : 'sm:col-span-2 xl:col-span-4'}`}>
            <span className={`text-[9px] uppercase tracking-widest block mb-1 ${muted}`}>Search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                tab === 'bases'
                  ? 'Search model, storage, SIM…'
                  : 'Search model or fault…'
              }
              className={`w-full rounded-xl px-3 py-2 text-xs border ${field}`}
            />
          </label>
        </div>
      </div>

      {tab === 'bases' ? (
        <>
          {simCoverageHints.length > 0 && (
            <div
              className={`rounded-xl border p-3 text-[11px] space-y-1 ${
                isLight
                  ? 'border-amber-500/40 bg-amber-50 text-amber-900'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              }`}
            >
              <p className="font-bold uppercase tracking-wider text-[10px]">
                Incomplete SIM coverage
              </p>
              <p className={isLight ? 'text-amber-800/80' : 'text-amber-100/80'}>
                Customers only see storage/SIM options you price. Use “Copy as other SIM” on a row
                to add the missing variant.
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {simCoverageHints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          <div
            className={`rounded-xl border p-4 space-y-3 ${
              isLight
                ? 'border-[#B38B21]/30 bg-[#B38B21]/8'
                : 'border-[#B38B21]/25 bg-[#B38B21]/5'
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21]">
              Add base row (model × storage × SIM)
            </p>
            <p className={`text-[11px] ${muted}`}>
              Pick a Listed device, then set Physical SIM (<code className={title}>ps</code>)
              and eSIM (<code className={title}>es</code>) as separate rows when both
              apply — each needs its own base value.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <select
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className={`rounded-xl px-3 py-2 text-xs border ${field}`}
              >
                <option value="">Select model…</option>
                {allModelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                    {devices.find((d) => modelsEqual(d.model, m))?.is_active === false
                      ? ' (hidden)'
                      : ''}
                  </option>
                ))}
              </select>

              {newStorageCustom ? (
                <div className="flex gap-1">
                  <input
                    value={newStorage}
                    onChange={(e) => setNewStorage(e.target.value)}
                    placeholder="Custom storage"
                    className={`flex-1 rounded-xl px-3 py-2 text-xs border ${field}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewStorageCustom(false);
                      setNewStorage('128GB');
                    }}
                    className={`px-2 rounded-xl text-[10px] font-bold border ${chipIdle}`}
                    title="Use standard tiers"
                  >
                    List
                  </button>
                </div>
              ) : (
                <select
                  value={
                    COMMON_STORAGE_TIERS.includes(newStorage as (typeof COMMON_STORAGE_TIERS)[number])
                      ? newStorage
                      : '__custom__'
                  }
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setNewStorageCustom(true);
                      setNewStorage('');
                      return;
                    }
                    setNewStorage(e.target.value);
                  }}
                  className={`rounded-xl px-3 py-2 text-xs border ${field}`}
                >
                  {COMMON_STORAGE_TIERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__custom__">Other…</option>
                </select>
              )}

              <select
                value={newSim}
                onChange={(e) => setNewSim(e.target.value)}
                className={`rounded-xl px-3 py-2 text-xs border ${field}`}
              >
                {SIM_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {simVariantLabel(s)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={newBase}
                onChange={(e) => setNewBase(e.target.value)}
                placeholder="Base GHS"
                className={`rounded-xl px-3 py-2 text-xs border ${field}`}
              />
              <button
                type="button"
                disabled={adding}
                onClick={() => void addBaseRow()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#B38B21] text-black text-[10px] font-black uppercase disabled:opacity-40"
              >
                <Plus size={12} /> {adding ? 'Adding…' : 'Add row'}
              </button>
            </div>
          </div>

          <div className={`border rounded-xl overflow-hidden ${panel}`}>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead
                  className={`sticky top-0 text-[9px] uppercase tracking-widest ${
                    isLight
                      ? 'bg-[#f5f5f5] text-black/45'
                      : 'bg-[#0a0a0a] text-white/40'
                  }`}
                >
                  <tr>
                    <th className="px-3 py-2">Model</th>
                    <th className="px-3 py-2">Storage</th>
                    <th className="px-3 py-2">SIM</th>
                    <th className="px-3 py-2">Starting price (GHS)</th>
                    <th className="px-3 py-2">Shown</th>
                    <th className="px-3 py-2">Copy as other SIM</th>
                    <th className="px-3 py-2">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBases.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t ${
                        isLight
                          ? 'border-black/[0.06] hover:bg-black/[0.02]'
                          : 'border-white/[0.04] hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className={`px-3 py-2 text-xs font-bold ${title}`}>{r.model}</td>
                      <td className={`px-3 py-2 text-xs ${muted}`}>{r.storage}</td>
                      <td className="px-3 py-2">
                        <select
                          value={r.sim_variant}
                          disabled={savingId === r.id}
                          onChange={(e) => void saveBase(r.id, { sim_variant: e.target.value })}
                          className={`rounded-lg px-2 py-1 text-xs border max-w-[9rem] ${field}`}
                          title={simVariantLabel(r.sim_variant)}
                        >
                          {SIM_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {simVariantLabel(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          defaultValue={r.base_value}
                          key={`${r.id}-${r.base_value}`}
                          disabled={savingId === r.id}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isFinite(n) || n === r.base_value) return;
                            void saveBase(r.id, { base_value: n });
                          }}
                          className={`w-28 rounded-lg px-2 py-1 text-xs font-bold border text-emerald-600 ${
                            isLight ? 'bg-white border-black/15' : 'bg-black/50 border-white/10 text-emerald-400'
                          } focus:border-[#B38B21]/50 focus:outline-none`}
                        />
                        <span className={`ml-2 text-[9px] hidden sm:inline ${muted}`}>
                          {formatGhs(r.base_value)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          disabled={savingId === r.id}
                          onChange={(e) => void saveBase(r.id, { is_active: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(['ps', 'es'] as const)
                            .filter((s) => s !== r.sim_variant)
                            .map((s) => (
                              <button
                                key={s}
                                type="button"
                                title={`Clone as ${simVariantLabel(s)}`}
                                disabled={savingId === r.id}
                                onClick={() => void cloneAsSim(r, s)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase border disabled:opacity-40 ${chipIdle} hover:text-[#B38B21] hover:border-[#B38B21]/40`}
                              >
                                <Copy size={10} /> {s}
                              </button>
                            ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          title="Delete base row"
                          disabled={savingId === r.id}
                          onClick={() => void removeBase(r)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-500/80 hover:bg-red-500/15 hover:text-red-400 disabled:opacity-40"
                        >
                          <Trash2 size={14} aria-hidden />
                          <span className="sr-only">Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBases.length === 0 && (
                <p className={`p-6 text-center text-sm ${muted}`}>
                  No base rows match these filters.
                  {filtersActive ? ' Try clearing filters or add a new row above.' : ''}
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={`rounded-xl border p-4 space-y-3 ${panel}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${muted}`}>
              <ArrowRightLeft size={12} aria-hidden /> Copy deduction figures from another phone
            </p>
            <p className={`text-[11px] ${muted}`}>
              Copies the same GHS amounts (battery, screen, …). Then edit any figure for this model.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
              <div>
                <label className={`text-[9px] uppercase tracking-widest block mb-1 ${muted}`}>
                  From
                </label>
                <select
                  value={copyFrom}
                  onChange={(e) => setCopyFrom(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border ${field}`}
                >
                  <option value="">Source model…</option>
                  {allModelOptions
                    .filter((m) => !marketModel || !modelsEqual(m, marketModel))
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className={`text-[9px] uppercase tracking-widest block mb-1 ${muted}`}>
                  To
                </label>
                <select
                  value={marketModel}
                  onChange={(e) => selectFocusModel(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border ${field}`}
                >
                  <option value="">Target model…</option>
                  {allModelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <label className={`flex items-center gap-2 text-[11px] px-1 py-2 ${muted}`}>
                <input
                  type="checkbox"
                  checked={copyOverwrite}
                  onChange={(e) => setCopyOverwrite(e.target.checked)}
                />
                Overwrite existing
              </label>
              <button
                type="button"
                disabled={copying || !copyFrom || !marketModel}
                onClick={() => void runCopyDeductions()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#B38B21] text-black text-[10px] font-black uppercase disabled:opacity-40"
              >
                {copying ? 'Copying…' : 'Copy GHS amounts'}
              </button>
            </div>
          </div>

          <div className={`rounded-xl border p-4 space-y-3 ${panel}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${muted}`}>
              Add deduction (fixed GHS)
            </p>
            <p className={`text-[11px] ${muted}`}>
              Example: Battery −₵400 means ₵400 off that model’s base — not a % of the trade-in.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <select
                value={dedModel}
                onChange={(e) => setDedModel(e.target.value)}
                className={`rounded-xl px-3 py-2 text-xs border ${field}`}
              >
                <option value="">Select model…</option>
                {allModelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={dedCode}
                onChange={(e) => setDedCode(e.target.value)}
                className={`rounded-xl px-3 py-2 text-xs border ${field}`}
              >
                {TRADE_COMPONENT_KEYS.map((c) => (
                  <option key={c} value={c}>
                    {FAULT_LABELS[c] || c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={dedAmount}
                onChange={(e) => setDedAmount(e.target.value)}
                placeholder="Amount GHS (e.g. 400)"
                className={`rounded-xl px-3 py-2 text-xs border ${field}`}
              />
              <button
                type="button"
                disabled={addingDed}
                onClick={() => void addDeductionRow()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#B38B21] text-black text-[10px] font-black uppercase disabled:opacity-40"
              >
                <Plus size={12} /> {addingDed ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>

          <div className={`border rounded-xl overflow-hidden ${panel}`}>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-left min-w-[520px]">
                <thead
                  className={`sticky top-0 text-[9px] uppercase tracking-widest ${
                    isLight
                      ? 'bg-[#f5f5f5] text-black/45'
                      : 'bg-[#0a0a0a] text-white/40'
                  }`}
                >
                  <tr>
                    <th className="px-3 py-2">Model</th>
                    <th className="px-3 py-2">Condition issue</th>
                    <th className="px-3 py-2">Deduction (GHS)</th>
                    <th className="px-3 py-2">Shown</th>
                    <th className="px-3 py-2">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeducs.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t ${
                        isLight
                          ? 'border-black/[0.06] hover:bg-black/[0.02]'
                          : 'border-white/[0.04] hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className={`px-3 py-2 text-xs font-bold ${title}`}>{r.model}</td>
                      <td className={`px-3 py-2 text-xs ${muted}`}>
                        {r.fault_label || r.fault_code}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          defaultValue={r.deduction}
                          key={`${r.id}-${r.deduction}`}
                          disabled={savingId === r.id}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isFinite(n) || n === r.deduction) return;
                            void saveDeduc(r.id, { deduction: n });
                          }}
                          className={`w-28 rounded-lg px-2 py-1 text-xs font-bold border text-red-600 ${
                            isLight ? 'bg-white border-black/15' : 'bg-black/50 border-white/10 text-red-400'
                          } focus:border-[#B38B21]/50 focus:outline-none`}
                        />
                        <span className={`ml-2 text-[9px] hidden sm:inline ${muted}`}>
                          {formatGhs(r.deduction)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          disabled={savingId === r.id}
                          onChange={(e) => void saveDeduc(r.id, { is_active: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          title="Delete deduction"
                          disabled={savingId === r.id}
                          onClick={() => void removeDeduction(r)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-500/80 hover:bg-red-500/15 hover:text-red-400 disabled:opacity-40"
                        >
                          <Trash2 size={14} aria-hidden />
                          <span className="sr-only">Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDeducs.length === 0 && (
                <p className={`p-6 text-center text-sm ${muted}`}>
                  No deduction rows match these filters.
                  {filtersActive ? ' Try clearing filters or add a new row above.' : ''}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteDialog
        open={pendingDelete != null}
        title={
          pendingDelete?.kind === 'base'
            ? 'Delete base pricing row?'
            : 'Delete deduction row?'
        }
        message={
          pendingDelete?.kind === 'base'
            ? `Permanently delete base pricing for ${pendingDelete.row.model} ${pendingDelete.row.storage} ${simVariantLabel(pendingDelete.row.sim_variant)}. This cannot be undone.`
            : pendingDelete
              ? `Permanently delete deduction “${pendingDelete.row.model} · ${pendingDelete.row.fault_label || pendingDelete.row.fault_code}”. This cannot be undone.`
              : ''
        }
        requireTypedDelete
        busy={deleting}
        onCancel={() => !deleting && setPendingDelete(null)}
        onConfirm={() => void confirmPendingDelete()}
      />
    </div>
  );
};
