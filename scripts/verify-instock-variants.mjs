/**
 * Find any product with in-stock variants (esp. iPhone) for e2e picker check.
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

const { data: variants, error } = await sb
  .from('product_variants')
  .select('id,product_id,color,storage,stock,price_modifier,sku')
  .gt('stock', 0)
  .limit(20);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const productIds = [...new Set((variants || []).map((v) => v.product_id))];
const { data: products } = await sb
  .from('products')
  .select('id,name,category,price,stock,model,status')
  .in('id', productIds.length ? productIds : ['00000000-0000-0000-0000-000000000000']);

const joined = (products || []).map((p) => ({
  ...p,
  variants: (variants || []).filter((v) => v.product_id === p.id),
}));

console.log(
  JSON.stringify(
    {
      inStockVariantCount: variants?.length ?? 0,
      productsWithInStockVariants: joined,
      iphoneAmongThem: joined.filter((p) => /iphone/i.test(p.category || '')),
    },
    null,
    2,
  ),
);
