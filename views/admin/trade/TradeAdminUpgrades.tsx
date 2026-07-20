/**
 * Trade Admin — Upgrade targets: which shop products customers can trade into.
 *
 * Staff pick from the shop catalogue. Products must be linked to a Matching
 * trade-in model (active Tradable device). If not linked, Add opens a quick
 * assign popup so staff can link then add in one step.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Link2, Package, RefreshCcw, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useAppContext } from '../../../lib/appContext';
import { getProductsAdmin, updateProduct } from '../../../lib/api';
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
  const { notify } = useAppContext();
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

  const tradeModels = useMemo(
    () =>
      new Set(
        tradeDevices
          .filter((d) => d.is_active !== false)
          .map((d) => String(d.model || '').trim())
          .filter(Boolean),
      ),
    [tradeDevices],
  );

  const activeTradeDevices = useMemo(
    () =>
      [...tradeDevices]
        .filter((d) => d.is_active !== false && String(d.model || '').trim())
        .sort((a, b) => String(a.model).localeCompare(String(b.model), undefined, { numeric: true })),
    [tradeDevices],
  );

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
      setTradeDevices(devices || []);
      setProducts(catalog.filter((p) => String(p.status || 'active') !== 'archived'));
      setListSource(loaded.source);
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
        const aOk = isEligibleTradeUpgradeProduct(a, tradeModels) ? 0 : 1;
        const bOk = isEligibleTradeUpgradeProduct(b, tradeModels) ? 0 : 1;
        if (aOk !== bOk) return aOk - bOk;
        return a.name.localeCompare(b.name);
      });
  }, [products, q, tradeModels]);

  const openLinkModal = (product: Product, addAfterLink: boolean) => {
    const current = productTradeModel(product) || '';
    const suggested =
      current && tradeModels.has(current)
        ? current
        : activeTradeDevices[0]?.model || '';
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

    if (isEligibleTradeUpgradeProduct(p, tradeModels)) {
      addEligible(id);
      return;
    }

    // Needs Matching trade-in model (or model not on Tradable devices) → quick assign
    if (!isTradeLinkedProduct(p) || (productTradeModel(p) && !tradeModels.has(productTradeModel(p)!))) {
      openLinkModal(p, true);
      return;
    }

    const reason = tradeUpgradeBlockReason(p, tradeModels);
    notify?.(reason || 'This product cannot be used as an upgrade target.', 'error');
  };

  const confirmLinkAndMaybeAdd = async () => {
    if (!linkModal) return;
    const model = linkModel.trim();
    if (!model) {
      notify?.('Pick a trade-in model to link.', 'warning');
      return;
    }
    if (!tradeModels.has(model)) {
      notify?.(
        'That model is not an active tradable device. Add it under Tradable devices first.',
        'error',
      );
      return;
    }

    setLinkSaving(true);
    try {
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
            Add shop products customers can trade into. Each product must be linked to a{' '}
            <strong className="opacity-90">Matching trade-in model</strong>. If it isn’t linked yet,
            Add opens a quick popup to assign the right model, then adds it to the list. Press{' '}
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
                const linked = isTradeLinkedProduct(p);
                const eligible = isEligibleTradeUpgradeProduct(p, tradeModels);
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
                        ) : linked && model ? (
                          <span className="text-amber-400"> · → {model} (not tradable)</span>
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
                        title="Assign matching trade-in model"
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={closeLinkModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  id="link-trade-model-title"
                  className="text-sm font-black uppercase tracking-widest text-[#CDA032]"
                >
                  Link trade-in model
                </p>
                <p className="text-xs text-white/55 mt-2 leading-relaxed">
                  <span className="text-white font-bold">{linkModal.product.name}</span> is not linked
                  to an active tradable device. Pick the matching model so it can appear in trade-in
                  upgrades.
                </p>
              </div>
              <button
                type="button"
                onClick={closeLinkModal}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {activeTradeDevices.length === 0 ? (
              <p className="text-xs text-amber-300/90 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 leading-relaxed">
                No active tradable devices yet. Add models under{' '}
                <Link to="/admin/trade/devices" className="underline text-[#CDA032]">
                  Tradable devices
                </Link>{' '}
                first.
              </p>
            ) : (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1.5">
                  Matching trade-in model
                </label>
                <select
                  value={linkModel}
                  onChange={(e) => setLinkModel(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-[#CDA032]/50 focus:outline-none"
                >
                  <option value="">Select model…</option>
                  {activeTradeDevices.map((d) => (
                    <option key={d.model} value={d.model}>
                      {d.model}
                      {d.device_type ? ` (${d.device_type})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeLinkModal}
                disabled={linkSaving}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={linkSaving || !linkModel || activeTradeDevices.length === 0}
                onClick={() => void confirmLinkAndMaybeAdd()}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#CDA032] text-black disabled:opacity-40"
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
