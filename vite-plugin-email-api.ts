import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { resolveUserFromBearer } from './lib/server/webPushSend';
import { sendContactConfirmationToCustomer } from './lib/server/notifyEmail';
import {
  deliverNotificationChannels,
  sendDirectLifecycleNotify,
} from './lib/server/notifyFanout';
import type { DirectEmailEvent, NotifyEmailPayload } from './lib/server/notifyEmail';

function readJsonBody(req: import('http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(
  res: import('http').ServerResponse,
  status: number,
  body: Record<string, unknown>,
) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Dev twin of /api/contact, /api/email/event, /api/notify/email
 * (email + web push fan-out).
 */
export function emailApiPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  const merged = { ...process.env, ...env };

  return {
    name: 'email-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (
          url !== '/api/contact' &&
          url !== '/api/email/event' &&
          url !== '/api/notify/email'
        ) {
          next();
          return;
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>;

          if (url === '/api/contact') {
            const name = String(body.name || '').trim();
            const email = String(body.email || '').trim();
            const subject = String(body.subject || '').trim();
            const message = String(body.message || '').trim();
            if (!name || !email || !subject || !message) {
              sendJson(res, 400, {
                error: 'Name, email, subject, and message are required.',
              });
              return;
            }
            const sent = await sendContactConfirmationToCustomer(
              { name, email, subject, message },
              merged,
            );
            sendJson(res, 200, { ok: true, id: sent.id });
            return;
          }

          if (url === '/api/email/event') {
            const auth = req.headers.authorization || '';
            const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
            if (!token) {
              sendJson(res, 401, { error: 'Missing Authorization Bearer token' });
              return;
            }
            const user = await resolveUserFromBearer(token, merged);
            if (!user?.id) {
              sendJson(res, 401, { error: 'Invalid session' });
              return;
            }
            const event = String(body.event || '').trim() as DirectEmailEvent;
            const allowed: DirectEmailEvent[] = [
              'order_placed',
              'trade_submitted',
              'repair_submitted',
            ];
            if (!allowed.includes(event)) {
              sendJson(res, 400, { error: 'Invalid event' });
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
              merged,
            );
            if (result.email.error || result.email.skipped) {
              sendJson(res, 500, {
                ok: false,
                error: result.email.error || result.email.skipped || 'Email not sent',
                ...result,
              });
              return;
            }
            sendJson(res, 200, { ok: true, ...result });
            return;
          }

          // /api/notify/email — status updates (+ any non-create notification)
          const expected = (merged.EMAIL_WEBHOOK_SECRET || '').trim();
          if (expected) {
            const header = req.headers['x-bb-webhook-secret'];
            const got =
              typeof header === 'string'
                ? header.trim()
                : (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
            if (got !== expected) {
              sendJson(res, 401, { error: 'Invalid webhook secret' });
              return;
            }
          }

          const record =
            (body.record as Record<string, unknown> | undefined) || body;
          const payload: NotifyEmailPayload = {
            id: record.id ? String(record.id) : undefined,
            user_id: String(record.user_id || ''),
            title: String(record.title || ''),
            body: String(record.body || ''),
            type: String(record.type || 'info'),
            reference_id: record.reference_id
              ? String(record.reference_id)
              : null,
          };
          if (!payload.user_id || !payload.title) {
            sendJson(res, 400, { error: 'Missing notification record' });
            return;
          }
          const result = await deliverNotificationChannels(payload, merged);
          const hardFail = Boolean(result.email.error && result.push.error);
          sendJson(res, hardFail ? 500 : 200, { ok: !hardFail, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('[email-api]', url, message);
          sendJson(res, 500, { error: message });
        }
      });
    },
  };
}
