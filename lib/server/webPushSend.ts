/**
 * Shared Web Push send helpers for Node (Vite middleware + CLI scripts).
 * Lazy-loads `web-push` for Vercel ESM compatibility.
 */
import { createClient } from '@supabase/supabase-js';
import {
  formatServerError,
  isMissingPushTableMessage,
  isPushNotConfiguredMessage,
  pushConfigError,
} from './serverError';

export type PushSubRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string | Buffer,
    options?: { TTL?: number },
  ) => Promise<void>;
};

let webPushPromise: Promise<WebPushModule> | null = null;

async function getWebPush(): Promise<WebPushModule> {
  if (!webPushPromise) {
    webPushPromise = import('web-push').then((mod) => {
      const lib = (mod as { default?: WebPushModule }).default ?? (mod as WebPushModule);
      return lib;
    });
  }
  return webPushPromise;
}

export function configureWebPushFromEnv(env = process.env): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  const publicKey = (env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (env.VAPID_SUBJECT || 'mailto:admin@blackboxghana.com').trim();

  if (!publicKey || !privateKey) {
    throw pushConfigError(
      'Push is not configured. Set VITE_VAPID_PUBLIC_KEY (or VAPID_PUBLIC_KEY) and VAPID_PRIVATE_KEY in your server environment, then redeploy.',
    );
  }

  return { publicKey, privateKey, subject };
}

async function applyVapidFromEnv(env = process.env): Promise<void> {
  const { publicKey, privateKey, subject } = configureWebPushFromEnv(env);
  const webpush = await getWebPush();
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function createServiceSupabase(env = process.env) {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceKey) {
    throw pushConfigError(
      'Push needs SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or VITE_SUPABASE_URL) on the server. The browser anon key cannot send push.',
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function sendWebPushToSubscription(
  row: PushSubRow,
  payload: PushPayload,
  env = process.env,
): Promise<{ ok: true } | { ok: false; statusCode?: number; message: string }> {
  try {
    await applyVapidFromEnv(env);
    const webpush = await getWebPush();
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
        tag: payload.tag || 'blackbox-test',
      }),
      { TTL: 60 * 60 },
    );
    return { ok: true };
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err
        ? Number((err as { statusCode: number }).statusCode)
        : undefined;
    const message = formatServerError(err);
    return { ok: false, statusCode, message };
  }
}

export async function sendWebPushToUser(
  userId: string,
  payload: PushPayload,
  env = process.env,
): Promise<{ sent: number; failed: number; gone: string[] }> {
  await applyVapidFromEnv(env);
  const supabase = createServiceSupabase(env);
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) {
    const msg = formatServerError(error);
    if (isMissingPushTableMessage(msg)) {
      throw pushConfigError(
        'push_subscriptions table is missing. Run database/migrations/2026_07_push_subscriptions.sql on Supabase.',
      );
    }
    throw new Error(msg);
  }

  const rows = (data || []) as PushSubRow[];
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  for (const row of rows) {
    const result = await sendWebPushToSubscription(row, payload, env);
    if (result.ok) {
      sent += 1;
      continue;
    }
    failed += 1;
    const statusCode = result.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      gone.push(row.id);
    }
  }

  if (gone.length > 0) {
    const { error: delErr } = await supabase.from('push_subscriptions').delete().in('id', gone);
    if (delErr) {
      console.warn('[webPushSend] cleanup stale subscriptions:', formatServerError(delErr));
    }
  }

  return { sent, failed, gone };
}

export async function resolveUserIdFromBearer(
  accessToken: string,
  env = process.env,
): Promise<string | null> {
  const user = await resolveUserFromBearer(accessToken, env);
  return user?.id ?? null;
}

export async function resolveUserFromBearer(
  accessToken: string,
  env = process.env,
): Promise<{ id: string; email: string | null } | null> {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const anon = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !anon) return null;
  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: (data.user.email || '').trim() || null,
  };
}

/** Map API errors to HTTP status for /api/push/test */
export function pushApiErrorStatus(err: unknown): number {
  const message = formatServerError(err);
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code || '')
      : '';
  if (code === 'PUSH_NOT_CONFIGURED' || isPushNotConfiguredMessage(message)) return 503;
  if (/invalid session|missing authorization|bearer/i.test(message)) return 401;
  if (/no push subscriptions|enable browser push/i.test(message)) return 400;
  return 500;
}

export { isPushNotConfiguredMessage, formatServerError };
