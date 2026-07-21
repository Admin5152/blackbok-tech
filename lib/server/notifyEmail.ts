/**
 * Fan-out Resend emails from in-app notification rows (and direct events).
 */
import { createClient } from '@supabase/supabase-js';
import { getAdminInbox, sendEmail } from './sendEmail';
import { plainFromHtml, wrapEmailHtml } from './emailTemplates';
import { notificationAbsoluteUrl } from './notificationDeepLink';

export type NotifyEmailPayload = {
  id?: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  reference_id?: string | null;
};

function appOrigin(env = process.env): string {
  return (env.VITE_APP_URL || env.APP_URL || 'https://blackboxghana.com').replace(/\/$/, '');
}

function createServiceClient(env = process.env) {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for email fan-out.');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveUserEmail(
  userId: string,
  env = process.env,
  overrideEmail?: string | null,
): Promise<string | null> {
  const fromOverride = (overrideEmail || '').trim();
  if (fromOverride) return fromOverride;

  try {
    const supabase = createServiceClient(env);
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();
    const fromProfile = (profile?.email || '').trim();
    if (fromProfile) return fromProfile;

    const { data: authData, error } = await supabase.auth.admin.getUserById(userId);
    if (error) return null;
    return (authData.user?.email || '').trim() || null;
  } catch {
    return null;
  }
}

function ctaForPayload(
  payload: Pick<NotifyEmailPayload, 'type' | 'title' | 'body' | 'reference_id'>,
  env = process.env,
): { url: string; label: string } {
  const type = String(payload.type || 'info').toLowerCase();
  const url = notificationAbsoluteUrl(payload, env);
  switch (type) {
    case 'order':
      return { url, label: 'View your order' };
    case 'trade':
      return { url, label: 'View trade-in' };
    case 'repair':
      return { url, label: 'View repair status' };
    default:
      return { url, label: 'Open notifications' };
  }
}

/** Creates are emailed from the client (/api/email/event); webhook handles status updates. */
export function isClientHandledCreateTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  return (
    t === 'order received' ||
    t === 'trade-in received' ||
    t === 'repair request received'
  );
}


/** True for “new request received” style notices that should also ping admin. */
export function shouldNotifyAdmin(payload: Pick<NotifyEmailPayload, 'type' | 'title'>): boolean {
  const t = `${payload.type} ${payload.title}`.toLowerCase();
  return (
    t.includes('received') ||
    t.includes('submitted') ||
    t.includes('order received') ||
    t.includes('trade-in received') ||
    t.includes('repair request received')
  );
}

export async function sendNotificationEmails(
  payload: NotifyEmailPayload,
  env = process.env,
  opts?: { force?: boolean; customerEmail?: string | null },
): Promise<{ customer?: string; admin?: string; skipped?: string }> {
  if (!opts?.force && isClientHandledCreateTitle(payload.title)) {
    return { skipped: 'client_handles_create' };
  }
  const title = (payload.title || 'BlackBox update').trim();
  const body = (payload.body || '').trim();
  const type = (payload.type || 'info').trim();
  const cta = ctaForPayload({ ...payload, type }, env);
  const html = wrapEmailHtml({
    title,
    bodyHtml: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    ctaUrl: cta.url,
    ctaLabel: cta.label,
  });
  const text = plainFromHtml(html);
  const out: { customer?: string; admin?: string } = {};

  const customerEmail = await resolveUserEmail(
    payload.user_id,
    env,
    opts?.customerEmail,
  );
  if (customerEmail) {
    const sent = await sendEmail(
      { to: customerEmail, subject: title, html, text },
      env,
    );
    out.customer = sent.id;
  }

  if (shouldNotifyAdmin(payload)) {
    const admin = getAdminInbox(env);
    if (admin && admin.toLowerCase() !== (customerEmail || '').toLowerCase()) {
      const adminHtml = wrapEmailHtml({
        title: `[Admin] ${title}`,
        bodyHtml: `<p>${body.replace(/\n/g, '<br/>')}</p>
          <p style="margin-top:16px;font-size:13px;color:#a3a3a3;">
            Customer user_id: ${payload.user_id}<br/>
            Type: ${type}<br/>
            Ref: ${payload.reference_id || '—'}
          </p>`,
        ctaUrl: `${appOrigin(env)}/admin`,
        ctaLabel: 'Open admin',
      });
      const sent = await sendEmail(
        {
          to: admin,
          subject: `[BlackBox] ${title}`,
          html: adminHtml,
          text: plainFromHtml(adminHtml),
        },
        env,
      );
      out.admin = sent.id;
    }
  }

  if (!out.customer && !out.admin) {
    throw new Error(
      customerEmail
        ? 'Email send produced no message ids.'
        : 'No customer email resolved (pass session email or set SUPABASE_SERVICE_ROLE_KEY).',
    );
  }

  return out;
}

export type DirectEmailEvent =
  | 'order_placed'
  | 'trade_submitted'
  | 'repair_submitted';

export async function sendDirectLifecycleEmail(
  event: DirectEmailEvent,
  opts: {
    userId: string;
    displayId?: string | null;
    referenceId?: string | null;
    extraBody?: string;
    customerEmail?: string | null;
  },
  env = process.env,
): Promise<{ customer?: string; admin?: string }> {
  const ref = (opts.displayId || '').trim() || 'your request';
  const map: Record<
    DirectEmailEvent,
    { type: string; title: string; body: string }
  > = {
    order_placed: {
      type: 'order',
      title: 'Order received',
      body: `We received order ${ref} and will process it shortly.${opts.extraBody ? ` ${opts.extraBody}` : ''}`,
    },
    trade_submitted: {
      type: 'trade',
      title: 'Trade-in received',
      body: `We received your trade-in request ${ref}.${opts.extraBody ? ` ${opts.extraBody}` : ''}`,
    },
    repair_submitted: {
      type: 'repair',
      title: 'Repair request received',
      body: `We received your repair request ${ref}.${opts.extraBody ? ` ${opts.extraBody}` : ''}`,
    },
  };

  const row = map[event];
  return sendNotificationEmails(
    {
      user_id: opts.userId,
      title: row.title,
      body: row.body,
      type: row.type,
      reference_id: opts.referenceId ? String(opts.referenceId) : null,
    },
    env,
    { force: true, customerEmail: opts.customerEmail },
  );
}

export async function sendContactEmailToAdmin(
  fields: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  },
  env = process.env,
): Promise<{ id: string }> {
  const admin = getAdminInbox(env);
  const html = wrapEmailHtml({
    title: `Contact: ${fields.subject}`,
    bodyHtml: `
      <p><strong>From:</strong> ${fields.name} &lt;${fields.email}&gt;</p>
      ${fields.phone ? `<p><strong>Phone:</strong> ${fields.phone}</p>` : ''}
      <p style="white-space:pre-wrap;margin-top:16px;">${fields.message.replace(/</g, '&lt;')}</p>
    `,
  });
  return sendEmail(
    {
      to: admin,
      subject: `[BlackBox contact] ${fields.subject}`,
      html,
      text: plainFromHtml(html),
      replyTo: fields.email,
    },
    env,
  );
}

/** Auto-reply to the person who used the public contact form (WhatsApp is primary for staff). */
export async function sendContactConfirmationToCustomer(
  fields: {
    name: string;
    email: string;
    subject: string;
    message: string;
  },
  env = process.env,
): Promise<{ id: string }> {
  const safeName = fields.name.replace(/</g, '&lt;');
  const safeSubject = fields.subject.replace(/</g, '&lt;');
  const safeMessage = fields.message.replace(/</g, '&lt;');
  const html = wrapEmailHtml({
    title: 'We got your message',
    bodyHtml: `
      <p>Hi ${safeName},</p>
      <p>Thanks for contacting BlackBox. We received your note about <strong>${safeSubject}</strong> and will reply soon — usually on WhatsApp or email.</p>
      <p style="margin-top:16px;padding:12px 14px;background:#1a1a1a;border-radius:10px;font-size:14px;color:#a3a3a3;white-space:pre-wrap;">${safeMessage}</p>
    `,
    ctaUrl: `${appOrigin(env)}/contact`,
    ctaLabel: 'Back to BlackBox',
  });
  return sendEmail(
    {
      to: fields.email,
      subject: `We received your message — ${fields.subject}`,
      html,
      text: plainFromHtml(html),
      replyTo: getAdminInbox(env),
    },
    env,
  );
}
