/**
 * Send a test Web Push to a user (by email) using the Node `web-push` library.
 *
 * Prerequisites:
 *   - Run database/migrations/2026_07_push_subscriptions.sql
 *   - npm run generate:vapid  → put keys in .env
 *   - User enables push in the app (/account/notifications)
 *   - SUPABASE_SERVICE_ROLE_KEY set
 *
 *   node --env-file=.env scripts/send-web-push-test.mjs you@email.com
 *   npm run test:push -- you@email.com
 */

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run test:push -- user@email.com');
  process.exit(1);
}

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const publicKey = (
  process.env.VAPID_PUBLIC_KEY ||
  process.env.VITE_VAPID_PUBLIC_KEY ||
  ''
).trim();
const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
const subject = (process.env.VAPID_SUBJECT || 'mailto:admin@blackboxghana.com').trim();

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL / VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!publicKey || !privateKey) {
  console.error('Missing VAPID keys. Run: npm run generate:vapid');
  process.exit(1);
}

webpush.setVapidDetails(subject, publicKey, privateKey);

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile, error: profileErr } = await supabase
  .from('profiles')
  .select('id, email')
  .ilike('email', email)
  .maybeSingle();

if (profileErr) {
  console.error(profileErr.message);
  process.exit(1);
}
if (!profile) {
  console.error(`No profile for ${email}`);
  process.exit(1);
}

const { data: subs, error: subErr } = await supabase
  .from('push_subscriptions')
  .select('id, endpoint, p256dh, auth')
  .eq('user_id', profile.id);

if (subErr) {
  console.error(subErr.message);
  process.exit(1);
}
if (!subs?.length) {
  console.error(
    `No push subscriptions for ${email}. Open the app → Notifications → Enable browser push.`,
  );
  process.exit(1);
}

const payload = JSON.stringify({
  title: 'BlackBox test',
  body: `Hello ${email} — Web Push is working.`,
  url: '/account/notifications',
  tag: 'blackbox-cli-test',
});

let sent = 0;
for (const row of subs) {
  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      payload,
      { TTL: 3600 },
    );
    sent += 1;
    console.log('Sent →', row.endpoint.slice(0, 64) + '…');
  } catch (err) {
    console.error('Failed:', err instanceof Error ? err.message : err);
    const code = err && typeof err === 'object' && 'statusCode' in err ? err.statusCode : null;
    if (code === 404 || code === 410) {
      await supabase.from('push_subscriptions').delete().eq('id', row.id);
      console.log('Removed stale subscription', row.id);
    }
  }
}

console.log(`Done. sent=${sent} / ${subs.length}`);
