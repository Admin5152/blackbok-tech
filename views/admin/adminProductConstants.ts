/**
 * Shared product admin constants — kept out of AdminProductForm so Vite Fast
 * Refresh can hot-reload the form component without invalidating constant exports.
 */
import type { Product, ProductImage } from '../../types';

export const PRODUCT_CATEGORIES = [
  'iPhone',
  'iPad',
  'Laptop',
  'Gaming',
  'Accessories',
  'Audio',
  'Tablet',
  'Trades',
] as const;

export const PRODUCT_CONDITIONS = ['new', 'pre-owned', 'refurbished'] as const;
export const PRODUCT_STATUSES = ['active', 'draft', 'archived'] as const;

/** Common SIM codes matching trade pricing / product_variants.sim_type */
export const PRODUCT_SIM_OPTIONS = ['ps', 'es', 'single', 'wifi', 'cell_ps', 'cell_es'] as const;

export type ProductDraft = Partial<Product> & {
  colors?: string[];
  storage?: string[];
  ram?: string[];
  specs?: string[];
  sim_types?: string[];
  featured?: boolean;
  /** Local / joined gallery — persisted via product_images helpers. */
  images?: ProductImage[];
  specifications?: Record<string, unknown> | null;
  /** Editable JSON string for the specs textarea */
  specificationsJson?: string;
};
