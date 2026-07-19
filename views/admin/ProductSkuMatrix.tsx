/**
 * Per-SKU inventory matrix for Admin product form.
 *
 * WHY: Each Color × Storage × RAM × SIM combo is a product_variants row with
 * its own stock, optional absolute price, sim_type, and active flag.
 */
import React, { useEffect, useMemo } from 'react';
import { Layers, RefreshCw, Package } from 'lucide-react';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import {
  buildSkuCombinations,
  canUseSkuMatrix,
  skuMatrixKey,
  syncSkuRowsFromChips,
  totalSkuStock,
  autoGenerateSku,
  findDuplicateSkuKeys,
  SKU_SIM_CODES,
} from '../../lib/productSkuMatrix';
import { formatCurrency } from '../../lib/utils';

type Props = {
  colors: string[];
  storage: string[];
  ram: string[];
  simTypes?: string[];
  basePrice: number;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  rows: SkuMatrixRow[];
  onRowsChange: (rows: SkuMatrixRow[]) => void;
  isLight?: boolean;
};

export const ProductSkuMatrix: React.FC<Props> = ({
  colors,
  storage,
  ram,
  simTypes = [],
  basePrice,
  enabled,
  onEnabledChange,
  rows,
  onRowsChange,
  isLight = false,
}) => {
  const canMatrix = canUseSkuMatrix(colors, storage, ram, simTypes);
  const chipSignature = useMemo(
    () =>
      `${colors.join('\u0001')}|${storage.join('\u0001')}|${ram.join('\u0001')}|${simTypes.join('\u0001')}`,
    [colors, storage, ram, simTypes],
  );

  const comboCount = useMemo(() => {
    if (!canMatrix) return 0;
    return buildSkuCombinations(colors, storage, ram, simTypes).length;
  }, [colors, storage, ram, simTypes, canMatrix]);

  const duplicateKeys = useMemo(() => new Set(findDuplicateSkuKeys(rows)), [rows]);

  useEffect(() => {
    if (!enabled || !canMatrix) return;
    onRowsChange(syncSkuRowsFromChips(colors, storage, ram, rows, simTypes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipSignature, enabled, canMatrix]);

  const regenerate = () =>
    onRowsChange(syncSkuRowsFromChips(colors, storage, ram, rows, simTypes));

  const handleEnable = (next: boolean) => {
    onEnabledChange(next);
    if (next && canMatrix) {
      onRowsChange(syncSkuRowsFromChips(colors, storage, ram, rows, simTypes));
    }
  };

  const patchRow = (index: number, patch: Partial<SkuMatrixRow>) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const total = totalSkuStock(rows);
  const inStockRows = rows.filter((r) => r.stock > 0 && r.is_active !== false).length;

  const rowLabel = (row: SkuMatrixRow) => {
    const parts = [row.color, row.storage, row.ram, row.sim_type].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Default';
  };

  /** Display price: absolute when set, else grey base+modifier preview. */
  const linePriceLabel = (row: SkuMatrixRow) => {
    if (row.price != null && Number.isFinite(Number(row.price))) {
      return { text: formatCurrency(Number(row.price)), muted: false };
    }
    return {
      text: formatCurrency(basePrice + (row.price_modifier || 0)),
      muted: true,
    };
  };

  const muted = isLight ? 'text-black/45' : 'text-white/45';
  const title = isLight ? 'text-black' : 'text-white';
  const inputCls = isLight
    ? 'w-full bg-black/[0.04] border border-black/10 rounded-lg px-2 py-1.5 text-black text-sm font-bold focus:border-[#B38B21]/50 focus:outline-none'
    : 'w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm font-bold focus:border-[#B38B21]/50 focus:outline-none';
  const cardCls = (row: SkuMatrixRow) => {
    const dup = duplicateKeys.has(skuMatrixKey(row));
    if (dup) return 'border-amber-500/40 bg-amber-500/[0.06]';
    if (row.is_active === false) {
      return isLight
        ? 'border-black/10 bg-black/[0.03] opacity-70'
        : 'border-white/10 bg-black/30 opacity-70';
    }
    return row.stock > 0
      ? isLight
        ? 'border-black/10 bg-white hover:border-[#B38B21]/30'
        : 'border-white/12 bg-black/40 hover:border-[#B38B21]/30'
      : 'border-red-500/20 bg-red-500/[0.04] opacity-90';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[#B38B21]/30 bg-gradient-to-br from-[#B38B21]/10 to-transparent">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] flex items-center gap-1.5">
            <Layers size={12} /> Inventory per selection
          </p>
          <p className={`text-[11px] mt-1 max-w-md ${muted}`}>
            Each row is one purchasable SKU (Color × Storage × RAM × SIM). Absolute price blank =
            base + modifier.
          </p>
        </div>
        <label
          className={`flex items-center gap-2.5 cursor-pointer shrink-0 rounded-xl border px-4 py-2.5 ${
            isLight ? 'border-black/15 bg-black/[0.04]' : 'border-white/15 bg-black/50'
          }`}
        >
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canMatrix}
            onChange={(e) => handleEnable(e.target.checked)}
            className="accent-[#B38B21] w-4 h-4"
          />
          <span className={`text-xs font-bold ${title}`}>Stock per version</span>
        </label>
      </div>

      {!canMatrix && (
        <p className="text-xs text-amber-400/95 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          Add Color, Storage, RAM, or SIM options above first — then enable per-SKU stock here.
        </p>
      )}

      {canMatrix && !enabled && (
        <p className={`text-xs px-1 ${muted}`}>
          Simple mode: one stock number on the Details tab. Enable per-SKU stock for{' '}
          <strong className={title}>{comboCount}</strong> combination{comboCount === 1 ? '' : 's'}.
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
            <span className={`text-[10px] ${muted}`}>
              {rows.length} SKU{rows.length === 1 ? '' : 's'} · {inStockRows} in stock ·{' '}
              <strong className="text-[#B38B21]">{total}</strong> units
            </span>
          </div>

          {duplicateKeys.size > 0 && (
            <p className="text-xs text-amber-400 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2">
              Duplicate combinations detected (same color/storage/RAM/SIM). Fix before saving —
              matches DB constraint uq_variant_combo.
            </p>
          )}

          {rows.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed text-center ${
                isLight ? 'border-black/15' : 'border-white/15'
              }`}
            >
              <Package size={28} className={`mb-3 ${isLight ? 'text-black/20' : 'text-white/20'}`} />
              <p className={`text-sm font-bold ${muted}`}>No SKU rows yet</p>
              <p className={`text-xs mt-1 ${muted}`}>Click &quot;Create SKUs&quot; to generate combinations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[min(52vh,420px)] overflow-y-auto bb-scrollbar pr-1">
              {rows.map((row, i) => {
                const priceLbl = linePriceLabel(row);
                return (
                  <div
                    key={row.id ?? skuMatrixKey(row)}
                    className={`rounded-xl border p-3 space-y-3 transition-colors ${cardCls(row)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${muted}`}>
                          SKU #{i + 1}
                        </p>
                        <p className={`text-sm font-bold leading-snug truncate ${title}`}>{rowLabel(row)}</p>
                        <p
                          className={`text-[10px] font-black mt-0.5 ${
                            priceLbl.muted ? muted : 'text-[#B38B21]'
                          }`}
                        >
                          {priceLbl.text}
                          {priceLbl.muted ? (
                            <span className={`font-normal ${muted}`}> (base + modifier)</span>
                          ) : (
                            <span className={`font-normal ${muted}`}> (absolute)</span>
                          )}
                        </p>
                      </div>
                      <label className="shrink-0 flex items-center gap-1.5 text-[9px] font-black uppercase">
                        <input
                          type="checkbox"
                          checked={row.is_active !== false}
                          onChange={(e) => patchRow(i, { is_active: e.target.checked })}
                          className="accent-[#B38B21]"
                        />
                        Active
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[8px] font-black uppercase block mb-1 ${muted}`}>
                          Stock *
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={row.stock}
                          onChange={(e) =>
                            patchRow(i, { stock: Math.max(0, parseInt(e.target.value, 10) || 0) })
                          }
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={`text-[8px] font-black uppercase block mb-1 ${muted}`}>
                          SIM type
                        </label>
                        <select
                          value={row.sim_type || ''}
                          onChange={(e) => patchRow(i, { sim_type: e.target.value })}
                          className={inputCls.replace('text-sm font-bold', 'text-xs')}
                        >
                          <option value="">—</option>
                          {SKU_SIM_CODES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`text-[8px] font-black uppercase block mb-1 ${muted}`}>
                          Absolute GH₵
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder={String(basePrice + (row.price_modifier || 0))}
                          value={row.price != null && Number.isFinite(row.price) ? row.price : ''}
                          onChange={(e) => {
                            const t = e.target.value.trim();
                            patchRow(i, {
                              price: t === '' ? null : parseFloat(t) || 0,
                            });
                          }}
                          className={`${inputCls.replace('text-sm font-bold', 'text-xs')} ${
                            row.price == null ? muted : ''
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`text-[8px] font-black uppercase block mb-1 ${muted}`}>
                          + Modifier
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.price_modifier}
                          onChange={(e) =>
                            patchRow(i, { price_modifier: parseFloat(e.target.value) || 0 })
                          }
                          className={inputCls.replace('text-sm font-bold', 'text-xs')}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className={`text-[8px] font-black uppercase block mb-1 ${muted}`}>
                          SKU code
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="auto on save if blank"
                            value={row.sku}
                            onChange={(e) => patchRow(i, { sku: e.target.value })}
                            className={`${inputCls.replace('text-sm font-bold', 'text-xs')} flex-1`}
                          />
                          <button
                            type="button"
                            title="Generate from color-storage-sim"
                            onClick={() => patchRow(i, { sku: autoGenerateSku(row) })}
                            className="shrink-0 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-[#B38B21]/15 text-[#B38B21] border border-[#B38B21]/30"
                          >
                            Auto
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className={`text-[8px] font-black uppercase block mb-1 ${muted}`}>
                          Image URL (optional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://…"
                          value={row.image_url || ''}
                          onChange={(e) => patchRow(i, { image_url: e.target.value })}
                          className={inputCls.replace('text-sm font-bold', 'text-xs')}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
