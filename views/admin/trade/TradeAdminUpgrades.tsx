/**
 * Trade Admin — Upgrade targets: which shop products customers can trade into.
 *
 * Staff pick from the shop catalogue. Products need a catalog model link
 * (`products.trade_model`). If not linked, Add opens a quick assign popup.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Link2, Package, RefreshCcw, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useAppContext } from '../../../lib/appContext';
import { getProductsAdmin, updateProduct } from '../../../lib/api';
import { ensureTradeCatalogModel, getAdminDevices } from '../../../lib/tradeAdminApi';
import { friendlyError } from '../../../lib/friendlyErrors';
import {
  isEligibleTradeUpgradeProduct,
  isTradeLinkedProduct,
  loadUpgradeProductIds,
  productTradeModel,
  saveUpgradeProductIds,
  suggestTradeModelFromProduct,
  tradeUpgradeBlockReason,
} from '../../../lib/tradeUpgradePicks';
import { formatGhs } from '../../../lib/money';
import type { Product } from '../../../types';
import type { TradeDeviceRow } from '../../../types/supabase';
import { lockPageScroll } from '../../../lib/pageScrollLock';

function isUpgradeCandidate(product: Product): boolean {
  const name = (product.name || '').toLowerCase();
  const cat = String(product.category || '').toLowerCase();
  return (
    name.includes('iphone') ||
    name.includes('ipad') ||
    cat.includes('iphone') ||
    cat.includes('ipad')
  );
}

type LinkModalState = {
  product: Product;
  /** After save, also add to the customer list */
  addAfterLink: boolean;
};

export const TradeAdminUpgrades: React.FC = () => {
  const { notify, theme } = useAppContext();
  const isLight = theme === 'light';
  const [products, setProducts] = useState<Product[]>([]);
  const [tradeDevices, setTradeDevices] = useState<TradeDeviceRow[]>([]);
  const [pickIds, setPickIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [dirty, setDirty] = useState(false);
  const [listSource, setListSource] = useState<'server' | 'local' | 'empty'>('empty');
  const [linkModal, setLinkModal] = useState<LinkModalState | null>(null);
  const [linkModel, setLinkModel] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);

  const catalogModelSuggestions = useMemo(
    () =>
      [...tradeDevices]
        .map((d) => String(d.model || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [tradeDevices],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, loaded, devices] = await Promise.all([
        getProductsAdmin(),
        loadUpgradeProductIds(),
        getAdminDevices(true).catch(() => []),
      ]);
      setTradeDevices(devices || []);
      setProducts(catalog.filter((p) => String(p.status || 'active') !== 'archived'));
      setListSource(loaded.source);
      const nextIds = (loaded.ids ?? []).filter((id) => {
        const p = catalog.find((x) => x.id === id);
        return p && isEligibleTradeUpgradeProduct(p);
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

  useEffect(() => {
    if (!linkModal) return;
    return lockPageScroll();
  }, [linkModal]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const catalogueRows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return products
      .filter(isUpgradeCandidate)
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
      .sort((a, b) => {
        const aOk = isEligibleTradeUpgradeProduct(a) ? 0 : 1;
        const bOk = isEligibleTradeUpgradeProduct(b) ? 0 : 1;
        if (aOk !== bOk) return aOk - bOk;
        return a.name.localeCompare(b.name);
      });
  }, [products, q]);

  const openLinkModal = (product: Product, addAfterLink: boolean) => {
    const current = productTradeModel(product) || '';
    const suggested =
      current ||
      suggestTradeModelFromProduct(product) ||
      catalogModelSuggestions[0] ||
      '';
    setLinkModel(suggested);
    setLinkModal({ product, addAfterLink });
  };

  const closeLinkModal = () => {
    if (linkSaving) return;
    setLinkModal(null);
    setLinkModel('');
  };

  const addEligible = (id: string) => {
    setPickIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDirty(true);
  };

  const add = (id: string) => {
    const p = byId.get(id);
    if (!p) return;
    if (pickIds.includes(id)) return;

    if (isEligibleTradeUpgradeProduct(p)) {
      addEligible(id);
      return;
    }

    if (!isTradeLinkedProduct(p)) {
      const suggested = suggestTradeModelFromProduct(p);
      if (suggested) {
        void (async () => {
          try {
            await ensureTradeCatalogModel(suggested, { category: p.category });
            const updated = await updateProduct(p.id, { trade_model: suggested });
            setProducts((prev) =>
              prev.map((x) =>
                x.id === updated.id ? { ...x, ...updated, trade_model: suggested } : x,
              ),
            );
            addEligible(p.id);
            notify?.(`Linked “${updated.name}” → ${suggested} and added.`, 'success');
            window.dispatchEvent(new CustomEvent('products:refresh'));
          } catch (e) {
            openLinkModal(p, true);
            notify?.(friendlyError(e, 'auto-link catalog model'), 'warning');
          }
        })();
        return;
      }
      openLinkModal(p, true);
      return;
    }

    const reason = tradeUpgradeBlockReason(p);
    notify?.(reason || 'This product cannot be used as an upgrade target.', 'error');
  };

  const confirmLinkAndMaybeAdd = async () => {
    if (!linkModal) return;
    const model = linkModel.trim();
    if (!model) {
      notify?.('Enter the catalog model name to link.', 'warning');
      return;
    }

    setLinkSaving(true);
    try {
      await ensureTradeCatalogModel(model, { category: linkModal.product.category });
      const updated = await updateProduct(linkModal.product.id, { trade_model: model });
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated, trade_model: model } : p)),
      );
      notify?.(`Linked “${updated.name}” → ${model}.`, 'success');
      if (linkModal.addAfterLink) {
        addEligible(linkModal.product.id);
      }
      setLinkModal(null);
      setLinkModel('');
      window.dispatchEvent(new CustomEvent('products:refresh'));
    } catch (e) {
      notify?.(friendlyError(e, 'link trade-in model'), 'error');
    } finally {
      setLinkSaving(false);
    }
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
      const nextProducts = [...products];
      const byIdLocal = new Map(nextProducts.map((p) => [p.id, p]));

      for (const id of pickIds) {
        const p = byIdLocal.get(id);
        if (!p || isTradeLinkedProduct(p)) continue;
        const model = suggestTradeModelFromProduct(p) || String(p.name || '').trim();
        if (!model) continue;
        await ensureTradeCatalogModel(model, { category: p.category });
        const updated = await updateProduct(id, { trade_model: model });
        const merged = { ...p, ...updated, trade_model: model };
        byIdLocal.set(id, merged);
        const idx = nextProducts.findIndex((x) => x.id === id);
        if (idx >= 0) nextProducts[idx] = merged;
      }

      setProducts(nextProducts);

      const clean = pickIds.filter((id) => {
        const p = byIdLocal.get(id);
        return p && isEligibleTradeUpgradeProduct(p);
      });
      await saveUpgradeProductIds(clean);
      setPickIds(clean);
      setDirty(false);
      notify?.(
        clean.length
          ? `Saved ${clean.length} upgrade target(s) for the trade-in page.`
          : 'Cleared list — customers see all trade-linked iPhone / iPad products.',
        'success',
      );
      window.dispatchEvent(new CustomEvent('products:refresh'));
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
            Add shop products customers can trade into. Each product needs a{' '}
            <strong className="opacity-90">catalog model link</strong> (e.g. iPhone 17 Pro Max).
            If it isn’t linked yet, Add opens a quick popup to assign the model, then adds it to
            the list. Press{' '}
            <strong className="opacity-90">Save list</strong> when done.
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
              Shop catalogue
            </p>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-3 py-2 text-sm"
            />
          </div>
          <div
            className="max-h-[min(60vh,520px)] min-h-0 overflow-y-auto p-2 space-y-1 [-webkit-overflow-scrolling:touch]"
            data-lenis-prevent
          >
            {catalogueRows.length === 0 ? (
              <p className="text-xs opacity-40 p-4 leading-relaxed">
                No iPhone / iPad products found. Add them under{' '}
                <Link to="/admin/products" className="text-[#CDA032] underline">
                  Products
                </Link>
                , then refresh here.
              </p>
            ) : (
              catalogueRows.map((p) => {
                const eligible = isEligibleTradeUpgradeProduct(p);
                const model = productTradeModel(p);
                const onList = pickIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${
                      eligible
                        ? 'bg-[var(--bb-surface-2)]/60'
                        : 'bg-amber-500/5 border border-amber-500/15'
                    }`}
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
                        {eligible && model ? (
                          <span className="text-[#CDA032]"> · → {model}</span>
                        ) : (
                          <span className="text-amber-400"> · Not linked</span>
                        )}
                      </p>
                    </div>
                    {!eligible && (
                      <button
                        type="button"
                        onClick={() => openLinkModal(p, false)}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#CDA032]/30 text-[#CDA032] text-[9px] font-black uppercase"
                        title="Assign catalog model"
                      >
                        <Link2 size={11} aria-hidden /> Link
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => add(p.id)}
                      disabled={onList}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-[#CDA032]/20 text-[#CDA032] text-[10px] font-black uppercase disabled:opacity-30"
                    >
                      {onList ? 'Added' : 'Add'}
                    </button>
                  </div>
                );
              })
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
          <div
            className="max-h-[min(60vh,520px)] min-h-0 overflow-y-auto p-2 space-y-1 flex-1 [-webkit-overflow-scrolling:touch]"
            data-lenis-prevent
          >
            {pickIds.length === 0 ? (
              <p className="text-xs opacity-40 p-4 leading-relaxed">
                Nothing selected — the trade-in upgrade step shows every trade-linked iPhone / iPad
                in stock. Add products on the left to lock the list.
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

      {linkModal && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-trade-model-title"
        >
          <button
            type="button"
            className={`absolute inset-0 backdrop-blur-sm ${
              isLight ? 'bg-black/40' : 'bg-black/75'
            }`}
            aria-label="Close"
            onClick={closeLinkModal}
          />
          <div
            className={`relative z-10 w-full max-w-md rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4 ${
              isLight
                ? 'bg-white border-black/10 text-black'
                : 'bg-[#121212] border-white/15 text-[#F5F5F5]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  id="link-trade-model-title"
                  className="text-sm font-black uppercase tracking-widest text-[#CDA032]"
                >
                  Link catalog model
                </p>
                <p
                  className={`text-xs mt-2 leading-relaxed ${
                    isLight ? 'text-black/75' : 'text-[#D4D4D4]'
                  }`}
                >
                  <span className={`font-bold ${isLight ? 'text-black' : 'text-[#F5F5F5]'}`}>
                    {linkModal.product.name}
                  </span>{' '}
                  needs a catalog model link so customers can pick it as an upgrade target.
                </p>
              </div>
              <button
                type="button"
                onClick={closeLinkModal}
                className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                  isLight
                    ? 'text-black/55 hover:text-black hover:bg-black/5'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-white/10'
                }`}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label
                className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${
                  isLight ? 'text-black/60' : 'text-[#B0B0B0]'
                }`}
              >
                Catalog model name
              </label>
              <input
                list="bb-trade-catalog-models"
                value={linkModel}
                onChange={(e) => setLinkModel(e.target.value)}
                placeholder="e.g. iPhone 17 Pro Max"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:border-[#CDA032]/60 focus:outline-none focus:ring-2 focus:ring-[#CDA032]/25 ${
                  isLight
                    ? 'border-black/15 bg-[#F5F5F7] text-black'
                    : 'border-white/20 bg-[#1a1a1a] text-[#F5F5F5]'
                }`}
              />
              <datalist id="bb-trade-catalog-models">
                {catalogModelSuggestions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <p className={`text-[10px] mt-2 leading-relaxed ${isLight ? 'text-black/50' : 'text-white/45'}`}>
                Use the exact model name. New names are saved to the catalog automatically.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeLinkModal}
                disabled={linkSaving}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors disabled:opacity-40 ${
                  isLight
                    ? 'border-black/20 text-black/80 hover:bg-black/5'
                    : 'border-white/25 text-[#E5E5E5] hover:bg-white/10'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={linkSaving || !linkModel.trim()}
                onClick={() => void confirmLinkAndMaybeAdd()}
                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#CDA032] text-black hover:bg-[#D4AF37] disabled:opacity-40"
              >
                {linkSaving
                  ? 'Saving…'
                  : linkModal.addAfterLink
                    ? 'Link & add'
                    : 'Save link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
