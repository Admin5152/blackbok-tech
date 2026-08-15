/**
 * Console / controller PDP controls: storage badge, edition cards (PS5 Slim only),
 * first-class colour swatches. Out-of-stock options are grayed with a pop tip.
 */
import React, { useEffect, useMemo } from 'react';
import type { Product } from '../../types';
import { formatGhsPlain } from '../../lib/money';
import {
  consoleHasEditionAxis,
  editionHelpText,
  getConsoleAvailability,
  type ConsoleCombo,
} from '../../lib/consoleApi';
import { databaseSellPrice } from '../../lib/productPrice';
import { StockAwareOptionButton } from '../StockAwareOptionButton';

type Props = {
  product: Product;
  selectedOptions: Record<string, string>;
  onOptionsChange: (next: Record<string, string>) => void;
  isLight: boolean;
};

function hexForColor(name: string, hex?: string | null): string {
  if (hex && /^#?[0-9a-f]{3,8}$/i.test(hex)) {
    return hex.startsWith('#') ? hex : `#${hex}`;
  }
  const ol = name.toLowerCase();
  if (ol.includes('black') || ol.includes('midnight')) return '#111111';
  if (ol.includes('white') || ol.includes('starlight')) return '#f5f5f7';
  if (ol.includes('red')) return '#ef4444';
  if (ol.includes('blue') || ol.includes('cobalt')) return '#3b82f6';
  if (ol.includes('green')) return '#10b981';
  if (ol.includes('purple')) return '#a855f7';
  if (ol.includes('pink')) return '#ec4899';
  if (ol.includes('gold')) return '#f59e0b';
  if (ol.includes('silver') || ol.includes('grey') || ol.includes('gray')) return '#9ca3af';
  return '#6b7280';
}

function comboInStock(c: ConsoleCombo): boolean {
  return c.status === 'active' && Number(c.stock_qty ?? 0) > 0;
}

export const ConsolePdpBlock: React.FC<Props> = ({
  product,
  selectedOptions,
  onOptionsChange,
  isLight,
}) => {
  const hasAxis = consoleHasEditionAxis(product);
  const storageLabel = String(
    (product.specifications as Record<string, unknown> | null | undefined)?.storage_label ??
      (Array.isArray(product.storage) ? product.storage[0] : '') ??
      '',
  ).trim();

  const localCombos = useMemo<ConsoleCombo[]>(() => {
    const rows = (product.variants || []).filter(
      (v) => v && typeof v === 'object' && !Array.isArray((v as { options?: unknown }).options),
    );
    return rows.map((v) => ({
      product_id: product.id,
      variant_id: String(v.id ?? ''),
      sku: String(v.sku ?? ''),
      edition: v.edition ?? null,
      storage: v.storage ?? null,
      color: v.color ?? null,
      price_ghs: databaseSellPrice(product, v),
      stock_qty: Number(v.stock ?? 0),
      status: v.is_active === false ? 'not_stocked' : Number(v.stock ?? 0) <= 0 ? 'out_of_stock' : 'active',
      hex: (v.attributes as Record<string, unknown> | null | undefined)?.hex as string | undefined,
      image_url: v.image_url ?? product.image ?? null,
      display_name: product.name,
    }));
  }, [product]);

  const [rpcCombos, setRpcCombos] = React.useState<ConsoleCombo[] | null>(null);
  const modelSlug = String(
    (product.specifications as Record<string, unknown> | null | undefined)?.model_slug ?? '',
  ).trim();

  useEffect(() => {
    if (!modelSlug) return;
    let cancelled = false;
    getConsoleAvailability(modelSlug)
      .then((data) => {
        if (!cancelled && data.combos.length) setRpcCombos(data.combos);
      })
      .catch(() => {
        /* seed/RPC may not be applied yet — local variants still work */
      });
    return () => {
      cancelled = true;
    };
  }, [modelSlug]);

  const combos = useMemo(() => {
    const source = rpcCombos && rpcCombos.length > 0 ? rpcCombos : localCombos;
    return source.map((combo) => {
      const variant = product.variants?.find(
        (row) => String(row.id ?? '') === String(combo.variant_id ?? ''),
      );
      return variant
        ? { ...combo, price_ghs: databaseSellPrice(product, variant) }
        : combo;
    });
  }, [localCombos, product, rpcCombos]);

  const editions = useMemo(() => {
    const map = new Map<string, { edition: string; price: number; sku: string; inStock: boolean }>();
    for (const c of combos) {
      const ed = String(c.edition ?? '').trim();
      if (!ed) continue;
      const prev = map.get(ed);
      const stocked = comboInStock(c);
      if (!prev) {
        map.set(ed, { edition: ed, price: c.price_ghs, sku: c.sku, inStock: stocked });
      } else if (stocked) {
        map.set(ed, { ...prev, inStock: true, price: Math.min(prev.price, c.price_ghs) });
      }
    }
    return [...map.values()];
  }, [combos]);

  const selectedEdition = selectedOptions.Edition || (hasAxis ? editions[0]?.edition : '') || '';

  const colourCombos = useMemo(() => {
    return combos.filter((c) => {
      if (hasAxis && selectedEdition) {
        return String(c.edition ?? '') === selectedEdition && String(c.color ?? '').trim();
      }
      return String(c.color ?? '').trim();
    });
  }, [combos, hasAxis, selectedEdition]);

  const selectedColor = selectedOptions.Color || '';
  const coloursExist = colourCombos.length > 0;

  useEffect(() => {
    if (!hasAxis || !editions.length) return;
    if (selectedOptions.Edition) return;
    const firstIn = editions.find((e) => e.inStock) || editions[0];
    onOptionsChange({ ...selectedOptions, Edition: firstIn.edition });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAxis, editions.map((e) => e.edition).join('|')]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-[10px] font-black uppercase tracking-widest ${
            isLight ? 'text-black/40' : 'text-white/40'
          }`}
        >
          Brand new
        </span>
        {storageLabel ? (
          <span
            className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
              isLight ? 'bg-black/5 text-black/70' : 'bg-white/10 text-white/80'
            }`}
          >
            {storageLabel}
          </span>
        ) : null}
      </div>

      {hasAxis && editions.length > 0 && (
        <div className="space-y-2">
          <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${isLight ? 'text-black/45' : 'text-white/45'}`}>
            Edition
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {editions.map((ed) => {
              const selected = selectedEdition === ed.edition;
              const oos = !ed.inStock;
              return (
                <StockAwareOptionButton
                  key={ed.edition}
                  outOfStock={oos}
                  selected={selected}
                  label={ed.edition}
                  tipAlign="start"
                  onSelect={() =>
                    onOptionsChange({
                      ...selectedOptions,
                      Edition: ed.edition,
                      Color: '',
                    })
                  }
                  className={`relative w-full text-left rounded-xl border px-3 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B38B21] ${
                    oos
                      ? 'opacity-40 grayscale cursor-not-allowed border-black/10'
                      : selected
                        ? 'border-[#B38B21] bg-[#B38B21]/10'
                        : isLight
                          ? 'border-black/10 hover:border-black/25 bg-white'
                          : 'border-white/10 hover:border-white/25 bg-white/[0.03]'
                  }`}
                >
                  <span className={`block text-sm font-black ${isLight ? 'text-black' : 'text-white'}`}>
                    {ed.edition}
                  </span>
                  <span className="block text-sm font-black text-[#B38B21] tabular-nums mt-0.5">
                    {formatGhsPlain(ed.price)}
                  </span>
                </StockAwareOptionButton>
              );
            })}
          </div>
          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-black/55' : 'text-white/55'}`}>
            Standard plays disc games. Digital is download-only.
          </p>
        </div>
      )}

      {!hasAxis && selectedEdition && editionHelpText(selectedEdition) ? (
        <p className={`text-[11px] ${isLight ? 'text-black/50' : 'text-white/50'}`}>
          {editionHelpText(selectedEdition)}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${isLight ? 'text-black/45' : 'text-white/45'}`}>
          Colour
        </p>
        {coloursExist ? (
          <div className="flex flex-wrap gap-2">
            {colourCombos.map((c) => {
              const name = String(c.color);
              const selected = selectedColor === name;
              const oos = !comboInStock(c);
              return (
                <StockAwareOptionButton
                  key={`${c.variant_id}-${name}`}
                  outOfStock={oos}
                  selected={selected}
                  label={name}
                  onSelect={() => onOptionsChange({ ...selectedOptions, Color: name })}
                  className={`relative inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B38B21] ${
                    oos
                      ? 'opacity-40 grayscale cursor-not-allowed'
                      : selected
                        ? 'border-[#B38B21] bg-[#B38B21]/15 text-[#B38B21]'
                        : isLight
                          ? 'border-black/15 text-black/80 hover:border-black/30'
                          : 'border-white/15 text-white/80 hover:border-white/30'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: hexForColor(name, c.hex) }}
                    aria-hidden
                  />
                  {name}
                </StockAwareOptionButton>
              );
            })}
          </div>
        ) : (
          <p className={`text-[11px] ${isLight ? 'text-black/40' : 'text-white/40'}`}>
            Colour options will appear here when stocked.
          </p>
        )}
      </div>
    </div>
  );
};
