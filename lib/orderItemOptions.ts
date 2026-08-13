/**
 * Order line `product_options` (JSONB): persist customer selections so admin
 * can fulfil the exact configuration. Postgres jsonb may reorder object keys,
 * so we also store a single human-readable `configuration` string in order.
 */

import { formatProductOptionLabel } from './productLabels';

/** Preferred display order for storefront option groups. */
const CANONICAL_KEYS = ['Color', 'Storage', 'RAM', 'SIM', 'Size', 'Edition'] as const;

/** Build "Color: Black · Storage: 256GB · RAM: 8GB" from a flat map. */
export function buildConfigurationSummary(opts: Record<string, string>): string {
  const parts: string[] = [];
  for (const key of CANONICAL_KEYS) {
    const v = opts[key]?.trim();
    if (v) parts.push(`${key}: ${v}`);
  }
  for (const [k, v] of Object.entries(opts)) {
    if ((CANONICAL_KEYS as readonly string[]).includes(k as (typeof CANONICAL_KEYS)[number])) continue;
    const t = String(v ?? '').trim();
    if (t) parts.push(`${formatProductOptionLabel(k)}: ${t}`);
  }
  return parts.join(' · ');
}

/**
 * Payload written to `order_items.product_options` at checkout.
 * Returns null when there are no meaningful selections.
 */
export function buildProductOptionsForRpc(
  selected: Record<string, string> | null | undefined,
): Record<string, string> | null {
  if (!selected || typeof selected !== 'object') return null;
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(selected)) {
    const t = String(v ?? '').trim();
    if (!t) continue;
    clean[k] = t;
  }
  if (Object.keys(clean).length === 0) return null;
  const configuration = buildConfigurationSummary(clean);
  return { ...clean, configuration };
}

/** Strip internal `configuration` key for UI chips / cart-style maps. */
export function normalizeOrderItemOptions(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === 'configuration') continue;
    if (v == null) continue;
    const s = String(v).trim();
    if (s) out[k] = s;
  }
  return out;
}

/** One-line summary for staff (prefers stored `configuration`). */
export function getOrderItemConfigurationLine(raw: unknown): string | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const c = (raw as Record<string, unknown>).configuration;
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  const opts = normalizeOrderItemOptions(raw);
  if (Object.keys(opts).length === 0) return null;
  return buildConfigurationSummary(opts);
}

export function mergeVariantSkuFallback(
  opts: Record<string, string>,
  variant:
    | {
        sku?: string | null;
        color?: string | null;
        storage?: string | null;
        ram?: string | null;
        sim_type?: string | null;
        display_size?: string | null;
        edition?: string | null;
      }
    | null
    | undefined,
): Record<string, string> {
  if (Object.keys(opts).length > 0) return opts;
  if (!variant || typeof variant !== 'object') return {};
  const fromSku: Record<string, string> = {};
  if (variant.color) fromSku.Color = String(variant.color);
  if (variant.storage) fromSku.Storage = String(variant.storage);
  if (variant.ram) fromSku.RAM = String(variant.ram);
  if (variant.sim_type) fromSku.SIM = String(variant.sim_type);
  if (variant.display_size) fromSku.Size = String(variant.display_size);
  if (variant.edition) fromSku.Edition = String(variant.edition);
  if (Object.keys(fromSku).length > 0) return fromSku;
  if (variant.sku) return { 'Item code': String(variant.sku) };
  return {};
}
