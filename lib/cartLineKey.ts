/**
 * Stable cart line identity — prefer variant_id when present so add/merge/remove
 * stay in sync (listing ATC hydrates SKUs; older carts may only have options).
 */
import type { CartItem } from '../types';

export function cartLineKey(
  item: Pick<CartItem, 'id' | 'variant_id' | 'selectedOptions'>,
): string {
  const vid = String(item.variant_id || '').trim();
  if (vid) return `${item.id}-v:${vid}`;
  return `${item.id}-o:${JSON.stringify(item.selectedOptions ?? {})}`;
}

export function cartLineKeyFromParts(
  productId: string,
  variantId: string | null | undefined,
  selectedOptions: Record<string, string> | undefined,
): string {
  return cartLineKey({
    id: productId,
    variant_id: variantId || undefined,
    selectedOptions,
  });
}
