/**
 * Shared helpers for admin promotions UI (status badges, code status, value labels).
 */
import type {
  PromoStatus,
  Promotion,
  PromotionCode,
} from '../../../lib/promotions';
import { formatGHS } from '../../../lib/promotions';

export type CodeDerivedStatus = 'unused' | 'redeemed' | 'expired';

export function promoValueLabel(p: Pick<Promotion, 'discount_type' | 'percent_off' | 'amount_off_pesewas'>): string {
  if (p.discount_type === 'percentage') {
    const pct = p.percent_off ?? 0;
    return `${pct}% off`;
  }
  return formatGHS(p.amount_off_pesewas ?? 0);
}

export function formatPromoDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Earlier of code expires_at and promo ends_at wins for expiry checks. */
export function effectiveCodeExpiry(
  code: Pick<PromotionCode, 'expires_at'>,
  promoEndsAt: string | null | undefined,
): string | null {
  const a = code.expires_at ? new Date(code.expires_at).getTime() : null;
  const b = promoEndsAt ? new Date(promoEndsAt).getTime() : null;
  if (a == null && b == null) return null;
  if (a == null) return promoEndsAt ?? null;
  if (b == null) return code.expires_at;
  return a <= b ? code.expires_at! : promoEndsAt!;
}

/**
 * Derive code status:
 * - expired if expires_at or promo.ends_at passed (earlier wins)
 * - redeemed if times_redeemed >= max_redemptions (or >0 for single-use)
 * - unused otherwise
 */
export function deriveCodeStatus(
  code: PromotionCode,
  promoEndsAt: string | null | undefined,
  now = new Date(),
): CodeDerivedStatus {
  const expiryIso = effectiveCodeExpiry(code, promoEndsAt);
  if (expiryIso) {
    const t = new Date(expiryIso).getTime();
    if (!Number.isNaN(t) && t <= now.getTime()) return 'expired';
  }

  const max = code.max_redemptions;
  if (max == null || max <= 0) {
    // Open-ended: treat any redemption as redeemed for display if used
    if (code.times_redeemed > 0) return 'redeemed';
    return 'unused';
  }
  if (code.times_redeemed >= max) return 'redeemed';
  return 'unused';
}

export function promoStatusTone(status: PromoStatus): 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'draft':
    case 'paused':
      return 'warning';
    case 'active':
      return 'success';
    case 'expired':
    case 'archived':
    default:
      return 'neutral';
  }
}

export function codeStatusTone(status: CodeDerivedStatus): 'accent' | 'success' | 'warning' {
  switch (status) {
    case 'unused':
      return 'accent';
    case 'redeemed':
      return 'success';
    case 'expired':
      return 'warning';
  }
}

export function statusBadgeClass(
  tone: 'warning' | 'success' | 'neutral' | 'accent',
  isLight: boolean,
): string {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize';
  switch (tone) {
    case 'warning':
      return `${base} ${isLight ? 'bg-amber-500/15 text-amber-700' : 'bg-amber-500/20 text-amber-300'}`;
    case 'success':
      return `${base} ${isLight ? 'bg-emerald-500/15 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'}`;
    case 'accent':
      return `${base} ${isLight ? 'bg-[#B38B21]/15 text-[#8A6A18]' : 'bg-[#B38B21]/20 text-[#CDA032]'}`;
    case 'neutral':
    default:
      return `${base} ${isLight ? 'bg-black/8 text-black/55' : 'bg-white/10 text-white/55'}`;
  }
}

/** Strip PostgREST / Postgres wrappers so UI shows the RAISE message. */
export function promoRpcErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Something went wrong.';

  let msg = raw.trim();
  // Common PostgREST shapes: "PGRST301: …", "ERROR: …", "PostgresException: …"
  msg = msg.replace(/^PostgrestException:\s*/i, '');
  msg = msg.replace(/^PostgresException:\s*/i, '');
  msg = msg.replace(/^ERROR:\s*/i, '');
  msg = msg.replace(/^PGRST\d+:\s*/i, '');
  msg = msg.replace(/^22P02:\s*/i, '');
  msg = msg.replace(/^42501:\s*/i, '');
  msg = msg.replace(/^P0002:\s*/i, '');
  msg = msg.replace(/^22023:\s*/i, '');
  // "new row violates…" style — keep short
  if (/violates|duplicate key|foreign key|relation |column /i.test(msg) && msg.length > 120) {
    return 'Could not complete that action. Please try again.';
  }
  return msg || 'Something went wrong.';
}

export function buildPromoWhatsAppText(args: {
  code: string;
  valueLabel: string;
  minOrderPesewas: number;
  expiryLabel: string;
}): string {
  const lines = [
    `BlackBox promo code: ${args.code}`,
    `Value: ${args.valueLabel}`,
    `Minimum spend: ${formatGHS(args.minOrderPesewas)}`,
    `Expires: ${args.expiryLabel}`,
  ];
  return lines.join('\n');
}

export function buildPromoWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function downloadPromoCodesCsv(
  codes: PromotionCode[],
  deriveStatus: (c: PromotionCode) => CodeDerivedStatus,
  filename: string,
): void {
  const header = 'code,status,expiry,batch_label';
  const rows = codes.map((c) => {
    const status = deriveStatus(c);
    const expiry = c.expires_at ? new Date(c.expires_at).toISOString() : '';
    const batch = c.batch_label ?? '';
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [esc(c.code), esc(status), esc(expiry), esc(batch)].join(',');
  });
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const hairlineCard = (isLight: boolean) =>
  `rounded-[12px] border-[0.5px] ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-[#0a0a0a]'}`;
