import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Percent, RotateCcw } from 'lucide-react';
import { Modal, ModalClose } from './adminUtils';
import { formatCurrency } from '../../lib/utils';
import {
  clearTradePricingOverrides,
  getDefaultTradeDevicePrices,
  getMergedTradeDevicePrices,
  persistTradeComponentPercentOverrides,
  persistTradeDevicePriceOverrides,
  readTradeComponentPercentOverrides,
  readTradeDevicePriceOverrides,
} from '../../lib/tradePricingStore';
import { getTradeComponentDefs, TRADE_COMPONENT_DEFS } from '../../lib/tradeValuation';

interface Props {
  open: boolean;
  onClose: () => void;
}

type DeviceTab = 'smartphone' | 'tablet';

export const AdminTradePricingModal: React.FC<Props> = ({ open, onClose }) => {
  const [deviceTab, setDeviceTab] = useState<DeviceTab>('smartphone');
  const [deviceDraft, setDeviceDraft] = useState<Record<string, string>>({});
  const [componentDraft, setComponentDraft] = useState<Record<string, string>>({});
  const [deviceQ, setDeviceQ] = useState('');

  useEffect(() => {
    if (!open) return;
    const iphone = getMergedTradeDevicePrices('smartphone');
    const ipad = getMergedTradeDevicePrices('tablet');
    const mergedDevices = { ...iphone, ...ipad };
    const deviceStrings: Record<string, string> = {};
    for (const [model, price] of Object.entries(mergedDevices)) {
      deviceStrings[model] = String(price);
    }
    setDeviceDraft(deviceStrings);

    const comps = getTradeComponentDefs();
    const compStrings: Record<string, string> = {};
    for (const c of comps) compStrings[c.key] = String(c.deductionPercent);
    setComponentDraft(compStrings);
    setDeviceQ('');
    setDeviceTab('smartphone');
  }, [open]);

  const deviceRows = useMemo(() => {
    const defaults = getDefaultTradeDevicePrices(deviceTab);
    const q = deviceQ.trim().toLowerCase();
    return Object.keys(defaults)
      .filter((model) => !q || model.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [deviceTab, deviceQ]);

  const save = () => {
    const defaultsIphone = getDefaultTradeDevicePrices('smartphone');
    const defaultsIpad = getDefaultTradeDevicePrices('tablet');
    const overrides = readTradeDevicePriceOverrides();
    const nextOverrides = { ...overrides };

    for (const model of Object.keys(defaultsIphone)) {
      const raw = deviceDraft[model];
      const n = parseFloat(raw);
      const defaultPrice = defaultsIphone[model];
      if (!Number.isFinite(n) || n < 0) continue;
      if (Math.round(n) === defaultPrice) delete nextOverrides[model];
      else nextOverrides[model] = Math.round(n);
    }
    for (const model of Object.keys(defaultsIpad)) {
      const raw = deviceDraft[model];
      const n = parseFloat(raw);
      const defaultPrice = defaultsIpad[model];
      if (!Number.isFinite(n) || n < 0) continue;
      if (Math.round(n) === defaultPrice) delete nextOverrides[model];
      else nextOverrides[model] = Math.round(n);
    }
    persistTradeDevicePriceOverrides(nextOverrides);

    const compOverrides: Record<string, number> = {};
    for (const def of TRADE_COMPONENT_DEFS) {
      const raw = componentDraft[def.key];
      const n = parseFloat(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) continue;
      if (n === def.deductionPercent) continue;
      compOverrides[def.key] = n;
    }
    persistTradeComponentPercentOverrides(compOverrides);
    onClose();
  };

  const resetAll = () => {
    if (!window.confirm('Reset all trade-in device prices and component deductions to built-in defaults?')) return;
    clearTradePricingOverrides();
    onClose();
  };

  if (!open) return null;

  return (
    <Modal onClose={onClose} maxW="max-w-4xl">
      <ModalClose onClose={onClose} />
      <div className="p-6">
        <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
          <DollarSign size={16} className="text-[#B38B21]" /> Trade-in pricing
        </h3>
        <p className="text-[10px] text-white/30 mb-5 leading-relaxed">
          Set base purchase prices for each iPhone and iPad model, plus the % deducted per faulty component on the customer trade-in flow. Saves to this browser only.
        </p>

        <div className="space-y-5">
          <section className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
            <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase text-white/50 tracking-widest flex items-center gap-1.5">
                <Percent size={12} /> Component deductions
              </p>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[28vh] overflow-y-auto">
              {TRADE_COMPONENT_DEFS.map((def) => (
                <label key={def.key} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-2">
                  <span className="text-[11px] font-bold text-white min-w-0 flex-1 truncate" title={def.description}>
                    {def.label}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={componentDraft[def.key] ?? ''}
                      onChange={(e) => setComponentDraft((prev) => ({ ...prev, [def.key]: e.target.value }))}
                      className="w-16 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs text-right focus:border-[#B38B21]/50 focus:outline-none"
                    />
                    <span className="text-[10px] text-white/40">%</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

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
                const defaultPrice = getDefaultTradeDevicePrices(deviceTab)[model];
                const preview = parseFloat(deviceDraft[model] ?? '');
                return (
                  <div key={model} className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02]">
                    <p className="text-[11px] font-bold text-white min-w-0 flex-1">{model}</p>
                    <p className="text-[9px] text-white/30 hidden sm:block shrink-0">
                      default {formatCurrency(defaultPrice)}
                    </p>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={deviceDraft[model] ?? ''}
                      onChange={(e) => setDeviceDraft((prev) => ({ ...prev, [model]: e.target.value }))}
                      className="w-24 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs text-right focus:border-[#B38B21]/50 focus:outline-none"
                    />
                    <span className="text-[9px] text-white/30 shrink-0">GHS</span>
                    {Number.isFinite(preview) && preview !== defaultPrice && (
                      <span className="text-[9px] text-[#B38B21] shrink-0 hidden md:inline">custom</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 justify-between">
          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-white/40 border border-white/10 hover:text-red-400 hover:border-red-500/30"
          >
            <RotateCcw size={12} /> Reset defaults
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white/50 border border-white/10 hover:text-white">
              Cancel
            </button>
            <button type="button" onClick={save} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-[#B38B21] text-black hover:bg-[#D4AF37]">
              Save pricing
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
