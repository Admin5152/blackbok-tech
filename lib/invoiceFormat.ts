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

/** Trade-in valuation lines use GHC without forced decimals when whole. */
export function formatInvoiceGhcPlain(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return n.toLocaleString('en-GH');
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
  const raw = (displayId || '').trim().toUpperCase();
  if (raw) {
    // ORD-000125 / INV-000125 / bare digits
    const digits = raw.replace(/\D/g, '');
    if (raw.startsWith('INV') && digits) {
      return `# INV-${digits.padStart(6, '0')}`;
    }
    if (raw.startsWith('ORD') && digits) {
      return `# INV-${digits.padStart(6, '0')}`;
    }
    if (/^\d+$/.test(digits) && digits.length >= 3) {
      return `# INV-${digits.padStart(6, '0')}`;
    }
    return `# ${raw}`;
  }
  const short = fallbackId.replace(/-/g, '').replace(/\D/g, '').slice(-6).toUpperCase() || '000001';
  return `# INV-${short.padStart(6, '0')}`;
}
