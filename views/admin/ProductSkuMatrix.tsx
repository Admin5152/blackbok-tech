/**
 * Per-SKU inventory matrix for Admin product form.
 *
 * WHY: Each Color × Storage × RAM × SIM combo is a product_variants row with
 * its own stock, optional absolute price, sim_type, and active flag.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Layers, RefreshCw, Package } from 'lucide-react';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import {
  buildSkuCombinations,
  canUseSkuMatrix,
  skuMatrixKey,
  syncSkuRowsFromChips,
  syncPricesByStorageRam,
  totalSkuStock,
  autoGenerateSku,
  findDuplicateSkuKeys,
  findDuplicateSkuRowIndices,
  SKU_SIM_CODES,
} from '../../lib/productSkuMatrix';
import { formatSimTypeLabel } from '../../lib/productLabels';
import { formatCurrency } from '../../lib/utils';

type Props = {
  colors: string[];
  storage: string[];
  ram: string[];
  simTypes?: string[];
  displaySizes?: string[];
  editions?: string[];
  basePrice: number;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  rows: SkuMatrixRow[];
  onRowsChange: (rows: SkuMatrixRow[]) => void;
  isLight?: boolean;
  onUploadRowImage?: (index: number, file: File) => void | Promise<void>;
  /** When true, hide RAM emphasis and label SIM as Connectivity (iPad). */
  tabletMode?: boolean;
  /** Consoles / controllers — colour + storage + edition. */
  consoleMode?: boolean;
  /** Headphones / speakers / accessories — colour-first variants. */
  simpleVariantMode?: boolean;
  /** Highlight these row indices (duplicate / save error). */
  highlightIndices?: number[];
  /** Bump to force scroll to the first highlighted card. */
  focusNonce?: number;
};

export const ProductSkuMatrix: React.FC<Props> = ({
  colors,
  storage,
  ram,
  simTypes = [],
  displaySizes = [],
  editions = [],
  basePrice,
  enabled,
  onEnabledChange,
  rows,
  onRowsChange,
  isLight = false,
  onUploadRowImage,
  tabletMode = false,
  consoleMode = false,
  simpleVariantMode = false,
  highlightIndices = [],
  focusNonce = 0,
}) => {
  const chipMatrix = canUseSkuMatrix(colors, storage, ram, simTypes, displaySizes, editions);
  /** Existing SKU rows (e.g. console seed) still unlock Generate versions. */
  const canMatrix = chipMatrix || rows.length > 0;
  const chipSignature = useMemo(
    () =>
      `${displaySizes.join('\u0001')}|${colors.join('\u0001')}|${storage.join('\u0001')}|${ram.join('\u0001')}|${simTypes.join('\u0001')}|${editions.join('\u0001')}`,
    [colors, storage, ram, simTypes, displaySizes, editions],
  );

  const comboCount = useMemo(() => {
    if (!chipMatrix) return rows.length;
    return buildSkuCombinations(colors, storage, ram, simTypes, displaySizes, editions).length;
  }, [colors, storage, ram, simTypes, displaySizes, editions, chipMatrix, rows.length]);

  const duplicateKeys = useMemo(() => new Set(findDuplicateSkuKeys(rows)), [rows]);
  const liveDupIndices = useMemo(() => new Set(findDuplicateSkuRowIndices(rows)), [rows]);
  const forcedHighlight = useMemo(() => new Set(highlightIndices), [highlightIndices]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!enabled || !chipMatrix) return;
    onRowsChange(
      syncSkuRowsFromChips(colors, storage, ram, rows, simTypes, displaySizes, editions),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipSignature, enabled, chipMatrix]);

  useEffect(() => {
    if (!focusNonce) return;
    const target =
      highlightIndices.find((i) => i >= 0 && i < rows.length) ??
      findDuplicateSkuRowIndices(rows)[0];
    if (target == null) return;
    const el = cardRefs.current[target];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusNonce, highlightIndices, rows]);

  const regenerate = () =>
    onRowsChange(
      syncSkuRowsFromChips(colors, storage, ram, rows, simTypes, displaySizes, editions),
    );

  const handleEnable = (next: boolean) => {
    onEnabledChange(next);
    if (next && chipMatrix) {
      onRowsChange(
        syncSkuRowsFromChips(colors, storage, ram, rows, simTypes, displaySizes, editions),
      );
    }
  };

  const patchRow = (index: number, patch: Partial<SkuMatrixRow>) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const total = totalSkuStock(rows);
  const inStockRows = rows.filter((r) => r.stock > 0 && r.is_active !== false).length;

  const rowLabel = (row: SkuMatrixRow) => {
    const parts = [
      row.display_size,
      row.color,
      row.storage,
      row.ram && row.ram.toUpperCase() !== 'N/A' ? row.ram : '',
      row.sim_type ? formatSimTypeLabel(row.sim_type) : '',
      row.edition,
    ].filter(Boolean);
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
  const cardCls = (row: SkuMatrixRow, index: number) => {
    const flagged =
      liveDupIndices.has(index) || forcedHighlight.has(index) || duplicateKeys.has(skuMatrixKey(row));
    if (flagged) {
      return 'border-red-500 ring-2 ring-red-500/50 bg-red-500/[0.08] shadow-[0_0_0_1px_rgba(239,68,68,0.35)]';
    }
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

  const enableAndCreate = () => {
    handleEnable(true);
  };

  const helpBlurb = consoleMode
    ? 'Add Colour, Storage, and Edition — then generate versions. Set price and stock on each row (e.g. Digital White · 4 units).'
    : simpleVariantMode
      ? 'Add Colour (and Storage if needed) — then generate versions. Edit price and stock on each row.'
      : `Add colors, storage${tabletMode ? '' : ', RAM'}, and ${tabletMode ? 'connectivity' : 'SIM'} — then generate versions. Price by Storage + RAM (same across colors). Stock per color on each row (e.g. Blue 6, Black 4).`;

  const missingHint = consoleMode
    ? 'Add Colour, Storage, or Edition options above first — then generate versions here.'
    : simpleVariantMode
      ? 'Add Colour (or Storage) options above first — then generate versions here.'
      : `Add Color, Size, Storage${tabletMode ? '' : ', RAM'}, or ${tabletMode ? 'Connectivity' : 'SIM'} options above first — then generate versions here.`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[#B38B21]/30 bg-gradient-to-br from-[#B38B21]/10 to-transparent">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] flex items-center gap-1.5">
            <Layers size={12} /> Generate versions from options
          </p>
          <p className={`text-[11px] mt-1 max-w-md ${muted}`}>{helpBlurb}</p>
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
          <span className={`text-xs font-bold ${title}`}>Generate versions from options</span>
        </label>
      </div>

      {!canMatrix && (
        <p className="text-xs text-amber-400/95 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          {missingHint}
        </p>
      )}

      {canMatrix && !enabled && (
        <div className="space-y-3">
          <p className={`text-xs px-1 ${muted}`}>
            Ready to build{' '}
            <strong className={title}>{comboCount}</strong> version
            {comboCount === 1 ? '' : 's'} from your options. Or keep simple mode (one stock number on
            Details).
          </p>
          <button
            type="button"
            onClick={enableAndCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#B38B21] text-black text-[11px] font-black uppercase tracking-wide hover:bg-[#D4AF37] transition-colors"
          >
            <Layers size={14} />
            Create {comboCount} version{comboCount === 1 ? '' : 's'}
          </button>
        </div>
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
              {rows.length ? 'Rebuild from options' : `Create ${comboCount} versions`}
            </button>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => onRowsChange(syncPricesByStorageRam(rows))}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-colors ${
                  isLight
                    ? 'border-black/15 hover:border-[#B38B21]/60 hover:bg-black/[0.03]'
                    : 'border-white/15 hover:border-[#B38B21]/50 hover:bg-white/[0.04]'
                }`}
                title="Copy price from the first row of each Storage+RAM(+size/SIM) group onto every color"
              >
                Match prices by Storage + RAM
              </button>
            )}
            <span className={`text-[10px] ${muted}`}>
              {rows.length} version{rows.length === 1 ? '' : 's'} · {inStockRows} in stock ·{' '}
              <strong className="text-[#B38B21]">{total}</strong> units — price by config, stock by
              color
            </span>
          </div>

          {(duplicateKeys.size > 0 || liveDupIndices.size > 0) && (
            <p className="text-xs text-red-400 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2">
              Duplicate combinations or item codes detected. Highlighted cards share the same size /
              color / storage / RAM / SIM (or the same item code). Fix those before saving.
            </p>
          )}

          {rows.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed text-center ${
                isLight ? 'border-black/15' : 'border-white/15'
              }`}
            >
              <Package size={28} className={`mb-3 ${isLight ? 'text-black/20' : 'text-white/20'}`} />
              <p className={`text-sm font-bold ${muted}`}>No versions yet</p>
              <p className={`text-xs mt-1 ${muted}`}>Click &quot;Create versions&quot; to generate combinations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[min(52vh,420px)] overflow-y-auto bb-scrollbar pr-1">
              {rows.map((row, i) => {
                const priceLbl = linePriceLabel(row);
                const flagged =
                  liveDupIndices.has(i) || forcedHighlight.has(i) || duplicateKeys.has(skuMatrixKey(row));
                return (
                  <div
                    key={row.id ?? `${skuMatrixKey(row)}-${i}`}
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    data-sku-row={i}
                    className={`rounded-xl border p-3 space-y-3 transition-colors ${cardCls(row, i)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${muted}`}>
                          Version #{i + 1}
                          {flagged ? (
                            <span className="ml-2 text-red-400 normal-case tracking-normal">Duplicate</span>
                          ) : null}
                        </p>
                        <p className={`text-sm font-bold leading-snug truncate ${title}`}>{rowLabel(row)}</p>
                        <p
                          className={`text-[10px] font-black mt-0.5 ${
                            priceLbl.muted ? muted : 'text-[#B38B21]'
                          }`}
                        >
                          {priceLbl.text}
                          {priceLbl.muted ? (
                            <span className={`font-normal ${muted}`}> · uses base price</span>
                          ) : (
                            <span className={`font-normal ${muted}`}> · your price</span>
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
                          Price GH₵
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
                        <p className={`text-[8px] mt-0.5 ${muted}`}>
                          Leave blank = main price{row.price_modifier ? ` + ${row.price_modifier}` : ''}
                        </p>
                      </div>
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
                              {formatSimTypeLabel(c)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`text-[8px] font-black uppercase block mb-1 ${muted}`}>
                          Price add-on
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
                          Item code
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Generated on save if blank"
                            value={row.sku}
                            onChange={(e) => patchRow(i, { sku: e.target.value })}
                            className={`${inputCls.replace('text-sm font-bold', 'text-xs')} flex-1`}
                          />
                          <button
                            type="button"
                            title="Make code from colour, storage & SIM"
                            onClick={() => patchRow(i, { sku: autoGenerateSku(row) })}
                            className="shrink-0 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-[#B38B21]/15 text-[#B38B21] border border-[#B38B21]/30"
                          >
                            Auto
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className={`text-[8px] font-black uppercase block mb-1 ${muted}`}>
                          Version photo
                        </label>
                        <div className="flex flex-col gap-1.5">
                          {row.image_url ? (
                            <div
                              className={`h-16 rounded-lg overflow-hidden flex items-center justify-center ${
                                isLight ? 'bg-black/[0.03]' : 'bg-white/5'
                              }`}
                            >
                              <img
                                src={row.image_url}
                                alt=""
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          ) : null}
                          {onUploadRowImage ? (
                            <label className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#B38B21]/15 text-[#B38B21] border border-[#B38B21]/30 text-[9px] font-black uppercase cursor-pointer hover:bg-[#B38B21]/25">
                              Upload
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,image/jpg"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void onUploadRowImage(i, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          ) : null}
                          <input
                            type="url"
                            placeholder="Or paste photo link"
                            value={row.image_url || ''}
                            onChange={(e) => patchRow(i, { image_url: e.target.value })}
                            className={inputCls.replace('text-sm font-bold', 'text-xs')}
                          />
                        </div>
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
