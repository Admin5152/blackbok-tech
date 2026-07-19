/**
 * Inspect live catalog columns / sample (no secrets printed).
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

const p = await sb.from('products').select('*').eq('status', 'active').limit(1);
console.log('products keys:', p.error ? p.error.message : Object.keys(p.data?.[0] || {}));
console.log(
  'sample product:',
  p.data?.[0]
    ? {
        id: p.data[0].id,
        name: p.data[0].name,
        category: p.data[0].category,
        price: p.data[0].price,
        stock: p.data[0].stock,
        model: p.data[0].model,
      }
    : null,
);

const v = await sb.from('product_variants').select('*').limit(1);
console.log(
  'variants keys:',
  v.error ? v.error.message : Object.keys(v.data?.[0] || {}),
);

const iphone = await sb
  .from('products')
  .select('id,name,category,price,stock,model')
  .eq('status', 'active')
  .ilike('category', '%iphone%')
  .limit(3);
console.log('iphone products:', iphone.error ? iphone.error.message : iphone.data);
