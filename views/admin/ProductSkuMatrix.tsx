import React, { useEffect, useMemo } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import {
  buildSkuCombinations,
  canUseSkuMatrix,
  skuMatrixKey,
  syncSkuRowsFromChips,
  totalSkuStock,
} from '../../lib/productSkuMatrix';

type Props = {
  colors: string[];
  storage: string[];
  ram: string[];
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  rows: SkuMatrixRow[];
  onRowsChange: (rows: SkuMatrixRow[]) => void;
};

export const ProductSkuMatrix: React.FC<Props> = ({
  colors,
  storage,
  ram,
  enabled,
  onEnabledChange,
  rows,
  onRowsChange,
}) => {
  const canMatrix = canUseSkuMatrix(colors, storage, ram);
  const chipSignature = useMemo(
    () => `${colors.join('\u0001')}|${storage.join('\u0001')}|${ram.join('\u0001')}`,
    [colors, storage, ram],
  );

  const comboCount = useMemo(() => {
    if (!canMatrix) return 0;
    return buildSkuCombinations(colors, storage, ram).length;
  }, [colors, storage, ram, canMatrix]);

  const showColor = colors.length > 0;
  const showStorage = storage.length > 0;
  const showRam = ram.length > 0;

  // When chips change while matrix mode is on, refresh combination rows (keeps stock where keys match).
  useEffect(() => {
    if (!enabled || !canMatrix) return;
    onRowsChange(syncSkuRowsFromChips(colors, storage, ram, rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when chip lists change
  }, [chipSignature, enabled, canMatrix]);

  const regenerate = () => {
    onRowsChange(syncSkuRowsFromChips(colors, storage, ram, rows));
  };

  const handleEnable = (next: boolean) => {
    onEnabledChange(next);
    if (next && canMatrix) {
      onRowsChange(syncSkuRowsFromChips(colors, storage, ram, rows));
    }
  };

  const patchRow = (index: number, patch: Partial<SkuMatrixRow>) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const total = totalSkuStock(rows);

  return (
    <div className="rounded-xl border border-[#B38B21]/25 bg-[#B38B21]/[0.04] p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] flex items-center gap-1.5">
            <Layers size={12} /> Per-selection stock (Color / Storage / RAM)
          </p>
          <ol className="text-[11px] text-white/45 mt-2 space-y-1 list-decimal list-inside max-w-lg">
            <li>Add Color, Storage, and/or RAM chips above (at least one).</li>
            <li>Turn on tracking below — rows are created for every combination.</li>
            <li>Enter stock (and optional +price) for each row, then save the product.</li>
          </ol>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canMatrix}
            onChange={(e) => handleEnable(e.target.checked)}
            className="accent-[#B38B21]"
          />
          <span className="text-xs text-white/70 font-bold">Track stock per combination</span>
        </label>
      </div>

      {!canMatrix && (
        <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Add at least one Color, Storage, or RAM option above — then you can set stock for each combination.
        </p>
      )}

      {canMatrix && !enabled && (
        <p className="text-[11px] text-white/40">
          This product uses one total stock number until you enable per-combination tracking
          {comboCount > 0 ? ` (${comboCount} combinations ready).` : '.'}
        </p>
      )}

      {enabled && canMatrix && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={regenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B38B21]/20 text-[#B38B21] text-[10px] font-black uppercase tracking-wide hover:bg-[#B38B21]/30 transition-all"
            >
              <RefreshCw size={11} />
              {rows.length ? `Rebuild ${comboCount} rows from chips` : `Create ${comboCount} rows`}
            </button>
            <span className="text-[10px] text-white/40">
              {rows.length} combination{rows.length === 1 ? '' : 's'} · <strong className="text-white/70">{total}</strong> units total
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="text-[11px] text-amber-400/90">
              Rows are generating… If nothing appears, click &quot;Create rows&quot; above.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-black/30">
              <table className="w-full text-left text-[11px] min-w-[520px]">
                <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                  <tr className="text-white/30 uppercase tracking-wider text-[9px]">
                    {showColor && <th className="py-2 pr-2 font-black">Color</th>}
                    {showStorage && <th className="py-2 pr-2 font-black">Storage</th>}
                    {showRam && <th className="py-2 pr-2 font-black">RAM</th>}
                    <th className="py-2 pr-2 font-black w-24">Stock *</th>
                    <th className="py-2 pr-2 font-black w-24">+ Price (GH₵)</th>
                    <th className="py-2 font-black">SKU code</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id ?? skuMatrixKey(row)} className="border-t border-white/5 hover:bg-white/[0.03]">
                      {showColor && <td className="py-2 pr-2 text-white/80 font-semibold">{row.color || '—'}</td>}
                      {showStorage && <td className="py-2 pr-2 text-white/80 font-semibold">{row.storage || '—'}</td>}
                      {showRam && <td className="py-2 pr-2 text-white/80 font-semibold">{row.ram || '—'}</td>}
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={row.stock}
                          onChange={(e) =>
                            patchRow(i, { stock: Math.max(0, parseInt(e.target.value, 10) || 0) })
                          }
                          className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                          aria-label={`Stock for ${[row.color, row.storage, row.ram].filter(Boolean).join(' ')}`}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.price_modifier}
                          onChange={(e) =>
                            patchRow(i, { price_modifier: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="text"
                          placeholder="Optional"
                          value={row.sku}
                          onChange={(e) => patchRow(i, { sku: e.target.value })}
                          className="w-full min-w-[88px] bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
