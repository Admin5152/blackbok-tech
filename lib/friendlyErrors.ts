/**
 * Plain-English errors for every user-facing action.
 * Prefer this over raw Postgres / PostgREST / network text — never fail silently.
 */
export type FriendlyAction =
  | 'add to cart'
  | 'remove from cart'
  | 'update cart'
  | 'add to wishlist'
  | 'remove from wishlist'
  | 'compare'
  | 'save'
  | 'delete'
  | 'load'
  | 'update'
  | 'checkout'
  | 'place order'
  | 'sign in'
  | 'sign up'
  | 'upload'
  | 'send offer'
  | 'complete trade'
  | string;

function rawFromUnknown(e: unknown): string {
  if (e == null) return '';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || '';
  if (typeof e === 'object') {
    const o = e as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string | number;
      error_description?: string;
    };
    return [o.message, o.details, o.hint, o.error_description, o.code != null ? String(o.code) : '']
      .filter(Boolean)
      .join(' ');
  }
  return String(e);
}

/**
 * Map any thrown value + action into a short staff/customer-readable sentence.
 */
export function friendlyError(e: unknown, action: FriendlyAction = 'complete that'): string {
  const raw = rawFromUnknown(e);
  const lower = raw.toLowerCase();
  const act = String(action || 'complete that').trim() || 'complete that';

  if (!raw.trim()) {
    return `Could not ${act}. Please try again. If it keeps happening, ask a manager for help.`;
  }

  // Permission / auth
  if (
    /42501|permission denied|row-level security|rls|not authorized|jwt|invalid.*token|not authenticated/i.test(
      lower,
    )
  ) {
    if (/sign in|sign up|login/i.test(act)) {
      return 'Sign-in failed. Check your email and password, or create an account first.';
    }
    return `You don’t have permission to ${act}. Sign in with a staff or admin account, or ask a manager.`;
  }

  // Stock / cart
  if (/out of stock|insufficient stock|stock.*insufficient|cannot decrement|no stock/i.test(lower)) {
    if (/cart|checkout|order/i.test(act)) {
      return 'This item is out of stock (or not enough left for the quantity you chose). Pick another version or lower the quantity.';
    }
    return 'Not enough stock to finish that action. Refresh and try a different quantity or version.';
  }

  // Foreign keys / linked records
  if (/foreign key|23503|still referenced|violates foreign key/i.test(lower)) {
    if (/order_items|orders/i.test(lower)) {
      return `Cannot permanently ${act} because this item appears on past customer orders. Archive or hide it instead, or ask IT for help.`;
    }
    if (/inventory/i.test(lower)) {
      return `Cannot permanently ${act} because inventory history is linked to it. Archive it instead if you only need it hidden from the shop.`;
    }
    if (/trade/i.test(lower)) {
      return `Cannot permanently ${act} because trade-in records still reference it. Clear or finish those trades first, or archive instead.`;
    }
    return `Cannot permanently ${act} because other records still reference it. Remove those links first, or archive/hide instead of deleting.`;
  }

  // Duplicates
  if (/duplicate|unique|already exists|23505|uq_variant/i.test(lower)) {
    if (/imei|serial/i.test(lower)) {
      return 'An active trade-in already exists for this IMEI or serial number.';
    }
    if (/sku|variant|color|storage|uq_variant/i.test(lower)) {
      return 'That combination already exists (duplicate color / storage / RAM / SIM). Change or remove the duplicate first.';
    }
    if (/email|user/i.test(lower)) {
      return 'That email is already registered. Sign in instead, or use a different email.';
    }
    return `Could not ${act} because that record already exists.`;
  }

  // Missing relation / migrations
  if (/relation|does not exist|could not find the table|schema cache|column .* does not exist|product_variants/i.test(lower)) {
    if (/product_variants|column/i.test(lower)) {
      return `Could not ${act} stock versions. Ask IT to finish product setup in the database, then try again.`;
    }
    return `Could not ${act} because the database is missing a required table or column. Ask IT to run the latest setup migrations.`;
  }

  // Network
  if (/failed to fetch|networkerror|network request failed|timeout|offline|load failed/i.test(lower)) {
    return `Network problem while trying to ${act}. Check your connection and try again.`;
  }

  // Validation
  if (/null value|not-null|check constraint|invalid input|22p02/i.test(lower)) {
    return `Could not ${act} — some required information is missing or invalid. Check the form and try again.`;
  }

  // Cart-specific phrasing when generic
  if (act === 'add to cart') {
    return `Could not add this item to your cart: ${cleanSnippet(raw)}. Check stock and your selection, then try again.`;
  }
  if (act === 'delete') {
    return `Could not delete: ${cleanSnippet(raw)}`;
  }

  return `Could not ${act}: ${cleanSnippet(raw)}`;
}

function cleanSnippet(raw: string): string {
  return raw
    .replace(/^.*Error:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

/** Notify the user and return the same message (never silent). */
export function notifyActionError(
  notify: ((message: string, type?: 'success' | 'error' | 'info' | 'warning') => void) | undefined,
  e: unknown,
  action: FriendlyAction,
): string {
  const msg = friendlyError(e, action);
  if (notify) notify(msg, 'error');
  else if (typeof window !== 'undefined') window.alert(msg);
  return msg;
}
