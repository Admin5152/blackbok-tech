/**
 * Admin product create/edit form — details, options/SKUs, images, listing.
 *
 * WHY: Central staff surface for catalog CRUD; trade_model bridges to
 * trade_devices so PDP trade-in banners resolve correctly.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Save, X, Package, ImageIcon, Layers, Tag, Upload, Star } from 'lucide-react';
import type { Product, ProductImage } from '../../types';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import { totalSkuStock, canUseSkuMatrix, chipsFromSkuRows } from '../../lib/productSkuMatrix';
import { formatCurrency } from '../../lib/utils';
import { ProductSkuMatrix } from './ProductSkuMatrix';
import { getApf, type AdminProductFormStyles } from './adminProductFormStyles';
import { getTradeDevices } from '../../lib/tradeApi';
import type { TradeDeviceRow } from '../../types/supabase';
import { uploadImage } from '../../lib/upload';
import {
  addProductImage,
  setPrimaryProductImage,
  deleteProductImage,
  setProductImageVariant,
} from '../../lib/api';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  PRODUCT_SIM_OPTIONS,
  PRODUCT_STATUSES,
  type ProductDraft,
} from './adminProductConstants';

type TabId = 'details' | 'options' | 'images' | 'listing';

type ChipFieldProps = {
  label: string;
  chips: string[];
  inputVal: string;
  setInputVal: (v: string) => void;
  placeholder: string;
  onAdd: () => void;
  onRemove: (v: string) => void;
  styles: AdminProductFormStyles;
  readOnly?: boolean;
  readOnlyNote?: string;
};

const ChipField: React.FC<ChipFieldProps> = ({
  label,
  chips,
  inputVal,
  setInputVal,
  placeholder,
  onAdd,
  onRemove,
  styles: s,
  readOnly,
  readOnlyNote,
}) => (
  <div className={s.card}>
    <label className={s.label}>{label}</label>
    {readOnly && readOnlyNote && (
      <p className={`text-[10px] mb-2 ${s.muted}`}>{readOnlyNote}</p>
    )}
    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
      {chips.length === 0 && <span className={`text-[10px] italic ${s.muted}`}>None yet</span>}
      {chips.map((c) => (
        <span
          key={c}
          className={`flex items-center gap-1 border rounded-lg px-2 py-1 text-[10px] font-bold ${s.chip}`}
        >
          {c}
          {!readOnly && (
            <button type="button" onClick={() => onRemove(c)} className="opacity-50 hover:text-red-500 transition-colors">
              <X size={10} />
            </button>
          )}
        </span>
      ))}
    </div>
    {!readOnly && (
      <div className="flex gap-2">
        <input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          className={`${s.input} flex-1 text-xs`}
        />
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2 bg-[#B38B21]/15 hover:bg-[#B38B21]/30 text-[#B38B21] border border-[#B38B21]/30 rounded-xl text-[10px] font-black uppercase transition-all shrink-0"
        >
          Add
        </button>
      </div>
    )}
  </div>
);

type Props = {
  draft: ProductDraft;
  setDraft: React.Dispatch<React.SetStateAction<ProductDraft>>;
  colorIn: string;
  setColorIn: (v: string) => void;
  storageIn: string;
  setStorageIn: (v: string) => void;
  ramIn: string;
  setRamIn: (v: string) => void;
  simIn: string;
  setSimIn: (v: string) => void;
  specsIn: string;
  setSpecsIn: (v: string) => void;
  onAddChip: (field: 'colors' | 'storage' | 'ram' | 'specs' | 'sim_types', val: string, clear: () => void) => void;
  onRemoveChip: (field: 'colors' | 'storage' | 'ram' | 'specs' | 'sim_types', val: string) => void;
  skuMatrixEnabled: boolean;
  setSkuMatrixEnabled: (v: boolean) => void;
  skuRows: SkuMatrixRow[];
  setSkuRows: (rows: SkuMatrixRow[]) => void;
  saving: boolean;
  error: string;
  onSubmit: () => void;
  isLight?: boolean;
};

export const AdminProductForm: React.FC<Props> = ({
  draft,
  setDraft,
  isLight = false,
  colorIn,
  setColorIn,
  storageIn,
  setStorageIn,
  ramIn,
  setRamIn,
  simIn,
  setSimIn,
  specsIn,
  setSpecsIn,
  onAddChip,
  onRemoveChip,
  skuMatrixEnabled,
  setSkuMatrixEnabled,
  skuRows,
  setSkuRows,
  saving,
  error,
  onSubmit,
}) => {
  const s = getApf(isLight);
  const [tab, setTab] = useState<TabId>('details');
  const [tradeDevices, setTradeDevices] = useState<TradeDeviceRow[]>([]);
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState('');
  const [specsJsonError, setSpecsJsonError] = useState('');

  const priceNum = Number(draft.price) || 0;
  const chipsLocked = skuMatrixEnabled && skuRows.length > 0;
  const hasOptions = canUseSkuMatrix(draft.colors || [], draft.storage || [], draft.ram || [], draft.sim_types || []);
  const displayStock = skuMatrixEnabled && skuRows.length > 0 ? totalSkuStock(skuRows) : (draft.stock ?? 0);
  const comboCount = skuRows.length;
  const gallery = draft.images || [];
  const derivedChips = useMemo(
    () => (chipsLocked ? chipsFromSkuRows(skuRows) : null),
    [chipsLocked, skuRows],
  );
  const displayColors = derivedChips?.colors ?? draft.colors ?? [];
  const displayStorage = derivedChips?.storage ?? draft.storage ?? [];
  const displayRam = derivedChips?.ram ?? draft.ram ?? [];
  const displaySimTypes = derivedChips?.sim_types ?? draft.sim_types ?? [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const devices = await getTradeDevices();
        if (!cancelled) setTradeDevices(devices);
      } catch (e) {
        console.warn('getTradeDevices failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (draft.specificationsJson != null) return;
    const spec = draft.specifications;
    const json =
      spec && typeof spec === 'object'
        ? JSON.stringify(spec, null, 2)
        : '{}';
    setDraft((d) => ({ ...d, specificationsJson: json }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  const filteredTradeModels = useMemo(() => {
    const q = tradeSearch.trim().toLowerCase();
    if (!q) return tradeDevices.slice(0, 40);
    return tradeDevices.filter((d) => d.model.toLowerCase().includes(q)).slice(0, 40);
  }, [tradeDevices, tradeSearch]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Details', icon: <Package size={12} /> },
                { id: 'options', label: 'Options & stock versions', icon: <Layers size={12} /> },
    { id: 'images', label: 'Images', icon: <ImageIcon size={12} /> },
    { id: 'listing', label: 'Listing', icon: <Tag size={12} /> },
  ];

  const canSave =
    Boolean(draft.name?.trim()) && Number.isFinite(priceNum) && priceNum >= 0 && !saving && !specsJsonError;

  const applySpecsJson = (raw: string) => {
    setDraft((d) => {
      if (!raw.trim()) {
        setSpecsJsonError('');
        return { ...d, specificationsJson: raw, specifications: {} };
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setSpecsJsonError('Must be a JSON object, e.g. {"chip":"A18"}');
          return { ...d, specificationsJson: raw };
        }
        setSpecsJsonError('');
        return {
          ...d,
          specificationsJson: raw,
          specifications: parsed as Record<string, unknown>,
        };
      } catch {
        setSpecsJsonError('Invalid JSON');
        return { ...d, specificationsJson: raw };
      }
    });
  };

  const handleUploadImage = async (file: File | null) => {
    if (!file) return;
    setImgBusy(true);
    setImgError('');
    try {
      const url = await uploadImage(file, 'product-images');
      if (!url) throw new Error('Upload returned no URL');
      if (draft.id) {
        const row = await addProductImage(draft.id, {
          url,
          sort_order: gallery.length,
          is_primary: gallery.length === 0,
        });
        const next = [...gallery, row];
        setDraft({
          ...draft,
          images: next,
          image: row.is_primary ? row.url : draft.image,
        });
      } else {
        const pending: ProductImage = {
          id: `pending-${Date.now()}`,
          url,
          sort_order: gallery.length,
          is_primary: gallery.length === 0,
        };
        setDraft({
          ...draft,
          images: [...gallery, pending],
          image: pending.is_primary ? url : draft.image,
        });
      }
    } catch (e) {
      setImgError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setImgBusy(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    const img = gallery.find((g) => g.id === imageId);
    if (!img) return;
    if (draft.id && !String(imageId).startsWith('pending-')) {
      setImgBusy(true);
      try {
        await setPrimaryProductImage(draft.id, imageId);
        setDraft({
          ...draft,
          image: img.url,
          images: gallery.map((g) => ({ ...g, is_primary: g.id === imageId })),
        });
      } catch (e) {
        setImgError(e instanceof Error ? e.message : 'Could not set primary');
      } finally {
        setImgBusy(false);
      }
    } else {
      setDraft({
        ...draft,
        image: img.url,
        images: gallery.map((g) => ({ ...g, is_primary: g.id === imageId })),
      });
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Remove this image?')) return;
    if (draft.id && !String(imageId).startsWith('pending-')) {
      try {
        await deleteProductImage(imageId, draft.id);
      } catch (e) {
        setImgError(e instanceof Error ? e.message : 'Delete failed');
        return;
      }
    }
    const next = gallery.filter((g) => g.id !== imageId);
    const primary = next.find((g) => g.is_primary) || next[0];
    setDraft({
      ...draft,
      images: next.map((g, i) => ({
        ...g,
        sort_order: i,
        is_primary: primary ? g.id === primary.id : false,
      })),
      image: primary?.url || draft.image,
    });
  };

  const handleAssignVariant = async (imageId: string, variantId: string) => {
    const nextVid = variantId || null;
    setDraft({
      ...draft,
      images: gallery.map((g) =>
        g.id === imageId ? { ...g, variant_id: nextVid } : g,
      ),
    });
    if (draft.id && !String(imageId).startsWith('pending-')) {
      try {
        await setProductImageVariant(imageId, nextVid);
      } catch (e) {
        console.warn('variant_id assign failed:', e);
        setImgError(e instanceof Error ? e.message : 'Could not assign variant');
      }
    }
  };

  const variantOptions = skuRows.filter((r) => r.id);

  return (
    <div className="flex flex-col lg:flex-row min-h-0">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className={`sticky top-0 z-20 backdrop-blur border-b px-5 sm:px-6 py-4 ${s.headerBg} ${s.headerBorder}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#B38B21]">
                {draft.id ? 'Edit product' : 'New product'}
              </p>
              <h3 className={`text-lg font-black mt-0.5 truncate max-w-[280px] sm:max-w-md ${s.title}`}>
                {draft.name?.trim() || 'Untitled product'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B38B21] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all disabled:opacity-40 shrink-0"
            >
              <Save size={14} />
              {saving ? 'Saving…' : draft.id ? 'Save' : 'Publish'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${
                  tab === t.id ? s.tabActive : s.tabIdle
                }`}
              >
                {t.icon}
                {t.label}
                {t.id === 'options' && comboCount > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[9px] ${isLight ? 'bg-black/10' : 'bg-black/20'}`}>{comboCount}</span>
                )}
                {t.id === 'images' && gallery.length > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[9px] ${isLight ? 'bg-black/10' : 'bg-black/20'}`}>{gallery.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bb-scrollbar px-5 sm:px-6 py-5 max-h-[min(70vh,640px)]">
          {error && (
            <div className={`mb-4 text-xs rounded-xl px-4 py-3 ${s.errorBox}`}>
              {error}
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-4">
              <div className={s.card}>
                <label className={s.label}>Product name *</label>
                <input
                  placeholder="e.g. iPhone 16 Pro Max"
                  value={draft.name ?? ''}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className={s.input}
                />
              </div>

              <div className={`${s.card} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
                <div>
                  <label className={s.label}>Price (GH₵) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.price ?? ''}
                    onChange={(e) => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })}
                    className={s.input}
                  />
                </div>
                <div>
                  <label className={s.label}>Category</label>
                  <select
                    value={draft.category ?? 'iPhone'}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as Product['category'] })}
                    className={s.input}
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={s.label}>Brand</label>
                  <input
                    type="text"
                    value={draft.brand ?? ''}
                    onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                    className={s.input}
                    placeholder="Apple"
                  />
                </div>
                <div>
                  <label className={s.label}>Condition</label>
                  <select
                    value={draft.condition ?? 'new'}
                    onChange={(e) => setDraft({ ...draft, condition: e.target.value })}
                    className={s.input}
                  >
                    {PRODUCT_CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={s.label}>Status</label>
                  <select
                    value={draft.status ?? 'active'}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    className={s.input}
                  >
                    {PRODUCT_STATUSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={s.label}>Currency</label>
                  <select
                    value={draft.currency ?? 'GHS'}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                    className={s.input}
                  >
                    <option value="GHS">GHS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                {/* Trade bridge: products.trade_model must match trade_devices.model */}
                <div className="sm:col-span-2 relative">
                  <label className={s.label}>Matching trade-in model</label>
                  <input
                    type="text"
                    value={tradeOpen ? tradeSearch : (draft.trade_model ?? '')}
                    onFocus={() => {
                      setTradeOpen(true);
                      setTradeSearch(draft.trade_model ?? '');
                    }}
                    onChange={(e) => {
                      setTradeSearch(e.target.value);
                      setTradeOpen(true);
                    }}
                    onBlur={() => {
                      // Delay so option click registers
                      window.setTimeout(() => setTradeOpen(false), 180);
                    }}
                    className={s.input}
                    placeholder="Search trade-in models… e.g. iPhone 14"
                    autoComplete="off"
                  />
                  {tradeOpen && (
                    <div
                      className={`absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl ${
                        isLight ? 'bg-white border-black/10' : 'bg-[#121212] border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-xs ${s.muted} hover:bg-[#B38B21]/10`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setDraft({ ...draft, trade_model: null });
                          setTradeSearch('');
                          setTradeOpen(false);
                        }}
                      >
                        Clear (not trade-eligible)
                      </button>
                      {filteredTradeModels.length === 0 && (
                        <p className={`px-3 py-2 text-xs ${s.muted}`}>No models match</p>
                      )}
                      {filteredTradeModels.map((d) => (
                        <button
                          key={d.model}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-[#B38B21]/15 ${s.title}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setDraft({ ...draft, trade_model: d.model });
                            setTradeSearch(d.model);
                            setTradeOpen(false);
                          }}
                        >
                          {d.model}
                          <span className={`ml-2 font-normal ${s.muted}`}>{d.device_type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className={`text-[10px] mt-1 ${s.muted}`}>
                    Links this catalog product to trade_devices — required for trade-in banners / targets.
                  </p>
                </div>
                {!skuMatrixEnabled && (
                  <div>
                    <label className={s.label}>Stock</label>
                    <input
                      type="number"
                      min={0}
                      value={draft.stock ?? ''}
                      onChange={(e) => setDraft({ ...draft, stock: parseInt(e.target.value, 10) || 0 })}
                      className={s.input}
                    />
                  </div>
                )}
                {skuMatrixEnabled && skuRows.length > 0 && (
                  <div>
                    <label className={s.label}>Total stock</label>
                    <p className={s.input + ' text-white/50 cursor-default'}>
                      {totalSkuStock(skuRows)}{' '}
                      <span className="text-[10px] text-white/30">(from SKU rows)</span>
                    </p>
                  </div>
                )}
                <div>
                  <label className={s.label}>Discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.discount ?? ''}
                    onChange={(e) => setDraft({ ...draft, discount: parseFloat(e.target.value) || 0 })}
                    className={s.input}
                  />
                </div>
                <div>
                  <label className={s.label}>Rating (0–5)</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step="0.1"
                    value={draft.rating ?? ''}
                    onChange={(e) => setDraft({ ...draft, rating: parseFloat(e.target.value) || 0 })}
                    className={s.input}
                  />
                </div>
              </div>

              <div className={s.card}>
                <label className={s.label}>
                  <ImageIcon size={10} className="inline mr-1 opacity-60" />
                  Primary image URL
                </label>
                <input
                  type="url"
                  placeholder="https://... (or manage gallery in Images tab)"
                  value={draft.image ?? ''}
                  onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                  className={s.input}
                />
              </div>

              <div className={s.card}>
                <label className={s.label}>Description</label>
                <textarea
                  rows={4}
                  placeholder="Product description for the storefront…"
                  value={draft.description ?? ''}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className={`${s.input} resize-y min-h-[96px]`}
                />
              </div>
            </div>
          )}

          {tab === 'options' && (
            <div className="space-y-4">
              <p className={`text-[11px] px-1 ${s.muted}`}>
                {chipsLocked
                  ? 'Color / Storage / RAM are derived from SKU rows below. Edit combinations in the matrix.'
                  : 'Define Color, Storage, and RAM choices. Each combination becomes its own SKU with separate stock.'}
              </p>
              <ChipField
                label="Colors"
                chips={displayColors}
                inputVal={colorIn}
                setInputVal={setColorIn}
                placeholder="e.g. Black Titanium"
                onAdd={() => onAddChip('colors', colorIn, () => setColorIn(''))}
                onRemove={(v) => onRemoveChip('colors', v)}
                styles={s}
                readOnly={chipsLocked}
                readOnlyNote="Managed by variants"
              />
              <ChipField
                label="Storage"
                chips={displayStorage}
                inputVal={storageIn}
                setInputVal={setStorageIn}
                placeholder="e.g. 256GB"
                onAdd={() => onAddChip('storage', storageIn, () => setStorageIn(''))}
                onRemove={(v) => onRemoveChip('storage', v)}
                styles={s}
                readOnly={chipsLocked}
                readOnlyNote="Managed by variants"
              />
              <ChipField
                label="RAM"
                chips={displayRam}
                inputVal={ramIn}
                setInputVal={setRamIn}
                placeholder="e.g. 16GB"
                onAdd={() => onAddChip('ram', ramIn, () => setRamIn(''))}
                onRemove={(v) => onRemoveChip('ram', v)}
                styles={s}
                readOnly={chipsLocked}
                readOnlyNote="Managed by variants"
              />
              <ChipField
                label="SIM type (ps / es / wifi / …)"
                chips={displaySimTypes}
                inputVal={simIn}
                setInputVal={setSimIn}
                placeholder="e.g. ps or es — or pick below"
                onAdd={() => onAddChip('sim_types', simIn, () => setSimIn(''))}
                onRemove={(v) => onRemoveChip('sim_types', v)}
                styles={s}
                readOnly={chipsLocked}
                readOnlyNote="Per-row SIM is edited in the matrix when enabled"
              />
              {!chipsLocked && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  {PRODUCT_SIM_OPTIONS.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onAddChip('sim_types', code, () => setSimIn(''))}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${
                        (displaySimTypes || []).includes(code)
                          ? 'border-[#B38B21] text-[#B38B21] bg-[#B38B21]/10'
                          : isLight
                            ? 'border-black/10 text-black/50'
                            : 'border-white/10 text-white/45'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}

              <div className={s.card}>
                <ProductSkuMatrix
                  colors={draft.colors || []}
                  storage={draft.storage || []}
                  ram={draft.ram || []}
                  simTypes={draft.sim_types || []}
                  basePrice={priceNum}
                  enabled={skuMatrixEnabled}
                  onEnabledChange={setSkuMatrixEnabled}
                  rows={skuRows}
                  onRowsChange={setSkuRows}
                  isLight={isLight}
                />
              </div>
            </div>
          )}

          {tab === 'images' && (
            <div className="space-y-4">
              <p className={`text-[11px] px-1 ${s.muted}`}>
                Upload to the product-images bucket. Primary mirrors to products.image_url.
                {!draft.id && ' New products: images upload now and link on save.'}
              </p>
              {imgError && <div className={`text-xs rounded-xl px-4 py-3 ${s.errorBox}`}>{imgError}</div>}
              <div className={s.card}>
                <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B38B21] text-black text-[10px] font-black uppercase cursor-pointer ${imgBusy ? 'opacity-50' : ''}`}>
                  <Upload size={12} />
                  {imgBusy ? 'Uploading…' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={imgBusy}
                    onChange={(e) => {
                      void handleUploadImage(e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {gallery.length === 0 ? (
                <div className={`text-center py-10 text-sm ${s.muted}`}>No gallery images yet</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map((img) => (
                    <div key={img.id} className={`${s.card} p-2 space-y-2`}>
                      <div className={`aspect-square rounded-lg overflow-hidden flex items-center justify-center ${isLight ? 'bg-black/[0.03]' : 'bg-white/5'}`}>
                        <img src={img.url} alt="" className="max-w-full max-h-full object-contain" />
                      </div>
                      <label className={`flex items-center gap-1.5 text-[10px] font-bold ${s.title}`}>
                        <input
                          type="radio"
                          name="primary-img"
                          checked={Boolean(img.is_primary)}
                          onChange={() => void handleSetPrimary(img.id)}
                          className="accent-[#B38B21]"
                        />
                        <Star size={10} className={img.is_primary ? 'text-[#B38B21]' : ''} />
                        Primary
                      </label>
                      {variantOptions.length > 0 && (
                        <select
                          value={img.variant_id || ''}
                          onChange={(e) => handleAssignVariant(img.id, e.target.value)}
                          className={`${s.input} text-[10px] py-1.5`}
                        >
                          <option value="">All variants</option>
                          {variantOptions.map((r) => (
                            <option key={r.id} value={r.id}>
                              {[r.color, r.storage, r.sim_type].filter(Boolean).join(' · ') || r.sku || r.id}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDeleteImage(img.id)}
                        className="text-[9px] font-black uppercase text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'listing' && (
            <div className="space-y-4">
              <ChipField
                label="Spec highlights (product page)"
                chips={draft.specs || []}
                inputVal={specsIn}
                setInputVal={setSpecsIn}
                placeholder="e.g. A18 chip, Ceramic Shield"
                onAdd={() => onAddChip('specs', specsIn, () => setSpecsIn(''))}
                onRemove={(v) => onRemoveChip('specs', v)}
                styles={s}
              />

              <div className={s.card}>
                <label className={s.label}>Extra specifications (advanced)</label>
                <textarea
                  rows={6}
                  value={draft.specificationsJson ?? '{}'}
                  onChange={(e) => applySpecsJson(e.target.value)}
                  className={`${s.input} font-mono text-[11px] resize-y min-h-[120px]`}
                  placeholder='{"display":"6.1\\"","chip":"A18"}'
                />
                {specsJsonError && (
                  <p className="text-[10px] text-red-400 mt-1">{specsJsonError}</p>
                )}
                <p className={`text-[10px] mt-1 ${s.muted}`}>
                  Free-form object stored on products.specifications when the column exists.
                </p>
              </div>

              <div className={s.card + ' space-y-4'}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${s.muted}`}>Storefront flags</p>
                <label className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 ${isLight ? 'border-black/10 bg-black/[0.03]' : 'border-white/10 bg-black/30'}`}>
                  <input
                    type="checkbox"
                    checked={draft.new ?? false}
                    onChange={(e) => setDraft({ ...draft, new: e.target.checked })}
                    className="accent-[#B38B21] w-4 h-4"
                  />
                  <span className={`text-sm font-bold ${s.title}`}>Mark as new</span>
                </label>
                <label className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 ${isLight ? 'border-black/10 bg-black/[0.03]' : 'border-[#B38B21]/20 bg-[#B38B21]/5'}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.featured)}
                    onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                    className="accent-[#B38B21] w-4 h-4"
                  />
                  <span className={`text-sm font-bold ${s.title}`}>Feature on homepage</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className={`lg:w-[240px] xl:w-[260px] shrink-0 border-t lg:border-t-0 lg:border-l p-5 ${s.asideBg} ${s.asideBorder}`}>
        <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${s.muted}`}>Preview</p>
        <div className={`rounded-2xl border overflow-hidden ${s.previewCard}`}>
          <div className={`aspect-square flex items-center justify-center p-4 ${isLight ? 'bg-black/[0.03]' : 'bg-white/5'}`}>
            {draft.image ? (
              <img
                src={draft.image}
                alt=""
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Package size={32} className={isLight ? 'text-black/15' : 'text-white/15'} />
            )}
          </div>
          <div className="p-3 space-y-2">
            <p className={`text-xs font-black leading-snug line-clamp-2 ${s.title}`}>
              {draft.name?.trim() || 'Product name'}
            </p>
            <p className="text-sm font-black text-[#B38B21]">{formatCurrency(priceNum)}</p>
            <div className="flex flex-wrap gap-1">
              {(draft.colors || []).slice(0, 2).map((c) => (
                <span key={c} className={`text-[8px] px-1.5 py-0.5 rounded ${isLight ? 'bg-black/5 text-black/45' : 'bg-white/5 text-white/40'}`}>
                  {c}
                </span>
              ))}
              {hasOptions && !skuMatrixEnabled && (
                <span className="text-[8px] text-amber-400/80">SKU stock off</span>
              )}
            </div>
            <div className={`pt-2 border-t grid grid-cols-2 gap-2 text-center ${s.asideBorder}`}>
              <div>
                <p className={`text-[8px] uppercase font-black ${s.muted}`}>Stock</p>
                <p className={`text-sm font-black ${s.title}`}>{displayStock}</p>
              </div>
              <div>
                <p className={`text-[8px] uppercase font-black ${s.muted}`}>SKUs</p>
                <p className={`text-sm font-black ${s.title}`}>{comboCount || (hasOptions ? '—' : '1')}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
