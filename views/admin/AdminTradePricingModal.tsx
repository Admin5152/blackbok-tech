import React, { useMemo, useState } from 'react';
import { DollarSign, Percent } from 'lucide-react';
import { Modal, ModalClose } from './adminUtils';
import { formatCurrency } from '../../lib/utils';
import { getCachedBaseValues, getCachedDeductions, getModelsForType } from '../../lib/tradePricingStore';
import { TRADE_COMPONENT_DEFS } from '../../lib/tradeValuation';

interface Props {
  open: boolean;
  onClose: () => void;
}

type DeviceTab = 'smartphone' | 'tablet';

export const AdminTradePricingModal: React.FC<Props> = ({ open, onClose }) => {
  const [deviceTab, setDeviceTab] = useState<DeviceTab>('smartphone');
  const [deviceQ, setDeviceQ] = useState('');

  const baseValues = getCachedBaseValues();
  const deductions = getCachedDeductions();

  const deviceRows = useMemo(() => {
    const models = getModelsForType(deviceTab);
    const q = deviceQ.trim().toLowerCase();
    return models
      .filter((model) => !q || model.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [deviceTab, deviceQ, baseValues]);

  if (!open) return null;

  return (
    <Modal onClose={onClose} maxW="max-w-4xl">
      <ModalClose onClose={onClose} />
      <div className="p-6">
        <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
          <DollarSign size={16} className="text-[#B38B21]" /> Trade-in pricing
        </h3>
        <p className="text-[10px] text-[#B38B21] mb-5 leading-relaxed font-bold uppercase tracking-wider">
          Pricing is now centrally managed in the database (trade_base_values & trade_fault_deductions). This is a read-only view.
        </p>

        <div className="space-y-5">
          <section className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
            <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {([
                  ['smartphone', 'iPhone'],
                  ['tablet', 'iPad'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDeviceTab(id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      deviceTab === id ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/50 hover:text-white'
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
              {deviceRows.map((model) => {
                const modelBases = baseValues.filter(b => b.model === model);
                const modelDeducs = deductions.filter(d => d.model === model);
                return (
                  <div key={model} className="px-4 py-3 hover:bg-white/[0.02]">
                    <p className="text-sm font-black text-white mb-2">{model}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-white/50 mb-1">Base Values</p>
                        <div className="grid grid-cols-1 gap-1">
                          {modelBases.map((b, i) => (
                            <div key={i} className="flex justify-between text-[10px] bg-white/[0.02] p-1.5 rounded">
                              <span className="text-white/70">{b.storage} • {b.sim_variant}</span>
                              <span className="text-emerald-400 font-bold">{formatCurrency(b.base_value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-white/50 mb-1">Fault Deductions</p>
                        <div className="grid grid-cols-1 gap-1">
                          {modelDeducs.map((d, i) => (
                            <div key={i} className="flex justify-between text-[10px] bg-white/[0.02] p-1.5 rounded">
                              <span className="text-white/70">{d.fault_code}</span>
                              <span className="text-red-400 font-bold">−{formatCurrency(d.deduction)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase text-white/50 border border-white/10 hover:text-white hover:bg-white/5">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

