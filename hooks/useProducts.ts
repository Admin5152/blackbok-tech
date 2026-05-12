import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface Product {
  id: string;
  name: string;
  model: string | null;
  sku: string | null;
  brand: string | null;
  description: string | null;
  specifications: Record<string, string> | null;
  category: string;
  /** Legacy single-image column. Falls back to this when `images` is empty. */
  image_url: string | null;
  images: ProductImage[];
  price: number;
  stock: number;
  sim_type: string | null;
  ram_capacity: string | null;
  storage_capacity: string | null;
  colors: string[];
  condition: string;
  status: string;
  featured: boolean;
  is_new: boolean;
  discount: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const PRODUCT_SELECT = `
  id, name, model, sku, brand, description, specifications, category,
  image_url, price, stock, sim_type, ram_capacity, storage_capacity,
  colors, condition, status, featured, is_new, discount, rating,
  review_count, created_at, updated_at,
  product_images ( id, url, alt_text, sort_order, is_primary )
`;

function normalizeProduct(row: Record<string, unknown>): Product {
  const rawImages = Array.isArray(row.product_images)
    ? (row.product_images as Array<Record<string, unknown>>)
    : [];

  const images: ProductImage[] = rawImages
    .map((image) => ({
      id: String(image.id ?? ''),
      url: String(image.url ?? ''),
      alt_text: (image.alt_text as string | null | undefined) ?? null,
      sort_order: Number(image.sort_order ?? 0),
      is_primary: Boolean(image.is_primary),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  const colors = Array.isArray(row.colors) ? (row.colors as string[]) : [];

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    model: (row.model as string | null | undefined) ?? null,
    sku: (row.sku as string | null | undefined) ?? null,
    brand: (row.brand as string | null | undefined) ?? null,
    description: (row.description as string | null | undefined) ?? null,
    specifications: (row.specifications as Record<string, string> | null | undefined) ?? null,
    category: String(row.category ?? ''),
    image_url: (row.image_url as string | null | undefined) ?? null,
    images,
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    sim_type: (row.sim_type as string | null | undefined) ?? null,
    ram_capacity: (row.ram_capacity as string | null | undefined) ?? null,
    storage_capacity: (row.storage_capacity as string | null | undefined) ?? null,
    colors,
    condition: String(row.condition ?? ''),
    status: String(row.status ?? ''),
    featured: Boolean(row.featured),
    is_new: Boolean(row.is_new),
    discount: Number(row.discount ?? 0),
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

/**
 * Fetches all products and their `product_images` rows via PostgREST embed.
 * The embed is the equivalent of the spec's `LEFT JOIN ... json_agg(...)`
 * pattern — supabase materializes it client-side as a `product_images`
 * array on each product row, which we sort and normalize here.
 */
export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fErr } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .order('created_at', { ascending: false });
      if (fErr) throw fErr;
      setProducts(((data ?? []) as Array<Record<string, unknown>>).map(normalizeProduct));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load products';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}

/**
 * Convenience helper for single-product pages. Same shape and fallback
 * behaviour as the list query.
 */
export async function fetchProductWithImages(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeProduct(data as Record<string, unknown>);
}

/**
 * Returns the URL to render for a product card / hero image.
 * - Prefers the `is_primary` image
 * - Falls back to the first image by `sort_order`
 * - Falls back to the legacy `image_url` column
 */
export function getDisplayImage(
  product: Pick<Product, 'images' | 'image_url'>,
): string | null {
  if (product.images && product.images.length > 0) {
    const primary = product.images.find((image) => image.is_primary);
    return (primary ?? product.images[0]).url;
  }
  return product.image_url;
}
