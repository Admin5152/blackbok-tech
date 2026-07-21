/**
 * Customer-facing promo error copy — coupon-style clarity.
 * Prefer the server `message` when present; fall back by reason code.
 */
import type { PromoEvaluateResult } from './promotions';
import { formatGHS } from './promotions';

const REASON_FALLBACK: Record<string, string> = {
  not_found: "We couldn't find that code. Check the spelling and try again.",
  inactive: 'This promotion is not active right now.',
  not_started: 'This promotion has not started yet. Try again later.',
  expired: 'This promotion has ended.',
  wrong_user: 'This code is linked to another account. Sign in with the right account.',
  code_exhausted: 'This code has already been used.',
  wrong_campus:
    'This code is not available at your campus. Set your campus in Profile, or use a different code.',
  promo_exhausted: 'This promotion has reached its usage limit.',
  user_limit_reached: 'You have already used this code.',
  no_eligible_items: 'This code does not apply to your order.',
  min_order_not_met: 'Your order does not meet the minimum spend for this code.',
  zero_discount: 'This code gives no discount on your current order.',
  no_payable_amount: 'There is nothing to discount yet.',
};

/** Map applies_to for no_eligible_items when server sends generic message. */
const APPLIES_TO_HINT: Record<string, string> = {
  order: 'This code does not apply to the items in your cart.',
  product: 'This code only applies to specific products not in your cart.',
  category: 'This code only applies to certain product categories not in your cart.',
  delivery: 'This code only applies to delivery fees. Choose delivery at checkout.',
  repair: 'This code only applies to repair services.',
  tradein_topup: 'This code only applies to trade-in top-up payments.',
};

export function promoFriendlyMessage(
  result:
    | Pick<PromoEvaluateResult, 'reason' | 'message' | 'min_order_pesewas'>
    | { reason?: string; message?: string; min_order_pesewas?: number }
    | null
    | undefined,
  opts?: { appliesTo?: string },
): string {
  if (!result) return REASON_FALLBACK.not_found;

  const raw = (result.message || '').trim();
  const reason = result.reason || 'not_found';

  if (reason === 'min_order_not_met' && result.min_order_pesewas != null) {
    return `Spend at least ${formatGHS(result.min_order_pesewas)} to use this code.`;
  }

  if (reason === 'no_eligible_items' && opts?.appliesTo && APPLIES_TO_HINT[opts.appliesTo]) {
    return APPLIES_TO_HINT[opts.appliesTo];
  }

  if (raw && raw !== 'This code is not valid.' && raw !== 'Discount applied.') {
    return raw;
  }

  return REASON_FALLBACK[reason] ?? REASON_FALLBACK.not_found;
}

/** Strip PostgREST / Postgres wrappers for admin + checkout toasts. */
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
  msg = msg.replace(/^PostgrestException:\s*/i, '');
  msg = msg.replace(/^PostgresException:\s*/i, '');
  msg = msg.replace(/^ERROR:\s*/i, '');
  msg = msg.replace(/^PGRST\d+:\s*/i, '');
  msg = msg.replace(/^22P02:\s*/i, '');
  msg = msg.replace(/^42501:\s*/i, '');
  msg = msg.replace(/^P0002:\s*/i, '');
  msg = msg.replace(/^22023:\s*/i, '');

  if (/super admin must publish/i.test(msg)) {
    return 'This campaign needs an admin account to publish. Ask an admin to publish it from the promotion detail page.';
  }
  if (/only drafts can be published/i.test(msg)) {
    return 'Only draft promotions can be published.';
  }
  if (/admin only/i.test(msg)) {
    return 'You need admin access to do that.';
  }
  if (/violates|duplicate key|foreign key/i.test(msg) && msg.length > 120) {
    return 'Could not complete that action. Please try again.';
  }
  return msg || 'Something went wrong.';
}
