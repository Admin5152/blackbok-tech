/**
 * Shared product admin constants — kept out of AdminProductForm so Vite Fast
 * Refresh can hot-reload the form component without invalidating constant exports.
 */
import type { Product, ProductImage } from '../../types';
import { ADMIN_MAIN_CATEGORIES } from '../../lib/storeFilters';

/** Approved main categories — same taxonomy as the storefront products page. */
export const PRODUCT_CATEGORIES = ADMIN_MAIN_CATEGORIES;

export const PRODUCT_CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'preowned', label: 'Pre-owned' },
  { value: 'refurbished', label: 'Refurbished' },
] as const;

/** DB values for products.condition (CHECK: new | preowned | refurbished). */
export const PRODUCT_CONDITIONS = PRODUCT_CONDITION_OPTIONS.map((o) => o.value);
export const PRODUCT_STATUSES = ['active', 'draft', 'archived'] as const;

/** Common SIM codes matching trade pricing / product_variants.sim_type */
export const PRODUCT_SIM_OPTIONS = ['ps', 'es', 'single', 'wifi', 'cell_ps', 'cell_es'] as const;

export type ProductDraft = Partial<Product> & {
  colors?: string[];
  storage?: string[];
  ram?: string[];
  specs?: string[];
  sim_types?: string[];
  /** Screen sizes for tablets (e.g. 11", 13") — product_variants.display_size */
  display_sizes?: string[];
  featured?: boolean;
  /**
   * Admin taxonomy picker value (condition new|used OR brand/type config value).
   * Synced into `condition` / `is_new` / `subcategory` on save.
   */
  taxonomy_value?: string | null;
  /** Series slug (pro / air / iphone-17 …) — stored on products.subcategory for series cats */
  series?: string | null;
  /** Local / joined gallery — persisted via product_images helpers. */
  images?: ProductImage[];
  specifications?: Record<string, unknown> | null;
  /** Editable JSON string for the specs textarea */
  specificationsJson?: string;
};
