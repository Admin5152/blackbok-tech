/**
 * Admin — Headphones/Speakers or Accessories catalogue CRUD.
 * Same products + product_variants tables as Shop Products (no parallel schema).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatGhsPlain } from '../../lib/money';
import { ListSkeleton } from '../../components/Skeleton';
import { DbSaveBanner } from '../../components/DbSaveBanner';
import { PAGE_SIZES, usePagination } from '../../lib/pagination';
import { Pagination } from '../../components/Pagination';
import { dbNotSavedMessage, dbSavedMessage, dbSavedShort } from '../../lib/dbSaveFeedback';
import { useAppContext } from '../../lib/appContext';
import { createProduct, deleteProduct, syncProductVariants } from '../../lib/api';
import {
  applyAdminTaxonomyFields,
  getCategorySeriesOptions,
  getCategorySubcategoryOptions,
  suggestBrandFromTaxonomy,
} from '../../lib/storeFilters';

export type TaxonomyCatalogMode = 'audio' | 'accessories';

type ProductRow = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  subcategory: string | null;
  condition: string | null;
  price: number;
  stock: number;
  status: string | null;
  accessory_type: string | null;
  series: string | null;
};

type Props = {
  mode: TaxonomyCatalogMode;
  canEdit?: boolean;
  theme?: 'light' | 'dark';
};

const MODE = {
  audio: {
    title: 'Headphones & Speakers',
    blurb: 'Brand → series (AirPods / Pro / Max, JBL Tune, Beats Solo, HomePod…). Price & stock write to the live shop.',
    categories: ['Headphones', 'Speakers'] as const,
    typeLabel: 'Brand',
    csvName: 'blackbox-audio.csv',
  },
  accessories: {
    title: 'Accessories',
    blurb: 'Type → series from the August accessories PDF (Chargers, Phone Covers, Protectors, AirTags, Pencil, Magic Keyboard, Power banks…). Edit price & stock here — same products table as the shop.',
    categories: ['Accessories'] as const,
    typeLabel: 'Type',
    csvName: 'blackbox-accessories.csv',
  },
} as const;

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export const AdminTaxonomyCatalog: React.FC<Props> = ({
  mode,
  canEdit = true,
  theme = 'dark',
}) => {
  const cfg = MODE[mode];
  const isLight = theme === 'light';
  const { notify, refreshProducts } = useAppContext();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addCategory, setAddCategory] = useState<string>(cfg.categories[0]);
  const [addType, setAddType] = useState('');
  const [addSeries, setAddSeries] = useState('');
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addStock, setAddStock] = useState('1');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('id, name, category, brand, subcategory, condition, price, stock, status, specifications')
        .in('category', [...cfg.categories])
        .order('name');
      if (err) throw err;
      const mapped: ProductRow[] = (data ?? []).map((p) => {
        const specs =
          p.specifications && typeof p.specifications === 'object'
            ? (p.specifications as Record<string, unknown>)
            : {};
        const accessoryType = String(specs.accessory_type ?? '').trim() || null;
        const series =
          String(specs.series ?? '').trim() ||
          String(p.subcategory ?? '').trim() ||
          null;
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          brand: p.brand ?? null,
          subcategory: p.subcategory ?? null,
          condition: p.condition ?? null,
          price: Number(p.price ?? 0),
          stock: Math.max(0, Math.floor(Number(p.stock ?? 0))),
          status: p.status ?? 'active',
          accessory_type: accessoryType,
          series,
        };
      });
      setRows(mapped);
      const prices: Record<string, string> = {};
      const stocks: Record<string, string> = {};
      for (const r of mapped) {
        prices[r.id] = String(r.price ?? 0);
        stocks[r.id] = String(r.stock ?? 0);
      }
      setDraftPrices(prices);
      setDraftStock(stocks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalogue');
    } finally {
      setLoading(false);
    }
  }, [cfg.categories]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setAddCategory(cfg.categories[0]);
    setAddType('');
    setAddSeries('');
    setCategoryFilter('all');
    setTypeFilter('all');
  }, [mode, cfg.categories]);

  const typeOptions = useMemo(() => {
    const cat =
      mode === 'audio'
        ? categoryFilter !== 'all'
          ? categoryFilter
          : addCategory
        : 'Accessories';
    return getCategorySubcategoryOptions(cat);
  }, [mode, categoryFilter, addCategory]);

  const addSeriesOptions = useMemo(
    () => getCategorySeriesOptions(addCategory, addType || null),
    [addCategory, addType],
  );

  const typeKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (mode === 'accessories') {
        if (r.accessory_type) set.add(r.accessory_type);
      } else if (r.brand) {
        set.add(r.brand);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows, mode]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (typeFilter !== 'all') {
        const key =
          mode === 'accessories'
            ? (r.accessory_type || '').toLowerCase()
            : (r.brand || '').toLowerCase();
        if (key !== typeFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [rows, categoryFilter, typeFilter, mode]);

  const paging = usePagination(
    filtered,
    PAGE_SIZES.list,
    `${categoryFilter}|${typeFilter}|${filtered.length}`,
  );

  const saveEdits = async () => {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      let n = 0;
      for (const r of filtered) {
        const price = Math.round(Number(draftPrices[r.id]));
        const stock = Math.max(0, Math.floor(Number(draftStock[r.id])));
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error(`Invalid price for “${r.name}”`);
        }
        if (!Number.isFinite(stock)) {
          throw new Error(`Invalid stock for “${r.name}”`);
        }
        if (price === r.price && stock === r.stock) continue;
        const { error: err, data } = await supabase
          .from('products')
          .update({ price, stock })
          .eq('id', r.id)
          .select('id');
        if (err) throw err;
        if (!data?.length) {
          throw new Error(`Could not update “${r.name}” (0 rows). Check staff write access.`);
        }
        // Keep a single default SKU in sync when present
        const { data: variants } = await supabase
          .from('product_variants')
          .select('id')
          .eq('product_id', r.id)
          .limit(2);
        if (variants?.length === 1) {
          const { error: vErr } = await supabase
            .from('product_variants')
            .update({ price, stock })
            .eq('id', variants[0].id);
          if (vErr) throw vErr;
        }
        n += 1;
      }
      setMessage(dbSavedShort(n, 'product'));
      notify?.(dbSavedMessage(`${n} product(s) updated`), 'success');
      await load();
      void refreshProducts?.();
    } catch (e) {
      const msg = dbNotSavedMessage(e, 'save catalogue');
      setError(msg);
      notify?.(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (row: ProductRow) => {
    if (!canEdit) return;
    if (!window.confirm(`Delete “${row.name}” from the shop? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProduct(row.id);
      setMessage(dbSavedShort(1, 'product deleted'));
      notify?.(dbSavedMessage(`Deleted “${row.name}”`), 'success');
      await load();
      void refreshProducts?.();
    } catch (e) {
      const msg = dbNotSavedMessage(e, 'delete product');
      setError(msg);
      notify?.(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitAdd = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const name = addName.trim();
      const price = Math.round(Number(addPrice));
      const stock = Math.max(0, Math.floor(Number(addStock)));
      if (!name) throw new Error('Enter a product name.');
      if (!addType) throw new Error(`Select a ${cfg.typeLabel.toLowerCase()}.`);
      if (addSeriesOptions.length > 0 && !addSeries) {
        throw new Error('Select a series for this type/brand.');
      }
      if (!Number.isFinite(price) || price <= 0) throw new Error('Enter a valid price (GHS).');
      if (!Number.isFinite(stock)) throw new Error('Enter a valid stock quantity.');

      const applied = applyAdminTaxonomyFields({
        category: addCategory,
        taxonomyValue: addType,
        series: addSeries || null,
        existingCondition: 'new',
      });
      const suggested = suggestBrandFromTaxonomy(addCategory, addType);
      const specs: Record<string, unknown> = {
        catalog: mode === 'accessories' ? 'accessories' : 'audio',
      };
      if (mode === 'accessories') {
        specs.accessory_type = addType;
        if (addSeries) specs.series = addSeries;
      } else {
        specs.audio_type = addCategory === 'Speakers' ? 'speakers' : 'headphones';
        if (addSeries) specs.series = addSeries;
      }

      const created = await createProduct({
        name,
        category: applied.category,
        brand: suggested ?? (mode === 'accessories' ? undefined : addType),
        subcategory: applied.subcategory,
        condition: applied.condition,
        is_new: applied.is_new,
        new: applied.is_new,
        price,
        stock,
        status: 'active',
        currency: 'GHS',
        specifications: specs,
      });

      await syncProductVariants(created.id, [
        {
          sku: `${created.id.slice(0, 8)}-default`,
          price,
          stock,
          is_active: true,
          color: null,
          storage: null,
          ram: null,
        },
      ]);

      setMessage(dbSavedMessage(`Added “${name}”`));
      notify?.(dbSavedMessage(`Added “${name}”`), 'success');
      setShowAdd(false);
      setAddName('');
      setAddPrice('');
      setAddStock('1');
      setAddType('');
      setAddSeries('');
      await load();
      void refreshProducts?.();
    } catch (e) {
      const msg = dbNotSavedMessage(e, 'add product');
      setError(msg);
      notify?.(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = [
      'Name',
      'Category',
      cfg.typeLabel,
      'Series',
      'Price (GHS)',
      'Stock',
      'Status',
      'ID',
    ];
    const lines = [header.join(',')];
    for (const r of filtered) {
      const typeCol =
        mode === 'accessories' ? r.accessory_type || '' : r.brand || '';
      lines.push(
        [
          csvEscape(r.name),
          csvEscape(r.category),
          csvEscape(typeCol),
          csvEscape(r.series || ''),
          r.price,
          r.stock,
          csvEscape(r.status || ''),
          csvEscape(r.id),
        ].join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cfg.csvName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls = `rounded-lg border px-2 py-1.5 bg-transparent text-sm ${
    isLight ? 'border-black/10' : 'border-white/10'
  }`;

  const addTypeOpts = getCategorySubcategoryOptions(addCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tight">{cfg.title}</h2>
          <p className={`text-sm mt-1 max-w-2xl ${isLight ? 'text-black/55' : 'text-white/55'}`}>
            {cfg.blurb}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
              isLight ? 'border-black/10' : 'border-white/10'
            }`}
          >
            <Download size={14} /> Export CSV
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#CDA032] text-black text-[10px] font-black uppercase tracking-widest"
            >
              <Plus size={14} /> Add product
            </button>
          )}
        </div>
      </div>

      {showAdd && canEdit && (
        <div
          className={`rounded-2xl border p-4 space-y-3 ${
            isLight ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/[0.03]'
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50">New product</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mode === 'audio' && (
              <label className="block text-xs space-y-1">
                <span className="opacity-50 font-black uppercase tracking-widest text-[10px]">Category</span>
                <select
                  value={addCategory}
                  onChange={(e) => {
                    setAddCategory(e.target.value);
                    setAddType('');
                    setAddSeries('');
                  }}
                  className={`${inputCls} w-full`}
                >
                  {cfg.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-xs space-y-1">
              <span className="opacity-50 font-black uppercase tracking-widest text-[10px]">
                {cfg.typeLabel}
              </span>
              <select
                value={addType}
                onChange={(e) => {
                  setAddType(e.target.value);
                  setAddSeries('');
                }}
                className={`${inputCls} w-full`}
              >
                <option value="">Select…</option>
                {addTypeOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs space-y-1">
              <span className="opacity-50 font-black uppercase tracking-widest text-[10px]">Series</span>
              <select
                value={addSeries}
                onChange={(e) => setAddSeries(e.target.value)}
                disabled={!addType || addSeriesOptions.length === 0}
                className={`${inputCls} w-full disabled:opacity-40`}
              >
                <option value="">
                  {addSeriesOptions.length === 0 ? 'None (optional)' : 'Select…'}
                </option>
                {addSeriesOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs space-y-1 sm:col-span-2">
              <span className="opacity-50 font-black uppercase tracking-widest text-[10px]">Name</span>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. AirPods Pro 2"
                className={`${inputCls} w-full`}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="opacity-50 font-black uppercase tracking-widest text-[10px]">Price (GHS)</span>
              <input
                type="number"
                min={1}
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
                className={`${inputCls} w-full`}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="opacity-50 font-black uppercase tracking-widest text-[10px]">Stock</span>
              <input
                type="number"
                min={0}
                value={addStock}
                onChange={(e) => setAddStock(e.target.value)}
                className={`${inputCls} w-full`}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submitAdd()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#CDA032] text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              <Save size={14} /> Save to database
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                isLight ? 'border-black/10' : 'border-white/10'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        {mode === 'audio' && (
          <>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={inputCls}
            >
              <option value="all">All</option>
              <option value="Headphones">Headphones</option>
              <option value="Speakers">Speakers</option>
            </select>
          </>
        )}
        <label className="text-[10px] font-black uppercase tracking-widest opacity-50">
          {cfg.typeLabel}
        </label>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputCls}>
          <option value="all">All</option>
          {typeKeys.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {typeOptions
            .filter((o) => !typeKeys.some((k) => k.toLowerCase() === o.value.toLowerCase()))
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </select>
        {canEdit && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveEdits()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#CDA032] text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            <Save size={14} /> Save price &amp; stock
          </button>
        )}
      </div>

      {message || error ? <DbSaveBanner ok={error ? null : message} error={error} isLight={isLight} /> : null}
      {loading && <ListSkeleton isLight={isLight} count={6} />}

      {!loading && (
        <div className={`overflow-x-auto rounded-2xl border ${isLight ? 'border-black/5' : 'border-white/5'}`}>
          <table className="w-full text-left text-sm min-w-[48rem]">
            <thead>
              <tr
                className={`text-[10px] font-black uppercase tracking-widest ${
                  isLight ? 'bg-black/[0.03]' : 'bg-white/[0.03]'
                }`}
              >
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">{cfg.typeLabel} · series</th>
                <th className="px-3 py-3">Price (GHS)</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((r) => (
                <tr key={r.id} className={`border-t ${isLight ? 'border-black/5' : 'border-white/5'}`}>
                  <td className="px-3 py-3 align-top">
                    <div className="font-bold text-xs">{r.name}</div>
                    <div className="text-[10px] opacity-40 mt-0.5">{r.category}</div>
                  </td>
                  <td className="px-3 py-3 align-top text-xs">
                    <div>
                      {mode === 'accessories' ? r.accessory_type || '—' : r.brand || '—'}
                    </div>
                    <div className="opacity-50">{r.series || '—'}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="number"
                      min={1}
                      disabled={!canEdit}
                      value={draftPrices[r.id] ?? ''}
                      onChange={(e) =>
                        setDraftPrices((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      className={`${inputCls} w-28`}
                    />
                    <div className="text-[10px] opacity-40 mt-1">
                      was {formatGhsPlain(r.price)}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="number"
                      min={0}
                      disabled={!canEdit}
                      value={draftStock[r.id] ?? '0'}
                      onChange={(e) =>
                        setDraftStock((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      className={`${inputCls} w-20`}
                    />
                  </td>
                  <td className="px-3 py-3 align-top text-[10px] font-black uppercase tracking-wider opacity-50">
                    {r.status || '—'}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {canEdit && (
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => void removeRow(r)}
                        className="p-1.5 rounded-md opacity-40 hover:opacity-100 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!paging.pageItems.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm opacity-50">
                    No products yet. Use Add product to create Headphones, Speakers, or Accessories
                    rows that match the shop Brand/Type → Series filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <Pagination
          page={paging.page}
          pageCount={paging.pageCount}
          onPageChange={paging.setPage}
          pageSize={PAGE_SIZES.list}
          total={paging.total}
          isLight={isLight}
        />
      )}
    </div>
  );
};
