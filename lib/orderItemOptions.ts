/**
 * Order line `product_options` (JSONB): persist customer selections so admin
 * can fulfil the exact configuration. Postgres jsonb may reorder object keys,
 * so we also store a single human-readable `configuration` string in order.
 */

/** Preferred display order for storefront option groups. */
const CANONICAL_KEYS = ['Color', 'Storage', 'RAM'] as const;

/** Build "Color: Black · Storage: 256GB · RAM: 8GB" from a flat map. */
export function buildConfigurationSummary(opts: Record<string, string>): string {
  const parts: string[] = [];
  for (const key of CANONICAL_KEYS) {
    const v = opts[key]?.trim();
    if (v) parts.push(`${key}: ${v}`);
  }
  for (const [k, v] of Object.entries(opts)) {
    if ((CANONICAL_KEYS as readonly string[]).includes(k)) continue;
    const t = String(v ?? '').trim();
    if (t) parts.push(`${k}: ${t}`);
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
  variant: { sku?: string | null } | null | undefined,
): Record<string, string> {
  if (Object.keys(opts).length > 0) return opts;
  if (variant?.sku) return { variant: String(variant.sku) };
  return {};
}
