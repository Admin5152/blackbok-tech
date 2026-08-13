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
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Invoice date like sample INV-000125: "08 Jun 2026" */
export function formatInvoiceDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
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

/**
 * Storefront / print copy — BlackBox prints these at the counter as invoices
 * (purchases, repair service amounts, trade-in valuations). Keep URLs as
 * `/receipt/...` for routing; customer-facing words should say Invoice.
 */
export const INVOICE_COPY = {
  /** Mini-printer / letterhead secondary label under INVOICE */
  purchaseKind: 'Purchase',
  repairKind: 'Repair service',
  tradeKind: 'Trade-in valuation',
  /** Buttons / history / profile */
  view: 'View Invoice',
  download: 'Download invoice',
  loadingPurchase: 'Loading invoice…',
  loadingRepair: 'Loading repair invoice…',
  loadingTrade: 'Loading trade-in invoice…',
  missing: 'Invoice not available',
  missingPurchaseHint: 'That order invoice could not be loaded. Check the link or open it from your order history.',
  missingRepairHint: 'This repair invoice could not be loaded, or you do not have access.',
  missingTradeHint: 'This trade-in invoice could not be loaded, or you do not have access.',
  /** Repair printable notes when staff have not locked a final amount */
  repairEstimateNote:
    'Repair service invoice — amount shown is the current estimate and may be updated after diagnostics.',
  tradeNote: 'Trade-in valuation invoice — credit applies toward an eligible upgrade.',
} as const;
