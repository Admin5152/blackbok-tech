/**
 * Post-migration smoke check for trade v7 objects the app depends on.
 */
import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const out = {};
  for (const file of ['.env', '.env.local']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      out[line.slice(0, i).trim()] = line
        .slice(i + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

const env = loadEnv();
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check(label, fn) {
  try {
    const result = await fn();
    console.log(`OK  ${label}`, result);
    return true;
  } catch (e) {
    console.log(`FAIL ${label}:`, e.message || e);
    return false;
  }
}

let ok = 0;
let fail = 0;

const r1 = await check('trade_devices (active)', async () => {
  const { data, error, count } = await sb
    .from('trade_devices')
    .select('model,device_type,is_active', { count: 'exact' })
    .eq('is_active', true)
    .limit(3);
  if (error) throw error;
  return { count, sample: data };
});
r1 ? ok++ : fail++;

const r2 = await check('trade_base_values (active)', async () => {
  const { count, error } = await sb
    .from('trade_base_values')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  if (error) throw error;
  return { count };
});
r2 ? ok++ : fail++;

const r3 = await check('v_trade_targets (in stock)', async () => {
  const { data, error, count } = await sb
    .from('v_trade_targets')
    .select('product_id,name,trade_model,variant_id,storage,color,sim_type,effective_price,variant_stock', {
      count: 'exact',
    })
    .gt('variant_stock', 0)
    .limit(5);
  if (error) throw error;
  return { count, sample: data };
});
r3 ? ok++ : fail++;

const r4 = await check('products.trade_model set', async () => {
  const { data, error, count } = await sb
    .from('products')
    .select('id,name,trade_model,category,status', { count: 'exact' })
    .not('trade_model', 'is', null)
    .eq('status', 'active')
    .limit(5);
  if (error) throw error;
  return { count, sample: data };
});
r4 ? ok++ : fail++;

const r5 = await check('compute_trade_estimate RPC', async () => {
  // Pick any active base value row to exercise the engine
  const { data: base, error: bErr } = await sb
    .from('trade_base_values')
    .select('model,storage,sim_variant')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!base) return { skipped: true, reason: 'no base values' };
  const { data, error } = await sb.rpc('compute_trade_estimate', {
    p_model: base.model,
    p_storage: base.storage,
    p_sim: base.sim_variant,
    p_answers: [],
  });
  if (error) throw error;
  return { input: base, estimate: data };
});
r5 ? ok++ : fail++;

const r6 = await check('trade_questions + answers', async () => {
  const { count: q, error: qe } = await sb
    .from('trade_questions')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  if (qe) throw qe;
  const { count: a, error: ae } = await sb
    .from('trade_answers')
    .select('*', { count: 'exact', head: true });
  if (ae) throw ae;
  return { questions: q, answers: a };
});
r6 ? ok++ : fail++;

console.log(`\n${ok} ok / ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
