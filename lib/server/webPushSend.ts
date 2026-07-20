/**
 * Shared Web Push send helpers for Node (Vite middleware + CLI scripts).
 * Uses the official `web-push` package.
 */
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

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

export function configureWebPushFromEnv(env = process.env): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  const publicKey = (env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (env.VAPID_SUBJECT || 'mailto:admin@blackboxghana.com').trim();

  if (!publicKey || !privateKey) {
    throw new Error(
      'Missing VAPID keys. Set VITE_VAPID_PUBLIC_KEY (or VAPID_PUBLIC_KEY) and VAPID_PRIVATE_KEY.',
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey, subject };
}

export function createServiceSupabase(env = process.env) {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function sendWebPushToSubscription(
  row: PushSubRow,
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; statusCode?: number; message: string }> {
  try {
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
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, statusCode, message };
  }
}

export async function sendWebPushToUser(
  userId: string,
  payload: PushPayload,
  env = process.env,
): Promise<{ sent: number; failed: number; gone: string[] }> {
  configureWebPushFromEnv(env);
  const supabase = createServiceSupabase(env);
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) throw error;
  const rows = (data || []) as PushSubRow[];
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  for (const row of rows) {
    const result = await sendWebPushToSubscription(row, payload);
    if (result.ok) {
      sent += 1;
      continue;
    }
    failed += 1;
    if (result.statusCode === 404 || result.statusCode === 410) {
      gone.push(row.id);
    }
  }

  if (gone.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', gone);
  }

  return { sent, failed, gone };
}

export async function resolveUserIdFromBearer(
  accessToken: string,
  env = process.env,
): Promise<string | null> {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const anon = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !anon) return null;
  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user.id;
}
