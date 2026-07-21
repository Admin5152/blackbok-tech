/**
 * Browser helper — lifecycle email + in-app notification after create.
 * Create emails go to /api/email/event (session email → Resend).
 * Status emails go through the DB webhook → /api/notify/email.
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

function apiUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const origin = window.location.origin.replace(/\/$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

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

async function postLifecycleEmail(
  event: ClientEmailEvent,
  accessToken: string,
  customerEmail: string | null,
  opts?: {
    displayId?: string | null;
    referenceId?: string | null;
    extraBody?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(apiUrl('/api/email/event'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      event,
      displayId: opts?.displayId ?? null,
      referenceId: opts?.referenceId ?? null,
      extraBody: opts?.extraBody,
      customerEmail: customerEmail || undefined,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
  if (!res.ok) {
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  }
  return { ok: true };
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
    if (!session?.access_token) {
      console.warn('[requestLifecycleEmail] No session — email skipped');
      return;
    }

    const customerEmail = (session.user?.email || '').trim() || null;

    // Email first (Resend). Retry once — Vercel cold starts can flake.
    let result = await postLifecycleEmail(
      event,
      session.access_token,
      customerEmail,
      opts,
    );
    if (!result.ok) {
      await new Promise((r) => setTimeout(r, 600));
      result = await postLifecycleEmail(
        event,
        session.access_token,
        customerEmail,
        opts,
      );
    }

    if (!result.ok) {
      console.warn('[requestLifecycleEmail]', result.error);
    }

    // Bell row even if email failed (webhook may still fan out status later).
    await ensureInAppNotification(event, opts);
  } catch (err) {
    console.warn('[requestLifecycleEmail]', err);
    try {
      await ensureInAppNotification(event, opts);
    } catch {
      /* ignore */
    }
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
    const res = await fetch(apiUrl('/api/contact'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      console.warn('[sendContactCustomerConfirmation]', data.error || res.status);
    }
  } catch (err) {
    console.warn('[sendContactCustomerConfirmation]', err);
  }
}
