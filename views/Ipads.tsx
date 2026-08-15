/**
 * /ipads — model grid (9 cards), not 90 variants.
 * Faceted filters live in URL search params.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Tablet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatGhsPlain } from '../lib/money';
import { PageBackButton } from '../components/PageBackButton';
import { ProductGridSkeleton } from '../components/Skeleton';
import { PAGE_SIZES, usePagination } from '../lib/pagination';
import { Pagination } from '../components/Pagination';
import { databaseSellPrice } from '../lib/productPrice';

type IpadProductRow = {
  id: string;
  name: string;
  slug: string | null;
  condition: string | null;
  subcategory: string | null;
  image_url: string | null;
  price: number | null;
  discount: number | null;
  specifications: Record<string, unknown> | null;
};

type ModelCard = {
  modelFamily: string;
  displayName: string;
  series: string;
  chip: string;
  imageUrl: string | null;
  priceFrom: number;
  conditions: Set<string>;
  storages: Set<string>;
  connectivities: Set<string>;
  productSlug: string;
};

type Search = {
  series?: string;
  storage?: string;
  connectivity?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
};

const SERIES_LABELS: Record<string, string> = {
  pro: 'iPad Pro',
  air: 'iPad Air',
  mini: 'iPad mini',
  standard: 'iPad',
};

type Props = {
  theme?: 'light' | 'dark';
  search: Search;
};

export const Ipads: React.FC<Props> = ({ theme = 'dark', search }) => {
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [rows, setRows] = useState<IpadProductRow[]>([]);
  const [variantMeta, setVariantMeta] = useState<
    Array<{
      product_id: string;
      storage: string | null;
      sim_type: string | null;
      price: number | null;
      price_modifier: number | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: products, error: pErr } = await supabase
          .from('products')
          .select('id, name, slug, condition, subcategory, image_url, price, discount, specifications')
          .eq('category', 'iPad')
          .eq('status', 'active');
        if (pErr) throw pErr;
        const list = (products ?? []) as IpadProductRow[];
        const ids = list.map((p) => p.id);
        let variants: typeof variantMeta = [];
        if (ids.length) {
          const { data: vrows, error: vErr } = await supabase
            .from('product_variants')
            .select('product_id, storage, sim_type, price, price_modifier, is_active')
            .in('product_id', ids)
            .eq('is_active', true);
          if (vErr) throw vErr;
          variants = (vrows ?? []).map((v) => ({
            product_id: String(v.product_id),
            storage: v.storage ?? null,
            sim_type: v.sim_type ?? null,
            price: v.price != null ? Number(v.price) : null,
            price_modifier: v.price_modifier != null ? Number(v.price_modifier) : 0,
          }));
        }
        if (!cancelled) {
          setRows(list);
          setVariantMeta(variants);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load iPads');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const models = useMemo(() => {
    const byFamily = new Map<string, ModelCard>();
    const variantsByProduct = new Map<string, typeof variantMeta>();
    for (const v of variantMeta) {
      const list = variantsByProduct.get(v.product_id) ?? [];
      list.push(v);
      variantsByProduct.set(v.product_id, list);
    }

    for (const p of rows) {
      const specs = p.specifications ?? {};
      const family = String(specs.model_family ?? p.slug?.replace(/-(new|preowned)$/, '') ?? p.id);
      const series = String(specs.series ?? p.subcategory ?? 'standard');
      const chip = String(specs.chip ?? '');
      const displayName = String(
        specs.generation_label
          ? `${SERIES_LABELS[series] ?? 'iPad'} ${specs.generation_label}${chip ? ` (${chip})` : ''}`
          : p.name.replace(/\s*\(Used\)\s*$/i, ''),
      );
      const existing = byFamily.get(family);
      const vs = variantsByProduct.get(p.id) ?? [];
      const prices = vs
        .map((variant) => databaseSellPrice(p, variant))
        .filter((price) => Number.isFinite(price) && price >= 0);
      const minP = prices.length ? Math.min(...prices) : databaseSellPrice(p);

      if (!existing) {
        const card: ModelCard = {
          modelFamily: family,
          displayName,
          series,
          chip,
          imageUrl: p.image_url,
          priceFrom: minP,
          conditions: new Set([String(p.condition ?? 'new')]),
          storages: new Set(vs.map((v) => v.storage).filter(Boolean) as string[]),
          connectivities: new Set(
            vs.map((v) => (v.sim_type === 'wifi' ? 'wifi' : 'cellular')).filter(Boolean),
          ),
          productSlug: family,
        };
        byFamily.set(family, card);
      } else {
        existing.conditions.add(String(p.condition ?? 'new'));
        if (minP > 0 && (existing.priceFrom <= 0 || minP < existing.priceFrom)) {
          existing.priceFrom = minP;
        }
        if (!existing.imageUrl && p.image_url) existing.imageUrl = p.image_url;
        for (const v of vs) {
          if (v.storage) existing.storages.add(v.storage);
          if (v.sim_type) existing.connectivities.add(v.sim_type === 'wifi' ? 'wifi' : 'cellular');
        }
      }
    }
    return Array.from(byFamily.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [rows, variantMeta]);

  const facets = useMemo(() => {
    const series = new Map<string, number>();
    const storage = new Map<string, number>();
    const connectivity = new Map<string, number>();
    const condition = new Map<string, number>();
    for (const m of models) {
      series.set(m.series, (series.get(m.series) ?? 0) + 1);
      for (const s of m.storages) storage.set(s, (storage.get(s) ?? 0) + 1);
      for (const c of m.connectivities) connectivity.set(c, (connectivity.get(c) ?? 0) + 1);
      for (const c of m.conditions) {
        const key = c === 'preowned' ? 'used' : c;
        condition.set(key, (condition.get(key) ?? 0) + 1);
      }
    }
    return { series, storage, connectivity, condition };
  }, [models]);

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (search.series && m.series !== search.series) return false;
      if (search.storage && !m.storages.has(search.storage)) return false;
      if (search.connectivity && !m.connectivities.has(search.connectivity)) return false;
      if (search.condition) {
        const want = search.condition === 'used' ? 'preowned' : 'new';
        if (!m.conditions.has(want) && !(search.condition === 'used' && m.conditions.has('used'))) {
          return false;
        }
      }
      if (search.minPrice != null && m.priceFrom < search.minPrice) return false;
      if (search.maxPrice != null && m.priceFrom > search.maxPrice) return false;
      return true;
    });
  }, [models, search]);

  const filterKey = [
    search.series,
    search.storage,
    search.connectivity,
    search.condition,
    search.minPrice,
    search.maxPrice,
  ].join('|');
  const {
    page,
    setPage,
    pageCount,
    pageItems,
    total,
  } = usePagination(filtered, PAGE_SIZES.catalog, filterKey);

  const setSearch = (patch: Partial<Search>) => {
    const next = { ...search, ...patch };
    // Drop undefined keys
    const clean: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(next)) {
      if (v != null && v !== '') clean[k] = v as string | number;
    }
    void navigate({ to: '/ipads', search: clean as never });
  };

  const clearFilters = () => void navigate({ to: '/ipads', search: {} as never });

  const hasFilters = Boolean(
    search.series ||
      search.storage ||
      search.connectivity ||
      search.condition ||
      search.minPrice != null ||
      search.maxPrice != null,
  );

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
      active
        ? 'border-[#CDA032] bg-[#CDA032]/15 text-[#CDA032]'
        : isLight
          ? 'border-black/10 hover:border-black/25'
          : 'border-white/10 hover:border-white/25'
    }`;

  return (
    <div className={`min-h-screen ${isLight ? 'bg-[#F0F0F0] text-black' : 'bg-black text-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <PageBackButton fallbackTo="/store" />
        <header className="mt-4 mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CDA032] mb-2">BlackBox</p>
          <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight">iPad</h1>
          <p className={`mt-2 text-sm ${isLight ? 'text-black/55' : 'text-white/55'}`}>
            Choose a model, then configure size, connectivity, storage, and colour.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          <aside className={`space-y-6 p-4 rounded-2xl border ${isLight ? 'bg-white border-black/5' : 'bg-[#0a0a0a] border-white/5'}`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Series</p>
              <div className="flex flex-wrap gap-2">
                {[...facets.series.entries()].map(([key, count]) => (
                  <button
                    key={key}
                    type="button"
                    className={chipClass(search.series === key)}
                    onClick={() => setSearch({ series: search.series === key ? undefined : key })}
                  >
                    {SERIES_LABELS[key] ?? key} ({count})
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Storage</p>
              <div className="flex flex-wrap gap-2">
                {[...facets.storage.keys()].sort().map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={chipClass(search.storage === key)}
                    onClick={() => setSearch({ storage: search.storage === key ? undefined : key })}
                  >
                    {key} ({facets.storage.get(key)})
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Connectivity</p>
              <div className="flex flex-wrap gap-2">
                {[...facets.connectivity.keys()].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={chipClass(search.connectivity === key)}
                    onClick={() =>
                      setSearch({ connectivity: search.connectivity === key ? undefined : key })
                    }
                  >
                    {key === 'wifi' ? 'Wi‑Fi' : 'Cellular'} ({facets.connectivity.get(key)})
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Condition</p>
              <div className="flex flex-wrap gap-2">
                {[...facets.condition.keys()].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={chipClass(search.condition === key)}
                    onClick={() =>
                      setSearch({ condition: search.condition === key ? undefined : key })
                    }
                  >
                    {key === 'used' ? 'Used' : 'Brand new'} ({facets.condition.get(key)})
                  </button>
                ))}
              </div>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#CDA032]/40 text-[#CDA032] hover:bg-[#CDA032]/10"
              >
                Clear filters
              </button>
            )}
          </aside>

          <div>
            {loading && <ProductGridSkeleton isLight={isLight} count={6} className="xl:grid-cols-3" />}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {!loading && !error && filtered.length === 0 && (
              <div className={`rounded-2xl border p-10 text-center ${isLight ? 'bg-white border-black/5' : 'bg-[#0a0a0a] border-white/5'}`}>
                <Tablet className="mx-auto mb-3 opacity-40" size={28} />
                <p className="font-bold mb-2">No iPads match these filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[#CDA032] text-sm font-bold underline"
                >
                  Clear filters
                </button>
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pageItems.map((m) => (
                    <Link
                      key={m.modelFamily}
                      to="/ipads/$modelSlug"
                      params={{ modelSlug: m.modelFamily } as any}
                      className={`group rounded-2xl border overflow-hidden transition-all ${
                        isLight
                          ? 'bg-white border-black/5 hover:border-[#CDA032]/40'
                          : 'bg-[#0a0a0a] border-white/5 hover:border-[#CDA032]/40'
                      }`}
                    >
                      <div className={`aspect-[4/3] flex items-center justify-center ${isLight ? 'bg-black/[0.03]' : 'bg-white/[0.03]'}`}>
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt={m.displayName} className="h-full w-full object-contain p-6" />
                        ) : (
                          <Tablet size={48} className="opacity-25" />
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mb-1">
                          {SERIES_LABELS[m.series] ?? m.series}
                          {m.chip ? ` · ${m.chip}` : ''}
                        </p>
                        <h2 className="font-black text-sm leading-snug group-hover:text-[#CDA032] transition-colors">
                          {m.displayName}
                        </h2>
                        <p className={`mt-2 text-sm font-bold ${isLight ? 'text-black/70' : 'text-white/70'}`}>
                          From {formatGhsPlain(m.priceFrom)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  total={total}
                  pageSize={PAGE_SIZES.catalog}
                  isLight={isLight}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
