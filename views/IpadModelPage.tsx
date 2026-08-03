/**
 * /ipads/$modelSlug — availability-driven configurator.
 * Selector order: Size → Connectivity → Storage → Condition → Colour.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Tablet } from 'lucide-react';
import {
  formatIpadCondition,
  formatIpadConnectivity,
  getIpadAvailability,
  type IpadAvailability,
  type IpadCombo,
} from '../lib/ipadApi';
import { formatGhsPlain } from '../lib/money';
import { PageBackButton } from '../components/PageBackButton';
import { ProductDetailSkeleton } from '../components/Skeleton';
import type { Product } from '../types';
import { getProductForPdp } from '../lib/catalogApi';

type Props = {
  modelSlug: string;
  theme?: 'light' | 'dark';
  addToCart: (product: Product, options?: Record<string, string>, quantity?: number) => void;
  notify?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
};

function uniq(values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const s = String(v ?? '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function AnimatedPrice({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(value)) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const duration = 320;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{formatGhsPlain(display)}</span>;
}

export const IpadModelPage: React.FC<Props> = ({ modelSlug, theme = 'dark', addToCart, notify }) => {
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [availability, setAvailability] = useState<IpadAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [size, setSize] = useState<string>('');
  const [connectivity, setConnectivity] = useState<string>('');
  const [storage, setStorage] = useState<string>('');
  const [condition, setCondition] = useState<string>('');
  const [color, setColor] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getIpadAvailability(modelSlug);
        if (cancelled) return;
        setAvailability(data);
        const combos = data.combos ?? [];
        if (combos.length) {
          const sizes = uniq(combos.map((c) => c.display_size));
          if (sizes[0]) setSize(sizes[0]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load model');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modelSlug]);

  const combos = availability?.combos ?? [];

  const conditionOptions = useMemo(() => {
    const set = new Set(combos.map((c) => (c.condition === 'preowned' ? 'preowned' : 'new')));
    return [...set];
  }, [combos]);

  const showCondition = conditionOptions.length > 1;

  // Auto-pick condition when only one exists
  useEffect(() => {
    if (conditionOptions.length === 1) setCondition(conditionOptions[0]);
  }, [conditionOptions]);

  const sizeOptions = useMemo(() => uniq(combos.map((c) => c.display_size)), [combos]);

  const connectivityOptions = useMemo(() => {
    const pool = size ? combos.filter((c) => c.display_size === size) : combos;
    return uniq(pool.map((c) => (c.sim_type === 'wifi' ? 'wifi' : 'cellular')));
  }, [combos, size]);

  const storageOptions = useMemo(() => {
    const pool = combos.filter((c) => {
      if (size && c.display_size !== size) return false;
      if (connectivity) {
        const want = connectivity === 'wifi' ? 'wifi' : 'cell';
        const got = c.sim_type === 'wifi' ? 'wifi' : 'cell';
        if (want !== got) return false;
      }
      return true;
    });
    return uniq(pool.map((c) => c.storage));
  }, [combos, size, connectivity]);

  const colorOptions = useMemo(() => {
    const pool = matchingCombos(combos, { size, connectivity, storage, condition, color: '' });
    const byColor = new Map<string, IpadCombo>();
    for (const c of pool) {
      const key = String(c.color ?? '');
      if (!key) continue;
      const prev = byColor.get(key);
      if (!prev || (c.stock_qty ?? 0) > (prev.stock_qty ?? 0)) byColor.set(key, c);
    }
    return [...byColor.values()].sort((a, b) =>
      String(a.color).localeCompare(String(b.color)),
    );
  }, [combos, size, connectivity, storage, condition]);

  // Keep selections valid as cascade narrows
  useEffect(() => {
    if (size && !sizeOptions.includes(size) && sizeOptions[0]) setSize(sizeOptions[0]);
  }, [size, sizeOptions]);
  useEffect(() => {
    if (connectivity && !connectivityOptions.includes(connectivity)) {
      setConnectivity(connectivityOptions[0] ?? '');
    }
  }, [connectivity, connectivityOptions]);
  useEffect(() => {
    if (storage && !storageOptions.includes(storage)) {
      setStorage(storageOptions[0] ?? '');
    }
  }, [storage, storageOptions]);
  useEffect(() => {
    if (color && !colorOptions.some((c) => c.color === color)) {
      setColor(colorOptions[0]?.color ?? '');
    }
  }, [color, colorOptions]);

  const matched = useMemo(() => {
    const hits = matchingCombos(combos, { size, connectivity, storage, condition, color });
    return hits[0] ?? null;
  }, [combos, size, connectivity, storage, condition, color]);

  const price = matched?.price_ghs ?? 0;

  const usedSave = useMemo(() => {
    if (!showCondition || !size || !connectivity || !storage) return null;
    const newHit = matchingCombos(combos, {
      size,
      connectivity,
      storage,
      condition: 'new',
      color: '',
    })[0];
    const usedHit = matchingCombos(combos, {
      size,
      connectivity,
      storage,
      condition: 'preowned',
      color: '',
    })[0];
    if (!newHit || !usedHit) return null;
    const delta = Number(newHit.price_ghs) - Number(usedHit.price_ghs);
    return delta > 0 ? delta : null;
  }, [combos, showCondition, size, connectivity, storage]);

  const missingLabel = useMemo(() => {
    if (!size) return 'Choose a size';
    if (!connectivity) return 'Choose connectivity';
    if (!storage) return 'Choose a storage size';
    if (showCondition && !condition) return 'Choose condition';
    if (!color) return 'Choose a colour';
    return null;
  }, [size, connectivity, storage, condition, color, showCondition]);

  const title =
    availability?.products?.[0]?.name?.replace(/\s*\(Used\)\s*$/i, '') ||
    modelSlug.replace(/-/g, ' ');

  const chipClass = (active: boolean, disabled: boolean) =>
    `px-3 py-2 rounded-xl text-xs font-bold border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CDA032] ${
      disabled
        ? 'opacity-40 line-through cursor-not-allowed border-[var(--bb-border)]'
        : active
          ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032]'
          : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40'
    }`;

  const optionStatus = (
    axis: 'size' | 'connectivity' | 'storage' | 'condition' | 'color',
    value: string,
  ): { disabled: boolean; reason?: string } => {
    const trial = {
      size: axis === 'size' ? value : size,
      connectivity: axis === 'connectivity' ? value : connectivity,
      storage: axis === 'storage' ? value : storage,
      condition: axis === 'condition' ? value : condition || (showCondition ? '' : 'new'),
      color: axis === 'color' ? value : '',
    };
    // For early axes, only require prior selections
    if (axis === 'size') {
      const any = combos.some((c) => c.display_size === value);
      return any ? { disabled: false } : { disabled: true, reason: 'Not stocked' };
    }
    if (axis === 'connectivity' && size) {
      const hits = combos.filter((c) => c.display_size === size);
      const want = value === 'wifi' ? 'wifi' : 'cell';
      const any = hits.some((c) => (c.sim_type === 'wifi' ? 'wifi' : 'cell') === want);
      return any ? { disabled: false } : { disabled: true, reason: 'Not stocked' };
    }
    if (axis === 'storage' && size && connectivity) {
      const hits = matchingCombos(combos, { ...trial, color: '', condition: '' });
      if (!hits.length) return { disabled: true, reason: 'Not stocked' };
      const active = hits.some((c) => c.status === 'active' || (c.stock_qty ?? 0) > 0);
      if (!active) return { disabled: true, reason: 'Out of stock' };
      return { disabled: false };
    }
    if (axis === 'condition') {
      const hits = matchingCombos(combos, {
        size,
        connectivity,
        storage,
        condition: value,
        color: '',
      });
      if (!hits.length) return { disabled: true, reason: 'Not stocked' };
      return { disabled: false };
    }
    if (axis === 'color') {
      const hits = matchingCombos(combos, { size, connectivity, storage, condition, color: value });
      if (!hits.length) return { disabled: true, reason: 'Not stocked' };
      const row = hits[0];
      if ((row.stock_qty ?? 0) <= 0) return { disabled: true, reason: 'Out of stock' };
      return { disabled: false };
    }
    return { disabled: false };
  };

  const onAdd = async () => {
    if (missingLabel || !matched) return;
    try {
      const product = await getProductForPdp(matched.product_id);
      if (!product) throw new Error('Product not found');
      addToCart(
        product,
        {
          Size: matched.display_size ?? size,
          SIM: matched.sim_type ?? '',
          Storage: matched.storage ?? storage,
          Color: matched.color ?? color,
        },
        1,
      );
      notify?.('Added to cart', 'success');
    } catch (e) {
      notify?.(e instanceof Error ? e.message : 'Could not add to cart', 'error');
    }
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-[#F0F0F0] text-black' : 'bg-black text-white'}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:pb-8">
        <PageBackButton fallbackTo="/ipads" />
        {loading && <div className="mt-8"><ProductDetailSkeleton isLight={isLight} /></div>}
        {error && <p className="mt-8 text-sm text-red-400">{error}</p>}
        {!loading && !error && combos.length === 0 && (
          <div className="mt-8 text-center">
            <Tablet className="mx-auto mb-3 opacity-40" />
            <p>No configurations found for this model.</p>
            <Link to="/ipads" className="text-[#CDA032] underline text-sm mt-2 inline-block">
              Back to iPads
            </Link>
          </div>
        )}

        {!loading && combos.length > 0 && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CDA032] mb-2">
                BlackBox · iPad
              </p>
              <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight mb-6">
                {title}
              </h1>

              {/* Size */}
              <section className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((opt) => {
                    const st = optionStatus('size', opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={st.disabled}
                        aria-pressed={size === opt}
                        className={chipClass(size === opt, st.disabled)}
                        onClick={() => !st.disabled && setSize(opt)}
                      >
                        {opt}
                        {st.disabled && st.reason ? (
                          <span className="ml-1 text-[9px] no-underline">{st.reason}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Connectivity */}
              <section className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">
                  Connectivity
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['wifi', 'cellular'] as const).map((opt) => {
                    const available = connectivityOptions.includes(opt);
                    const st = available
                      ? optionStatus('connectivity', opt)
                      : { disabled: true, reason: 'Not stocked' as const };
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={st.disabled}
                        aria-pressed={connectivity === opt}
                        className={chipClass(connectivity === opt, st.disabled)}
                        onClick={() => !st.disabled && setConnectivity(opt)}
                      >
                        {formatIpadConnectivity(opt)}
                        {st.disabled && st.reason ? (
                          <span className="ml-1 text-[9px]">{st.reason}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Storage */}
              <section className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">
                  Storage
                </p>
                <div className="flex flex-wrap gap-2">
                  {storageOptions.map((opt) => {
                    const st = optionStatus('storage', opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={st.disabled}
                        aria-pressed={storage === opt}
                        className={chipClass(storage === opt, st.disabled)}
                        onClick={() => !st.disabled && setStorage(opt)}
                      >
                        {opt}
                        {st.disabled && st.reason ? (
                          <span className="ml-1 text-[9px]">{st.reason}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Condition — only when both exist */}
              {showCondition && (
                <section className="mb-6">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">
                    Condition
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {conditionOptions.map((opt) => {
                      const st = optionStatus('condition', opt);
                      const label =
                        opt === 'preowned'
                          ? usedSave
                            ? `Used — save ${formatGhsPlain(usedSave)}`
                            : 'Used'
                          : 'Brand new';
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={st.disabled}
                          aria-pressed={condition === opt}
                          className={chipClass(condition === opt, st.disabled)}
                          onClick={() => !st.disabled && setCondition(opt)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Colour */}
              <section className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">
                  Colour
                </p>
                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((c) => {
                    const name = String(c.color ?? '');
                    const st = optionStatus('color', name);
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={st.disabled}
                        aria-label={name}
                        aria-pressed={color === name}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CDA032] ${
                          st.disabled
                            ? 'opacity-40 line-through cursor-not-allowed border-[var(--bb-border)]'
                            : color === name
                              ? 'border-[#CDA032] bg-[#CDA032]/10'
                              : 'border-[var(--bb-border)]'
                        }`}
                        onClick={() => !st.disabled && setColor(name)}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                          style={{ background: c.hex || '#888' }}
                          aria-hidden
                        />
                        {name}
                        {st.disabled && st.reason ? (
                          <span className="text-[9px]">{st.reason}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Price block — sticky on mobile via fixed bar */}
            <aside
              className={`hidden lg:block rounded-2xl border p-5 h-fit sticky top-24 ${
                isLight ? 'bg-white border-black/5' : 'bg-[#0a0a0a] border-white/5'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Price</p>
              <AnimatedPrice
                value={price}
                className="text-3xl font-black tracking-tight text-[#CDA032]"
              />
              {matched && (
                <p className={`mt-2 text-xs ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                  {formatIpadCondition(matched.condition)} · {formatIpadConnectivity(matched.sim_type)} ·{' '}
                  {matched.storage}
                </p>
              )}
              <button
                type="button"
                disabled={Boolean(missingLabel)}
                onClick={() => void onAdd()}
                className="mt-5 w-full py-3.5 rounded-xl bg-[#CDA032] text-black font-black text-xs uppercase tracking-[0.15em] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                {missingLabel ?? 'Add to cart'}
              </button>
              <button
                type="button"
                onClick={() => void navigate({ to: '/ipads' })}
                className={`mt-2 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  isLight ? 'border-black/10' : 'border-white/10'
                }`}
              >
                All iPads
              </button>
            </aside>
          </div>
        )}
      </div>

      {/* Mobile sticky price */}
      {!loading && combos.length > 0 && (
        <div
          className={`lg:hidden fixed bottom-0 inset-x-0 z-40 border-t p-4 backdrop-blur-xl ${
            isLight ? 'bg-white/95 border-black/10' : 'bg-black/95 border-white/10'
          }`}
        >
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Price</p>
              <AnimatedPrice value={price} className="text-xl font-black text-[#CDA032]" />
            </div>
            <button
              type="button"
              disabled={Boolean(missingLabel)}
              onClick={() => void onAdd()}
              className="shrink-0 px-5 py-3 rounded-xl bg-[#CDA032] text-black font-black text-[10px] uppercase tracking-[0.15em] disabled:opacity-40"
            >
              {missingLabel ?? 'Add to cart'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function matchingCombos(
  combos: IpadCombo[],
  sel: {
    size: string;
    connectivity: string;
    storage: string;
    condition: string;
    color: string;
  },
): IpadCombo[] {
  return combos.filter((c) => {
    if (sel.size && c.display_size !== sel.size) return false;
    if (sel.connectivity) {
      const want = sel.connectivity === 'wifi' ? 'wifi' : 'cell';
      const got = c.sim_type === 'wifi' ? 'wifi' : 'cell';
      if (want !== got) return false;
    }
    if (sel.storage && String(c.storage) !== sel.storage) return false;
    if (sel.condition) {
      const want = sel.condition === 'used' ? 'preowned' : sel.condition;
      if (c.condition !== want) return false;
    }
    if (sel.color && String(c.color) !== sel.color) return false;
    return true;
  });
}
