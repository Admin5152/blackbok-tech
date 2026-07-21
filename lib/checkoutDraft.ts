/**
 * Persist checkout form progress across redirect to /auth and back.
 * Cart items live in app state; this only stores step + address/payment fields.
 */
const KEY = 'bb_checkout_draft';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type CheckoutDraft = {
  v: 1;
  step: 1 | 2;
  shippingMethod: string;
  form: {
    phone: string;
    address: string;
    city: string;
    region: string;
    digitalAddress: string;
  };
  paymentMethod: string;
  savedAt: number;
};

export function saveCheckoutDraft(draft: Omit<CheckoutDraft, 'v' | 'savedAt'>): void {
  try {
    const payload: CheckoutDraft = { v: 1, ...draft, savedAt: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function takeCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (parsed?.v !== 1 || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (parsed.step !== 1 && parsed.step !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
