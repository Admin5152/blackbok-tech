/**
 * Console / controller catalogue client — availability matrix + SKU resolve RPCs.
 */
import { supabase } from './supabase';

export type ConsoleCombo = {
  product_id: string;
  variant_id: string;
  sku: string;
  edition: string | null;
  storage: string | null;
  color: string | null;
  price_ghs: number;
  price_pesewas?: number;
  stock_qty: number;
  status: string;
  hex?: string | null;
  color_slug?: string | null;
  image_url?: string | null;
  display_name?: string | null;
};

export type ConsoleAvailabilityProduct = {
  product_id: string;
  slug: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  series?: string | null;
  storage_label?: string | null;
  has_edition_axis?: boolean;
  image_url?: string | null;
  price_from?: number | null;
};

export type ConsoleAvailability = {
  model_slug: string;
  has_edition_axis: boolean;
  products: ConsoleAvailabilityProduct[];
  combos: ConsoleCombo[];
};

export function isConsoleCatalog(product: {
  category?: string | null;
  specifications?: Record<string, unknown> | null;
}): boolean {
  const catalog = String(product.specifications?.catalog ?? '').toLowerCase();
  if (catalog === 'console' || catalog === 'controller') return true;
  const cat = String(product.category ?? '');
  return cat === 'Consoles' || cat === 'Controllers';
}

export function consoleHasColourSkus(product: {
  variants?: Array<{ color?: string | null; options?: unknown }> | null;
}): boolean {
  return (product.variants || []).some((v) => {
    if (!v || typeof v !== 'object') return false;
    if (typeof (v as { name?: unknown }).name === 'string' && Array.isArray(v.options)) return false;
    return Boolean(String(v.color ?? '').trim());
  });
}

export function consoleHasEditionAxis(product: {
  specifications?: Record<string, unknown> | null;
  name?: string | null;
}): boolean {
  if (product.specifications?.has_edition_axis === true) return true;
  return String(product.name ?? '').toLowerCase().includes('playstation 5 slim');
}

export async function getConsoleAvailability(modelSlug: string): Promise<ConsoleAvailability> {
  const { data, error } = await supabase.rpc('get_console_availability', {
    p_model_slug: modelSlug,
  });
  if (error) throw error;
  const raw = (data ?? {}) as Partial<ConsoleAvailability>;
  return {
    model_slug: String(raw.model_slug ?? modelSlug),
    has_edition_axis: Boolean(raw.has_edition_axis),
    products: Array.isArray(raw.products) ? raw.products : [],
    combos: Array.isArray(raw.combos) ? raw.combos : [],
  };
}

export async function resolveConsoleVariant(args: {
  modelSlug: string;
  edition?: string | null;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('resolve_console_variant', {
    p_model_slug: args.modelSlug,
    p_edition: args.edition ?? null,
  });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export function formatConsoleCondition(code: string | null | undefined): string {
  const c = String(code || '')
    .trim()
    .toLowerCase();
  if (c === 'new' || c === 'brand new') return 'Brand new';
  if (c === 'preowned' || c === 'used' || c === 'pre-owned') return 'Used';
  return code || 'Brand new';
}

export function editionHelpText(edition: string | null | undefined): string {
  const e = String(edition || '').trim().toLowerCase();
  if (e === 'standard') return 'Standard plays disc games.';
  if (e === 'digital') return 'Digital is download-only.';
  if (e === 'disc') return 'Disc edition plays physical games.';
  return '';
}
