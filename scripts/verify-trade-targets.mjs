/**
 * Verify Screen 5 data path: prefer v_trade_targets; else products+variants fallback.
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

const view = await sb
  .from('v_trade_targets')
  .select('product_id,name,trade_model,variant_stock,effective_price')
  .gt('variant_stock', 0)
  .limit(3);

if (!view.error) {
  console.log(
    JSON.stringify({ source: 'v_trade_targets', sample: view.data }, null, 2),
  );
  process.exit(0);
}

console.log('view missing:', view.error.message);

const { data: products, error: pErr } = await sb
  .from('products')
  .select('id,name,category,price,stock,model,image_url,status')
  .eq('status', 'active')
  .gt('stock', 0)
  .limit(5);

if (pErr) {
  console.error(pErr.message);
  process.exit(1);
}

const ids = (products || []).map((p) => p.id);
const { data: variants } = await sb
  .from('product_variants')
  .select('id,product_id,color,storage,stock,price_modifier')
  .in('product_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  .gt('stock', 0);

// Prefer an iPhone with in-stock variants for the trade_model bridge check
const { data: iphones } = await sb
  .from('products')
  .select('id,name,category,price,stock,model')
  .eq('status', 'active')
  .eq('category', 'iPhone')
  .limit(10);

let linked = null;
for (const p of iphones || []) {
  const { data: vs } = await sb
    .from('product_variants')
    .select('id,color,storage,stock,price_modifier')
    .eq('product_id', p.id)
    .gt('stock', 0)
    .limit(2);
  if (vs && vs.length > 0) {
    linked = {
      product: p,
      inStockVariants: vs,
      bridgeNote:
        'trade_model column not migrated yet — fallback uses products.model (currently ' +
        JSON.stringify(p.model) +
        ')',
    };
    break;
  }
}

console.log(
  JSON.stringify(
    {
      source: 'products+variants fallback',
      inStockProducts: products,
      inStockVariantsForSample: variants,
      endToEndIphoneWithStock: linked,
    },
    null,
    2,
  ),
);
