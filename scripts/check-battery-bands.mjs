/**
 * Smoke-check battery 4-tier bands against live Supabase.
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

const { data: q, error: qErr } = await sb
  .from('trade_questions')
  .select('id,code')
  .in('code', ['B2', 'iB2']);
if (qErr) throw qErr;

const ids = (q || []).map((x) => x.id);
const { data: answers, error: aErr } = await sb
  .from('trade_answers')
  .select('answer_text,outcome,display_order,question_id')
  .in('question_id', ids)
  .order('display_order');
if (aErr) throw aErr;

console.log('B2/iB2 answers:');
for (const row of answers || []) {
  const code = (q || []).find((x) => x.id === row.question_id)?.code;
  console.log(`  ${code} [${row.display_order}] ${row.outcome} — ${row.answer_text}`);
}

const hasQuarter = (answers || []).some((a) => a.outcome === 'deduct_quarter');
console.log(hasQuarter ? 'OK  deduct_quarter present' : 'FAIL deduct_quarter missing — run 2026_07_battery_bands_4tier.sql');

const { data: cfg } = await sb
  .from('trade_config')
  .select('key,value')
  .in('key', [
    'battery_healthy_min',
    'battery_quarter_min',
    'battery_half_min',
    'battery_full_below',
  ]);
console.log('config', cfg);
