/**
 * Browser helper — best-effort lifecycle email + web push after successful create.
 * Failures are logged only; never block checkout / trade / repair UX.
 */
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export type ClientEmailEvent =
  | 'order_placed'
  | 'trade_submitted'
  | 'repair_submitted';

export async function requestLifecycleEmail(
  event: ClientEmailEvent,
  opts?: {
    displayId?: string | null;
    referenceId?: string | null;
    extraBody?: string;
  },
): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;
    const {
      data: { session },
    } = await getSupabaseClient().auth.getSession();
    if (!session?.access_token) return;

    const res = await fetch('/api/email/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        event,
        displayId: opts?.displayId ?? null,
        referenceId: opts?.referenceId ?? null,
        extraBody: opts?.extraBody,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      console.warn('[requestLifecycleEmail]', data.error || res.status);
    }
  } catch (err) {
    console.warn('[requestLifecycleEmail]', err);
  }
}

/** Alias — same endpoint fans out email + push. */
export const requestLifecycleNotify = requestLifecycleEmail;

/** Best-effort confirmation email to the contact-form customer (WhatsApp is primary). */
export async function sendContactCustomerConfirmation(fields: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> {
  try {
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(fields),
    });
  } catch (err) {
    console.warn('[sendContactCustomerConfirmation]', err);
  }
}
