/**
 * Admin Deal of the Day — flag products, set discount % + promo text,
 * preview shop pricing. Dedicated page under Shop → Deals (/admin/deals).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Flame, Plus, RefreshCw, ExternalLink, Search, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Product } from '../../types';
import { getProductsAdmin, updateProduct, friendlyProductActionError } from '../../lib/api';
import {
  getDealDiscountedPrice,
  getDealDiscountPercentage,
  getDealOriginalPrice,
  getDealPromoText,
  isDealOfTheDayProduct,
} from '../../lib/dealOfTheDay';
import { formatCurrency } from '../../lib/utils';
import { useAppContext } from '../../lib/appContext';
import { ListSkeleton } from '../../components/Skeleton';

interface Props {
  canEdit: boolean;
  theme?: 'light' | 'dark';
}

type DraftPatch = {
  discount: number;
  promo_text: string;
  is_deal_of_the_day: boolean;
};

export const AdminDealOfTheDay: React.FC<Props> = ({ canEdit, theme = 'dark' }) => {
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const { notify, refreshProducts } = useAppContext();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, DraftPatch>>({});

  const muted = isLight ? 'text-black/50' : 'text-white/50';
  const fg = isLight ? 'text-black' : 'text-white';
  const border = isLight ? 'border-black/10' : 'border-white/10';
  const card = isLight
    ? 'bg-white border-black/10'
    : 'bg-white/[0.03] border-white/10';
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm ${
    isLight
      ? 'border-black/10 bg-white text-black placeholder:text-black/35'
      : 'border-white/10 bg-black/40 text-white placeholder:text-white/30'
  }`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getProductsAdmin();
      setProducts(rows);
      const next: Record<string, DraftPatch> = {};
      for (const p of rows) {
        if (!isDealOfTheDayProduct(p)) continue;
        next[p.id] = {
          discount: getDealDiscountPercentage(p),
          promo_text: getDealPromoText(p),
          is_deal_of_the_day: true,
        };
      }
      setDrafts(next);
    } catch (e) {
      notify(friendlyProductActionError(e, 'load products'), 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const dealProducts = useMemo(
    () => products.filter((p) => isDealOfTheDayProduct(p) || drafts[p.id]?.is_deal_of_the_day),
    [products, drafts],
  );

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dealProducts;
    return dealProducts.filter((p) => {
      const hay = `${p.name} ${p.brand ?? ''} ${p.category ?? ''} ${p.promo_text ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [dealProducts, query]);

  const addable = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return products
      .filter((p) => !isDealOfTheDayProduct(p) && !drafts[p.id]?.is_deal_of_the_day)
      .filter((p) => {
        if (!q) return true;
        const hay = `${p.name} ${p.brand ?? ''} ${p.category ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [products, drafts, pickerQuery]);

  const patchDraft = (id: string, patch: Partial<DraftPatch>, seed?: Product) => {
    setDrafts((prev) => {
      const base =
        prev[id] ??
        (seed
          ? {
              discount: getDealDiscountPercentage(seed),
              promo_text: getDealPromoText(seed),
              is_deal_of_the_day: Boolean(seed.is_deal_of_the_day ?? seed.isDealOfTheDay),
            }
          : { discount: 0, promo_text: '', is_deal_of_the_day: false });
      return { ...prev, [id]: { ...base, ...patch } };
    });
  };

  const persist = async (product: Product, next: DraftPatch) => {
    if (!canEdit) {
      notify('You do not have permission to edit deals.', 'error');
      return;
    }
    const discount = Math.min(100, Math.max(0, Math.round(Number(next.discount) || 0)));
    if (next.is_deal_of_the_day && discount <= 0) {
      notify('Set a discount % (1–100) before enabling Deal of the Day.', 'error');
      return;
    }
    setSavingId(product.id);
    try {
      const updated = await updateProduct(product.id, {
        is_deal_of_the_day: next.is_deal_of_the_day,
        isDealOfTheDay: next.is_deal_of_the_day,
        discount,
        promo_text: next.promo_text.trim() || null,
        promoText: next.promo_text.trim() || null,
      });
      setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, ...updated } : p)));
      if (next.is_deal_of_the_day) {
        patchDraft(product.id, {
          discount,
          promo_text: next.promo_text.trim(),
          is_deal_of_the_day: true,
        });
      } else {
        setDrafts((prev) => {
          const copy = { ...prev };
          delete copy[product.id];
          return copy;
        });
      }
      window.dispatchEvent(new Event('products:refresh'));
      void refreshProducts();
      notify(
        next.is_deal_of_the_day
          ? `${product.name} is on Deal of the Day (−${discount}%).`
          : `${product.name} removed from Deal of the Day.`,
        'success',
      );
    } catch (e) {
      notify(friendlyProductActionError(e, 'update deal'), 'error');
    } finally {
      setSavingId(null);
    }
  };

  const addDeal = (product: Product) => {
    const seedDiscount = Math.max(5, getDealDiscountPercentage(product) || 10);
    const next: DraftPatch = {
      discount: seedDiscount,
      promo_text: getDealPromoText(product) || 'Limited time',
      is_deal_of_the_day: true,
    };
    patchDraft(product.id, next, product);
    setPickerOpen(false);
    setPickerQuery('');
    void persist(product, next);
  };

  const removeDeal = (product: Product) => {
    const draft = drafts[product.id] ?? {
      discount: getDealDiscountPercentage(product),
      promo_text: getDealPromoText(product),
      is_deal_of_the_day: true,
    };
    void persist(product, { ...draft, is_deal_of_the_day: false });
  };

  const saveRow = (product: Product) => {
    const draft = drafts[product.id];
    if (!draft) return;
    void persist(product, draft);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-orange-500 shrink-0" />
            <h2 className={`text-sm font-medium ${fg}`}>Deal of the Day</h2>
          </div>
          <p className={`mt-1 text-xs leading-relaxed max-w-xl ${muted}`}>
            Flag shop products, set the discount %, and optional promo line. Shop → Deal of the Day,
            home rail, cards, and cart prices all read these fields.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide ${border} ${muted} hover:text-[#B38B21]`}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <a
            href="#/store?browse=deals"
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide ${border} ${muted} hover:text-[#B38B21]`}
          >
            <ExternalLink size={12} />
            View shop
          </a>
          {canEdit && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#B38B21] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-black hover:bg-[#D4AF37]"
            >
              <Plus size={12} />
              Add deal
            </button>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border px-4 py-3 text-xs ${card} ${border}`}>
        <p className={muted}>
          <strong className={fg}>{dealProducts.length}</strong> live deal
          {dealProducts.length === 1 ? '' : 's'} · Discount uses product{' '}
          <code className="text-[10px]">discount</code> % · Flag is{' '}
          <code className="text-[10px]">is_deal_of_the_day</code>. Price stays on Storage+RAM SKUs;
          the % applies at cart / PDP.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search
          size={14}
          className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter current deals…"
          className={`${inputCls} pl-9`}
        />
      </div>

      {loading ? (
        <ListSkeleton count={4} isLight={isLight} />
      ) : filteredDeals.length === 0 ? (
        <div className={`rounded-2xl border border-dashed px-6 py-12 text-center ${border}`}>
          <Flame size={28} className={`mx-auto mb-3 opacity-30 ${muted}`} />
          <p className={`text-sm font-bold ${fg}`}>No Deal of the Day products yet</p>
          <p className={`mt-1 text-xs ${muted}`}>
            Add a product here, or enable the flag on a product’s Shop options tab.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#B38B21] px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-black"
            >
              <Plus size={12} />
              Add first deal
            </button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3">
          {filteredDeals.map((product) => {
            const draft = drafts[product.id] ?? {
              discount: getDealDiscountPercentage(product),
              promo_text: getDealPromoText(product),
              is_deal_of_the_day: true,
            };
            const previewProduct = {
              ...product,
              discount: draft.discount,
              promo_text: draft.promo_text,
              is_deal_of_the_day: draft.is_deal_of_the_day,
            };
            const original = getDealOriginalPrice(previewProduct);
            const sale = getDealDiscountedPrice(previewProduct);
            const busy = savingId === product.id;
            const dirty =
              draft.discount !== getDealDiscountPercentage(product) ||
              draft.promo_text !== getDealPromoText(product);

            return (
              <li
                key={product.id}
                className={`rounded-2xl border p-4 flex flex-col gap-4 sm:flex-row sm:items-stretch ${card} ${border}`}
              >
                <div className="flex gap-3 min-w-0 sm:w-[min(100%,280px)]">
                  <div
                    className={`h-16 w-16 shrink-0 rounded-xl overflow-hidden border ${border} ${
                      isLight ? 'bg-black/[0.03]' : 'bg-black/40'
                    }`}
                  >
                    {(product.image || product.image_url) && (
                      <img
                        src={product.image || product.image_url || ''}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-black leading-snug line-clamp-2 ${fg}`}>
                      {product.name}
                    </p>
                    <p className={`text-[10px] uppercase tracking-wider mt-1 ${muted}`}>
                      {product.category}
                      {product.brand ? ` · ${product.brand}` : ''}
                      {product.status && product.status !== 'active' ? ` · ${product.status}` : ''}
                    </p>
                    <p className="mt-2 text-xs font-bold text-[#B38B21] tabular-nums">
                      {formatCurrency(sale)}
                      {draft.discount > 0 && original > sale && (
                        <span className={`ml-2 font-medium line-through ${muted}`}>
                          {formatCurrency(original)}
                        </span>
                      )}
                      {draft.discount > 0 && (
                        <span className="ml-2 text-orange-500">−{draft.discount}%</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${muted}`}>
                      Discount %
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canEdit || busy}
                      value={draft.discount}
                      onChange={(e) =>
                        patchDraft(product.id, {
                          discount: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                  <label className="block sm:col-span-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${muted}`}>
                      Promo text
                    </span>
                    <input
                      type="text"
                      maxLength={120}
                      disabled={!canEdit || busy}
                      value={draft.promo_text}
                      onChange={(e) => patchDraft(product.id, { promo_text: e.target.value })}
                      placeholder="Limited time offer"
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch sm:justify-center sm:w-36">
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        disabled={busy || !dirty}
                        onClick={() => saveRow(product)}
                        className="rounded-xl bg-[#B38B21] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-black disabled:opacity-40 hover:bg-[#D4AF37]"
                      >
                        {busy ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeDeal(product)}
                        className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide ${border} ${muted} hover:border-red-500/40 hover:text-red-400`}
                      >
                        Remove
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      void navigate({ to: '/admin/products' as any })
                    }
                    className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide ${border} ${muted}`}
                    title="Open Shop products to edit full listing"
                  >
                    Open in Shop
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setPickerOpen(false)}
          />
          <div
            className={`relative z-10 w-full max-w-lg max-h-[min(80vh,640px)] flex flex-col rounded-2xl border shadow-2xl ${
              isLight ? 'bg-white border-black/10' : 'bg-[#0c0c0c] border-white/10'
            }`}
          >
            <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${border}`}>
              <h3 className={`text-sm font-black ${fg}`}>Add to Deal of the Day</h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className={`rounded-lg p-2 ${muted} hover:text-[#B38B21]`}
                aria-label="Close picker"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3">
              <input
                type="search"
                autoFocus
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Search catalogue…"
                className={inputCls}
              />
            </div>
            <ul className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
              {addable.length === 0 ? (
                <li className={`px-3 py-8 text-center text-xs ${muted}`}>
                  No matching products (or all are already deals).
                </li>
              ) : (
                addable.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={savingId === p.id}
                      onClick={() => addDeal(p)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isLight ? 'hover:bg-black/[0.04]' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <div
                        className={`h-10 w-10 shrink-0 rounded-lg overflow-hidden border ${border}`}
                      >
                        {(p.image || p.image_url) && (
                          <img
                            src={p.image || p.image_url || ''}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${fg}`}>{p.name}</p>
                        <p className={`text-[10px] ${muted}`}>
                          {p.category} · {formatCurrency(Number(p.price_from ?? p.price ?? 0))}
                        </p>
                      </div>
                      <Plus size={14} className="text-[#B38B21] shrink-0" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
