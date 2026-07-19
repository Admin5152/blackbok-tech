/**
 * Trade Admin pricing — editable base values + fault deductions grids.
 *
 * Staff keep each phone’s offer market-current with **fixed GHS amounts**
 * (not percentages):
 * - Base values: model × storage × SIM — the trade-in base in GHS
 * - Deductions: model × fault (screen, battery, …) — flat GHS off the base
 *
 * Deep links: /admin/trade/pricing?model=iPhone%2015%20Pro&tab=deductions
 * Invalidates tradePricingStore on save so the live ticker reflects edits.
 *
 * TODO(D1a): iPhone 15 1TB seed (4650) stays inactive until client confirms —
 * activate the base_value row here when approved (no code deploy).
 * TODO(iPad-prices): same pattern for iPad base rows.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Plus, Copy, ArrowRightLeft, Trash2 } from 'lucide-react';
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
import type { TradeBaseValueRow, TradeDeviceRow, TradeFaultDeductionRow } from '../../../types/supabase';
import { useAppContext } from '../../../lib/appContext';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';

type Tab = 'bases' | 'deductions';
type PendingDelete =
  | { kind: 'base'; row: TradeBaseValueRow }
  | { kind: 'deduction'; row: TradeFaultDeductionRow };

/** Allowed sim_variant codes for trade_base_values (matches product_variants.sim_type). */
const SIM_OPTIONS = ['ps', 'es', 'single', 'wifi', 'cell_ps', 'cell_es'] as const;

const FAULT_LABELS: Record<string, string> = {
  screen: 'Screen',
  battery: 'Battery',
  backglass: 'Back glass',
  charging: 'Charging',
  front_camera: 'Front camera',
  back_camera: 'Back camera',
  face_id: 'Face ID / Touch ID',
};

export const TradeAdminPricing: React.FC = () => {
  const { notify } = useAppContext();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    model?: string;
    tab?: Tab;
  };
  const [tab, setTab] = useState<Tab>(search.tab === 'deductions' ? 'deductions' : 'bases');
  const [bases, setBases] = useState<TradeBaseValueRow[]>([]);
  const [deducs, setDeducs] = useState<TradeFaultDeductionRow[]>([]);
  const [devices, setDevices] = useState<TradeDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusModel, setFocusModel] = useState(search.model ?? '');
  const [q, setQ] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newModel, setNewModel] = useState(search.model ?? '');
  const [newStorage, setNewStorage] = useState('128GB');
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

  const syncSearch = useCallback(
    (next: { model?: string; tab?: Tab }) => {
      void navigate({
        to: '/admin/trade/pricing',
        search: {
          model: next.model || undefined,
          tab: next.tab && next.tab !== 'bases' ? next.tab : undefined,
        },
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
  }, [search.model, search.tab]);

  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of devices) set.add(d.model);
    for (const r of bases) set.add(r.model);
    for (const r of deducs) set.add(r.model);
    return [...set].sort();
  }, [devices, bases, deducs]);

  const activeDeviceModels = useMemo(
    () => devices.filter((d) => d.is_active).map((d) => d.model).sort(),
    [devices],
  );

  const marketModel = focusModel || newModel || dedModel;

  const ql = q.trim().toLowerCase();
  const filteredBases = useMemo(
    () =>
      bases.filter((r) => {
        if (focusModel && r.model !== focusModel) return false;
        if (
          ql &&
          !r.model.toLowerCase().includes(ql) &&
          !r.storage.toLowerCase().includes(ql) &&
          !r.sim_variant.toLowerCase().includes(ql)
        ) {
          return false;
        }
        return true;
      }),
    [bases, focusModel, ql],
  );
  const filteredDeducs = useMemo(
    () =>
      deducs.filter((r) => {
        if (focusModel && r.model !== focusModel) return false;
        if (
          ql &&
          !r.model.toLowerCase().includes(ql) &&
          !r.fault_code.toLowerCase().includes(ql) &&
          !r.fault_label.toLowerCase().includes(ql)
        ) {
          return false;
        }
        return true;
      }),
    [deducs, focusModel, ql],
  );

  const selectTab = (id: Tab) => {
    setTab(id);
    syncSearch({ model: focusModel || undefined, tab: id });
  };

  const selectFocusModel = (model: string) => {
    setFocusModel(model);
    if (model) {
      setNewModel(model);
      setDedModel(model);
    }
    syncSearch({ model: model || undefined, tab });
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
    if (!devices.some((d) => d.model === newModel.trim())) {
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
        r.model === src.model &&
        r.storage === src.storage &&
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
      syncSearch({ model: marketModel, tab: 'deductions' });
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
    return <div className="text-center py-16 text-white/30 text-sm">Loading pricing…</div>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#B38B21]/25 bg-[#B38B21]/5 p-3 text-[11px] text-white/70 leading-relaxed">
        <p className="font-bold text-[#B38B21] text-xs mb-1">Pricing & deductions (GHS figures)</p>
        Edit <span className="text-white/90 font-semibold">actual cedis amounts</span> per phone —
        not percentages. Base value is the trade-in start price; each fault (battery, screen, …)
        is a fixed GHS deduction you set for that model. Customer estimates update as soon as you
        save. Manage listed models on{' '}
        <Link to="/admin/trade/devices" className="text-[#B38B21] font-bold underline">
          Devices
        </Link>
        .
        {activeDeviceModels.length === 0 && (
          <span className="block mt-1 text-amber-300">
            No devices are Listed yet — add or activate models on Devices first.
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1">
          {(
            [
              ['bases', 'Starting prices'],
              ['deductions', 'Condition discounts'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                tab === id ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={focusModel}
            onChange={(e) => selectFocusModel(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none min-w-[10rem]"
          >
            <option value="">All models</option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter storage / fault…"
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs w-full sm:w-40 focus:border-[#B38B21]/50 focus:outline-none"
          />
        </div>
      </div>

      {tab === 'bases' ? (
        <>
          <div className="rounded-xl border border-[#B38B21]/25 bg-[#B38B21]/5 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21]">
              Add base row (model × storage × SIM)
            </p>
            <p className="text-[11px] text-white/45">
              Pick a Listed device, then set Physical SIM (<code className="text-white/70">ps</code>)
              and eSIM (<code className="text-white/70">es</code>) as separate rows when both
              apply — each needs its own base value.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <select
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
              >
                <option value="">Select model…</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                    {devices.find((d) => d.model === m)?.is_active === false ? ' (hidden)' : ''}
                  </option>
                ))}
              </select>
              <input
                value={newStorage}
                onChange={(e) => setNewStorage(e.target.value)}
                placeholder="Storage (128GB)"
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
              />
              <select
                value={newSim}
                onChange={(e) => setNewSim(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
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
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
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

          <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#0a0a0a] text-[9px] uppercase tracking-widest text-white/40">
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
                    <tr key={r.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-xs font-bold text-white">{r.model}</td>
                      <td className="px-3 py-2 text-xs text-white/60">{r.storage}</td>
                      <td className="px-3 py-2">
                        <select
                          value={r.sim_variant}
                          disabled={savingId === r.id}
                          onChange={(e) => void saveBase(r.id, { sim_variant: e.target.value })}
                          className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white max-w-[9rem] focus:border-[#B38B21]/50 focus:outline-none"
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
                          className="w-28 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-emerald-400 text-xs font-bold focus:border-[#B38B21]/50 focus:outline-none"
                        />
                        <span className="ml-2 text-[9px] text-white/25 hidden sm:inline">
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
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-white/5 border border-white/10 text-white/50 hover:text-[#B38B21] hover:border-[#B38B21]/40 disabled:opacity-40"
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
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-400/80 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
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
                <p className="p-6 text-center text-white/30 text-sm">No base rows match.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5">
              <ArrowRightLeft size={12} aria-hidden /> Copy deduction figures from another phone
            </p>
            <p className="text-[11px] text-white/40">
              Copies the same GHS amounts (battery, screen, …). Then edit any figure for this model.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/35 block mb-1">
                  From
                </label>
                <select
                  value={copyFrom}
                  onChange={(e) => setCopyFrom(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                >
                  <option value="">Source model…</option>
                  {modelOptions
                    .filter((m) => m !== marketModel)
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/35 block mb-1">
                  To
                </label>
                <select
                  value={marketModel}
                  onChange={(e) => selectFocusModel(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                >
                  <option value="">Target model…</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-white/50 px-1 py-2">
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

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
              Add deduction (fixed GHS)
            </p>
            <p className="text-[11px] text-white/40">
              Example: Battery −₵400 means ₵400 off that model’s base — not a % of the trade-in.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <select
                value={dedModel}
                onChange={(e) => setDedModel(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
              >
                <option value="">Select model…</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={dedCode}
                onChange={(e) => setDedCode(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
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
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
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

          <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#0a0a0a] text-[9px] uppercase tracking-widest text-white/40">
                  <tr>
                    <th className="px-3 py-2">Model</th>
                    <th className="px-3 py-2">Condition issue</th>
                    <th className="px-3 py-2">Discount (GHS)</th>
                    <th className="px-3 py-2">Shown</th>
                    <th className="px-3 py-2">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeducs.map((r) => (
                    <tr key={r.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-xs font-bold text-white">{r.model}</td>
                      <td className="px-3 py-2 text-xs text-white/60">
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
                          className="w-28 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-red-400 text-xs font-bold focus:border-[#B38B21]/50 focus:outline-none"
                        />
                        <span className="ml-2 text-[9px] text-white/25 hidden sm:inline">
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
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-400/80 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
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
                <p className="p-6 text-center text-white/30 text-sm">No deduction rows match.</p>
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
