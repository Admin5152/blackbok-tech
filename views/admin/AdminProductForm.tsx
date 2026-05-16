import React, { useState } from 'react';
import { Save, X, Package, ImageIcon, Layers, Tag } from 'lucide-react';
import type { Product } from '../../types';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import { totalSkuStock, canUseSkuMatrix } from '../../lib/productSkuMatrix';
import { formatCurrency } from '../../lib/utils';
import { ProductSkuMatrix } from './ProductSkuMatrix';
import { getApf, type AdminProductFormStyles } from './adminProductFormStyles';

export const PRODUCT_CATEGORIES = ['iPhone', 'Laptop', 'Gaming', 'Accessories', 'Audio', 'Tablet', 'Trades'] as const;

export type ProductDraft = Partial<Product> & {
  colors?: string[];
  storage?: string[];
  ram?: string[];
  specs?: string[];
  featured?: boolean;
};

type TabId = 'details' | 'options' | 'listing';

type ChipFieldProps = {
  label: string;
  chips: string[];
  inputVal: string;
  setInputVal: (v: string) => void;
  placeholder: string;
  onAdd: () => void;
  onRemove: (v: string) => void;
  styles: AdminProductFormStyles;
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
}) => (
  <div className={s.card}>
    <label className={s.label}>{label}</label>
    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
      {chips.length === 0 && <span className={`text-[10px] italic ${s.muted}`}>None yet</span>}
      {chips.map((c) => (
        <span
          key={c}
          className={`flex items-center gap-1 border rounded-lg px-2 py-1 text-[10px] font-bold ${s.chip}`}
        >
          {c}
          <button type="button" onClick={() => onRemove(c)} className="opacity-50 hover:text-red-500 transition-colors">
            <X size={10} />
          </button>
        </span>
      ))}
    </div>
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
  specsIn: string;
  setSpecsIn: (v: string) => void;
  onAddChip: (field: 'colors' | 'storage' | 'ram' | 'specs', val: string, clear: () => void) => void;
  onRemoveChip: (field: 'colors' | 'storage' | 'ram' | 'specs', val: string) => void;
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
  const priceNum = Number(draft.price) || 0;
  const hasOptions = canUseSkuMatrix(draft.colors || [], draft.storage || [], draft.ram || []);
  const displayStock = skuMatrixEnabled && skuRows.length > 0 ? totalSkuStock(skuRows) : (draft.stock ?? 0);
  const comboCount = skuRows.length;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Details', icon: <Package size={12} /> },
    { id: 'options', label: 'Options & SKUs', icon: <Layers size={12} /> },
    { id: 'listing', label: 'Listing', icon: <Tag size={12} /> },
  ];

  const canSave =
    Boolean(draft.name?.trim()) && Number.isFinite(priceNum) && priceNum >= 0 && !saving;

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
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
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
                Define Color, Storage, and RAM choices. Each combination becomes its own SKU with separate stock.
              </p>
              <ChipField
                label="Colors"
                chips={draft.colors || []}
                inputVal={colorIn}
                setInputVal={setColorIn}
                placeholder="e.g. Black Titanium"
                onAdd={() => onAddChip('colors', colorIn, () => setColorIn(''))}
                onRemove={(v) => onRemoveChip('colors', v)}
                styles={s}
              />
              <ChipField
                label="Storage"
                chips={draft.storage || []}
                inputVal={storageIn}
                setInputVal={setStorageIn}
                placeholder="e.g. 256GB"
                onAdd={() => onAddChip('storage', storageIn, () => setStorageIn(''))}
                onRemove={(v) => onRemoveChip('storage', v)}
                styles={s}
              />
              <ChipField
                label="RAM"
                chips={draft.ram || []}
                inputVal={ramIn}
                setInputVal={setRamIn}
                placeholder="e.g. 16GB"
                onAdd={() => onAddChip('ram', ramIn, () => setRamIn(''))}
                onRemove={(v) => onRemoveChip('ram', v)}
                styles={s}
              />

              <div className={s.card}>
                <ProductSkuMatrix
                  colors={draft.colors || []}
                  storage={draft.storage || []}
                  ram={draft.ram || []}
                  basePrice={priceNum}
                  enabled={skuMatrixEnabled}
                  onEnabledChange={setSkuMatrixEnabled}
                  rows={skuRows}
                  onRowsChange={setSkuRows}
                />
              </div>
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

              <div className={s.card + ' space-y-4'}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${s.muted}`}>Storefront flags</p>
                <label className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 ${isLight ? 'border-black/10 bg-black/[0.03]' : 'border-white/10 bg-black/30'}`}>
                  <input
                    type="checkbox"
                    checked={draft.new ?? false}
                    onChange={(e) => setDraft({ ...draft, new: e.target.checked })}
                    className="accent-[#B38B21] w-4 h-4"
                  />
                  <span className="text-sm text-white font-bold">Mark as new</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-[#B38B21]/20 bg-[#B38B21]/5 px-4 py-3">
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
            <p className="text-xs font-black text-white leading-snug line-clamp-2">
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
