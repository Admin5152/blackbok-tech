import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import {
  formatServerError,
  pushApiErrorStatus,
  resolveUserIdFromBearer,
  sendWebPushToUser,
} from './lib/server/webPushSend';

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

/**
 * Dev-only POST /api/push/test — sends a Web Push via Node `web-push`.
 * Requires VAPID_* + SUPABASE_SERVICE_ROLE_KEY in .env.
 */
export function webPushTestPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  const merged = { ...process.env, ...env };

  return {
    name: 'web-push-test-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (url !== '/api/push/test') {
          next();
          return;
        }

        const sendJson = (status: number, body: Record<string, unknown>) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          sendJson(405, { error: 'Method not allowed' });
          return;
        }

        try {
          const auth = req.headers.authorization || '';
          const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
          if (!token) {
            sendJson(401, { error: 'Missing Authorization Bearer token' });
            return;
          }

          const userId = await resolveUserIdFromBearer(token, merged);
          if (!userId) {
            sendJson(401, { error: 'Invalid session' });
            return;
          }

          const body = (await readJsonBody(req)) as {
            title?: string;
            body?: string;
            url?: string;
          };

          const result = await sendWebPushToUser(
            userId,
            {
              title: body.title || 'BlackBox test',
              body: body.body || 'Push notifications are working.',
              url: body.url || '/account/notifications',
              tag: 'blackbox-ui-test',
            },
            merged,
          );

          if (result.sent === 0) {
            sendJson(400, {
              error:
                result.failed > 0
                  ? 'Push delivery failed for all subscriptions. Try turning notifications off and on again.'
                  : 'No push subscriptions for this account. Enable browser push first.',
              sent: 0,
              failed: result.failed,
            });
            return;
          }

          sendJson(200, result);
        } catch (err) {
          const message = formatServerError(err);
          const status = pushApiErrorStatus(err);
          const code =
            err && typeof err === 'object' && 'code' in err
              ? String((err as { code?: string }).code || '')
              : '';
          console.error('[web-push-test]', message);
          sendJson(status, { error: message, ...(code ? { code } : {}) });
        }
      });
    },
  };
}
