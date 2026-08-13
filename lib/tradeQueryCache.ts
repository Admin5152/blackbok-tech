/**
 * Short-TTL caches for trade-in questionnaire, config, pricing rows, and
 * upgrade targets. Complements tradeCatalogCache (device grids).
 */
import { supabase } from './supabase';
import type {
  TradeBaseValueRow,
  TradeConfigRow,
  TradeDeviceRow,
  TradeDeviceType,
  TradeQuestionWithAnswers,
  TradeTargetRow,
} from '../types/supabase';

const TTL_MS = 5 * 60_000;
const TRADE_TARGET_PAGE = 1000;

type Timed<T> = { value: T; at: number };

const questionsCache = new Map<TradeDeviceType, Timed<TradeQuestionWithAnswers[]>>();
const questionsInflight = new Map<TradeDeviceType, Promise<TradeQuestionWithAnswers[]>>();

const baseValuesCache = new Map<string, Timed<TradeBaseValueRow[]>>();
const baseValuesInflight = new Map<string, Promise<TradeBaseValueRow[]>>();

const deviceByModelCache = new Map<string, Timed<TradeDeviceRow | null>>();
const deviceInflight = new Map<string, Promise<TradeDeviceRow | null>>();

let configCache: Timed<Map<string, string>> | null = null;
let configInflight: Promise<Map<string, string>> | null = null;

const targetsCache = new Map<string, Timed<TradeTargetRow[]>>();
const targetsInflight = new Map<string, Promise<TradeTargetRow[]>>();

function fresh<T>(entry: Timed<T> | null | undefined): entry is Timed<T> {
  return Boolean(entry && Date.now() - entry.at < TTL_MS);
}

function sortAnswersYesFirst(
  answers: TradeQuestionWithAnswers['answers'],
): TradeQuestionWithAnswers['answers'] {
  const rank = (text: string) => {
    const n = text.trim().toLowerCase();
    if (n === 'yes' || n.startsWith('yes ') || n.startsWith('yes,')) return 0;
    if (n === 'no' || n.startsWith('no ') || n.startsWith('no,')) return 1;
    return 2;
  };
  return [...answers].sort((a, b) => {
    const ra = rank(a.answer_text);
    const rb = rank(b.answer_text);
    if (ra !== rb) return ra - rb;
    return a.display_order - b.display_order;
  });
}

export async function getTradeQuestionsCached(
  deviceType: TradeDeviceType,
): Promise<TradeQuestionWithAnswers[]> {
  const hit = questionsCache.get(deviceType);
  if (fresh(hit)) return hit.value;
  const pending = questionsInflight.get(deviceType);
  if (pending) return pending;

  const load = (async () => {
    const { data: questions, error: qErr } = await supabase
      .from('trade_questions')
      .select('*')
      .eq('device_type', deviceType)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (qErr) throw qErr;
    if (!questions?.length) {
      questionsCache.set(deviceType, { value: [], at: Date.now() });
      return [];
    }
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
    const value = questions.map((q) => ({
      ...q,
      answers: sortAnswersYesFirst(byQuestion.get(q.id) ?? []),
    })) as TradeQuestionWithAnswers[];
    questionsCache.set(deviceType, { value, at: Date.now() });
    return value;
  })();

  questionsInflight.set(deviceType, load);
  try {
    return await load;
  } finally {
    questionsInflight.delete(deviceType);
  }
}

export async function getTradeConfigCached(): Promise<Map<string, string>> {
  if (fresh(configCache)) return configCache.value;
  if (configInflight) return configInflight;

  configInflight = (async () => {
    const { data, error } = await supabase.from('trade_config').select('*');
    if (error) throw error;
    const map = new Map<string, string>();
    for (const row of (data ?? []) as TradeConfigRow[]) {
      map.set(row.key, row.value);
    }
    configCache = { value: map, at: Date.now() };
    return map;
  })();

  try {
    return await configInflight;
  } finally {
    configInflight = null;
  }
}

export async function getTradeBaseValuesForModelCached(
  model: string,
): Promise<TradeBaseValueRow[]> {
  const key = model.trim();
  const hit = baseValuesCache.get(key);
  if (fresh(hit)) return hit.value;
  const pending = baseValuesInflight.get(key);
  if (pending) return pending;

  const load = (async () => {
    const { data, error } = await supabase
      .from('trade_base_values')
      .select('*')
      .eq('model', key)
      .eq('is_active', true);
    if (error) throw error;
    const value = (data ?? []) as TradeBaseValueRow[];
    baseValuesCache.set(key, { value, at: Date.now() });
    return value;
  })();

  baseValuesInflight.set(key, load);
  try {
    return await load;
  } finally {
    baseValuesInflight.delete(key);
  }
}

export async function getTradeDeviceCached(model: string): Promise<TradeDeviceRow | null> {
  const key = model.trim();
  const hit = deviceByModelCache.get(key);
  if (fresh(hit)) return hit.value;
  const pending = deviceInflight.get(key);
  if (pending) return pending;

  const load = (async () => {
    const { data, error } = await supabase
      .from('trade_devices')
      .select('*')
      .eq('model', key)
      .maybeSingle();
    if (error) throw error;
    const value = (data as TradeDeviceRow | null) ?? null;
    deviceByModelCache.set(key, { value, at: Date.now() });
    return value;
  })();

  deviceInflight.set(key, load);
  try {
    return await load;
  } finally {
    deviceInflight.delete(key);
  }
}

function targetsCacheKey(filters?: {
  tradeModel?: string;
  category?: string;
  inStockOnly?: boolean;
}): string {
  const inStockOnly = filters?.inStockOnly !== false;
  return [
    filters?.tradeModel ?? '',
    filters?.category ?? '',
    inStockOnly ? '1' : '0',
  ].join('|');
}

async function fetchTradeTargetsPage(filters?: {
  tradeModel?: string;
  category?: string;
  inStockOnly?: boolean;
}): Promise<TradeTargetRow[]> {
  const inStockOnly = filters?.inStockOnly !== false;
  const rows: TradeTargetRow[] = [];
  let from = 0;
  for (;;) {
    let query = supabase
      .from('v_trade_targets')
      .select('*')
      .not('trade_model', 'is', null)
      .neq('trade_model', '');
    if (filters?.tradeModel) query = query.eq('trade_model', filters.tradeModel);
    if (filters?.category) query = query.eq('category', filters.category);
    if (inStockOnly) query = query.gt('variant_stock', 0);

    const { data, error } = await query
      .order('name')
      .order('product_id')
      .range(from, from + TRADE_TARGET_PAGE - 1);
    if (error) throw error;

    const batch = (data ?? []) as TradeTargetRow[];
    rows.push(...batch);
    if (batch.length < TRADE_TARGET_PAGE) break;
    from += TRADE_TARGET_PAGE;
  }
  return rows;
}

export async function getTradeTargetsCached(filters?: {
  tradeModel?: string;
  category?: string;
  inStockOnly?: boolean;
}): Promise<TradeTargetRow[]> {
  const key = targetsCacheKey(filters);
  const hit = targetsCache.get(key);
  if (fresh(hit)) return hit.value;
  const pending = targetsInflight.get(key);
  if (pending) return pending;

  const load = (async () => {
    const value = await fetchTradeTargetsPage(filters);
    targetsCache.set(key, { value, at: Date.now() });
    return value;
  })();

  targetsInflight.set(key, load);
  try {
    return await load;
  } finally {
    targetsInflight.delete(key);
  }
}

/** Warm questionnaire + upgrade list while customer is mid-flow. */
export function prefetchTradeSessionCaches(deviceType?: TradeDeviceType | null): void {
  if (deviceType === 'iphone' || deviceType === 'ipad') {
    void getTradeQuestionsCached(deviceType).catch(() => undefined);
  } else {
    void getTradeQuestionsCached('iphone').catch(() => undefined);
    void getTradeQuestionsCached('ipad').catch(() => undefined);
  }
  void getTradeConfigCached().catch(() => undefined);
  void getTradeTargetsCached({ inStockOnly: true }).catch(() => undefined);
}

export function prefetchTradeBaseValues(model: string | null | undefined): void {
  const m = String(model ?? '').trim();
  if (!m) return;
  void getTradeBaseValuesForModelCached(m).catch(() => undefined);
  void getTradeDeviceCached(m).catch(() => undefined);
}

export function invalidateTradeQueryCache(): void {
  questionsCache.clear();
  questionsInflight.clear();
  baseValuesCache.clear();
  baseValuesInflight.clear();
  deviceByModelCache.clear();
  deviceInflight.clear();
  configCache = null;
  configInflight = null;
  targetsCache.clear();
  targetsInflight.clear();
}
