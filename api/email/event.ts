/**
 * Authenticated lifecycle notify (order / trade / repair placed).
 * POST /api/email/event
 * Authorization: Bearer <supabase access token>
 *
 * Body: {
 *   event: 'order_placed'|'trade_submitted'|'repair_submitted',
 *   displayId?: string,
 *   referenceId?: string,
 *   extraBody?: string
 * }
 *
 * Sends customer email + admin alert + web push.
 * Status-change fan-out comes from the notifications webhook.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveUserIdFromBearer } from '../../lib/server/webPushSend';
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

    const userId = await resolveUserIdFromBearer(token, process.env);
    if (!userId) {
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
        userId,
        displayId: body.displayId ? String(body.displayId) : null,
        referenceId: body.referenceId ? String(body.referenceId) : null,
        extraBody: body.extraBody ? String(body.extraBody) : undefined,
      },
      process.env,
    );

    const hardFail = Boolean(result.email.error && result.push.error);
    res.status(hardFail ? 500 : 200).json({ ok: !hardFail, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/email/event]', message);
    res.status(500).json({ error: message });
  }
}
