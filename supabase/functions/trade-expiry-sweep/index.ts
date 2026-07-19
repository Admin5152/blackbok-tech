// @ts-nocheck — Deno Edge Function; types resolved in Supabase runtime, not app tsc.
/**
 * Daily trade expiry sweep — Supabase Edge Function.
 *
 * Sets status='expired' where expires_at < now() and status is still pre-offer.
 * Idempotent: already-expired rows are skipped by the status filter.
 * Logs { expired_count } to the function console for ops.
 *
 * Schedule (Dashboard → Edge Functions → Schedules): cron `0 4 * * *` (04:00 UTC).
 * Or: supabase functions deploy trade-expiry-sweep && add schedule via CLI/dashboard.
 *
 * WHY Edge Function (not only SQL): scheduled invocation + structured logs without
 * requiring pg_cron on every project plan.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const PRE_OFFER = [
  'submitted',
  'inspecting',
  'under_review',
  'pending',
] as const;

Deno.serve(async (req) => {
  try {
    // Optional shared secret: Authorization: Bearer <CRON_SECRET>
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret) {
      const auth = req.headers.get('Authorization') || '';
      if (auth !== `Bearer ${cronSecret}`) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'missing service env' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();

    // Prefer RPC if migration applied; else direct update.
    const rpc = await supabase.rpc('fn_trade_expiry_sweep');
    if (!rpc.error && typeof rpc.data === 'number') {
      console.log(JSON.stringify({ expired_count: rpc.data, via: 'rpc', at: nowIso }));
      return new Response(JSON.stringify({ expired_count: rpc.data, via: 'rpc' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: candidates, error: selErr } = await supabase
      .from('trade_in_requests')
      .select('id')
      .lt('expires_at', nowIso)
      .in('status', [...PRE_OFFER]);

    if (selErr) throw selErr;
    const ids = (candidates ?? []).map((r: { id: string }) => r.id);
    if (ids.length === 0) {
      console.log(JSON.stringify({ expired_count: 0, via: 'update', at: nowIso }));
      return new Response(JSON.stringify({ expired_count: 0, via: 'update' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: updErr } = await supabase
      .from('trade_in_requests')
      .update({ status: 'expired' })
      .in('id', ids)
      .in('status', [...PRE_OFFER]);

    if (updErr) throw updErr;

    console.log(JSON.stringify({ expired_count: ids.length, via: 'update', at: nowIso }));
    return new Response(JSON.stringify({ expired_count: ids.length, via: 'update' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('trade-expiry-sweep failed', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
