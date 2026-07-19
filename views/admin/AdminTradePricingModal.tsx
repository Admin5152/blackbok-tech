/**
 * Trade pricing modal — editable base values + fault deductions.
 * Prefer /admin/trade/pricing for the full grid; this keeps AdminTrades quick access.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Modal, ModalClose } from './adminUtils';
import { formatGhs } from '../../lib/money';
import {
  getAdminBaseValues,
  getAdminDeductions,
  tradeAdminErrorMessage,
  updateBaseValue,
  updateDeduction,
} from '../../lib/tradeAdminApi';
import { getModelsForType } from '../../lib/tradePricingStore';
import type { TradeBaseValueRow, TradeFaultDeductionRow } from '../../types/supabase';
import { useAppContext } from '../../lib/appContext';
import { useNavigate } from '@tanstack/react-router';

interface Props {
  open: boolean;
  onClose: () => void;
}

type DeviceTab = 'smartphone' | 'tablet';

export const AdminTradePricingModal: React.FC<Props> = ({ open, onClose }) => {
  const { notify } = useAppContext();
  const navigate = useNavigate();
  const [deviceTab, setDeviceTab] = useState<DeviceTab>('smartphone');
  const [deviceQ, setDeviceQ] = useState('');
  const [bases, setBases] = useState<TradeBaseValueRow[]>([]);
  const [deducs, setDeducs] = useState<TradeFaultDeductionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [b, d] = await Promise.all([getAdminBaseValues(true), getAdminDeductions(true)]);
      setBases(b);
      setDeducs(d);
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const deviceRows = useMemo(() => {
    const models = getModelsForType(deviceTab);
    const fromDb = new Set([
      ...bases.map((b) => b.model),
      ...deducs.map((d) => d.model),
    ]);
    const all = Array.from(new Set([...models, ...fromDb])).filter((model) => {
      if (deviceTab === 'tablet') return model.toLowerCase().includes('ipad');
      return model.toLowerCase().includes('iphone');
    });
    const q = deviceQ.trim().toLowerCase();
    return all
      .filter((model) => !q || model.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [deviceTab, deviceQ, bases, deducs]);

  if (!open) return null;

  return (
    <Modal onClose={onClose} maxW="max-w-4xl">
      <ModalClose onClose={onClose} />
      <div className="p-6">
        <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
          <DollarSign size={16} className="text-[#B38B21]" /> Trade-in pricing
        </h3>
        <p className="text-[10px] text-white/40 mb-2 leading-relaxed">
          Inline edits save to <code className="text-white/60">trade_base_values</code> &amp;{' '}
          <code className="text-white/60">trade_fault_deductions</code> and refresh the live cache.
        </p>
        <button
          type="button"
          onClick={() => {
            onClose();
            void navigate({ to: '/admin/trade/pricing' });
          }}
          className="mb-4 text-[10px] font-black uppercase text-[#B38B21] hover:text-[#D4AF37]"
        >
          Open full Trade Admin pricing →
        </button>

        <div className="space-y-5">
          <section className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
            <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {(
                  [
                    ['smartphone', 'iPhone'],
                    ['tablet', 'iPad'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDeviceTab(id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      deviceTab === id
                        ? 'bg-[#B38B21] text-black'
                        : 'bg-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                value={deviceQ}
                onChange={(e) => setDeviceQ(e.target.value)}
                placeholder="Search models…"
                className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs w-full sm:w-44 focus:border-[#B38B21]/50 focus:outline-none"
              />
            </div>
            <div className="max-h-[40vh] overflow-y-auto divide-y divide-white/[0.04]">
              {loading ? (
                <p className="p-6 text-center text-white/30 text-sm">Loading…</p>
              ) : deviceRows.length === 0 ? (
                <p className="p-6 text-center text-white/30 text-sm">No models found.</p>
              ) : (
                deviceRows.map((model) => {
                  const modelBases = bases.filter((b) => b.model === model);
                  const modelDeducs = deducs.filter((d) => d.model === model);
                  return (
                    <div key={model} className="px-4 py-3 hover:bg-white/[0.02]">
                      <p className="text-sm font-black text-white mb-2">{model}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-white/50 mb-1">
                            Base Values
                          </p>
                          <div className="grid grid-cols-1 gap-1">
                            {modelBases.map((b) => (
                              <div
                                key={b.id}
                                className="flex justify-between items-center gap-2 text-[10px] bg-white/[0.02] p-1.5 rounded"
                              >
                                <span className="text-white/70">
                                  {b.storage} • {b.sim_variant}
                                </span>
                                <input
                                  type="number"
                                  defaultValue={b.base_value}
                                  disabled={savingId === b.id}
                                  onBlur={(e) => {
                                    const n = Number(e.target.value);
                                    if (!Number.isFinite(n) || n === b.base_value) return;
                                    setSavingId(b.id);
                                    void updateBaseValue(b.id, { base_value: n })
                                      .then((row) => {
                                        setBases((prev) =>
                                          prev.map((x) => (x.id === b.id ? row : x)),
                                        );
                                        notify?.('Saved.', 'success');
                                      })
                                      .catch((err) =>
                                        notify?.(tradeAdminErrorMessage(err), 'error'),
                                      )
                                      .finally(() => setSavingId(null));
                                  }}
                                  className="w-20 bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-emerald-400 font-bold text-right focus:border-[#B38B21]/50 focus:outline-none"
                                />
                              </div>
                            ))}
                            {modelBases.length === 0 && (
                              <p className="text-[10px] text-white/25">No base rows</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-white/50 mb-1">
                            Fault Deductions
                          </p>
                          <div className="grid grid-cols-1 gap-1">
                            {modelDeducs.map((d) => (
                              <div
                                key={d.id}
                                className="flex justify-between items-center gap-2 text-[10px] bg-white/[0.02] p-1.5 rounded"
                              >
                                <span className="text-white/70">{d.fault_code}</span>
                                <input
                                  type="number"
                                  defaultValue={d.deduction}
                                  disabled={savingId === d.id}
                                  onBlur={(e) => {
                                    const n = Number(e.target.value);
                                    if (!Number.isFinite(n) || n === d.deduction) return;
                                    setSavingId(d.id);
                                    void updateDeduction(d.id, { deduction: n })
                                      .then((row) => {
                                        setDeducs((prev) =>
                                          prev.map((x) => (x.id === d.id ? row : x)),
                                        );
                                        notify?.('Saved.', 'success');
                                      })
                                      .catch((err) =>
                                        notify?.(tradeAdminErrorMessage(err), 'error'),
                                      )
                                      .finally(() => setSavingId(null));
                                  }}
                                  className="w-20 bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-red-400 font-bold text-right focus:border-[#B38B21]/50 focus:outline-none"
                                />
                              </div>
                            ))}
                            {modelDeducs.length === 0 && (
                              <p className="text-[10px] text-white/25">
                                No deductions ({formatGhs(0)} placeholder)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase text-white/50 border border-white/10 hover:text-white hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
