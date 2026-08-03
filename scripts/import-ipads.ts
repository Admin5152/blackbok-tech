/**
 * BlackBox Ghana — iPad catalogue import
 *
 * Reads data/BlackBox_iPad_Catalogue.xlsx, validates, and emits
 * supabase/seed/ipads.sql as idempotent upserts into products + product_variants.
 *
 * Usage: npx tsx scripts/import-ipads.ts
 * Exit non-zero on any validation failure (never partial-writes).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'data', 'BlackBox_iPad_Catalogue.xlsx');
const OUT_SEED = path.join(ROOT, 'supabase', 'seed', 'ipads.sql');
const OUT_MIGRATION = path.join(
  ROOT,
  'database',
  'migrations',
  '20260803000200_ipad_retail_catalogue_seed.sql',
);

type ModelRow = {
  model_slug: string;
  series: string;
  series_name: string;
  generation: string;
  generation_label: string;
  chip: string;
  release_year: string | number;
  display_name: string;
  sizes_inches: string;
  storages_gb: string;
};

type VariantRow = {
  sku: string;
  model_slug: string;
  size_inches: string | number;
  connectivity: string;
  storage_gb: string | number;
  storage_label: string;
  condition: string;
  price_ghs: string | number;
  price_pesewas: string | number;
  status: string;
  display_name: string;
};

type ColorRow = {
  model_slug: string;
  color_name: string;
  color_slug: string;
  hex_approx: string;
  sort_order: string | number;
};

type VariantColorRow = {
  color_sku: string;
  variant_sku: string;
  model_slug: string;
  condition: string;
  color_name: string;
  color_slug: string;
  hex_approx: string;
  sort_order: string | number;
  stock_qty: string | number | null;
  image_url: string | null;
};

const errors: string[] = [];

function fail(msg: string) {
  errors.push(msg);
}

function sheetRows<T>(wb: XLSX.WorkBook, name: string): T[] {
  const sheet = wb.Sheets[name];
  if (!sheet) {
    fail(`Missing sheet: ${name}`);
    return [];
  }
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: null });
}

function toInt(v: unknown, label: string, rowHint: string): number | null {
  if (v == null || v === '') {
    fail(`${rowHint}: ${label} is empty`);
    return null;
  }
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    fail(`${rowHint}: ${label} must be an integer, got ${JSON.stringify(v)}`);
    return null;
  }
  return n;
}

function mapConnectivity(raw: string): string | null {
  const c = String(raw || '')
    .trim()
    .toLowerCase();
  if (c === 'wifi' || c === 'wi-fi') return 'wifi';
  if (c === 'cellular' || c === 'cell' || c === 'cell_ps') return 'cell_ps';
  if (c === 'cell_es' || c === 'cellular_esim' || c === 'cellular esim') return 'cell_es';
  return null;
}

function mapCondition(raw: string): 'new' | 'preowned' | null {
  const c = String(raw || '')
    .trim()
    .toLowerCase();
  if (c === 'new') return 'new';
  if (c === 'used' || c === 'preowned' || c === 'pre-owned') return 'preowned';
  return null;
}

function formatSize(inches: string | number): string {
  const s = String(inches).trim();
  if (!s) return '';
  return s.endsWith('"') ? s : `${s}"`;
}

function sqlStr(v: string | null | undefined): string {
  if (v == null) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlJson(obj: unknown): string {
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`Catalogue not found: ${XLSX_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const models = sheetRows<ModelRow>(wb, 'Models');
  const variants = sheetRows<VariantRow>(wb, 'Variants');
  const colors = sheetRows<ColorRow>(wb, 'Colors');
  const variantColors = sheetRows<VariantColorRow>(wb, 'Variant_Colors');

  const modelSlugs = new Set(models.map((m) => String(m.model_slug || '').trim()).filter(Boolean));
  const variantBySku = new Map<string, VariantRow & { _row: number }>();

  // --- Models ---
  models.forEach((m, i) => {
    const row = `Models row ${i + 2}`;
    if (!m.model_slug) fail(`${row}: model_slug required`);
    if (!m.display_name) fail(`${row}: display_name required`);
    if (!m.series) fail(`${row}: series required`);
  });

  // --- Variants ---
  const priceKeySeen = new Set<string>();
  const skuSeen = new Set<string>();

  variants.forEach((v, i) => {
    const row = `Variants row ${i + 2}`;
    const sku = String(v.sku || '').trim();
    if (!sku) {
      fail(`${row}: sku required`);
      return;
    }
    if (skuSeen.has(sku)) fail(`${row}: duplicate sku ${sku}`);
    skuSeen.add(sku);

    const slug = String(v.model_slug || '').trim();
    if (!modelSlugs.has(slug)) fail(`${row}: model_slug ${slug} not in Models`);

    const sim = mapConnectivity(v.connectivity);
    if (!sim) fail(`${row}: unknown connectivity ${JSON.stringify(v.connectivity)}`);

    const cond = mapCondition(v.condition);
    if (!cond) fail(`${row}: unknown condition ${JSON.stringify(v.condition)}`);

    const priceGhs = toInt(v.price_ghs, 'price_ghs', row);
    const pricePesewas = toInt(v.price_pesewas, 'price_pesewas', row);
    if (priceGhs != null && priceGhs <= 0) fail(`${row}: price_ghs must be > 0`);
    if (pricePesewas != null && pricePesewas <= 0) fail(`${row}: price_pesewas must be > 0`);
    if (priceGhs != null && pricePesewas != null && pricePesewas !== priceGhs * 100) {
      fail(
        `${row}: price_pesewas (${pricePesewas}) !== price_ghs*100 (${priceGhs * 100})`,
      );
    }

    const size = formatSize(v.size_inches);
    const storage = String(v.storage_label || '').trim() || `${v.storage_gb}GB`;
    const key = `${slug}|${size}|${sim}|${storage}|${cond}`;
    if (priceKeySeen.has(key)) fail(`${row}: duplicate price key ${key}`);
    priceKeySeen.add(key);

    variantBySku.set(sku, { ...v, _row: i + 2 });
  });

  // --- Colors ---
  const colorKeys = new Set<string>();
  colors.forEach((c, i) => {
    const row = `Colors row ${i + 2}`;
    const slug = String(c.model_slug || '').trim();
    if (!modelSlugs.has(slug)) fail(`${row}: model_slug ${slug} not in Models`);
    colorKeys.add(`${slug}|${String(c.color_slug || '').trim()}`);
  });

  // --- Variant_Colors ---
  const colorSkuSeen = new Set<string>();
  variantColors.forEach((vc, i) => {
    const row = `Variant_Colors row ${i + 2}`;
    const colorSku = String(vc.color_sku || '').trim();
    const variantSku = String(vc.variant_sku || '').trim();
    if (!colorSku) fail(`${row}: color_sku required`);
    if (colorSkuSeen.has(colorSku)) fail(`${row}: duplicate color_sku ${colorSku}`);
    colorSkuSeen.add(colorSku);
    if (!variantBySku.has(variantSku)) {
      fail(`${row}: variant_sku ${variantSku} not in Variants`);
    }
    if (vc.stock_qty != null && vc.stock_qty !== '') {
      const stock = toInt(vc.stock_qty, 'stock_qty', row);
      if (stock != null && stock < 0) fail(`${row}: stock_qty must be >= 0`);
    }
  });

  console.log('Validation report');
  console.log(`  Models:          ${models.length}`);
  console.log(`  Variants:        ${variants.length}`);
  console.log(`  Colors:          ${colors.length}`);
  console.log(`  Variant_Colors:  ${variantColors.length}`);
  console.log(`  Errors:          ${errors.length}`);

  if (errors.length > 0) {
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  // --- Emit SQL ---
  const lines: string[] = [];
  lines.push('-- Auto-generated by scripts/import-ipads.ts — do not hand-edit.');
  lines.push('-- Source: data/BlackBox_iPad_Catalogue.xlsx');
  lines.push('-- Idempotent upserts into products + product_variants.');
  lines.push('BEGIN;');
  lines.push('');

  // Products: one per model_slug × condition present in variants
  const productKeys = new Map<
    string,
    { model: ModelRow; condition: 'new' | 'preowned'; minPrice: number }
  >();

  for (const v of variants) {
    const cond = mapCondition(v.condition)!;
    const key = `${v.model_slug}|${cond}`;
    const model = models.find((m) => m.model_slug === v.model_slug)!;
    const price = Number(v.price_ghs);
    const existing = productKeys.get(key);
    if (!existing) {
      productKeys.set(key, { model, condition: cond, minPrice: price });
    } else if (price < existing.minPrice) {
      existing.minPrice = price;
    }
  }

  for (const [, { model, condition, minPrice }] of productKeys) {
    const slug = `${model.model_slug}-${condition}`;
    const name =
      condition === 'preowned'
        ? `${model.display_name} (Used)`
        : model.display_name;
    const specs = {
      model_family: model.model_slug,
      series: model.series,
      series_name: model.series_name,
      chip: model.chip,
      generation: model.generation,
      generation_label: model.generation_label,
      release_year: Number(model.release_year) || model.release_year,
      catalog: 'ipad',
    };
    lines.push(`-- Product: ${name}`);
    lines.push(`INSERT INTO public.products (`);
    lines.push(
      `  name, slug, brand, category, subcategory, condition, status, price, currency, stock, description, specifications, is_new, featured`,
    );
    lines.push(`) VALUES (`);
    lines.push(
      `  ${sqlStr(name)}, ${sqlStr(slug)}, 'Apple', 'iPad', ${sqlStr(model.series)}, ${sqlStr(condition)}, 'active', ${minPrice}, 'GHS', 0,`,
    );
    lines.push(
      `  ${sqlStr(`${model.display_name} — ${model.chip}, ${model.generation_label}`)},`,
    );
    lines.push(`  ${sqlJson(specs)}, ${condition === 'new'}, false`);
    lines.push(`)`);
    lines.push(`ON CONFLICT (slug) DO UPDATE SET`);
    lines.push(`  name = EXCLUDED.name,`);
    lines.push(`  brand = EXCLUDED.brand,`);
    lines.push(`  category = EXCLUDED.category,`);
    lines.push(`  subcategory = EXCLUDED.subcategory,`);
    lines.push(`  condition = EXCLUDED.condition,`);
    lines.push(`  status = EXCLUDED.status,`);
    lines.push(`  price = EXCLUDED.price,`);
    lines.push(`  description = EXCLUDED.description,`);
    lines.push(`  specifications = EXCLUDED.specifications,`);
    lines.push(`  updated_at = NOW();`);
    lines.push('');
  }

  // Variants from Variant_Colors (colour rows carry stock; price from parent variant)
  lines.push('-- SKU rows (colour expansions)');
  for (const vc of variantColors) {
    const parent = variantBySku.get(String(vc.variant_sku).trim())!;
    const sim = mapConnectivity(parent.connectivity)!;
    const size = formatSize(parent.size_inches);
    const storage =
      String(parent.storage_label || '').trim() || `${parent.storage_gb}GB`;
    const price = Number(parent.price_ghs);
    const stock =
      vc.stock_qty == null || vc.stock_qty === ''
        ? 0
        : Number(vc.stock_qty);
    const isActive = String(parent.status || 'active').toLowerCase() === 'active';
    const colorSku = String(vc.color_sku).trim();
    const colorName = String(vc.color_name || '').trim();
    const hex = String(vc.hex_approx || '').trim();
    const attrs = {
      status: String(parent.status || 'active'),
      color_slug: String(vc.color_slug || '').trim(),
      hex,
      model_slug: String(vc.model_slug || '').trim(),
      variant_sku: String(vc.variant_sku).trim(),
      catalog: 'ipad',
    };
    const productSlug = `${parent.model_slug}-${mapCondition(parent.condition)}`;
    const imageUrl = vc.image_url ? String(vc.image_url).trim() : '';

    lines.push(`INSERT INTO public.product_variants (`);
    lines.push(
      `  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes`,
    );
    lines.push(`) SELECT`);
    lines.push(
      `  p.id, ${sqlStr(colorSku)}, ${sqlStr(colorName)}, ${sqlStr(storage)}, 'N/A', ${sqlStr(sim)}, ${sqlStr(size)},`,
    );
    lines.push(
      `  ${price}, ${Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0}, ${isActive}, ${imageUrl ? sqlStr(imageUrl) : 'NULL'}, ${sqlJson(attrs)}`,
    );
    lines.push(`FROM public.products p`);
    lines.push(`WHERE p.slug = ${sqlStr(productSlug)}`);
    lines.push(`ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET`);
    lines.push(`  color = EXCLUDED.color,`);
    lines.push(`  storage = EXCLUDED.storage,`);
    lines.push(`  ram = EXCLUDED.ram,`);
    lines.push(`  sim_type = EXCLUDED.sim_type,`);
    lines.push(`  display_size = EXCLUDED.display_size,`);
    lines.push(`  price = EXCLUDED.price,`);
    lines.push(`  is_active = EXCLUDED.is_active,`);
    lines.push(`  image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),`);
    lines.push(`  attributes = EXCLUDED.attributes,`);
    lines.push(`  updated_at = NOW();`);
    lines.push('');
  }

  // Sync product chip arrays + base price from variants
  lines.push(`-- Refresh product chip arrays from variants`);
  lines.push(`UPDATE public.products p SET`);
  lines.push(`  colors = COALESCE((SELECT array_agg(DISTINCT pv.color ORDER BY pv.color) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.color IS NOT NULL AND btrim(pv.color) <> ''), p.colors),`);
  lines.push(`  storage = COALESCE((SELECT array_agg(DISTINCT pv.storage ORDER BY pv.storage) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.storage IS NOT NULL AND btrim(pv.storage) <> ''), p.storage),`);
  lines.push(`  price = COALESCE((SELECT MIN(pv.price) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.is_active AND pv.price > 0), p.price),`);
  lines.push(`  stock = COALESCE((SELECT SUM(pv.stock) FROM public.product_variants pv WHERE pv.product_id = p.id), p.stock),`);
  lines.push(`  updated_at = NOW()`);
  lines.push(`WHERE p.category = 'iPad'`);
  lines.push(`  AND p.specifications->>'catalog' = 'ipad';`);
  lines.push('');
  lines.push('COMMIT;');

  const body = lines.join('\n');
  const migrationHeader = [
    '-- =====================================================================',
    '-- BlackBox Ghana — iPad retail catalogue seed (pricing + colour SKUs)',
    '-- Migration: 20260803000200_ipad_retail_catalogue_seed.sql',
    '--',
    '-- Run AFTER 20260803000100_ipad_retail_display_size_and_rpcs.sql',
    '-- (needs product_variants.display_size).',
    '--',
    '-- Source: data/BlackBox_iPad_Catalogue.xlsx via scripts/import-ipads.ts',
    '-- Idempotent upserts — safe to re-run in the Supabase SQL editor.',
    `-- ${productKeys.size} products · ${variantColors.length} colour SKU rows · GHS prices`,
    '-- =====================================================================',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT_SEED), { recursive: true });
  fs.writeFileSync(OUT_SEED, body, 'utf8');
  fs.mkdirSync(path.dirname(OUT_MIGRATION), { recursive: true });
  fs.writeFileSync(OUT_MIGRATION, migrationHeader + body, 'utf8');
  console.log(`Wrote ${OUT_SEED}`);
  console.log(`Wrote ${OUT_MIGRATION}`);
  console.log(`  Products: ${productKeys.size}`);
  console.log(`  SKU rows: ${variantColors.length}`);
}

main();
