import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type ShopTaxonomyKind = 'category' | 'subcategory' | 'series';

export interface ShopTaxonomyNode {
  id: string;
  parent_id: string | null;
  kind: ShopTaxonomyKind;
  value: string;
  label: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ShopTaxonomyNodeInput = {
  parent_id?: string | null;
  kind: ShopTaxonomyKind;
  value: string;
  label: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
};

const clean = (value: unknown, max = 80) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export async function getShopTaxonomy(options?: {
  includeInactive?: boolean;
}): Promise<ShopTaxonomyNode[]> {
  let query = supabase
    .from('shop_taxonomy_nodes')
    .select('*')
    .order('sort_order')
    .order('label');
  if (!options?.includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) {
    // The storefront remains usable before the migration is deployed.
    if (/shop_taxonomy_nodes|does not exist|schema cache|PGRST205/i.test(error.message)) return [];
    throw error;
  }
  return (data ?? []) as ShopTaxonomyNode[];
}

export async function createShopTaxonomyNode(
  input: ShopTaxonomyNodeInput,
): Promise<ShopTaxonomyNode> {
  const value = clean(input.value);
  const label = clean(input.label);
  if (!value || !label) throw new Error('Name and catalog value are required.');
  const { data, error } = await supabase
    .from('shop_taxonomy_nodes')
    .insert({
      parent_id: input.parent_id ?? null,
      kind: input.kind,
      value,
      label,
      description: clean(input.description, 240),
      sort_order: Math.floor(Number(input.sort_order) || 0),
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single();
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('shop-taxonomy:refresh'));
  return data as ShopTaxonomyNode;
}

export async function updateShopTaxonomyNode(
  id: string,
  updates: Partial<Pick<ShopTaxonomyNode, 'label' | 'description' | 'sort_order' | 'is_active'>>,
): Promise<ShopTaxonomyNode> {
  const payload = {
    ...(updates.label !== undefined ? { label: clean(updates.label) } : {}),
    ...(updates.description !== undefined
      ? { description: clean(updates.description, 240) }
      : {}),
    ...(updates.sort_order !== undefined
      ? { sort_order: Math.floor(Number(updates.sort_order) || 0) }
      : {}),
    ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
  };
  if ('label' in payload && !payload.label) throw new Error('Name is required.');
  const { data, error } = await supabase
    .from('shop_taxonomy_nodes')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('shop-taxonomy:refresh'));
  return data as ShopTaxonomyNode;
}

function rootForNode(
  node: ShopTaxonomyNode,
  nodes: ShopTaxonomyNode[],
): ShopTaxonomyNode | undefined {
  let current: ShopTaxonomyNode | undefined = node;
  while (current?.parent_id) current = nodes.find((item) => item.id === current?.parent_id);
  return current?.kind === 'category' ? current : undefined;
}

export async function deleteShopTaxonomyNode(
  node: ShopTaxonomyNode,
  nodes: ShopTaxonomyNode[],
): Promise<void> {
  if (node.is_system) throw new Error('Built-in categories cannot be deleted.');
  if (nodes.some((item) => item.parent_id === node.id)) {
    throw new Error('Delete its child subcategories or series first.');
  }

  const root = rootForNode(node, nodes);
  let productsQuery = supabase.from('products').select('id', { count: 'exact', head: true });
  if (root) productsQuery = productsQuery.eq('category', root.value);
  if (node.kind === 'subcategory') productsQuery = productsQuery.eq('brand', node.value);
  if (node.kind === 'series') productsQuery = productsQuery.eq('subcategory', node.value);
  const { count, error: countError } = await productsQuery;
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error(
      `Move or delete ${count} assigned product${count === 1 ? '' : 's'} before deleting this item.`,
    );
  }

  const { error } = await supabase.from('shop_taxonomy_nodes').delete().eq('id', node.id);
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('shop-taxonomy:refresh'));
}

export function taxonomyChildren(
  nodes: ShopTaxonomyNode[],
  parentId: string | null,
  kind?: ShopTaxonomyKind,
): ShopTaxonomyNode[] {
  return nodes
    .filter((node) => node.parent_id === parentId && (!kind || node.kind === kind))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
}

export function useShopTaxonomy(includeInactive = false) {
  const [nodes, setNodes] = useState<ShopTaxonomyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setNodes(await getShopTaxonomy({ includeInactive }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load shop categories.');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void reload();
    const refresh = () => void reload();
    window.addEventListener('shop-taxonomy:refresh', refresh);
    return () => window.removeEventListener('shop-taxonomy:refresh', refresh);
  }, [reload]);

  return { nodes, loading, error, reload };
}
