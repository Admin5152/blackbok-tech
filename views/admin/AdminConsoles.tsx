/**
 * Admin — bulk console / controller pricing, stock, colour SKUs, CSV, audit.
 * Writes the same products + product_variants tables (no parallel schema).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Upload, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatGhsPlain } from '../../lib/money';
import { formatConsoleCondition } from '../../lib/consoleApi';
import { ListSkeleton } from '../../components/Skeleton';
import { PAGE_SIZES, usePagination } from '../../lib/pagination';
import { Pagination } from '../../components/Pagination';

const LOW_STOCK_HINT = 3;
const ALLOWED_EDITIONS = new Set(['', 'Digital', 'Standard', 'Disc']);

type VariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  edition: string | null;
  storage: string | null;
  color: string | null;
  price: number | null;
  stock: number | null;
  is_active: boolean | null;
  product_name?: string;
  brand?: string;
  series?: string;
  category?: string;
  condition?: string;
  model_slug?: string;
};

type AuditRow = {
  id: number;
  created_at: string;
  action: string;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

type Props = {
  canEdit?: boolean;
  theme?: 'light' | 'dark';
};

type SortKey = 'sku' | 'brand' | 'series' | 'price' | 'stock';

export const AdminConsoles: React.FC<Props> = ({ canEdit = true, theme = 'dark' }) => {
  const isLight = theme === 'light';
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('sku');
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [draftEdition, setDraftEdition] = useState<Record<string, string>>({});
  const [draftStorage, setDraftStorage] = useState<Record<string, string>>({});
  const [colourDraft, setColourDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, brand, subcategory, category, condition, specifications')
        .in('category', ['Consoles', 'Controllers']);
      if (pErr) throw pErr;
      const plist = products ?? [];
      const ids = plist.map((p) => p.id);
      if (!ids.length) {
        setRows([]);
        setAudit([]);
        return;
      }
      const { data: variants, error: vErr } = await supabase
        .from('product_variants')
        .select('id, product_id, sku, edition, storage, color, price, stock, is_active')
        .in('product_id', ids)
        .order('sku');
      if (vErr) throw vErr;
      const byId = new Map(plist.map((p) => [p.id, p]));
      const mapped: VariantRow[] = (variants ?? []).map((v) => {
        const p = byId.get(v.product_id);
        const specs = (p?.specifications ?? {}) as Record<string, unknown>;
        return {
          ...v,
          price: v.price != null ? Number(v.price) : null,
          stock: v.stock != null ? Number(v.stock) : 0,
          product_name: p?.name,
          brand: p?.brand ?? undefined,
          series: String(specs.series ?? p?.subcategory ?? ''),
          category: p?.category ?? undefined,
          condition: p?.condition ?? undefined,
          model_slug: String(specs.model_slug ?? ''),
        };
      });
      setRows(mapped);
      const prices: Record<string, string> = {};
      const stocks: Record<string, string> = {};
      const editions: Record<string, string> = {};
      const storages: Record<string, string> = {};
      for (const r of mapped) {
        prices[r.id] = r.price != null ? String(r.price) : '';
        stocks[r.id] = String(r.stock ?? 0);
        editions[r.id] = r.edition ?? '';
        storages[r.id] = r.storage ?? '';
      }
      setDraftPrices(prices);
      setDraftStock(stocks);
      setDraftEdition(editions);
      setDraftStorage(storages);

      const variantIds = mapped.map((r) => r.id);
      const { data: logRows, error: aErr } = await supabase
        .from('audit_log')
        .select('id, created_at, action, entity_id, old_data, new_data')
        .eq('entity', 'product_variants')
        .in('entity_id', variantIds)
        .order('created_at', { ascending: false })
        .limit(20);
      if (aErr) {
        setAudit([]);
      } else {
        setAudit(
          (logRows ?? []).map((row) => ({
            id: Number(row.id),
            created_at: String(row.created_at),
            action: String(row.action),
            entity_id: String(row.entity_id),
            old_data: (row.old_data as Record<string, unknown> | null) ?? null,
            new_data: (row.new_data as Record<string, unknown> | null) ?? null,
          })),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load console SKUs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const brands = useMemo(() => {
    return [...new Set(rows.map((r) => r.brand).filter(Boolean) as string[])].sort();
  }, [rows]);

  const visible = useMemo(() => {
    let list = rows;
    if (brandFilter !== 'all') list = list.filter((r) => r.brand === brandFilter);
    if (categoryFilter !== 'all') list = list.filter((r) => r.category === categoryFilter);
    const copy = [...list];
    copy.sort((a, b) => {
      if (sortKey === 'price') return Number(a.price ?? 0) - Number(b.price ?? 0);
      if (sortKey === 'stock') return Number(a.stock ?? 0) - Number(b.stock ?? 0);
      const av = String(a[sortKey] ?? '').toLowerCase();
      const bv = String(b[sortKey] ?? '').toLowerCase();
      return av.localeCompare(bv);
    });
    return copy;
  }, [rows, brandFilter, categoryFilter, sortKey]);

  /** One price editor per product × edition; colour rows share that price. */
  const priceGroups = useMemo(() => {
    const map = new Map<string, VariantRow & { colorIds: string[] }>();
    for (const r of visible) {
      const key = `${r.product_id}|${r.edition ?? ''}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...r, colorIds: [r.id] });
      } else {
        existing.colorIds.push(r.id);
      }
    }
    return [...map.values()];
  }, [visible]);

  const paging = usePagination(
    priceGroups,
    PAGE_SIZES.list,
    `${brandFilter}|${categoryFilter}|${sortKey}|${priceGroups.length}`,
  );

  const savePrices = async () => {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updates: Array<{ ids: string[]; price: number }> = [];
      for (const row of priceGroups) {
        const raw = draftPrices[row.id];
        if (raw == null || String(raw).trim() === '') {
          throw new Error(`Price cannot be blank for ${row.sku || row.product_name}`);
        }
        const price = Number(raw);
        if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(price)) {
          throw new Error(`Price must be a positive whole GHS amount (${row.sku || row.product_name})`);
        }
        if (price === Number(row.price)) continue;
        updates.push({ ids: row.colorIds, price });
      }
      for (const u of updates) {
        const { error: err } = await supabase.from('product_variants').update({ price: u.price }).in('id', u.ids);
        if (err) throw err;
      }
      setMessage(`Saved ${updates.length} price group(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveStock = async () => {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      let n = 0;
      for (const r of visible) {
        const stock = Math.max(0, Math.floor(Number(draftStock[r.id] ?? r.stock ?? 0)));
        if (stock === Number(r.stock ?? 0)) continue;
        const { error: err } = await supabase.from('product_variants').update({ stock }).eq('id', r.id);
        if (err) throw err;
        n += 1;
      }
      setMessage(`Updated stock on ${n} colour row(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stock save failed');
    } finally {
      setSaving(false);
    }
  };

  const commitEditionStorage = async (group: VariantRow & { colorIds: string[] }) => {
    if (!canEdit) return;
    const nextEdition = String(draftEdition[group.id] ?? '').trim();
    const nextStorage = String(draftStorage[group.id] ?? '').trim();
    const prevEdition = String(group.edition ?? '').trim();
    const prevStorage = String(group.storage ?? '').trim();
    if (nextEdition === prevEdition && nextStorage === prevStorage) return;
    if (nextEdition && !ALLOWED_EDITIONS.has(nextEdition)) {
      setError('Edition must be Digital, Standard, Disc, or blank.');
      return;
    }
    const ok = window.confirm(
      `Change edition/storage on existing SKU ${group.sku || group.id}? This updates a live sellable row.`,
    );
    if (!ok) {
      setDraftEdition((prev) => ({ ...prev, [group.id]: prevEdition }));
      setDraftStorage((prev) => ({ ...prev, [group.id]: prevStorage }));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('product_variants')
        .update({
          edition: nextEdition || null,
          storage: nextStorage || null,
        })
        .in('id', group.colorIds);
      if (err) throw err;
      setMessage(`Updated edition/storage on ${group.sku}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update edition/storage');
    } finally {
      setSaving(false);
    }
  };

  const addColour = async (group: VariantRow & { colorIds: string[] }) => {
    if (!canEdit) return;
    const name = String(colourDraft[group.id] ?? '').trim();
    if (!name) {
      setError('Enter a colour name before adding.');
      return;
    }
    const already = group.colorIds.some((id) => {
      const r = rows.find((x) => x.id === id);
      return String(r?.color ?? '').toLowerCase() === name.toLowerCase();
    });
    if (already) {
      setError(`${name} already exists on this edition.`);
      return;
    }
    const source = rows.find((r) => r.id === group.id) ?? group;
    const slug = name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 24);
    const baseSku = String(source.sku || 'SKU').replace(/-+$/, '');
    const sku = slug ? `${baseSku}-${slug}` : `${baseSku}-COLOR`;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('product_variants').insert({
        product_id: source.product_id,
        sku,
        edition: source.edition || null,
        storage: source.storage || null,
        color: name,
        price: source.price,
        stock: 0,
        is_active: true,
        attributes: { catalog: source.category === 'Controllers' ? 'controller' : 'console' },
      });
      if (err) throw err;
      setColourDraft((prev) => ({ ...prev, [group.id]: '' }));
      setMessage(`Added ${name} at ${formatGhsPlain(Number(source.price ?? 0))}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add colour');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row: VariantRow, groupSize: number) => {
    if (!canEdit) return;
    if (groupSize <= 1 && rows.filter((r) => r.product_id === row.product_id).length <= 1) {
      setError('Cannot delete the last SKU for this model.');
      return;
    }
    const stock = Number(row.stock ?? 0);
    if (stock > 0) {
      const ok = window.confirm(
        `${row.sku || row.color || 'This SKU'} still has ${stock} in stock. Delete anyway?`,
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(`Delete ${row.sku || row.color || 'this SKU'}?`);
      if (!ok) return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('product_variants').delete().eq('id', row.id);
      if (err) throw err;
      setMessage(`Deleted ${row.sku || 'SKU'}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = [
      'SKU',
      'Category',
      'Brand',
      'Series',
      'Model',
      'Edition',
      'Storage',
      'Condition',
      'Colour',
      'Price (GHS)',
      'Stock',
      'Notes',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.sku ?? ''),
          csvEscape(r.category ?? ''),
          csvEscape(r.brand ?? ''),
          csvEscape(r.series ?? ''),
          csvEscape(r.product_name ?? ''),
          csvEscape(r.edition ?? ''),
          csvEscape(r.storage ?? ''),
          csvEscape(r.condition ?? ''),
          csvEscape(r.color ?? ''),
          r.price ?? '',
          r.stock ?? 0,
          '',
        ].join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blackbox-consoles.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error('CSV is empty');
      const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
      const idx = (names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;
      const skuIdx = idx(['sku']);
      const priceIdx = idx(['price (ghs)', 'price_ghs', 'price']);
      const stockIdx = idx(['stock', 'stock_qty']);
      const colourIdx = idx(['colour', 'color']);
      if (skuIdx < 0) throw new Error('CSV needs a SKU column');
      let updated = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const sku = cols[skuIdx]?.trim();
        if (!sku) continue;
        const patch: { price?: number; stock?: number; color?: string | null } = {};
        if (priceIdx >= 0 && cols[priceIdx] != null && cols[priceIdx] !== '') {
          const price = Number(cols[priceIdx]);
          if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(price)) {
            throw new Error(`Row ${i + 1}: invalid Price (GHS)`);
          }
          patch.price = price;
        }
        if (stockIdx >= 0 && cols[stockIdx] != null && cols[stockIdx] !== '') {
          const stock = Math.floor(Number(cols[stockIdx]));
          if (!Number.isFinite(stock) || stock < 0) {
            throw new Error(`Row ${i + 1}: invalid Stock`);
          }
          patch.stock = stock;
        }
        if (colourIdx >= 0 && cols[colourIdx] != null) {
          const colour = cols[colourIdx].trim();
          patch.color = colour || null;
        }
        if (!Object.keys(patch).length) continue;
        const { error: err } = await supabase.from('product_variants').update(patch).eq('sku', sku);
        if (err) throw err;
        updated += 1;
      }
      setMessage(`Imported updates for ${updated} SKU(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CSV import failed');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `rounded-lg border px-2 py-1.5 bg-transparent text-sm ${
    isLight ? 'border-black/10' : 'border-white/10'
  }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tight">Consoles &amp; controllers</h2>
          <p className={`text-sm mt-1 ${isLight ? 'text-black/55' : 'text-white/55'}`}>
            Bulk price by edition · stock per colour · CSV matches the catalogue sheet. Price writes go to
            audit_log.
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
          <label
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest cursor-pointer ${
              isLight ? 'border-black/10' : 'border-white/10'
            } ${!canEdit ? 'opacity-40 pointer-events-none' : ''}`}
          >
            <Upload size={14} /> Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={!canEdit || saving}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importCsv(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Category</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={inputCls}
        >
          <option value="all">All</option>
          <option value="Consoles">Consoles</option>
          <option value="Controllers">Controllers</option>
        </select>
        <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Brand</label>
        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className={inputCls}>
          <option value="all">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Sort</label>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={inputCls}>
          <option value="sku">SKU</option>
          <option value="brand">Brand</option>
          <option value="series">Series</option>
          <option value="price">Price</option>
          <option value="stock">Stock</option>
        </select>
        {canEdit && (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => void savePrices()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#CDA032] text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              <Save size={14} /> Save prices
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveStock()}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest disabled:opacity-40 ${
                isLight ? 'border-black/10' : 'border-white/10'
              }`}
            >
              <Save size={14} /> Save stock
            </button>
          </>
        )}
      </div>

      {message && <p className="text-sm text-[#CDA032]">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <ListSkeleton isLight={isLight} count={6} />}

      {!loading && (
        <div className={`overflow-x-auto rounded-2xl border ${isLight ? 'border-black/5' : 'border-white/5'}`}>
          <table className="w-full text-left text-sm min-w-[64rem]">
            <thead>
              <tr className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-black/[0.03]' : 'bg-white/[0.03]'}`}>
                <th className="px-3 py-3">SKU / model</th>
                <th className="px-3 py-3">Brand · series</th>
                <th className="px-3 py-3">Edition</th>
                <th className="px-3 py-3">Storage</th>
                <th className="px-3 py-3">Price (GHS)</th>
                <th className="px-3 py-3">Colour / stock</th>
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((group) => (
                <tr key={`${group.product_id}|${group.edition ?? ''}`} className={`border-t ${isLight ? 'border-black/5' : 'border-white/5'}`}>
                  <td className="px-3 py-3 align-top">
                    <div className="font-bold text-xs">{group.product_name}</div>
                    <div className="text-[10px] opacity-50 mt-0.5">{group.sku}</div>
                    <div className="text-[10px] opacity-40">{group.category}</div>
                  </td>
                  <td className="px-3 py-3 align-top text-xs">
                    <div>{group.brand}</div>
                    <div className="opacity-50">{group.series}</div>
                    <div className="opacity-40 mt-0.5">{formatConsoleCondition(group.condition)}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <select
                      disabled={!canEdit}
                      value={draftEdition[group.id] ?? ''}
                      onChange={(e) => setDraftEdition((prev) => ({ ...prev, [group.id]: e.target.value }))}
                      onBlur={() => void commitEditionStorage(group)}
                      className={inputCls}
                    >
                      <option value="">—</option>
                      <option value="Digital">Digital</option>
                      <option value="Standard">Standard</option>
                      <option value="Disc">Disc</option>
                    </select>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      disabled={!canEdit}
                      value={draftStorage[group.id] ?? ''}
                      onChange={(e) => setDraftStorage((prev) => ({ ...prev, [group.id]: e.target.value }))}
                      onBlur={() => void commitEditionStorage(group)}
                      className={`${inputCls} w-24`}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      disabled={!canEdit}
                      value={draftPrices[group.id] ?? ''}
                      onChange={(e) => setDraftPrices((prev) => ({ ...prev, [group.id]: e.target.value }))}
                      className={`${inputCls} w-28`}
                    />
                    <div className="text-[10px] opacity-40 mt-1">
                      was {formatGhsPlain(Number(group.price ?? 0))} · {group.colorIds.length} row(s)
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {group.colorIds.map((id) => {
                        const c = rows.find((r) => r.id === id);
                        if (!c) return null;
                        const stockN = Number(draftStock[id] ?? c.stock ?? 0);
                        const status =
                          c.is_active === false
                            ? 'not stocked'
                            : stockN <= 0
                              ? 'out of stock'
                              : stockN <= LOW_STOCK_HINT
                                ? 'low stock'
                                : 'active';
                        return (
                          <div key={id} className="flex items-center gap-2 text-xs">
                            <span className="w-24 truncate" title={c.sku ?? ''}>
                              {c.color || '—'}
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              disabled={!canEdit}
                              value={draftStock[id] ?? '0'}
                              onChange={(e) => setDraftStock((prev) => ({ ...prev, [id]: e.target.value }))}
                              className={`${inputCls} w-16`}
                            />
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider ${
                                status === 'active'
                                  ? 'text-emerald-500'
                                  : status === 'low stock'
                                    ? 'text-amber-500'
                                    : 'opacity-40'
                              }`}
                            >
                              {status}
                            </span>
                            {canEdit && (
                              <button
                                type="button"
                                title="Delete SKU"
                                onClick={() => void deleteRow(c, group.colorIds.length)}
                                className="p-1 rounded-md opacity-40 hover:opacity-100 hover:text-red-400"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <input
                          placeholder="Add colour"
                          value={colourDraft[group.id] ?? ''}
                          onChange={(e) => setColourDraft((prev) => ({ ...prev, [group.id]: e.target.value }))}
                          className={`${inputCls} w-28`}
                        />
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void addColour(group)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest disabled:opacity-40"
                        >
                          <Plus size={12} /> Colour
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {priceGroups.length === 0 && (
            <p className="p-6 text-sm opacity-50">
              No console variants yet. Run the catalogue import seed after applying the migration.
            </p>
          )}
        </div>
      )}
      {!loading && priceGroups.length > 0 && (
        <Pagination
          page={paging.page}
          pageCount={paging.pageCount}
          onPageChange={paging.setPage}
          total={paging.total}
          pageSize={PAGE_SIZES.list}
          isLight={isLight}
        />
      )}

      <div className={`rounded-2xl border p-4 ${isLight ? 'border-black/5' : 'border-white/5'}`}>
        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">
          Recent price changes
        </h3>
        {audit.length === 0 ? (
          <p className="text-xs opacity-40">No price audit rows yet.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {audit.map((a) => {
              const sku = String(a.new_data?.sku ?? a.old_data?.sku ?? a.entity_id);
              const oldP = a.old_data?.price;
              const newP = a.new_data?.price;
              return (
                <li key={a.id} className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="opacity-40 tabular-nums">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                  <span className="font-bold">{sku}</span>
                  <span>
                    {oldP != null ? formatGhsPlain(Number(oldP)) : '—'} →{' '}
                    {newP != null ? formatGhsPlain(Number(newP)) : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
