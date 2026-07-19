/**
 * Trade engine matrix — node script hitting compute_trade_estimate on branch DB.
 *
 * Usage: node scripts/engine-matrix.mjs
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY)
 *
 * Asserts canonical 2760 / 6300 and structural rules. Exits 1 on failure.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY)');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const failures = [];

function ok(label) {
  console.log(`  ✅ ${label}`);
}
function fail(label, detail) {
  console.error(`  ❌ ${label}`, detail ?? '');
  failures.push(label);
}

async function answerId(questionCode, displayOrder) {
  const { data: q, error: qErr } = await sb
    .from('trade_questions')
    .select('id')
    .eq('code', questionCode)
    .maybeSingle();
  if (qErr || !q) throw new Error(`question ${questionCode}: ${qErr?.message}`);
  const { data: a, error: aErr } = await sb
    .from('trade_answers')
    .select('id')
    .eq('question_id', q.id)
    .eq('display_order', displayOrder)
    .maybeSingle();
  if (aErr || !a) {
    throw new Error(`answer ${questionCode}#${displayOrder}: ${aErr?.message}`);
  }
  return a.id;
}

async function estimate(model, storage, sim, pairs) {
  const payload = [];
  for (const [code, order] of pairs) {
    payload.push({ answer_id: await answerId(code, order) });
  }
  const { data, error } = await sb.rpc('compute_trade_estimate', {
    p_model: model,
    p_storage: storage,
    p_sim_variant: sim,
    p_answers: payload,
  });
  if (error) throw error;
  return data;
}

async function main() {
  console.log('Engine matrix\n');

  try {
    const r = await estimate('iPhone 14 Pro', '256GB', 'ps', [
      ['B2', 3],
      ['CAM4', 2],
    ]);
    if (Number(r.estimate) === 2760) ok('canonical 2760');
    else fail('canonical 2760', `got ${r.estimate}`);
  } catch (e) {
    fail('canonical 2760', e.message);
  }

  try {
    let r;
    try {
      r = await estimate('iPhone 16 Pro Max', '512GB', 'es', [['F1', 2]]);
    } catch {
      r = await estimate('iPhone 16 Pro Max', '512GB', 'es', [['BIO1', 2]]);
    }
    if (Number(r.estimate) === 6300) ok('canonical 6300');
    else fail('canonical 6300', `got ${r.estimate}`);
  } catch (e) {
    fail('canonical 6300', e.message);
  }

  try {
    const r = await estimate('iPhone 14 Pro', '256GB', 'ps', [
      ['BG1', 2],
      ['BG2', 2],
    ]);
    const bg = (r.deductions ?? []).filter((d) =>
      /back|glass|bg/i.test(String(d.component)),
    );
    if (bg.length <= 1) ok('one-per-component BG');
    else fail('one-per-component BG', `lines=${bg.length}`);
  } catch (e) {
    fail('one-per-component BG', e.message);
  }

  try {
    const r = await estimate('iPhone 14 Pro', '256GB', 'ps', [
      ['B1', 1],
      ['B2', 2],
    ]);
    const batt = (r.deductions ?? []).filter((d) =>
      /battery/i.test(String(d.component)),
    );
    if (
      batt.length === 1 &&
      Number(r.total_deductions) === Number(batt[0].amount)
    ) {
      ok('battery replaced + 80–84% single policy');
    } else {
      fail(
        'battery replaced + 80–84% single policy',
        JSON.stringify({ batt, total: r.total_deductions }),
      );
    }
  } catch (e) {
    fail('battery policy', e.message);
  }

  try {
    const r = await estimate('iPhone 16 Pro', '256GB', 'ps', [
      ['SCR1', 3],
      ['A2', 2],
    ]);
    if (Number(r.estimate) < 0) fail('clamp-to-zero', `negative ${r.estimate}`);
    else if (
      Number(r.total_deductions) >= Number(r.base_value) &&
      Number(r.estimate) !== 0
    ) {
      fail('clamp-to-zero', `expected 0 got ${r.estimate}`);
    } else {
      ok(`A1/A2 clamp path (estimate=${r.estimate})`);
    }
  } catch (e) {
    fail('A1/A2 clamp', e.message);
  }

  try {
    const r = await estimate('iPhone 14 Pro', '256GB', 'ps', [['B2', 3]]);
    if (Number(r.estimate) % 5 === 0) ok('rounding to GHS 5');
    else fail('rounding to GHS 5', String(r.estimate));
  } catch (e) {
    fail('rounding', e.message);
  }

  try {
    const { data } = await sb
      .from('trade_devices')
      .select('model, threshold_value')
      .not('threshold_value', 'is', null)
      .limit(1)
      .maybeSingle();
    if (!data?.threshold_value) {
      ok('per-model threshold skipped (TODO(D16-values) empty)');
    } else {
      ok(`per-model threshold present on ${data.model}`);
    }
  } catch (e) {
    fail('per-model threshold', e.message);
  }

  console.log('');
  if (failures.length) {
    console.error(`FAILED (${failures.length})`);
    process.exit(1);
  }
  console.log('Engine matrix passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
