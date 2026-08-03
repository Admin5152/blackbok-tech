/**
 * Admin — bulk iPad pricing / stock / CSV round-trip.
 * Writes the same products + product_variants tables (no parallel schema).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Upload, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatGhsPlain } from '../../lib/money';
import { formatIpadConnectivity, formatIpadCondition } from '../../lib/ipadApi';
import { ListSkeleton } from '../../components/Skeleton';
import { PAGE_SIZES, usePagination } from '../../lib/pagination';
import { Pagination } from '../../components/Pagination';

type VariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  color: string | null;
  storage: string | null;
  sim_type: string | null;
  display_size: string | null;
  price: number | null;
  stock: number | null;
  is_active: boolean | null;
  product_name?: string;
  condition?: string;
  model_family?: string;
};

type Props = {
  canEdit?: boolean;
  theme?: 'light' | 'dark';
};

export const AdminIpads: React.FC<Props> = ({ canEdit = true, theme = 'dark' }) => {
  const isLight = theme === 'light';
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, condition, specifications')
        .eq('category', 'iPad');
      if (pErr) throw pErr;
      const plist = products ?? [];
      const ids = plist.map((p) => p.id);
      if (!ids.length) {
        setRows([]);
        return;
      }
      const { data: variants, error: vErr } = await supabase
        .from('product_variants')
        .select('id, product_id, sku, color, storage, sim_type, display_size, price, stock, is_active')
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
          condition: p?.condition ?? undefined,
          model_family: String(specs.model_family ?? ''),
        };
      });
      setRows(mapped);
      const prices: Record<string, string> = {};
      const stocks: Record<string, string> = {};
      for (const r of mapped) {
        prices[r.id] = r.price != null ? String(r.price) : '';
        stocks[r.id] = String(r.stock ?? 0);
      }
      setDraftPrices(prices);
      setDraftStock(stocks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load iPad SKUs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const modelFamilies = useMemo(() => {
    const set = new Set(rows.map((r) => r.model_family).filter(Boolean));
    return [...set].sort();
  }, [rows]);

  const visible = useMemo(() => {
    if (modelFilter === 'all') return rows;
    return rows.filter((r) => r.model_family === modelFilter);
  }, [rows, modelFilter]);

  /** Deduplicate price key rows for bulk edit (one row per size×sim×storage×condition). */
  const priceRows = useMemo(() => {
    const map = new Map<string, VariantRow & { colorIds: string[] }>();
    for (const r of visible) {
      const key = [
        r.product_id,
        r.display_size,
        r.sim_type,
        r.storage,
      ].join('|');
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...r, colorIds: [r.id] });
      } else {
        existing.colorIds.push(r.id);
      }
    }
    return [...map.values()];
  }, [visible]);

  const ipadPaging = usePagination(
    priceRows,
    PAGE_SIZES.list,
    `${modelFilter}|${priceRows.length}`,
  );

  const savePrices = async () => {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    try {
      const updates: Array<{ ids: string[]; price: number }> = [];
      for (const row of priceRows) {
        const raw = draftPrices[row.id];
        const price = Number(raw);
        if (!Number.isFinite(price) || price <= 0) continue;
        if (price === Number(row.price)) continue;
        updates.push({ ids: row.colorIds, price });
      }
      for (const u of updates) {
        const { error: err } = await supabase
          .from('product_variants')
          .update({ price: u.price })
          .in('id', u.ids);
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
    try {
      let n = 0;
      for (const r of visible) {
        const stock = Math.max(0, Math.floor(Number(draftStock[r.id] ?? r.stock ?? 0)));
        if (stock === Number(r.stock ?? 0)) continue;
        const { error: err } = await supabase
          .from('product_variants')
          .update({ stock })
          .eq('id', r.id);
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

  const exportCsv = () => {
    const header = [
      'sku',
      'model_family',
      'display_name',
      'condition',
      'display_size',
      'sim_type',
      'storage',
      'color',
      'price_ghs',
      'stock_qty',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.sku,
          r.model_family,
          csvEscape(r.product_name ?? ''),
          r.condition,
          r.display_size,
          r.sim_type,
          r.storage,
          csvEscape(r.color ?? ''),
          r.price ?? '',
          r.stock ?? 0,
        ].join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blackbox-ipad-variants.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error('CSV is empty');
      const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
      const skuIdx = header.indexOf('sku');
      const priceIdx = header.indexOf('price_ghs');
      const stockIdx = header.indexOf('stock_qty');
      if (skuIdx < 0) throw new Error('CSV needs a sku column');
      let updated = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const sku = cols[skuIdx]?.trim();
        if (!sku) continue;
        const patch: { price?: number; stock?: number } = {};
        if (priceIdx >= 0 && cols[priceIdx] != null && cols[priceIdx] !== '') {
          const price = Number(cols[priceIdx]);
          if (!Number.isFinite(price) || price <= 0) {
            throw new Error(`Row ${i + 1}: invalid price_ghs`);
          }
          patch.price = price;
        }
        if (stockIdx >= 0 && cols[stockIdx] != null && cols[stockIdx] !== '') {
          const stock = Math.floor(Number(cols[stockIdx]));
          if (!Number.isFinite(stock) || stock < 0) {
            throw new Error(`Row ${i + 1}: invalid stock_qty`);
          }
          patch.stock = stock;
        }
        if (!Object.keys(patch).length) continue;
        const { error: err } = await supabase
          .from('product_variants')
          .update(patch)
          .eq('sku', sku);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tight">iPad catalogue</h2>
          <p className={`text-sm mt-1 ${isLight ? 'text-black/55' : 'text-white/55'}`}>
            Bulk price by configuration · stock per colour · CSV export/re-import. Price writes go to audit_log.
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
        <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Model</label>
        <select
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className={`rounded-xl border px-3 py-2 text-sm bg-transparent ${
            isLight ? 'border-black/10' : 'border-white/10'
          }`}
        >
          <option value="all">All models</option>
          {modelFamilies.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
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
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-black/[0.03]' : 'bg-white/[0.03]'}`}>
                <th className="px-3 py-3">Config</th>
                <th className="px-3 py-3">Condition</th>
                <th className="px-3 py-3">Price (GHS)</th>
                <th className="px-3 py-3">Colours / stock</th>
              </tr>
            </thead>
            <tbody>
              {ipadPaging.pageItems.map((row) => (
                <tr key={row.id} className={`border-t ${isLight ? 'border-black/5' : 'border-white/5'}`}>
                  <td className="px-3 py-3">
                    <div className="font-bold text-xs">
                      {row.display_size} · {formatIpadConnectivity(row.sim_type)} · {row.storage}
                    </div>
                    <div className="text-[10px] opacity-50 mt-0.5">{row.model_family}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">{formatIpadCondition(row.condition)}</td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      disabled={!canEdit}
                      value={draftPrices[row.id] ?? ''}
                      onChange={(e) =>
                        setDraftPrices((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      className={`w-28 rounded-lg border px-2 py-1.5 bg-transparent text-sm ${
                        isLight ? 'border-black/10' : 'border-white/10'
                      }`}
                    />
                    <div className="text-[10px] opacity-40 mt-1">
                      was {formatGhsPlain(Number(row.price ?? 0))} · {row.colorIds.length} colour(s)
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {row.colorIds.map((id) => {
                        const c = rows.find((r) => r.id === id);
                        if (!c) return null;
                        return (
                          <div key={id} className="flex items-center gap-2 text-xs">
                            <span className="w-24 truncate">{c.color}</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              disabled={!canEdit}
                              value={draftStock[id] ?? '0'}
                              onChange={(e) =>
                                setDraftStock((prev) => ({ ...prev, [id]: e.target.value }))
                              }
                              className={`w-20 rounded-lg border px-2 py-1 bg-transparent ${
                                isLight ? 'border-black/10' : 'border-white/10'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {priceRows.length === 0 && (
            <p className="p-6 text-sm opacity-50">
              No iPad variants yet. Run the catalogue import seed after applying the migration.
            </p>
          )}
        </div>
      )}
      {!loading && priceRows.length > 0 && (
        <Pagination
          page={ipadPaging.page}
          pageCount={ipadPaging.pageCount}
          onPageChange={ipadPaging.setPage}
          total={ipadPaging.total}
          pageSize={PAGE_SIZES.list}
          isLight={isLight}
        />
      )}
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
