/**
 * Browser helper — best-effort lifecycle email + in-app notification after create.
 * Failures are logged only; never block checkout / trade / repair UX.
 */
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export type ClientEmailEvent =
  | 'order_placed'
  | 'trade_submitted'
  | 'repair_submitted';

const EVENT_COPY: Record<
  ClientEmailEvent,
  { type: string; title: string; body: (ref: string, extra?: string) => string }
> = {
  order_placed: {
    type: 'order',
    title: 'Order received',
    body: (ref, extra) =>
      `We received order ${ref} and will process it shortly.${extra ? ` ${extra}` : ''}`,
  },
  trade_submitted: {
    type: 'trade',
    title: 'Trade-in received',
    body: (ref, extra) =>
      `We received your trade-in request ${ref}.${extra ? ` ${extra}` : ''}`,
  },
  repair_submitted: {
    type: 'repair',
    title: 'Repair request received',
    body: (ref, extra) =>
      `We received your repair request ${ref}.${extra ? ` ${extra}` : ''}`,
  },
};

/** Ensure an in-app bell row exists even if DB triggers were not migrated yet. */
async function ensureInAppNotification(
  event: ClientEmailEvent,
  opts?: {
    displayId?: string | null;
    referenceId?: string | null;
    extraBody?: string;
  },
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const copy = EVENT_COPY[event];
    const ref = (opts?.displayId || '').trim() || 'your request';
    const referenceId = opts?.referenceId ? String(opts.referenceId) : null;

    const { error } = await supabase.rpc('create_notification', {
      p_user_id: session.user.id,
      p_title: copy.title,
      p_body: copy.body(ref, opts?.extraBody),
      p_type: copy.type,
      p_reference_id: referenceId,
    });

    if (error) {
      console.warn('[ensureInAppNotification]', error.message);
    }
  } catch (err) {
    console.warn('[ensureInAppNotification]', err);
  }
}

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

    // In-app first so the bell updates even if Resend/API is down.
    await ensureInAppNotification(event, opts);

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
