/**
 * BlackBox Ghana — Consoles & Controllers catalogue import
 *
 * Reads data/BlackBox_Consoles.xlsx, validates against the locked Word-doc
 * prices, and emits idempotent upserts into products + product_variants.
 *
 * Usage: npx tsx scripts/import-consoles.ts
 * Exit non-zero on any validation failure (never partial-writes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'data', 'BlackBox_Consoles.xlsx');
const OUT_SEED = path.join(ROOT, 'supabase', 'seed', 'consoles.sql');
const OUT_MIGRATION = path.join(
  ROOT,
  'database',
  'migrations',
  '20260812000200_consoles_catalogue_seed.sql',
);

/** Exact GHS integers from CONSOLES AND CONTROLLERS PRICING.docx */
const LOCKED_PRICES_GHS: Readonly<Record<string, number>> = {
  'SONY-PLAYSTATION5SLIM-DIGITAL-1TB': 6899,
  'SONY-PLAYSTATION5SLIM-STANDARD-1TB': 7599,
  'SONY-PLAYSTATION5PRO-2TB': 9999,
  SONYPLAYSTATIONPORTAL: 2899,
  'SONY-PLAYSTATIONPORTAL': 2899,
  'MICROSOFT-XBOXSERIESS-DIGITAL-1TB': 4999,
  'MICROSOFT-XBOXSERIESX-DISC-1TB': 8499,
  'NINTENDO-SWITCH2-256GB': 6499,
  'NINTENDO-SWITCHOLED-64GB': 4499,
  'VALVE-STEAMDECKOLED-512GB': 9499,
  SONYDUALSENSEWIRELESSCONTROLLER: 899,
  'SONY-DUALSENSEWIRELESSCONTROLLER': 899,
  SONYDUALSENSEEDGEWIRELESSCONTROLLER: 2599,
  'SONY-DUALSENSEEDGEWIRELESSCONTROLLER': 2599,
  MICROSOFTXBOXCONTROLLER: 999,
  'MICROSOFT-XBOXCONTROLLER': 999,
};

const ALLOWED_EDITIONS = new Set(['Digital', 'Standard', 'Disc']);
const PS5_SLIM_MODEL = 'PlayStation 5 Slim';

type CatalogueRow = {
  SKU: string;
  Category: string;
  Brand: string;
  Series: string;
  Model: string;
  Edition: string | null;
  Storage: string | null;
  Condition: string | null;
  Colour: string | null;
  'Price (GHS)': string | number | null;
  Stock: string | number | null;
  Notes: string | null;
};

type VariantSeed = {
  sku: string;
  edition: string | null;
  storage: string | null;
  price: number;
};

type ProductSeed = {
  modelSlug: string;
  productSlug: string;
  name: string;
  brand: string;
  series: string;
  category: 'Consoles' | 'Controllers';
  catalog: 'console' | 'controller';
  storageLabel: string | null;
  hasEditionAxis: boolean;
  priceFrom: number;
  variants: VariantSeed[];
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
  if (s === '—' || s === '-' || s === '–' || s === 'N/A' || s === 'n/a') return null;
  return s;
}

function slugify(parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseGhs(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!Number.isInteger(n)) return null;
  return n;
}

function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`Catalogue not found: ${XLSX_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const catalogue = sheetRows<CatalogueRow>(wb, 'Catalogue');
  if (!wb.Sheets['Price audit']) {
    fail('Missing sheet: Price audit');
  }

  const skuSeen = new Set<string>();
  const byModel = new Map<string, ProductSeed>();

  catalogue.forEach((row, i) => {
    const hint = `Catalogue row ${i + 2}`;
    const sku = String(row.SKU || '').trim();
    const sheetCategory = String(row.Category || '').trim();
    const brand = String(row.Brand || '').trim();
    const series = String(row.Series || '').trim();
    const model = String(row.Model || '').trim();

    if (!sku || !sheetCategory || !brand || !series || !model) {
      fail(`${hint}: missing required category/brand/series/model/SKU`);
      return;
    }

    if (skuSeen.has(sku)) {
      fail(`${hint}: duplicate SKU ${sku}`);
      return;
    }
    skuSeen.add(sku);

    let category: 'Consoles' | 'Controllers' | null = null;
    if (sheetCategory === 'Consoles') category = 'Consoles';
    else if (sheetCategory === 'Controllers') category = 'Controllers';
    else {
      fail(`${hint}: category must be Consoles or Controllers (got ${sheetCategory})`);
      return;
    }

    const editionRaw = blankToNull(row.Edition);
    if (editionRaw && !ALLOWED_EDITIONS.has(editionRaw)) {
      fail(`${hint}: edition must be Digital, Standard, Disc, or empty (got ${editionRaw})`);
      return;
    }

    const price = parseGhs(row['Price (GHS)']);
    if (price == null) {
      fail(`${hint}: price must be a positive integer GHS for ${sku}`);
      return;
    }
    const pesewas = price * 100;
    if (!Number.isInteger(pesewas) || pesewas <= 0) {
      fail(`${hint}: price ${price} does not convert to a positive integer pesewas`);
      return;
    }

    const locked = LOCKED_PRICES_GHS[sku];
    if (locked == null) {
      fail(`${hint}: SKU ${sku} is not in the locked pricing table`);
      return;
    }
    if (price !== locked) {
      fail(`${hint}: price ${price} does not match locked GHS ${locked} for ${sku}`);
      return;
    }

    const storage = blankToNull(row.Storage);
    const modelSlug = slugify([model]);
    const productSlug = slugify([brand, model, 'new']);
    const catalog = category === 'Controllers' ? 'controller' : 'console';
    const hasEditionAxis = model === PS5_SLIM_MODEL;

    let product = byModel.get(modelSlug);
    if (!product) {
      product = {
        modelSlug,
        productSlug,
        name: model,
        brand,
        series,
        category,
        catalog,
        storageLabel: storage,
        hasEditionAxis,
        priceFrom: price,
        variants: [],
      };
      byModel.set(modelSlug, product);
    } else {
      if (product.brand !== brand || product.series !== series || product.category !== category) {
        fail(`${hint}: model ${model} already exists with different brand/series/category`);
        return;
      }
      product.priceFrom = Math.min(product.priceFrom, price);
      if (storage && !product.storageLabel) product.storageLabel = storage;
    }

    product.variants.push({
      sku,
      edition: editionRaw,
      storage,
      price,
    });
  });

  const products = [...byModel.values()];
  const variantSkus = new Set<string>();
  for (const p of products) {
    if (p.hasEditionAxis && p.variants.length < 2) {
      fail(`${p.name}: has_edition_axis but fewer than 2 variants`);
    }
    if (!p.hasEditionAxis && p.variants.length !== 1) {
      fail(`${p.name}: expected exactly one variant (got ${p.variants.length})`);
    }
    for (const v of p.variants) {
      if (variantSkus.has(v.sku)) fail(`Duplicate variant SKU ${v.sku}`);
      variantSkus.add(v.sku);
    }
  }

  console.log('Validation report');
  console.log(`  Products:    ${products.length}`);
  console.log(`  Variants:    ${products.reduce((n, p) => n + p.variants.length, 0)}`);
  console.log(`  Consoles:    ${products.filter((p) => p.category === 'Consoles').length}`);
  console.log(`  Controllers: ${products.filter((p) => p.category === 'Controllers').length}`);
  console.log(`  Errors:      ${errors.length}`);

  if (errors.length > 0) {
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  const lines: string[] = [];
  lines.push('-- Auto-generated by scripts/import-consoles.ts — do not hand-edit.');
  lines.push('-- Source: data/BlackBox_Consoles.xlsx + CONSOLES AND CONTROLLERS PRICING.docx');
  lines.push('-- Idempotent upserts into products + product_variants.');
  lines.push('BEGIN;');
  lines.push('');
  lines.push(`ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;`);
  lines.push(`ALTER TABLE public.products`);
  lines.push(`  ADD CONSTRAINT products_category_check`);
  lines.push(`  CHECK (`);
  lines.push(`    category IS NULL`);
  lines.push(`    OR category IN (`);
  lines.push(`      'iPhone', 'Android phones', 'iPad', 'MacBooks', 'Laptops',`);
  lines.push(`      'Smart watches', 'Gaming', 'Headphones', 'Speakers', 'Accessories',`);
  lines.push(`      'Consoles', 'Controllers',`);
  lines.push(`      'Laptop', 'Audio', 'Tablet', 'Trades'`);
  lines.push(`    )`);
  lines.push(`  );`);
  lines.push('');
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
  lines.push(`      'Tune', 'Solo', 'Flip', 'Charge', 'Boombox', 'Go', 'Onyx', 'Pill',`);
  lines.push(`      'Omen', 'Envy', 'Victus', 'Alienware',`);
  lines.push(`      'pro', 'air', 'mini', 'standard', 'other',`);
  lines.push(`      'iphone-17', 'iphone-16', 'iphone-15', 'iphone-14',`);
  lines.push(`      'iphone-13', 'iphone-12', 'iphone-11', 'iphone-x',`);
  lines.push(`      'iphone-se', 'iphone-older',`);
  lines.push(`      -- Console / controller series`);
  lines.push(`      'PlayStation 5', 'PlayStation Portal', 'Xbox Series',`);
  lines.push(`      'Switch', 'Steam Deck', 'DualSense'`);
  lines.push(`    )`);
  lines.push(`  );`);
  lines.push('');

  for (const p of products) {
    const specs = {
      catalog: p.catalog,
      model_slug: p.modelSlug,
      series: p.series,
      storage_label: p.storageLabel,
      has_edition_axis: p.hasEditionAxis,
    };
    const storageSql = p.storageLabel ? sqlTextArray([p.storageLabel]) : sqlTextArray([]);
    const description = `${p.brand} ${p.name}${p.storageLabel ? ` · ${p.storageLabel}` : ''} — Brand new`;

    lines.push(`-- Product: ${p.name} (${p.category})`);
    lines.push(`INSERT INTO public.products (`);
    lines.push(
      `  name, slug, brand, category, subcategory, condition, status, price, currency, stock,`,
    );
    lines.push(`  description, specifications, is_new, featured, colors, storage, ram`);
    lines.push(`) VALUES (`);
    lines.push(
      `  ${sqlStr(p.name)}, ${sqlStr(p.productSlug)}, ${sqlStr(p.brand)}, ${sqlStr(p.category)},`,
    );
    lines.push(`  ${sqlStr(p.series)}, 'new', 'active', ${p.priceFrom}, 'GHS', 0,`);
    lines.push(`  ${sqlStr(description)},`);
    lines.push(`  ${sqlJson(specs)}, true, false,`);
    lines.push(`  ARRAY[]::TEXT[], ${storageSql}, ARRAY[]::TEXT[]`);
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

    for (const v of p.variants) {
      const attrs = {
        status: 'active',
        catalog: p.catalog,
        series: p.series,
        model_slug: p.modelSlug,
        source_sku: v.sku,
        edition: v.edition,
        storage_label: v.storage,
      };
      lines.push(`INSERT INTO public.product_variants (`);
      lines.push(
        `  product_id, sku, color, storage, ram, sim_type, display_size, edition, price, stock, is_active, image_url, attributes`,
      );
      lines.push(`) SELECT`);
      lines.push(
        `  p.id, ${sqlStr(v.sku)}, NULL, ${sqlStr(v.storage)}, NULL, NULL, NULL, ${sqlStr(v.edition)},`,
      );
      lines.push(`  ${v.price}, 0, true, NULL, ${sqlJson(attrs)}`);
      lines.push(`FROM public.products p`);
      lines.push(`WHERE p.slug = ${sqlStr(p.productSlug)}`);
      lines.push(`ON CONFLICT (sku) WHERE sku IS NOT NULL DO UPDATE SET`);
      lines.push(`  color = EXCLUDED.color,`);
      lines.push(`  storage = EXCLUDED.storage,`);
      lines.push(`  ram = EXCLUDED.ram,`);
      lines.push(`  sim_type = EXCLUDED.sim_type,`);
      lines.push(`  display_size = EXCLUDED.display_size,`);
      lines.push(`  edition = EXCLUDED.edition,`);
      lines.push(`  price = EXCLUDED.price,`);
      lines.push(`  is_active = EXCLUDED.is_active,`);
      lines.push(`  image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),`);
      lines.push(`  attributes = EXCLUDED.attributes,`);
      lines.push(`  updated_at = NOW();`);
      lines.push('');
    }
  }

  lines.push(`UPDATE public.products p SET`);
  lines.push(
    `  price = COALESCE((SELECT MIN(pv.price) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.is_active AND pv.price > 0), p.price),`,
  );
  lines.push(
    `  stock = COALESCE((SELECT SUM(pv.stock) FROM public.product_variants pv WHERE pv.product_id = p.id), p.stock),`,
  );
  lines.push(`  updated_at = NOW()`);
  lines.push(`WHERE p.specifications->>'catalog' IN ('console', 'controller')`);
  lines.push(`  AND p.condition = 'new';`);
  lines.push('');
  lines.push('COMMIT;');

  const body = lines.join('\n');
  const consoleCount = products.filter((p) => p.category === 'Consoles').length;
  const controllerCount = products.filter((p) => p.category === 'Controllers').length;
  const variantCount = products.reduce((n, p) => n + p.variants.length, 0);

  const migrationHeader = [
    '-- =====================================================================',
    '-- BlackBox Ghana — Consoles & Controllers catalogue seed',
    '-- Migration: 20260812000200_consoles_catalogue_seed.sql',
    '--',
    '-- Source: data/BlackBox_Consoles.xlsx via scripts/import-consoles.ts',
    '-- Prices locked to CONSOLES AND CONTROLLERS PRICING.docx (integer GHS).',
    `-- ${products.length} products · ${variantCount} SKU rows`,
    `--   Consoles ${consoleCount} · Controllers ${controllerCount}`,
    '--',
    '-- Requires: 20260812000100_console_retail_edition_and_rpcs.sql (edition column)',
    '-- Verify:',
    `--   SELECT category, brand, subcategory, name, price FROM products`,
    `--   WHERE specifications->>'catalog' IN ('console','controller') ORDER BY category, brand, name;`,
    `--   SELECT sku, edition, storage, price FROM product_variants`,
    `--   WHERE attributes->>'catalog' IN ('console','controller') ORDER BY sku;`,
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
