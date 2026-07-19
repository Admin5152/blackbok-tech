/**
 * RLS smoke script — two personas (anon + customer JWT optional).
 *
 * Usage:
 *   node scripts/rls-trade-tests.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY
 * Optional: TEST_CUSTOMER_EMAIL, TEST_CUSTOMER_PASSWORD (cannot complete trades)
 * Optional: TEST_USER_B_EMAIL/PASSWORD (cannot read user A's requests)
 *
 * Exits 1 on failure. Safe to run against branch DB.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY');
  process.exit(1);
}

const failures = [];

function ok(label) {
  console.log(`  ✅ ${label}`);
}
function fail(label, detail) {
  console.error(`  ❌ ${label}`, detail || '');
  failures.push(label);
}

const anonClient = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('RLS trade matrix\n');

  // 1) Anon can read catalog products
  {
    const { data, error } = await anonClient
      .from('products')
      .select('id')
      .eq('status', 'active')
      .limit(1);
    if (error) fail('anon reads products', error.message);
    else ok('anon reads catalog products');
  }

  // 2) Anon cannot list others' trade_in_requests
  {
    const { data, error } = await anonClient
      .from('trade_in_requests')
      .select('id')
      .limit(5);
    if (error && /permission|rls|policy/i.test(error.message)) {
      ok('anon blocked from trade_in_requests (RLS error)');
    } else if (!data || data.length === 0) {
      ok('anon sees zero trade_in_requests (empty under RLS)');
    } else {
      fail('anon must not read trade requests', `got ${data.length} rows`);
    }
  }

  // 3) Customer cannot set completed / scheduled
  const email = process.env.TEST_CUSTOMER_EMAIL;
  const password = process.env.TEST_CUSTOMER_PASSWORD;
  if (email && password) {
    const cust = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await cust.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr) {
      fail('customer sign-in', signErr.message);
    } else {
      ok('customer signed in');
      const { data: mine } = await cust
        .from('trade_in_requests')
        .select('id, status')
        .limit(1)
        .maybeSingle();
      if (!mine) {
        ok('customer has no rows to mutate (skip completed check)');
      } else {
        for (const status of ['completed', 'scheduled']) {
          const { error } = await cust
            .from('trade_in_requests')
            .update({ status })
            .eq('id', mine.id);
          if (!error) {
            fail(`customer must not set status=${status}`);
            // best-effort revert
            await cust
              .from('trade_in_requests')
              .update({ status: mine.status })
              .eq('id', mine.id);
          } else {
            ok(`customer blocked from status=${status}`);
          }
        }
      }

      // 4) Non-staff blocked from admin mutation (trade_config)
      const { error: cfgErr } = await cust
        .from('trade_config')
        .update({ value: '999' })
        .eq('key', 'offer_sla_hours');
      if (!cfgErr) fail('customer must not update trade_config');
      else ok('customer blocked from trade_config update');
    }
  } else {
    console.log('  ⚠️  Set TEST_CUSTOMER_EMAIL/PASSWORD for customer mutation checks');
  }

  // 5) Second user cannot read first user's requests (optional)
  const emailB = process.env.TEST_USER_B_EMAIL;
  const passB = process.env.TEST_USER_B_PASSWORD;
  if (email && password && emailB && passB) {
    const a = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await a.auth.signInWithPassword({ email, password });
    const { data: aRows } = await a
      .from('trade_in_requests')
      .select('id')
      .limit(1);
    const id = aRows?.[0]?.id;
    const b = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await b.auth.signInWithPassword({ email: emailB, password: passB });
    if (id) {
      const { data: stolen } = await b
        .from('trade_in_requests')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (stolen) fail('user B must not read user A request');
      else ok('user B cannot read user A trade request');
    }
  }

  console.log('');
  if (failures.length) {
    console.error(`FAILED (${failures.length})`);
    process.exit(1);
  }
  console.log('All RLS checks passed (or skipped where env missing).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
