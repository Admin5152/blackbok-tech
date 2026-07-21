/** Company block printed on customer invoices (matches store letterhead). */
export const INVOICE_COMPANY = {
  legalName: 'BLACKBOX TECHNOLOGIES GHANA',
  lines: ['New Brunei', 'GUSSS HOSTELS, KNUST', 'Kumasi Ashanti 00233', 'Ghana'],
  email: 'blackboxxxgh@gmail.com',
} as const;

/** Invoice-style amount: GHS12,500.00 */
export function formatInvoiceMoney(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'GHS0.00';
  return `GHS${n.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Plain number for table rate/amount columns (no currency prefix). */
export function formatInvoicePlain(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatInvoiceQty(qty: number): string {
  const n = Number(qty);
  if (!Number.isFinite(n)) return '0.00 pcs';
  return `${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pcs`;
}

/** Normalize display ids toward INV-##### style when possible. */
export function formatInvoiceNumber(displayId: string | null | undefined, fallbackId: string): string {
  const raw = (displayId || '').trim();
  if (raw) {
    const upper = raw.toUpperCase();
    if (upper.startsWith('INV')) return `# ${upper}`;
    if (upper.startsWith('ORD')) return `# ${upper.replace(/^ORD/, 'INV')}`;
    return `# ${upper}`;
  }
  const short = fallbackId.replace(/-/g, '').slice(-6).toUpperCase();
  return `# INV-${short.padStart(6, '0')}`;
}
