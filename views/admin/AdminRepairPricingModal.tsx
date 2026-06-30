import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Wrench } from 'lucide-react';
import { Modal, ModalClose } from './adminUtils';
import {
  clearRepairMatrixOverrides,
  getDefaultRepairPricing,
  getEffectiveRepairPricing,
  getRepairMatrixColumnLabels,
  replaceRepairMatrixOverrides,
  type RepairMatrixRow,
} from '../../lib/repairPricingStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const AdminRepairPricingModal: React.FC<Props> = ({ open, onClose }) => {
  const [draft, setDraft] = useState<Record<string, RepairMatrixRow>>({});
  const [modelQ, setModelQ] = useState('');

  const columns = useMemo(() => getRepairMatrixColumnLabels(), []);

  useEffect(() => {
    if (!open) return;
    setDraft(getEffectiveRepairPricing());
    setModelQ('');
  }, [open]);

  const modelRows = useMemo(() => {
    const q = modelQ.trim().toLowerCase();
    return Object.keys(getDefaultRepairPricing())
      .filter((model) => !q || model.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [modelQ]);

  const setCell = (model: string, key: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [model]: { ...(prev[model] || {}), [key]: value },
    }));
  };

  const save = () => {
    const defaults = getDefaultRepairPricing();
    const overrides: Record<string, RepairMatrixRow> = {};

    for (const model of Object.keys(defaults)) {
      const draftRow = draft[model] || {};
      const defaultRow = defaults[model] || {};
      const diffRow: RepairMatrixRow = {};
      for (const col of columns) {
        const draftVal = (draftRow[col.key] ?? defaultRow[col.key] ?? '').trim();
        const defaultVal = (defaultRow[col.key] ?? '').trim();
        if (draftVal && draftVal !== defaultVal) diffRow[col.key] = draftVal;
      }
      if (Object.keys(diffRow).length > 0) overrides[model] = diffRow;
    }

    replaceRepairMatrixOverrides(overrides);
    onClose();
  };

  const resetAll = () => {
    if (!window.confirm('Reset all iPhone repair matrix prices to built-in defaults?')) return;
    clearRepairMatrixOverrides();
    onClose();
  };

  if (!open) return null;

  return (
    <Modal onClose={onClose} maxW="max-w-6xl">
      <ModalClose onClose={onClose} />
      <div className="p-6">
        <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
          <Wrench size={16} className="text-orange-400" /> iPhone repair matrix
        </h3>
        <p className="text-[10px] text-white/30 mb-4 leading-relaxed">
          Component repair prices (GHS) shown to customers on Apple iPhone repairs with matrix pricing. Use N/A or Consult where a service does not apply. Saves to this browser only.
        </p>

        <div className="mb-3">
          <input
            value={modelQ}
            onChange={(e) => setModelQ(e.target.value)}
            placeholder="Search iPhone models…"
            className="w-full sm:w-64 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
          />
        </div>

        <div className="border border-white/10 rounded-xl overflow-auto max-h-[55vh] bg-black/30">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-white/10 bg-black/40">
                <th className="sticky left-0 z-10 bg-[#0a0a0a] px-3 py-2 text-[9px] font-black uppercase text-white/40 tracking-widest min-w-[9rem]">
                  Model
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2 text-[8px] font-black uppercase text-white/40 tracking-wider min-w-[4.5rem]"
                    title={col.label}
                  >
                    {col.key}
                    <span className="block font-normal normal-case text-white/25 truncate max-w-[5rem]">{col.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelRows.map((model) => {
                const row = draft[model] || getDefaultRepairPricing()[model] || {};
                return (
                  <tr key={model} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#0a0a0a] px-3 py-1.5 text-[10px] font-bold text-white whitespace-nowrap">
                      {model}
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-1 py-1">
                        <input
                          value={row[col.key] ?? ''}
                          onChange={(e) => setCell(model, col.key, e.target.value)}
                          className="w-full min-w-[3.5rem] bg-black/50 border border-white/10 rounded px-1.5 py-1 text-white text-[10px] focus:border-orange-400/50 focus:outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
              Save matrix
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
