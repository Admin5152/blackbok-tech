import React, { useEffect, useMemo } from 'react';
import { Layers, RefreshCw, Package } from 'lucide-react';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import {
  buildSkuCombinations,
  canUseSkuMatrix,
  skuMatrixKey,
  syncSkuRowsFromChips,
  totalSkuStock,
} from '../../lib/productSkuMatrix';
import { formatCurrency } from '../../lib/utils';

type Props = {
  colors: string[];
  storage: string[];
  ram: string[];
  basePrice: number;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  rows: SkuMatrixRow[];
  onRowsChange: (rows: SkuMatrixRow[]) => void;
};

export const ProductSkuMatrix: React.FC<Props> = ({
  colors,
  storage,
  ram,
  basePrice,
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

  useEffect(() => {
    if (!enabled || !canMatrix) return;
    onRowsChange(syncSkuRowsFromChips(colors, storage, ram, rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipSignature, enabled, canMatrix]);

  const regenerate = () => onRowsChange(syncSkuRowsFromChips(colors, storage, ram, rows));

  const handleEnable = (next: boolean) => {
    onEnabledChange(next);
    if (next && canMatrix) onRowsChange(syncSkuRowsFromChips(colors, storage, ram, rows));
  };

  const patchRow = (index: number, patch: Partial<SkuMatrixRow>) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const total = totalSkuStock(rows);
  const inStockRows = rows.filter((r) => r.stock > 0).length;

  const rowLabel = (row: SkuMatrixRow) => {
    const parts = [row.color, row.storage, row.ram].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Default';
  };

  const linePrice = (row: SkuMatrixRow) => basePrice + (row.price_modifier || 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[#B38B21]/30 bg-gradient-to-br from-[#B38B21]/10 to-transparent">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] flex items-center gap-1.5">
            <Layers size={12} /> Inventory per selection
          </p>
          <p className="text-[11px] text-white/45 mt-1 max-w-md">
            Each row is one purchasable SKU (Color × Storage × RAM). Storefront and checkout use these counts.
          </p>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer shrink-0 rounded-xl border border-white/15 bg-black/50 px-4 py-2.5">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canMatrix}
            onChange={(e) => handleEnable(e.target.checked)}
            className="accent-[#B38B21] w-4 h-4"
          />
          <span className="text-xs text-white font-bold">Per-SKU stock</span>
        </label>
      </div>

      {!canMatrix && (
        <p className="text-xs text-amber-400/95 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          Add Color, Storage, or RAM options in the tab above first — then enable per-SKU stock here.
        </p>
      )}

      {canMatrix && !enabled && (
        <p className="text-xs text-white/40 px-1">
          Simple mode: one stock number on the Details tab. Enable per-SKU stock for{' '}
          <strong className="text-white/60">{comboCount}</strong> combination{comboCount === 1 ? '' : 's'}.
        </p>
      )}

      {enabled && canMatrix && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#B38B21] text-black text-[10px] font-black uppercase tracking-wide hover:bg-[#D4AF37] transition-colors"
            >
              <RefreshCw size={12} />
              {rows.length ? 'Rebuild from options' : `Create ${comboCount} SKUs`}
            </button>
            <span className="text-[10px] text-white/40">
              {rows.length} SKU{rows.length === 1 ? '' : 's'} · {inStockRows} in stock ·{' '}
              <strong className="text-[#B38B21]">{total}</strong> units
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-white/15 text-center">
              <Package size={28} className="text-white/20 mb-3" />
              <p className="text-sm text-white/50 font-bold">No SKU rows yet</p>
              <p className="text-xs text-white/35 mt-1">Click &quot;Create SKUs&quot; to generate combinations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[min(52vh,420px)] overflow-y-auto pr-1">
              {rows.map((row, i) => (
                <div
                  key={row.id ?? skuMatrixKey(row)}
                  className={`rounded-xl border p-3 space-y-3 transition-colors ${
                    row.stock > 0
                      ? 'border-white/12 bg-black/40 hover:border-[#B38B21]/30'
                      : 'border-red-500/20 bg-red-500/[0.04] opacity-90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/35">SKU #{i + 1}</p>
                      <p className="text-sm font-bold text-white leading-snug truncate">{rowLabel(row)}</p>
                      <p className="text-[10px] text-[#B38B21] font-black mt-0.5">
                        {formatCurrency(linePrice(row))}
                        {row.price_modifier ? (
                          <span className="text-white/35 font-normal"> (base + modifier)</span>
                        ) : null}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                        row.stock > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {row.stock > 0 ? 'In stock' : 'Out'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-black uppercase text-white/30 block mb-1">Stock *</label>
                      <input
                        type="number"
                        min={0}
                        value={row.stock}
                        onChange={(e) =>
                          patchRow(i, { stock: Math.max(0, parseInt(e.target.value, 10) || 0) })
                        }
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm font-bold focus:border-[#B38B21]/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-white/30 block mb-1">+ GH₵</label>
                      <input
                        type="number"
                        step="0.01"
                        value={row.price_modifier}
                        onChange={(e) =>
                          patchRow(i, { price_modifier: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-white/30 block mb-1">Code</label>
                      <input
                        type="text"
                        placeholder="SKU"
                        value={row.sku}
                        onChange={(e) => patchRow(i, { sku: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
