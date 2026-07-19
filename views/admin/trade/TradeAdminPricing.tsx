/**
 * Trade Admin pricing — editable base values + fault deductions grids.
 *
 * Staff can add model × storage × SIM rows (Physical / eSIM) without SQL.
 * Invalidates tradePricingStore on save so the live ticker reflects edits.
 *
 * TODO(D1a): iPhone 15 1TB seed (4650) stays inactive until client confirms —
 * activate the base_value row here when approved (no code deploy).
 * TODO(iPad-prices): same pattern for iPad base rows.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Copy } from 'lucide-react';
import {
  cloneBaseValueForSim,
  createBaseValue,
  createDeduction,
  getAdminBaseValues,
  getAdminDeductions,
  tradeAdminErrorMessage,
  updateBaseValue,
  updateDeduction,
} from '../../../lib/tradeAdminApi';
import { formatGhs } from '../../../lib/money';
import { simVariantLabel } from '../../../lib/tradeCopy';
import { TRADE_COMPONENT_KEYS } from '../../../lib/tradeComponentKeys';
import type { TradeBaseValueRow, TradeFaultDeductionRow } from '../../../types/supabase';
import { useAppContext } from '../../../lib/appContext';

type Tab = 'bases' | 'deductions';

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
  const [tab, setTab] = useState<Tab>('bases');
  const [bases, setBases] = useState<TradeBaseValueRow[]>([]);
  const [deducs, setDeducs] = useState<TradeFaultDeductionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newModel, setNewModel] = useState('');
  const [newStorage, setNewStorage] = useState('128GB');
  const [newSim, setNewSim] = useState<string>('ps');
  const [newBase, setNewBase] = useState('');
  const [adding, setAdding] = useState(false);

  const [dedModel, setDedModel] = useState('');
  const [dedCode, setDedCode] = useState<string>(TRADE_COMPONENT_KEYS[0] || 'screen');
  const [dedAmount, setDedAmount] = useState('');
  const [addingDed, setAddingDed] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [b, d] = await Promise.all([getAdminBaseValues(true), getAdminDeductions(true)]);
      setBases(b);
      setDeducs(d);
    } catch (e) {
      setError(tradeAdminErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of bases) set.add(r.model);
    for (const r of deducs) set.add(r.model);
    return [...set].sort();
  }, [bases, deducs]);

  const ql = q.trim().toLowerCase();
  const filteredBases = useMemo(
    () =>
      bases.filter(
        (r) =>
          !ql ||
          r.model.toLowerCase().includes(ql) ||
          r.storage.toLowerCase().includes(ql) ||
          r.sim_variant.toLowerCase().includes(ql),
      ),
    [bases, ql],
  );
  const filteredDeducs = useMemo(
    () =>
      deducs.filter(
        (r) =>
          !ql ||
          r.model.toLowerCase().includes(ql) ||
          r.fault_code.toLowerCase().includes(ql) ||
          r.fault_label.toLowerCase().includes(ql),
      ),
    [deducs, ql],
  );

  const saveBase = async (
    id: string,
    patch: { base_value?: number; is_active?: boolean; sim_variant?: string },
  ) => {
    setSavingId(id);
    try {
      const row = await updateBaseValue(id, patch);
      setBases((prev) => prev.map((r) => (r.id === id ? row : r)));
      notify?.('Base value saved.', 'success');
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
      notify?.('Deduction saved.', 'success');
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
      setBases((prev) => [...prev, row].sort((a, b) => a.model.localeCompare(b.model)));
      setNewBase('');
      notify?.(`Added ${row.model} ${row.storage} ${simVariantLabel(row.sim_variant)}.`, 'success');
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
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1">
          {(
            [
              ['bases', 'Base values'],
              ['deductions', 'Deductions'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                tab === id ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter model…"
          className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs w-full sm:w-48 focus:border-[#B38B21]/50 focus:outline-none"
        />
      </div>

      {tab === 'bases' ? (
        <>
          <div className="rounded-xl border border-[#B38B21]/25 bg-[#B38B21]/5 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21]">
              Add base row (model × storage × SIM)
            </p>
            <p className="text-[11px] text-white/45">
              Use Physical SIM (<code className="text-white/70">ps</code>) and eSIM (
              <code className="text-white/70">es</code>) for iPhone 14+ — each needs its own base
              value.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <input
                list="trade-base-models"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder="Model (e.g. iPhone 14)"
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
              />
              <datalist id="trade-base-models">
                {modelOptions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
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
                    {simVariantLabel(s)} ({s})
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
                    <th className="px-3 py-2">Base (GHS)</th>
                    <th className="px-3 py-2">Active</th>
                    <th className="px-3 py-2">Clone SIM</th>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
              Add deduction row
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <input
                list="trade-ded-models"
                value={dedModel}
                onChange={(e) => setDedModel(e.target.value)}
                placeholder="Model"
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
              />
              <datalist id="trade-ded-models">
                {modelOptions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
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
                placeholder="Deduction GHS"
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
                    <th className="px-3 py-2">Fault</th>
                    <th className="px-3 py-2">Deduction</th>
                    <th className="px-3 py-2">Active</th>
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
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          disabled={savingId === r.id}
                          onChange={(e) => void saveDeduc(r.id, { is_active: e.target.checked })}
                        />
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
    </div>
  );
};
