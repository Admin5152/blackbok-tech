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
export type InvoiceDocumentPhase = 'estimate' | 'final';

/** Repair: estimate until ready/completed or a locked final_cost exists. */
export function repairInvoicePhase(repair: {
  status?: string | null;
  final_cost?: number | string | null;
  estimatedCost?: string | null;
}): InvoiceDocumentPhase {
  const finalRaw = repair.final_cost;
  const hasFinal =
    finalRaw != null &&
    finalRaw !== '' &&
    Number.isFinite(Number(String(finalRaw).replace(/[^\d.]/g, ''))) &&
    Number(String(finalRaw).replace(/[^\d.]/g, '')) > 0;
  const st = String(repair.status || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ');
  if (hasFinal) return 'final';
  if (
    st === 'completed' ||
    st === 'ready' ||
    st === 'in repair' ||
    st === 'in_repair'
  ) {
    return 'final';
  }
  return 'estimate';
}

/**
 * Trade-in: online estimate until staff send an offer (or the trade is accepted /
 * scheduled / completed). Then it is the final valuation / offer.
 */
export function tradeInvoicePhase(trade: {
  status?: string | null;
  finalValue?: number | null;
  final_value?: number | null;
  offeredPrice?: number | null;
  offered_price?: number | null;
}): InvoiceDocumentPhase {
  const offerRaw =
    trade.finalValue ?? trade.final_value ?? trade.offeredPrice ?? trade.offered_price;
  const n = offerRaw == null ? NaN : Number(offerRaw);
  const hasOffer = Number.isFinite(n) && n > 0;
  const st = String(trade.status || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ');
  if (hasOffer) return 'final';
  if (
    st === 'accepted' ||
    st === 'scheduled' ||
    st === 'completed' ||
    st === 'offer made' ||
    st === 'offer sent' ||
    st === 'awaiting user' ||
    st === 'awaiting_user'
  ) {
    return 'final';
  }
  return 'estimate';
}

export const INVOICE_COPY = {
  /** Mini-printer / letterhead secondary label under INVOICE */
  purchaseKind: 'Purchase',
  repairKind: 'Repair service',
  tradeKind: 'Trade-in valuation',
  titleEstimate: 'ESTIMATE',
  titleFinal: 'INVOICE',
  phaseEstimateBadge: 'Estimate — not final',
  phaseFinalBadge: 'Final invoice',
  phaseEstimateBanner:
    'This is an estimate only. Amounts may change after inspection. It is not a final invoice.',
  phaseFinalBanner: 'This is the final invoice for this request.',
  phaseEstimateTerms: 'Estimate — subject to confirmation',
  phaseFinalTerms: 'Due on Receipt',
  balanceEstimateLabel: 'Estimated amount',
  balanceFinalLabel: 'Balance Due',
  dateEstimateLabel: 'Estimate Date :',
  dateFinalLabel: 'Invoice Date :',
  /** Buttons / history / profile */
  view: 'View Invoice',
  download: 'Download invoice',
  downloadShort: 'Print / PDF',
  share: 'Share',
  loadingPurchase: 'Loading invoice…',
  loadingRepair: 'Loading repair invoice…',
  loadingTrade: 'Loading trade-in invoice…',
  missing: 'Invoice not available',
  missingPurchaseHint: 'That order invoice could not be loaded. Check the link or open it from your order history.',
  missingRepairHint: 'This repair invoice could not be loaded, or you do not have access.',
  missingTradeHint: 'This trade-in invoice could not be loaded, or you do not have access.',
  /** Repair printable notes when staff have not locked a final amount */
  repairEstimateNote:
    'ESTIMATE — Repair service amounts shown are provisional and may be updated after diagnostics. This is not a final invoice.',
  repairFinalNote:
    'FINAL INVOICE — Repair service amount as confirmed by BlackBox.',
  tradeEstimateNote:
    'ESTIMATE — Online trade-in valuation only. Final offer comes after BlackBox inspects your device. This is not a final invoice.',
  tradeFinalNote:
    'FINAL — Trade-in valuation / offer from BlackBox. Credit applies toward an eligible upgrade.',
  tradeNote: 'Trade-in valuation invoice — credit applies toward an eligible upgrade.',
  settingsHeading: 'Invoices & receipts',
  settingsHint:
    'View, print, or share invoices for orders, repairs, and trade-ins. Use Print / PDF for a physical copy or to save on your phone.',
  settingsEmpty: 'No invoices yet — they appear after you place an order, repair, or trade-in.',
  settingsViewAll: 'Full history',
} as const;
