/**
 * Supabase Database Webhook → email + web push
 * POST /api/notify/email
 *
 * Configure in Supabase → Database → Webhooks:
 *   Table: notifications, Events: INSERT
 *   URL: https://blackboxghana.com/api/notify/email
 *   HTTP Header: x-bb-webhook-secret: <EMAIL_WEBHOOK_SECRET>
 *
 * Fan-out: Resend (customer + admin when relevant) + Web Push to push_subscriptions.
 * Create titles ("Order received", …) are skipped here — handled by /api/email/event.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deliverNotificationChannels } from '../../lib/server/notifyFanout';
import type { NotifyEmailPayload } from '../../lib/server/notifyEmail';

function readSecret(req: VercelRequest): string {
  const h = req.headers['x-bb-webhook-secret'];
  if (typeof h === 'string' && h.trim()) return h.trim();
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return '';
}

function extractPayload(body: unknown): NotifyEmailPayload | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  const record =
    (root.record as Record<string, unknown> | undefined) ||
    ((root as { data?: { record?: Record<string, unknown> } }).data?.record) ||
    root;

  const user_id = String(record.user_id || '').trim();
  const title = String(record.title || '').trim();
  const bodyText = String(record.body || '').trim();
  if (!user_id || !title) return null;

  return {
    id: record.id ? String(record.id) : undefined,
    user_id,
    title,
    body: bodyText,
    type: String(record.type || 'info'),
    reference_id: record.reference_id ? String(record.reference_id) : null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const expected = (process.env.EMAIL_WEBHOOK_SECRET || '').trim();
    if (expected) {
      const got = readSecret(req);
      if (got !== expected) {
        res.status(401).json({ error: 'Invalid webhook secret' });
        return;
      }
    }

    const payload = extractPayload(req.body);
    if (!payload) {
      res.status(400).json({ error: 'Missing notification record' });
      return;
    }

    const result = await deliverNotificationChannels(payload, process.env);
    const hardFail = Boolean(result.email.error && result.push.error);
    res.status(hardFail ? 500 : 200).json({ ok: !hardFail, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/notify/email]', message);
    res.status(500).json({ error: message });
  }
}
