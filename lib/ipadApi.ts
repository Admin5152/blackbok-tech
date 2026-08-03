/**
 * iPad catalogue client — availability matrix + SKU resolve RPCs.
 */
import { supabase } from './supabase';

export type IpadCombo = {
  product_id: string;
  condition: string;
  variant_id: string;
  sku: string;
  display_size: string | null;
  sim_type: string | null;
  connectivity: string | null;
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

export type IpadAvailabilityProduct = {
  product_id: string;
  slug: string;
  name: string;
  condition: string;
  series?: string | null;
  series_name?: string | null;
  chip?: string | null;
  image_url?: string | null;
  price_from?: number | null;
};

export type IpadAvailability = {
  model_family: string;
  products: IpadAvailabilityProduct[];
  combos: IpadCombo[];
};

export async function getIpadAvailability(modelFamily: string): Promise<IpadAvailability> {
  const { data, error } = await supabase.rpc('get_ipad_availability', {
    p_model_family: modelFamily,
  });
  if (error) throw error;
  const raw = (data ?? {}) as Partial<IpadAvailability>;
  return {
    model_family: String(raw.model_family ?? modelFamily),
    products: Array.isArray(raw.products) ? raw.products : [],
    combos: Array.isArray(raw.combos) ? raw.combos : [],
  };
}

export async function resolveIpadVariant(args: {
  modelFamily: string;
  size: string;
  connectivity: string;
  storage: string;
  condition: string;
  color?: string | null;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('resolve_ipad_variant', {
    p_model_family: args.modelFamily,
    p_size: args.size,
    p_connectivity: args.connectivity,
    p_storage: args.storage,
    p_condition: args.condition,
    p_color: args.color ?? null,
  });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

/** Customer-facing connectivity label from sim_type / connectivity code. */
export function formatIpadConnectivity(code: string | null | undefined): string {
  const c = String(code || '')
    .trim()
    .toLowerCase();
  if (c === 'wifi' || c === 'wi-fi') return 'Wi‑Fi';
  if (c === 'cellular' || c === 'cell_ps' || c === 'cell') return 'Cellular';
  if (c === 'cell_es') return 'Cellular (eSIM)';
  return code || '';
}

export function formatIpadCondition(code: string | null | undefined): string {
  const c = String(code || '')
    .trim()
    .toLowerCase();
  if (c === 'preowned' || c === 'used' || c === 'pre-owned') return 'Used';
  if (c === 'new') return 'Brand new';
  return code || '';
}

export function connectivityToSim(code: string): string {
  const c = code.trim().toLowerCase();
  if (c === 'wifi' || c === 'wi-fi') return 'wifi';
  if (c === 'cellular' || c === 'cell' || c === 'cell_ps') return 'cell_ps';
  if (c === 'cell_es') return 'cell_es';
  return c;
}
