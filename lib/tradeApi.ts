/**
 * Trade-in data access — Supabase queries and RPC wrappers.
 *
 * Role in flow: all server-sourced trade data (devices, questions, targets,
 * live estimates). Money never computed client-side — compute_trade_estimate
 * RPC is the single pricing authority after every questionnaire answer.
 */
import { supabase } from './supabase';
import { sortStorageTiers } from './tradeFlowState';
import {
  categoriesFromPriced,
  getPricedActiveModelsCached,
  modelsInCategoryFromPriced,
} from './tradeCatalogCache';
import type {
  SimVariant,
  TradeAnswerInput,
  TradeBaseValueRow,
  TradeConfigRow,
  TradeDeviceRow,
  TradeDeviceType,
  TradeEstimateResult,
  TradeQuestionWithAnswers,
  TradeTargetRow,
} from '../types/supabase';

/** Maps UI device type to DB trade_devices.device_type */
export function toTradeDeviceType(
  uiType: 'smartphone' | 'tablet' | string,
): TradeDeviceType {
  return uiType === 'tablet' ? 'ipad' : 'iphone';
}

/** Maps DB device_type back to UI shorthand */
export function fromTradeDeviceType(dbType: TradeDeviceType): 'smartphone' | 'tablet' {
  return dbType === 'ipad' ? 'tablet' : 'smartphone';
}

/**
 * Active trade-in device catalog — drives Screens 1–3.
 * iPad rows are hidden automatically when is_active=false (pending pricing).
 */
export async function getTradeDevices(
  deviceType?: TradeDeviceType,
): Promise<TradeDeviceRow[]> {
  let query = supabase
    .from('trade_devices')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (deviceType) query = query.eq('device_type', deviceType);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TradeDeviceRow[];
}

/** Single device row (incl. biometric) — Screen 6 Face ID / Touch ID label */
export async function getTradeDevice(model: string): Promise<TradeDeviceRow | null> {
  const { data, error } = await supabase
    .from('trade_devices')
    .select('*')
    .eq('model', model)
    .maybeSingle();
  if (error) throw error;
  return data as TradeDeviceRow | null;
}

/**
 * Whether any tradeable iPad exists for Screen 1.
 * Requires active device AND ≥1 active base_value (same gate as model grids).
 */
export async function hasActiveIpadDevices(): Promise<boolean> {
  const priced = await getPricedActiveModelsCached('ipad');
  return priced.length >= 1;
}

/**
 * Models that have ≥1 active base_value row — used to filter category/model grids
 * so customers never pick an unpriceable device.
 * Cached + parallel fetch (see lib/tradeCatalogCache.ts).
 */
export async function getPricedActiveModels(
  deviceType: TradeDeviceType,
): Promise<TradeDeviceRow[]> {
  return getPricedActiveModelsCached(deviceType);
}

/**
 * Screen 2 categories: iPhone series or iPad product_line that contain
 * ≥1 active model with ≥1 active base value.
 */
export async function getTradeCategories(
  deviceType: TradeDeviceType,
): Promise<string[]> {
  const priced = await getPricedActiveModelsCached(deviceType);
  return categoriesFromPriced(deviceType, priced);
}

/** Models within a series/line that have active pricing (Screen 3). */
export async function getTradeModelsInCategory(
  deviceType: TradeDeviceType,
  category: string,
): Promise<TradeDeviceRow[]> {
  const priced = await getPricedActiveModelsCached(deviceType);
  return modelsInCategoryFromPriced(deviceType, category, priced);
}

/** @deprecated Prefer getTradeCategories — kept for callers that only need series labels */
export async function getTradeSeries(deviceType: TradeDeviceType): Promise<string[]> {
  return getTradeCategories(deviceType);
}

/** @deprecated Prefer getTradeModelsInCategory */
export async function getTradeModelsInSeries(
  deviceType: TradeDeviceType,
  seriesOrLine: string,
): Promise<TradeDeviceRow[]> {
  return getTradeModelsInCategory(deviceType, seriesOrLine);
}

/**
 * Active base-value rows for one model — drives Screen 4 progressive selects.
 * Only combinations that exist in pricing can be chosen.
 */
export async function getTradeBaseValuesForModel(
  model: string,
): Promise<TradeBaseValueRow[]> {
  const { data, error } = await supabase
    .from('trade_base_values')
    .select('*')
    .eq('model', model)
    .eq('is_active', true);

  if (error) throw error;
  return (data ?? []) as TradeBaseValueRow[];
}

/** Distinct storage tiers that exist for this model (sorted). */
export function distinctStorageFromRows(rows: TradeBaseValueRow[]): string[] {
  return sortStorageTiers(
    Array.from(new Set(rows.map((r) => r.storage))),
  );
}

/**
 * Distinct SIM variants for a model+storage pair.
 * Returns empty when only `single` exists (auto-skip picker).
 */
export function distinctSimsFromRows(
  rows: TradeBaseValueRow[],
  storage: string,
): SimVariant[] {
  const forStorage = rows.filter((r) => r.storage === storage);
  const sims = Array.from(new Set(forStorage.map((r) => r.sim_variant)));
  const selectable = sims.filter((s) => s !== 'single') as SimVariant[];
  // Prefer physical before eSIM for consistent chip order
  const order: SimVariant[] = ['ps', 'es', 'wifi', 'cell_ps', 'cell_es'];
  return selectable.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/**
 * Resolve the single sim_variant when the model has no split (pre-14, 17 Air).
 * Returns 'single' or the sole variant code.
 */
export function resolveAutoSim(
  rows: TradeBaseValueRow[],
  storage: string,
): SimVariant | null {
  const forStorage = rows.filter((r) => r.storage === storage);
  if (forStorage.length === 0) return null;
  const sims = Array.from(new Set(forStorage.map((r) => r.sim_variant)));
  if (sims.length === 1) return sims[0];
  if (sims.every((s) => s === 'single')) return 'single';
  return null;
}

/** Look up base_value for exact model/storage/sim — used to lock after Screen 4. */
export function lookupBaseValueFromRows(
  rows: TradeBaseValueRow[],
  storage: string,
  sim: string,
): number | null {
  const hit = rows.find(
    (r) => r.storage === storage && r.sim_variant === sim && r.is_active,
  );
  return hit?.base_value ?? null;
}

/**
 * Full questionnaire with answers — drives Screen 6.
 * Questions and answer options are admin-editable in DB; never hardcode.
 */
export async function getTradeQuestions(
  deviceType: TradeDeviceType,
): Promise<TradeQuestionWithAnswers[]> {
  const { data: questions, error: qErr } = await supabase
    .from('trade_questions')
    .select('*')
    .eq('device_type', deviceType)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (qErr) throw qErr;
  if (!questions?.length) return [];

  const ids = questions.map((q: { id: string }) => q.id);
  const { data: answers, error: aErr } = await supabase
    .from('trade_answers')
    .select('*')
    .in('question_id', ids)
    .order('display_order', { ascending: true });

  if (aErr) throw aErr;

  const byQuestion = new Map<string, TradeQuestionWithAnswers['answers']>();
  for (const a of answers ?? []) {
    const list = byQuestion.get(a.question_id) ?? [];
    list.push(a);
    byQuestion.set(a.question_id, list);
  }

  return questions.map((q) => ({
    ...q,
    answers: byQuestion.get(q.id) ?? [],
  }));
}

/** Business rules from trade_config — threshold message, validity days, etc. */
export async function getTradeConfig(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('trade_config').select('*');
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of (data ?? []) as TradeConfigRow[]) {
    map.set(row.key, row.value);
  }
  return map;
}

/** Single config value with fallback */
export async function getTradeConfigValue(key: string, fallback = ''): Promise<string> {
  const { data, error } = await supabase
    .from('trade_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? fallback;
}

/**
 * Target device catalog for Screen 5 — live price + stock from v_trade_targets.
 * Prices come from the shop catalog; never duplicated into trade tables.
 * Default: in-stock only (D11 — no reservation; hide zero-stock SKUs).
 *
 * Fallback: if v_trade_targets is missing (migration not yet applied on this
 * project), synthesise equivalent rows from products + product_variants so
 * Screen 5 still works. Prefer the view whenever it exists.
 */
export async function getTradeTargets(filters?: {
  tradeModel?: string;
  category?: string;
  /** Defaults to true — Screen 5 never lists out-of-stock colours */
  inStockOnly?: boolean;
}): Promise<TradeTargetRow[]> {
  const inStockOnly = filters?.inStockOnly !== false;

  let query = supabase.from('v_trade_targets').select('*');
  if (filters?.tradeModel) query = query.eq('trade_model', filters.tradeModel);
  if (filters?.category) query = query.eq('category', filters.category);
  // D11: stock_reservation=none — first come, first served; hide OOS entirely
  if (inStockOnly) query = query.gt('variant_stock', 0);

  const { data, error } = await query.order('name');
  if (!error) return (data ?? []) as TradeTargetRow[];

  // View missing / schema lag — build from live shop tables
  console.warn(
    'v_trade_targets unavailable (' + error.message + '); falling back to products+variants',
  );
  return getTradeTargetsFromProducts(filters);
}

/**
 * Synthesise v_trade_targets-shaped rows from products + product_variants.
 * Used until the production migration view is live on the connected project.
 * trade_model falls back to products.model (pre-migration bridge column).
 */
async function getTradeTargetsFromProducts(filters?: {
  tradeModel?: string;
  category?: string;
  inStockOnly?: boolean;
}): Promise<TradeTargetRow[]> {
  const inStockOnly = filters?.inStockOnly !== false;

  let productQuery = supabase
    .from('products')
    .select('id,name,category,condition,image_url,price,stock,status,trade_model,model')
    .eq('status', 'active');
  if (filters?.category) productQuery = productQuery.eq('category', filters.category);
  if (filters?.tradeModel) {
    productQuery = productQuery.or(
      `trade_model.eq.${filters.tradeModel},model.eq.${filters.tradeModel}`,
    );
  }

  const { data: products, error: pErr } = await productQuery;
  if (pErr) throw pErr;
  if (!products?.length) return [];

  const ids = products.map((p: { id: string }) => p.id);
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select(
      'id,product_id,color,ram,storage,sim_type,price_modifier,price,stock,sku,image_url,is_active',
    )
    .in('product_id', ids);
  if (vErr) throw vErr;

  const byProduct = new Map<string, NonNullable<typeof variants>>();
  for (const v of variants ?? []) {
    if (v.is_active === false) continue;
    const list = byProduct.get(v.product_id) ?? [];
    list.push(v);
    byProduct.set(v.product_id, list);
  }

  const rows: TradeTargetRow[] = [];
  for (const p of products) {
    const tradeModel =
      (p as { trade_model?: string | null }).trade_model ??
      (p as { model?: string | null }).model ??
      null;
    const pVars = byProduct.get(p.id) ?? [];
    if (pVars.length === 0) {
      const stock = Number(p.stock) || 0;
      if (inStockOnly && stock <= 0) continue;
      rows.push({
        product_id: p.id,
        name: p.name,
        slug: null,
        category: p.category,
        condition: p.condition,
        trade_model: tradeModel,
        product_image: p.image_url,
        variant_id: null,
        sku: null,
        color: null,
        storage: null,
        ram: null,
        sim_type: null,
        effective_price: Number(p.price) || 0,
        variant_stock: stock,
        display_image: p.image_url,
      });
      continue;
    }
    for (const v of pVars) {
      const stock = Number(v.stock) || 0;
      if (inStockOnly && stock <= 0) continue;
      const absolute =
        v.price != null && Number.isFinite(Number(v.price))
          ? Number(v.price)
          : Number(p.price) + (Number(v.price_modifier) || 0);
      rows.push({
        product_id: p.id,
        name: p.name,
        slug: null,
        category: p.category,
        condition: p.condition,
        trade_model: tradeModel,
        product_image: p.image_url,
        variant_id: v.id,
        sku: v.sku,
        color: v.color,
        storage: v.storage,
        ram: v.ram,
        sim_type: (v.sim_type as TradeTargetRow['sim_type']) ?? null,
        effective_price: absolute,
        variant_stock: stock,
        display_image: v.image_url || p.image_url,
      });
    }
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Live trade-in estimate — called after every questionnaire answer.
 * Server enforces one-deduction-per-component; UI displays result only.
 */
export async function computeTradeEstimate(
  model: string,
  storage: string,
  sim: string,
  answers: TradeAnswerInput[],
): Promise<TradeEstimateResult> {
  const payload = answers.map((a) => ({
    answer_id: a.answer_id,
    ...(a.description ? { description: a.description } : {}),
  }));

  const { data, error } = await supabase.rpc('compute_trade_estimate', {
    p_model: model,
    p_storage: storage,
    p_sim: sim,
    p_answers: payload,
  });

  if (error) throw error;
  return data as TradeEstimateResult;
}

/** Resolve trade config → sellable SKU with match quality label */
export async function resolveProductVariant(
  tradeModel: string,
  storage?: string,
  sim?: string,
  color?: string,
) {
  const { data, error } = await supabase.rpc('fn_resolve_product_variant', {
    p_trade_model: tradeModel,
    p_storage: storage ?? null,
    p_sim: sim ?? null,
    p_color: color ?? null,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

/** Check for an active trade request on this IMEI/serial (duplicate protection). */
export async function findActiveTradeByImei(imeiSerial: string): Promise<{
  id: string;
  display_id: string | null;
} | null> {
  return findActiveTradeByIdentity([imeiSerial]);
}

/** Match any of IMEI 1 / IMEI 2 / serial / legacy imei_serial on active trades. */
export async function findActiveTradeByIdentity(
  values: Array<string | null | undefined>,
): Promise<{ id: string; display_id: string | null } | null> {
  const norms = [
    ...new Set(
      values
        .map((v) => (v ?? '').trim())
        .filter(Boolean)
        .map((v) => v.toLowerCase()),
    ),
  ];
  if (norms.length === 0) return null;

  const activeStatuses = [
    'submitted',
    'under_review',
    'offer_made',
    'accepted',
    'scheduled',
  ];

  for (const n of norms) {
    const cols = ['imei_1', 'imei_2', 'serial_number', 'imei_serial'] as const;
    for (const col of cols) {
      const { data, error } = await supabase
        .from('trade_in_requests')
        .select('id, display_id')
        .ilike(col, n)
        .in('status', activeStatuses)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
    }
  }
  return null;
}

/** Alias used by Screen 6 — same as getTradeQuestions */
export const getQuestions = getTradeQuestions;

/** Alias for compute_trade_estimate — Screen 6 live ticker */
export const computeEstimate = computeTradeEstimate;

export interface SubmitTradeRequestInput {
  userId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  imeiSerial: string;
  imei1?: string | null;
  imei2?: string | null;
  serialNumber?: string | null;
  deviceLock: {
    model: string;
    storage: string;
    sim: string;
    color: string;
    imei1?: string | null;
    imei2?: string | null;
    serialNumber?: string | null;
    imeiSerial?: string;
    lockedBaseValue: number;
  };
  targetLock: {
    productId: string | null;
    variantId: string | null;
    productName: string | null;
    color: string | null;
    cashOnly: boolean;
  };
  deviceType: TradeDeviceType;
  estimate: {
    base_value: number;
    estimate: number;
    deductions: Array<{ component: string; amount: number }>;
    needs_verification: boolean;
  };
  quizAnswers: Record<
    string,
    {
      questionCode: string;
      answerId: string;
      descriptionTags?: string[];
      descriptionText?: string;
    }
  >;
  editLog: Array<{ code: string; old: string | null; new: string; at: string }>;
}

/**
 * Screen 8 submit — browser sends answers + IDs only.
 * Server triggers re-derive target price, top-up, expiry, display_id.
 * Assert response contains display_id / expires_at / top_up_amount.
 */
export async function submitTradeRequest(input: SubmitTradeRequestInput) {
  const { createTradeRequest } = await import('./api');

  const answers = Object.values(input.quizAnswers).map((a) => ({
    code: a.questionCode,
    answerId: a.answerId,
    description: [...(a.descriptionTags ?? []), a.descriptionText ?? '']
      .filter(Boolean)
      .join('; ') || undefined,
  }));

  const snapshot = {
    answers,
    editLog: input.editLog,
  };

  try {
    const row = await createTradeRequest({
      user_id: input.userId,
      userId: input.userId,
      device_brand: 'Apple',
      device_name: input.deviceLock.model,
      device_type: input.deviceType === 'ipad' ? 'tablet' : 'smartphone',
      storage_tier: input.deviceLock.storage,
      sim_variant: input.deviceLock.sim,
      your_color: input.deviceLock.color,
      target_color: input.targetLock.color ?? undefined,
      target_device: input.targetLock.cashOnly
        ? 'Cash trade-in'
        : input.targetLock.productName ?? undefined,
      target_product_id: input.targetLock.productId ?? undefined,
      target_variant_id: input.targetLock.variantId ?? undefined,
      pricing_mode: 'questionnaire_v2',
      base_trade_value: input.estimate.base_value,
      estimated_value: input.estimate.estimate,
      estimatedValue: input.estimate.estimate,
      deduction_breakdown: input.estimate.deductions.map((d) => ({
        key: d.component,
        label: d.component,
        amount: d.amount,
      })),
      answers_snapshot: snapshot,
      answers_edited: input.editLog.length > 0,
      needs_verification: input.estimate.needs_verification,
      needs_manual_review: false,
      imei_1: (input.imei1 ?? input.deviceLock.imei1 ?? '').trim() || undefined,
      imei_2: (input.imei2 ?? input.deviceLock.imei2 ?? '').trim() || undefined,
      serial_number:
        (input.serialNumber ?? input.deviceLock.serialNumber ?? '').trim() || undefined,
      imei_serial:
        input.imeiSerial.trim() ||
        (input.imei1 ?? input.deviceLock.imei1 ?? '').trim() ||
        (input.serialNumber ?? input.deviceLock.serialNumber ?? '').trim() ||
        (input.imei2 ?? input.deviceLock.imei2 ?? '').trim() ||
        undefined,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      contact_email: input.contactEmail || undefined,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      fulfillment_method: 'dropoff',
      terms_accepted_at: new Date().toISOString(),
      status: 'submitted',
      date: new Date().toISOString(),
    });

    return {
      id: row.id,
      // Prefer server TRD… code only — never invent a client reference
      displayId: row.display_id || '',
      expiresAt: row.expires_at ?? null,
      topUpAmount:
        row.top_up_amount != null ? Number(row.top_up_amount) : null,
      targetProductPrice:
        row.target_product_price != null
          ? Number(row.target_product_price)
          : null,
      estimatedValue: Number(row.estimated_value ?? row.estimatedValue) || 0,
      status: String(row.status),
    };
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'message' in err
      ? String((err as { message: string }).message)
      : String(err);
    // Unique active IMEI index → friendly copy
    if (/imei|serial|unique|duplicate|uq_trade_active/i.test(msg)) {
      const existing = await findActiveTradeByIdentity([
        input.imei1,
        input.imei2,
        input.serialNumber,
        input.imeiSerial,
        input.deviceLock.imei1,
        input.deviceLock.imei2,
        input.deviceLock.serialNumber,
      ]);
      const e = new Error(
        existing?.display_id
          ? `DUPLICATE_IMEI:${existing.display_id}`
          : 'DUPLICATE_IMEI',
      );
      (e as Error & { code: string }).code = 'DUPLICATE_IMEI';
      throw e;
    }
    throw err;
  }
}
