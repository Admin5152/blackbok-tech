/**
 * Trade Admin — Upgrade targets: which shop products customers can trade into.
 *
 * WHY: Staff remove models (e.g. iPhone 17) from the upgrade list without a
 * deploy. Empty categories (iPad / Accessories with no picks) stay hidden on
 * /trade/target. Saves to trade_config so all browsers share the list.
 *
 * RULE: Only trade-linked products (Matching trade-in model set, and that model
 * exists on Tradable devices) can be added.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Package, RefreshCcw, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useAppContext } from '../../../lib/appContext';
import { getProductsAdmin } from '../../../lib/api';
import { getTradeDevices } from '../../../lib/tradeApi';
import { friendlyError } from '../../../lib/friendlyErrors';
import {
  isEligibleTradeUpgradeProduct,
  isTradeLinkedProduct,
  loadUpgradeProductIds,
  productTradeModel,
  saveUpgradeProductIds,
  tradeUpgradeBlockReason,
} from '../../../lib/tradeUpgradePicks';
import { formatGhs } from '../../../lib/money';
import type { Product } from '../../../types';

export const TradeAdminUpgrades: React.FC = () => {
  const { notify } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [tradeModels, setTradeModels] = useState<Set<string>>(new Set());
  const [pickIds, setPickIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [dirty, setDirty] = useState(false);
  const [showUnlinked, setShowUnlinked] = useState(false);
  const [listSource, setListSource] = useState<'server' | 'local' | 'empty'>('empty');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, loaded, devices] = await Promise.all([
        getProductsAdmin(),
        loadUpgradeProductIds(),
        getTradeDevices().catch(() => []),
      ]);
      const modelSet = new Set(
        (devices || [])
          .filter((d) => d.is_active !== false)
          .map((d) => String(d.model || '').trim())
          .filter(Boolean),
      );
      setProducts(catalog.filter((p) => String(p.status || 'active') !== 'archived'));
      setTradeModels(modelSet);
      setListSource(loaded.source);
      // Drop stale picks that are no longer trade-linked
      const nextIds = (loaded.ids ?? []).filter((id) => {
        const p = catalog.find((x) => x.id === id);
        return p && isEligibleTradeUpgradeProduct(p, modelSet);
      });
      setPickIds(nextIds);
      setDirty(false);
      if (loaded.source === 'local') {
        notify?.(
          'Showing a list saved only on this computer — press Save list so every staff browser matches.',
          'warning',
        );
      }
    } catch (e) {
      notify?.(friendlyError(e, 'load upgrade targets'), 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const eligibleRows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return products
      .filter((p) => isEligibleTradeUpgradeProduct(p, tradeModels))
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
  }, [products, q, tradeModels]);

  const blockedRows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return products
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const cat = String(p.category || '').toLowerCase();
        const looksPhone =
          name.includes('iphone') ||
          name.includes('ipad') ||
          cat.includes('iphone') ||
          cat.includes('ipad');
        if (!looksPhone) return false;
        return !isEligibleTradeUpgradeProduct(p, tradeModels);
      })
      .filter((p) => {
        if (!ql) return true;
        return (
          p.name.toLowerCase().includes(ql) ||
          String(p.category || '')
            .toLowerCase()
            .includes(ql)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, q, tradeModels]);

  const add = (id: string) => {
    const p = byId.get(id);
    if (!p) return;
    const reason = tradeUpgradeBlockReason(p, tradeModels);
    if (reason) {
      notify?.(reason, 'error');
      return;
    }
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
      const clean = pickIds.filter((id) => {
        const p = byId.get(id);
        return p && isEligibleTradeUpgradeProduct(p, tradeModels);
      });
      await saveUpgradeProductIds(clean);
      setPickIds(clean);
      setDirty(false);
      notify?.(
        clean.length
          ? `Saved ${clean.length} trade-linked upgrade target(s).`
          : 'Cleared list — customers see all trade-linked iPhone / iPad products.',
        'success',
      );
    } catch (e) {
      notify?.(friendlyError(e, 'save upgrade targets'), 'error');
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
            Only products with a <strong className="opacity-90">Matching trade-in model</strong>{' '}
            (e.g. shop “iPhone 17 Pro Max Blue” → model <strong className="opacity-90">iPhone 17 Pro Max</strong>)
            can be listed. Link that on Admin → Products first, then add here and press{' '}
            <strong className="opacity-90">Save list</strong>.
          </p>
          {dirty && (
            <p className="text-[11px] text-amber-500 font-medium mt-2">
              Unsaved changes — press Save list to publish to the trade-in flow.
            </p>
          )}
          {listSource === 'local' && (
            <p className="text-[11px] text-amber-400 font-medium mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
              This list came from this browser only (shared save failed or never ran). Save list to
              sync for customers and other staff.
            </p>
          )}
          <p className="text-[10px] uppercase tracking-widest mt-2 opacity-50">
            {pickIds.length === 0
              ? 'Showing all trade-linked iPhone / iPad (no custom list)'
              : `${pickIds.length} product(s) on the customer list`}
            {listSource === 'server' ? ' · shared' : listSource === 'local' ? ' · this browser' : ''}
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
              Trade-linked catalogue
            </p>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-3 py-2 text-sm"
            />
          </div>
          <div className="max-h-[min(60vh,520px)] overflow-y-auto p-2 space-y-1">
            {eligibleRows.length === 0 ? (
              <p className="text-xs opacity-40 p-4 leading-relaxed">
                No trade-linked iPhone / iPad products yet. Open{' '}
                <Link to="/admin/products" className="text-[#CDA032] underline">
                  Products
                </Link>
                , set <em>Matching trade-in model</em>, then refresh here.
              </p>
            ) : (
              eligibleRows.map((p) => (
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
                      {' · '}
                      <span className="text-[#CDA032]">→ {productTradeModel(p)}</span>
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

            {blockedRows.length > 0 && (
              <div className="pt-3 mt-2 border-t border-[var(--bb-border)]">
                <button
                  type="button"
                  onClick={() => setShowUnlinked((v) => !v)}
                  className="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-80 px-2"
                >
                  {showUnlinked ? 'Hide' : 'Show'} {blockedRows.length} not trade-linked
                </button>
                {showUnlinked &&
                  blockedRows.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-start gap-2 rounded-xl px-2 py-1.5 opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{p.name}</p>
                        <p className="text-[9px] text-amber-500/90 leading-snug">
                          {tradeUpgradeBlockReason(p, tradeModels)}
                          {!isTradeLinkedProduct(p) && (
                            <>
                              {' '}
                              <Link
                                to="/admin/products"
                                className="underline text-[#CDA032]"
                              >
                                Open products
                              </Link>
                            </>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-[9px] font-black uppercase opacity-40 pt-1">
                        Locked
                      </span>
                    </div>
                  ))}
              </div>
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
                    'Clear the custom list? Customers will see all trade-linked iPhone / iPad products again.',
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
                Nothing selected — the trade-in upgrade step shows every trade-linked
                iPhone / iPad. Add products on the left to lock the list.
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
                          {productTradeModel(p) ? (
                            <span className="text-[#CDA032]"> · → {productTradeModel(p)}</span>
                          ) : null}
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
