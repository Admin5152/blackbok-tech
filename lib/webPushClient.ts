/**
 * Browser Web Push subscribe / unsubscribe (Push API + Supabase storage).
 */
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const SW_PATH = '/sw.js';

export function getVapidPublicKey(): string {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch (err) {
    console.warn('Service worker register failed:', err);
    return null;
  }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function persistSubscription(sub: PushSubscription): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Push subscription is missing keys.');
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Sign in to enable push notifications.');

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

async function removePersistedSubscription(endpoint: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

/** Request permission, subscribe with VAPID, store endpoint for this user. */
export async function enableWebPush(): Promise<PushSubscription> {
  clearWebPushOptOut();
  const vapid = getVapidPublicKey();
  if (!vapid) {
    throw new Error(
      'Missing VITE_VAPID_PUBLIC_KEY. Run npm run generate:vapid and add the public key to .env.',
    );
  }
  if (!isWebPushSupported()) {
    throw new Error('This browser does not support Web Push.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was blocked. Allow notifications in browser settings.');
  }

  const reg = (await registerPushServiceWorker()) || (await navigator.serviceWorker.ready);
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    }));

  await persistSubscription(sub);
  return sub;
}

export async function disableWebPush(): Promise<void> {
  setWebPushOptOut();
  if (!isWebPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await removePersistedSubscription(endpoint);
}

const WEB_PUSH_OPT_OUT_KEY = 'bb_web_push_opt_out';

export function isWebPushOptedOut(): boolean {
  try {
    return localStorage.getItem(WEB_PUSH_OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setWebPushOptOut(): void {
  try {
    localStorage.setItem(WEB_PUSH_OPT_OUT_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearWebPushOptOut(): void {
  try {
    localStorage.removeItem(WEB_PUSH_OPT_OUT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Turn browser push on by default for signed-in users.
 * Skips if the user previously disabled push, or the browser denied permission.
 * Safe to call repeatedly (re-persists an existing subscription).
 */
export async function ensureWebPushEnabledByDefault(): Promise<
  'enabled' | 'skipped' | 'denied' | 'unsupported' | 'error'
> {
  if (!isWebPushSupported() || !getVapidPublicKey()) return 'unsupported';
  if (isWebPushOptedOut()) return 'skipped';
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    await enableWebPush();
    return 'enabled';
  } catch (err) {
    console.warn('[ensureWebPushEnabledByDefault]', err);
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return 'denied';
    }
    return 'error';
  }
}

/** Ask the Node/Vite test API to send a push to the signed-in user. */
export async function requestTestWebPush(payload?: {
  title?: string;
  body?: string;
  url?: string;
}): Promise<{ sent: number; failed: number }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in to send a test push.');

  const res = await fetch('/api/push/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      title: payload?.title || 'BlackBox test',
      body: payload?.body || 'Push notifications are working.',
      url: payload?.url || '/account/notifications',
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    sent?: number;
    failed?: number;
  };
  if (!res.ok) {
    throw new Error(data.error || `Test push failed (${res.status})`);
  }
  return { sent: data.sent ?? 0, failed: data.failed ?? 0 };
}
