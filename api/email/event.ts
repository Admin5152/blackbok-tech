/**
 * Authenticated lifecycle notify (order / trade / repair placed).
 * POST /api/email/event
 * Authorization: Bearer <supabase access token>
 *
 * Uses the session user's email for Resend (does not require service_role
 * for create emails). Status updates still use the notifications webhook.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveUserFromBearer } from '../../lib/server/webPushSend';
import { sendDirectLifecycleNotify } from '../../lib/server/notifyFanout';
import type { DirectEmailEvent } from '../../lib/server/notifyEmail';

const ALLOWED: DirectEmailEvent[] = [
  'order_placed',
  'trade_submitted',
  'repair_submitted',
];

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
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Missing Authorization Bearer token' });
      return;
    }

    const user = await resolveUserFromBearer(token, process.env);
    if (!user?.id) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    const body = (typeof req.body === 'object' && req.body) || {};
    const event = String(body.event || '').trim() as DirectEmailEvent;
    if (!ALLOWED.includes(event)) {
      res.status(400).json({ error: 'Invalid event' });
      return;
    }

    const result = await sendDirectLifecycleNotify(
      event,
      {
        userId: user.id,
        displayId: body.displayId ? String(body.displayId) : null,
        referenceId: body.referenceId ? String(body.referenceId) : null,
        extraBody: body.extraBody ? String(body.extraBody) : undefined,
        customerEmail: user.email,
      },
      process.env,
    );

    // Create path: email must succeed. Push is best-effort (may skip if not enabled).
    if (result.email.error || result.email.skipped) {
      res.status(500).json({
        ok: false,
        error: result.email.error || result.email.skipped || 'Email not sent',
        ...result,
      });
      return;
    }

    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/email/event]', message);
    res.status(500).json({ error: message });
  }
}
