/**
 * BlackBox Ghana — August retail catalogue import (Audio + Laptops)
 *
 * Reads data/BlackBox_August_Catalogue.xlsx and emits an idempotent seed
 * migration for Headphones, Speakers, and Laptops (skips Phones/Android).
 *
 * Usage: npx tsx scripts/import-august-catalog.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'data', 'BlackBox_August_Catalogue.xlsx');
const OUT_SEED = path.join(ROOT, 'supabase', 'seed', 'august_retail.sql');
const OUT_MIGRATION = path.join(
  ROOT,
  'database',
  'migrations',
  '20260808000100_august_retail_catalogue_seed.sql',
);

/** Confirmed corrections vs held / printed-odd rows. */
const PRICE_OVERRIDES: Record<string, number> = {
  'JBL-TUNE730BT': 9999,
  'BEATS-SOLOPRO': 1699,
  'BEATS-PILL3RDGEN2024': 1699,
};

const HEADPHONE_SERIES = new Set(['AirPods', 'Tune', 'Solo']);
const SPEAKER_SERIES = new Set(['Onyx', 'Flip', 'Charge', 'Boombox', 'Go', 'Pill']);

type CatalogueRow = {
  SKU: string;
  Category: string;
  Brand: string;
  Series: string;
  Model: string;
  Storage: string | null;
  Condition: string | null;
  Colour: string | null;
  'Price (GHS)': string | number | null;
  Status: string | null;
  Stock: string | number | null;
  Notes: string | null;
};

type LaptopSpecRow = {
  Brand: string;
  Series: string;
  Model: string;
  'PRO\nPROCESSOR'?: string | null;
  'GEN\nGENERATION'?: string | null;
  'STOR\nSTORAGE CAPACITY'?: string | null;
  'MEM\nMEMORY'?: string | null;
  'GRA\nGRAPHICS'?: string | null;
  'DIS\nDISPLAY'?: string | null;
  'BATT\nBATTERY'?: string | null;
  'OS\nOPERATING SYSTEM'?: string | null;
  'EXT\nEXTRAS'?: string | null;
  // Flattened headers after sheet_to_json may collapse newlines differently
  [key: string]: string | null | undefined;
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

function sqlStr(v: string | null | undefined): string {
  if (v == null) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlJson(obj: unknown): string {
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function sqlTextArray(values: string[]): string {
  if (values.length === 0) return `ARRAY[]::TEXT[]`;
  return `ARRAY[${values.map((v) => sqlStr(v)).join(', ')}]::TEXT[]`;
}

function blankToNull(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^blank on your sheet$/i.test(s)) return null;
  if (s === '—' || s === '-' || s === 'N/A' || s === 'n/a') return null;
  return s;
}

function normalizeStorageAxis(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!s || s === '—') return null;
  // "1TB SSD" / "1TB M.2 PCIe NVMe SSD" → prefer compact tier for SKU axis
  const tb = s.match(/(\d+(?:\.\d+)?)\s*TB/i);
  if (tb) return `${tb[1]}TB`;
  const gb = s.match(/(\d+)\s*GB/i);
  if (gb) return `${gb[1]}GB`;
  return s;
}

function normalizeRamAxis(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.replace(/\s+/g, ' ').trim();
  const m = s.match(/(\d+)\s*GB/i);
  return m ? `${m[1]}GB` : s;
}

function slugify(parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveStoreCategory(series: string): 'Headphones' | 'Speakers' | null {
  if (HEADPHONE_SERIES.has(series)) return 'Headphones';
  if (SPEAKER_SERIES.has(series)) return 'Speakers';
  return null;
}

function pickSpecField(row: LaptopSpecRow, needles: string[]): string | null {
  for (const [key, val] of Object.entries(row)) {
    const compact = key.replace(/\s+/g, ' ').toUpperCase();
    if (needles.some((n) => compact.includes(n))) {
      return blankToNull(val);
    }
  }
  return null;
}

function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`Catalogue not found: ${XLSX_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const catalogue = sheetRows<CatalogueRow>(wb, 'Catalogue');
  const laptopSpecs = sheetRows<LaptopSpecRow>(wb, 'Laptop specs');

  const specsByModel = new Map<string, LaptopSpecRow>();
  for (const row of laptopSpecs) {
    const model = String(row.Model || '').trim();
    if (model) specsByModel.set(model.toLowerCase(), row);
  }

  type SeedItem = {
    sku: string;
    storeCategory: 'Headphones' | 'Speakers' | 'Laptops';
    brand: string;
    series: string;
    model: string;
    price: number;
    storageLabel: string | null;
    storageAxis: string | null;
    ramAxis: string | null;
    laptopSpecs: Record<string, string | null> | null;
    productSlug: string;
    variantSku: string;
  };

  const items: SeedItem[] = [];

  catalogue.forEach((row, i) => {
    const hint = `Catalogue row ${i + 2}`;
    const sku = String(row.SKU || '').trim();
    const sheetCategory = String(row.Category || '').trim();
    const brand = String(row.Brand || '').trim();
    const series = String(row.Series || '').trim();
    const model = String(row.Model || '').trim();

    if (!sku || !sheetCategory || !brand || !series || !model) {
      fail(`${hint}: missing required fields`);
      return;
    }

    // Skip Android / phones this pass
    if (/phone/i.test(sheetCategory)) return;

    let storeCategory: 'Headphones' | 'Speakers' | 'Laptops' | null = null;
    if (/laptop/i.test(sheetCategory)) {
      storeCategory = 'Laptops';
    } else if (/audio/i.test(sheetCategory)) {
      storeCategory = resolveStoreCategory(series);
      if (!storeCategory) fail(`${hint}: unknown audio series ${series}`);
    } else {
      return;
    }
    if (!storeCategory) return;

    let price: number | null =
      PRICE_OVERRIDES[sku] ??
      (row['Price (GHS)'] == null || row['Price (GHS)'] === ''
        ? null
        : Number(String(row['Price (GHS)']).replace(/,/g, '')));

    if (price == null || !Number.isFinite(price) || price <= 0) {
      fail(`${hint}: missing/invalid price for ${sku} (set PRICE_OVERRIDES if held)`);
      return;
    }
    price = Math.round(price);

    const storageLabel = blankToNull(row.Storage);
    let storageAxis = normalizeStorageAxis(storageLabel);
    let ramAxis: string | null = null;
    let laptopSpecJson: Record<string, string | null> | null = null;

    if (storeCategory === 'Laptops') {
      const spec = specsByModel.get(model.toLowerCase());
      if (!spec) fail(`${hint}: no Laptop specs row for ${model}`);
      else {
        const processor = pickSpecField(spec, ['PROCESSOR', 'PRO']);
        const generation = pickSpecField(spec, ['GENERATION', 'GEN']);
        const stor = pickSpecField(spec, ['STORAGE', 'STOR']) ?? storageLabel;
        const memory = pickSpecField(spec, ['MEMORY', 'MEM']);
        const graphics = pickSpecField(spec, ['GRAPHICS', 'GRA']);
        const display = pickSpecField(spec, ['DISPLAY', 'DIS']);
        const battery = pickSpecField(spec, ['BATTERY', 'BATT']);
        const os = pickSpecField(spec, ['OPERATING', 'OS']);
        const extras = pickSpecField(spec, ['EXTRAS', 'EXT']);
        storageAxis = normalizeStorageAxis(stor) ?? storageAxis;
        ramAxis = normalizeRamAxis(memory);
        laptopSpecJson = {
          catalog: 'laptop',
          series,
          processor,
          generation,
          storage_label: stor,
          memory,
          graphics,
          display,
          battery,
          os,
          extras,
        };
      }
    }

    const productSlug = slugify([
      brand,
      model,
      'new',
      storeCategory === 'Laptops' && storageAxis ? storageAxis : '',
    ].filter(Boolean));

    items.push({
      sku,
      storeCategory,
      brand,
      series,
      model,
      price,
      storageLabel,
      storageAxis: storeCategory === 'Laptops' ? storageAxis : null,
      ramAxis: storeCategory === 'Laptops' ? ramAxis : null,
      laptopSpecs: laptopSpecJson,
      productSlug,
      variantSku: `${sku}-NEW`,
    });
  });

  const slugSeen = new Set<string>();
  const variantSeen = new Set<string>();
  for (const item of items) {
    if (slugSeen.has(item.productSlug)) fail(`Duplicate product slug ${item.productSlug}`);
    slugSeen.add(item.productSlug);
    if (variantSeen.has(item.variantSku)) fail(`Duplicate variant sku ${item.variantSku}`);
    variantSeen.add(item.variantSku);
  }

  console.log('Validation report');
  console.log(`  Seed items: ${items.length}`);
  console.log(
    `  Headphones: ${items.filter((i) => i.storeCategory === 'Headphones').length}`,
  );
  console.log(`  Speakers:   ${items.filter((i) => i.storeCategory === 'Speakers').length}`);
  console.log(`  Laptops:    ${items.filter((i) => i.storeCategory === 'Laptops').length}`);
  console.log(`  Errors:     ${errors.length}`);

  if (errors.length > 0) {
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  const lines: string[] = [];
  lines.push('-- Auto-generated by scripts/import-august-catalog.ts — do not hand-edit.');
  lines.push('-- Source: data/BlackBox_August_Catalogue.xlsx');
  lines.push('-- Idempotent upserts into products + product_variants (Audio + Laptops).');
  lines.push('BEGIN;');
  lines.push('');

  lines.push(`-- Widen products.category for Headphones / Speakers / Laptops (and full taxonomy)`);
  lines.push(`ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;`);
  lines.push(`ALTER TABLE public.products`);
  lines.push(`  ADD CONSTRAINT products_category_check`);
  lines.push(`  CHECK (`);
  lines.push(`    category IS NULL`);
  lines.push(`    OR category IN (`);
  lines.push(`      'iPhone', 'Android phones', 'iPad', 'MacBooks', 'Laptops',`);
  lines.push(`      'Smart watches', 'Gaming', 'Headphones', 'Speakers', 'Accessories',`);
  lines.push(`      'Laptop', 'Audio', 'Tablet', 'Trades'`);
  lines.push(`    )`);
  lines.push(`  );`);
  lines.push('');

  // Widen subcategory check for series slugs used by this seed
  lines.push(`-- Widen products.subcategory for August series slugs`);
  lines.push(`ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_subcategory_check;`);
  lines.push(`ALTER TABLE public.products`);
  lines.push(`  ADD CONSTRAINT products_subcategory_check`);
  lines.push(`  CHECK (`);
  lines.push(`    subcategory IS NULL`);
  lines.push(`    OR subcategory IN (`);
  lines.push(`      'new', 'used', 'preowned', 'refurbished',`);
  lines.push(`      'iWatches', 'Others',`);
  lines.push(`      'PlayStation', 'Xbox', 'Steam', 'Nintendo',`);
  lines.push(`      'AirPods', 'JBL', 'Sony', 'EarPods', 'Beats',`);
  lines.push(`      'HomePod', 'HarmanKardon',`);
  lines.push(`      'PhoneCases', 'ScreenProtectors', 'Chargers',`);
  lines.push(`      'HP', 'Dell',`);
  lines.push(`      -- Audio series`);
  lines.push(`      'Tune', 'Solo', 'Flip', 'Charge', 'Boombox', 'Go', 'Onyx', 'Pill',`);
  lines.push(`      -- Laptop series`);
  lines.push(`      'Omen', 'Envy', 'Victus', 'Alienware',`);
  lines.push(`      -- iPad / MacBook series`);
  lines.push(`      'pro', 'air', 'mini', 'standard', 'other',`);
  lines.push(`      -- iPhone series`);
  lines.push(`      'iphone-17', 'iphone-16', 'iphone-15', 'iphone-14',`);
  lines.push(`      'iphone-13', 'iphone-12', 'iphone-11', 'iphone-x',`);
  lines.push(`      'iphone-se', 'iphone-older'`);
  lines.push(`    )`);
  lines.push(`  );`);
  lines.push('');

  for (const item of items) {
    const isAudio = item.storeCategory === 'Headphones' || item.storeCategory === 'Speakers';
    const specs = isAudio
      ? {
          catalog: 'audio',
          audio_type: item.storeCategory === 'Headphones' ? 'headphones' : 'speakers',
          series: item.series,
        }
      : item.laptopSpecs;

    const colorsSql = sqlTextArray([]);
    const storageSql = item.storageAxis ? sqlTextArray([item.storageAxis]) : sqlTextArray([]);
    const ramSql = item.ramAxis ? sqlTextArray([item.ramAxis]) : sqlTextArray([]);

    const description = isAudio
      ? `${item.brand} ${item.model} — brand new`
      : `${item.brand} ${item.model}${item.storageLabel ? ` · ${item.storageLabel}` : ''} — brand new`;

    lines.push(`-- Product: ${item.model} (${item.storeCategory})`);
    lines.push(`INSERT INTO public.products (`);
    lines.push(
      `  name, slug, brand, category, subcategory, condition, status, price, currency, stock,`,
    );
    lines.push(
      `  description, specifications, is_new, featured, colors, storage, ram`,
    );
    lines.push(`) VALUES (`);
    lines.push(
      `  ${sqlStr(item.model)}, ${sqlStr(item.productSlug)}, ${sqlStr(item.brand)}, ${sqlStr(item.storeCategory)},`,
    );
    lines.push(
      `  ${sqlStr(item.series)}, 'new', 'active', ${item.price}, 'GHS', 0,`,
    );
    lines.push(`  ${sqlStr(description)},`);
    lines.push(`  ${sqlJson(specs)}, true, false,`);
    lines.push(`  ${colorsSql}, ${storageSql}, ${ramSql}`);
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
    lines.push(`  is_new = EXCLUDED.is_new,`);
    lines.push(`  colors = EXCLUDED.colors,`);
    lines.push(`  storage = EXCLUDED.storage,`);
    lines.push(`  ram = EXCLUDED.ram,`);
    lines.push(`  updated_at = NOW();`);
    lines.push('');

    const attrs = {
      status: 'active',
      catalog: isAudio ? 'audio' : 'laptop',
      series: item.series,
      model_slug: item.productSlug,
      source_sku: item.sku,
    };

    lines.push(`INSERT INTO public.product_variants (`);
    lines.push(
      `  product_id, sku, color, storage, ram, sim_type, display_size, price, stock, is_active, image_url, attributes`,
    );
    lines.push(`) SELECT`);
    lines.push(
      `  p.id, ${sqlStr(item.variantSku)}, NULL, ${sqlStr(item.storageAxis)}, ${sqlStr(item.ramAxis)}, NULL, NULL,`,
    );
    lines.push(`  ${item.price}, 0, true, NULL, ${sqlJson(attrs)}`);
    lines.push(`FROM public.products p`);
    lines.push(`WHERE p.slug = ${sqlStr(item.productSlug)}`);
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

  lines.push(`-- Refresh base price / stock from variants for seeded catalogue rows`);
  lines.push(`UPDATE public.products p SET`);
  lines.push(
    `  price = COALESCE((SELECT MIN(pv.price) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.is_active AND pv.price > 0), p.price),`,
  );
  lines.push(
    `  stock = COALESCE((SELECT SUM(pv.stock) FROM public.product_variants pv WHERE pv.product_id = p.id), p.stock),`,
  );
  lines.push(`  updated_at = NOW()`);
  lines.push(`WHERE p.specifications->>'catalog' IN ('audio', 'laptop')`);
  lines.push(`  AND p.condition = 'new';`);
  lines.push('');
  lines.push('COMMIT;');

  const body = lines.join('\n');
  const counts = {
    headphones: items.filter((i) => i.storeCategory === 'Headphones').length,
    speakers: items.filter((i) => i.storeCategory === 'Speakers').length,
    laptops: items.filter((i) => i.storeCategory === 'Laptops').length,
  };

  const migrationHeader = [
    '-- =====================================================================',
    '-- BlackBox Ghana — August retail catalogue seed (Audio + Laptops)',
    '-- Migration: 20260808000100_august_retail_catalogue_seed.sql',
    '--',
    '-- Source: data/BlackBox_August_Catalogue.xlsx via scripts/import-august-catalog.ts',
    '-- Price overrides: Tune 730BT 9999, Solo Pro 1699, Pill 3rd Gen 1699',
    '-- Idempotent upserts — safe to re-run in the Supabase SQL editor.',
    `-- ${items.length} products · ${items.length} SKU rows`,
    `--   Headphones ${counts.headphones} · Speakers ${counts.speakers} · Laptops ${counts.laptops}`,
    '--',
    '-- Verify:',
    `--   SELECT category, brand, subcategory, name, price FROM products`,
    `--   WHERE specifications->>'catalog' IN ('audio','laptop') ORDER BY category, brand, name;`,
    `--   SELECT sku, storage, ram, price, stock FROM product_variants`,
    `--   WHERE attributes->>'catalog' IN ('audio','laptop') ORDER BY sku;`,
    '-- =====================================================================',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT_SEED), { recursive: true });
  fs.writeFileSync(OUT_SEED, body, 'utf8');
  fs.mkdirSync(path.dirname(OUT_MIGRATION), { recursive: true });
  fs.writeFileSync(OUT_MIGRATION, migrationHeader + body, 'utf8');
  console.log(`Wrote ${OUT_SEED}`);
  console.log(`Wrote ${OUT_MIGRATION}`);
}

main();
