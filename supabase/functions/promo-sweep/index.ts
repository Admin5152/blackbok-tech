// @ts-nocheck — Deno Edge Function; types resolved in Supabase runtime, not app tsc.
/**
 * Release abandoned promo reservations — Supabase Edge Function.
 *
 * Calls public.promo_sweep_expired(p_minutes := 30) with the service-role key.
 *
 * Schedule (Dashboard → Edge Functions → Schedules): every 5 minutes
 * (cron expression: star-slash-5 star star star star).
 * Optional Authorization: Bearer CRON_SECRET.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  try {
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

    const { data, error } = await supabase.rpc('promo_sweep_expired', {
      p_minutes: 30,
    });
    if (error) throw error;

    const reversed = typeof data === 'number' ? data : 0;
    console.log(JSON.stringify({ reversed, at: new Date().toISOString() }));
    return new Response(JSON.stringify({ ok: true, reversed }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('promo-sweep failed', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
