/**
 * Vercel serverless: POST /api/push/test
 * Uses Node `web-push` to deliver a test notification to the caller.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  resolveUserIdFromBearer,
  sendWebPushToUser,
} from '../../lib/server/webPushSend';
import { parseRequestBody } from '../../lib/server/parseRequestBody';

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

    const body = parseRequestBody(req.body);
    const result = await sendWebPushToUser(
      userId,
      {
        title: String(body.title || 'BlackBox test'),
        body: String(body.body || 'Push notifications are working.'),
        url: String(body.url || '/account/notifications'),
        tag: 'blackbox-ui-test',
      },
      process.env,
    );

    if (result.sent === 0) {
      res.status(400).json({
        error: 'No push subscriptions for this account. Enable browser push first.',
        ...result,
      });
      return;
    }

    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/push/test]', message);
    res.status(500).json({ error: message });
  }
}
