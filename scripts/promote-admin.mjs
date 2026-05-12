/**
 * Promote a user to admin by matching profiles.email.
 *
 * Requires the service role key (never commit it; never use in the browser):
 *   set SUPABASE_SERVICE_ROLE_KEY=...
 *   set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
 *
 * Optional: pass email as first CLI arg, or set PROMOTE_EMAIL.
 *
 *   node scripts/promote-admin.mjs
 *   node scripts/promote-admin.mjs other@email.com
 */

import { createClient } from '@supabase/supabase-js';

const targetEmail = (
  process.argv[2] ||
  process.env.PROMOTE_EMAIL ||
  'osmondabdulkarimworiwi72@gmail.com'
)
  .trim()
  .toLowerCase();

const url =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceKey) {
  console.error(
    'Missing env: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Create a service role key in Supabase → Project Settings → API.'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile, error: readErr } = await supabase
  .from('profiles')
  .select('id, email, role')
  .ilike('email', targetEmail)
  .maybeSingle();

if (readErr) {
  console.error('Read profiles failed:', readErr.message);
  process.exit(1);
}

if (!profile) {
  console.error(`No profile row for email (ilike): ${targetEmail}`);
  console.error('The user must sign up once so handle_new_user creates public.profiles.');
  process.exit(1);
}

const { data: updated, error: updErr } = await supabase
  .from('profiles')
  .update({ role: 'admin' })
  .eq('id', profile.id)
  .select('id, email, role');

if (updErr) {
  console.error('Update failed:', updErr.message);
  process.exit(1);
}

const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', profile.id);

console.log('OK — profile updated:', updated?.[0] ?? updated);
console.log('user_roles for this user:', roles ?? []);
