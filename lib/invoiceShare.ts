/** Paths + share helpers for customer invoices (orders / repairs / trade-ins). */

export type InvoiceKind = 'order' | 'repair' | 'trade';

export function invoicePath(
  kind: InvoiceKind,
  id: string,
  opts?: { print?: boolean },
): string {
  const base =
    kind === 'order'
      ? `/receipt/${id}`
      : kind === 'repair'
        ? `/receipt/repair/${id}`
        : `/receipt/trade/${id}`;
  return opts?.print ? `${base}?print=1` : base;
}

export function invoiceAbsoluteUrl(
  kind: InvoiceKind,
  id: string,
  opts?: { print?: boolean },
): string {
  const path = invoicePath(kind, id, opts);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

export type ShareInvoiceResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export async function shareInvoiceLink(opts: {
  title: string;
  text?: string;
  url: string;
}): Promise<ShareInvoiceResult> {
  const { title, text, url } = opts;
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
      if (name === 'AbortError') return 'cancelled';
      /* fall through to clipboard */
    }
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
  } catch {
    /* ignore */
  }
  return 'failed';
}
