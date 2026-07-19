/**
 * Trade Admin — Upgrade targets: which shop products customers can trade into.
 *
 * WHY: Staff remove models (e.g. iPhone 17) from the upgrade list without a
 * deploy. Empty categories (iPad / Accessories with no picks) stay hidden on
 * /trade/target. Saves to trade_config so all browsers share the list.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Package, RefreshCcw, X } from 'lucide-react';
import { useAppContext } from '../../../lib/appContext';
import { getProductsAdmin } from '../../../lib/api';
import {
  isEligibleTradeUpgradeProduct,
  loadUpgradeProductIds,
  saveUpgradeProductIds,
} from '../../../lib/tradeUpgradePicks';
import { formatGhs } from '../../../lib/money';
import type { Product } from '../../../types';

export const TradeAdminUpgrades: React.FC = () => {
  const { notify } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [pickIds, setPickIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [dirty, setDirty] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, ids] = await Promise.all([
        getProductsAdmin(),
        loadUpgradeProductIds(),
      ]);
      setProducts(catalog.filter((p) => String(p.status || 'active') !== 'archived'));
      setPickIds(ids ?? []);
      setDirty(false);
    } catch (e) {
      notify?.(e instanceof Error ? e.message : 'Could not load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const catalogRows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return products
      .filter(isEligibleTradeUpgradeProduct)
      .filter((p) => {
        if (!ql) return true;
        return (
          p.name.toLowerCase().includes(ql) ||
          String(p.category || '')
            .toLowerCase()
            .includes(ql) ||
          String(p.trade_model || '')
            .toLowerCase()
            .includes(ql)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, q]);

  const add = (id: string) => {
    setPickIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDirty(true);
  };

  const remove = (id: string) => {
    setPickIds((prev) => prev.filter((x) => x !== id));
    setDirty(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    setPickIds((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[j];
      next[j] = tmp;
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const eligible = new Set(
        products.filter(isEligibleTradeUpgradeProduct).map((p) => p.id),
      );
      const clean = pickIds.filter((id) => eligible.has(id));
      await saveUpgradeProductIds(clean);
      setPickIds(clean);
      setDirty(false);
      notify?.(
        clean.length
          ? `Saved ${clean.length} upgrade target(s). Customers only see these.`
          : 'Cleared list — customers see all eligible iPhone / iPad products.',
        'success',
      );
    } catch (e) {
      notify?.(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm opacity-60 py-8">Loading upgrade targets…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Package size={20} className="text-[#CDA032]" aria-hidden />
            Upgrade targets
          </h2>
          <p className="text-xs opacity-60 mt-1 max-w-2xl leading-relaxed">
            Choose which shop products appear when a customer picks what to{' '}
            <strong className="opacity-90">trade into</strong>. Remove a phone
            (e.g. iPhone 17) so it no longer shows. Categories with no listed
            products — including iPad or Accessories — stay hidden in the
            trade-in flow.
          </p>
          <p className="text-[10px] uppercase tracking-widest mt-2 opacity-50">
            {pickIds.length === 0
              ? 'Showing all eligible iPhone / iPad (no custom list)'
              : `${pickIds.length} product(s) on the customer list`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--bb-border)] px-3 py-2 text-xs font-black uppercase tracking-wider hover:border-[#CDA032]/50"
          >
            <RefreshCcw size={14} aria-hidden /> Refresh
          </button>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void save()}
            className="rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-wider text-xs px-5 py-2 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save list'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col min-h-0 border border-[var(--bb-border)] rounded-2xl overflow-hidden bg-[var(--bb-surface)]">
          <div className="p-3 border-b border-[var(--bb-border)] shrink-0 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">
              Shop catalogue
            </p>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-3 py-2 text-sm"
            />
          </div>
          <div className="max-h-[min(60vh,520px)] overflow-y-auto p-2 space-y-1">
            {catalogRows.length === 0 ? (
              <p className="text-xs opacity-40 p-4">No matching iPhone / iPad products.</p>
            ) : (
              catalogRows.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl bg-[var(--bb-surface-2)]/60 px-2 py-1.5"
                >
                  {(p.image || p.image_url) && (
                    <img
                      src={p.image || p.image_url}
                      alt=""
                      className="h-9 w-9 object-contain shrink-0 rounded-lg"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{p.name}</p>
                    <p className="text-[9px] opacity-45">
                      {p.category}
                      {p.price != null ? ` · ${formatGhs(Number(p.price))}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(p.id)}
                    disabled={pickIds.includes(p.id)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-[#CDA032]/20 text-[#CDA032] text-[10px] font-black uppercase disabled:opacity-30"
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col min-h-0 border border-[var(--bb-border)] rounded-2xl overflow-hidden bg-[var(--bb-surface)]">
          <div className="p-3 border-b border-[var(--bb-border)] shrink-0 flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">
              Customer list ({pickIds.length})
            </p>
            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    'Clear the custom list? Customers will see all eligible iPhone / iPad products again.',
                  )
                ) {
                  return;
                }
                setPickIds([]);
                setDirty(true);
              }}
              className="text-[9px] font-black uppercase opacity-50 hover:text-red-500"
            >
              Clear list
            </button>
          </div>
          <div className="max-h-[min(60vh,520px)] overflow-y-auto p-2 space-y-1 flex-1">
            {pickIds.length === 0 ? (
              <p className="text-xs opacity-40 p-4 leading-relaxed">
                Nothing selected — the trade-in upgrade step shows every eligible
                iPhone / iPad in stock. Add products on the left to lock the list
                (e.g. exclude iPhone 17).
              </p>
            ) : (
              pickIds.map((id, i) => {
                const p = byId.get(id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-xl bg-[var(--bb-surface-2)]/60 px-2 py-1.5"
                  >
                    {(p?.image || p?.image_url) && (
                      <img
                        src={p.image || p.image_url}
                        alt=""
                        className="h-9 w-9 object-contain shrink-0 rounded-lg"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{p?.name || id}</p>
                      {p && (
                        <p className="text-[9px] opacity-45">
                          {p.category}
                          {p.price != null ? ` · ${formatGhs(Number(p.price))}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col shrink-0 gap-0.5">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        className="p-0.5 rounded opacity-40 hover:opacity-100 disabled:opacity-15"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={i === pickIds.length - 1}
                        onClick={() => move(i, 1)}
                        className="p-0.5 rounded opacity-40 hover:opacity-100 disabled:opacity-15"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      className="p-1.5 rounded-lg text-red-500/90 hover:bg-red-500/10 shrink-0"
                      aria-label="Remove from list"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
