import React, { useMemo } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import {
  buildSkuCombinations,
  canUseSkuMatrix,
  mergeSkuMatrix,
  skuMatrixKey,
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
  const comboCount = useMemo(() => {
    if (!canMatrix) return 0;
    return (colors.length ? colors.length : 1) *
      (storage.length ? storage.length : 1) *
      (ram.length ? ram.length : 1);
  }, [colors, storage, ram, canMatrix]);

  const showColor = colors.length > 0;
  const showStorage = storage.length > 0;
  const showRam = ram.length > 0;

  const regenerate = () => {
    const combos = buildSkuCombinations(colors, storage, ram);
    onRowsChange(mergeSkuMatrix(combos, rows));
  };

  const patchRow = (index: number, patch: Partial<SkuMatrixRow>) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const total = totalSkuStock(rows);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] flex items-center gap-1.5">
            <Layers size={12} /> SKU inventory matrix
          </p>
          <p className="text-[11px] text-white/40 mt-1 max-w-md">
            Set stock per Color / Storage / RAM combination. Checkout decrements the matching row.
            Total product stock syncs automatically.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canMatrix}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="accent-[#B38B21]"
          />
          <span className="text-xs text-white/60">Track per combination</span>
        </label>
      </div>

      {!canMatrix && (
        <p className="text-[11px] text-white/30 italic">
          Add at least one Color, Storage, or RAM chip above to enable per-SKU stock.
        </p>
      )}

      {enabled && canMatrix && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={regenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B38B21]/15 text-[#B38B21] text-[10px] font-black uppercase tracking-wide hover:bg-[#B38B21]/25 transition-all"
            >
              <RefreshCw size={11} />
              {rows.length ? 'Sync rows from chips' : `Generate ${comboCount} rows`}
            </button>
            <span className="text-[10px] text-white/35">
              {rows.length} row{rows.length === 1 ? '' : 's'} · {total} units total
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="text-[11px] text-amber-400/90">
              Click Generate to build rows from your chips, then enter stock for each combination.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1 max-h-56 overflow-y-auto rounded-lg border border-white/5">
              <table className="w-full text-left text-[11px] min-w-[520px]">
                <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                  <tr className="text-white/30 uppercase tracking-wider text-[9px]">
                    {showColor && <th className="py-2 pr-2 font-black">Color</th>}
                    {showStorage && <th className="py-2 pr-2 font-black">Storage</th>}
                    {showRam && <th className="py-2 pr-2 font-black">RAM</th>}
                    <th className="py-2 pr-2 font-black w-20">Stock</th>
                    <th className="py-2 pr-2 font-black w-24">+ Price</th>
                    <th className="py-2 font-black">SKU</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id ?? skuMatrixKey(row)} className="border-t border-white/5 hover:bg-white/[0.02]">
                      {showColor && <td className="py-1.5 pr-2 text-white/70">{row.color || '—'}</td>}
                      {showStorage && <td className="py-1.5 pr-2 text-white/70">{row.storage || '—'}</td>}
                      {showRam && <td className="py-1.5 pr-2 text-white/70">{row.ram || '—'}</td>}
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={row.stock}
                          onChange={(e) =>
                            patchRow(i, { stock: Math.max(0, parseInt(e.target.value, 10) || 0) })
                          }
                          className="w-16 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          value={row.price_modifier}
                          onChange={(e) =>
                            patchRow(i, { price_modifier: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5">
                        <input
                          type="text"
                          placeholder="Optional"
                          value={row.sku}
                          onChange={(e) => patchRow(i, { sku: e.target.value })}
                          className="w-full min-w-[80px] bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
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