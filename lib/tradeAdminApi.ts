/**
 * Trade Admin data access — staff CRUD for the full trade lifecycle.
 *
 * Role in flow: powers /admin/trade (queue, pricing, thresholds, config,
 * questionnaire, aesthetics, audit). Customer quiz stays data-driven via
 * getTradeQuestions() — admin edits here appear without code deploys.
 *
 * WHY separate from lib/api.ts: keeps staff-only surface typed against
 * v_trade_requests_admin / trade_* tables without bloating the shared API.
 */
import { supabase } from './supabase';
import { mapTradeFromDb, updateTradeRequest } from './api';
import { invalidateTradePricing } from './tradePricingStore';
import { staffTradeError } from './tradeErrors';
import type { TradeInRequest } from '../types';
import type {
  AuditLogRow,
  Json,
  TradeAestheticOverrideRow,
  TradeAnswerOutcome,
  TradeAnswerRow,
  TradeBaseValueRow,
  TradeConfigRow,
  TradeDeviceType,
  TradeFaultDeductionRow,
  TradeQuestionRow,
  TradeQuestionWithAnswers,
  TradeRequestsAdminRow,
  TradeThresholdWorksheetRow,
} from '../types/supabase';

/** Queue row — view columns when present; else derived from trade_in_requests */
export type AdminTradeQueueItem = TradeInRequest & {
  resolved_name?: string | null;
  resolved_email?: string | null;
  resolved_phone?: string | null;
  imei_masked?: string | null;
  is_expired?: boolean | null;
  display_id?: string | null;
};

export interface AuditLogFilters {
  entity?: string;
  actor?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Surface PostgREST / constraint text; maps OOS / RLS via tradeErrors. */
export function tradeAdminErrorMessage(e: unknown): string {
  return staffTradeError(e);
}

function isMissingRelationError(message: string): boolean {
  return /relation|does not exist|Could not find the table|schema cache/i.test(message);
}

function enrichQueueItem(row: Record<string, unknown>): AdminTradeQueueItem {
  const mapped = mapTradeFromDb(row) as AdminTradeQueueItem;
  const expiresAt = row.expires_at ? String(row.expires_at) : mapped.expires_at;
  const status = String(row.status || '').toLowerCase();
  const activeStatuses = new Set([
    'submitted',
    'inspecting',
    'under_review',
    'offer_made',
    'awaiting_user',
  ]);
  const computedExpired =
    Boolean(expiresAt) &&
    new Date(expiresAt!).getTime() < Date.now() &&
    activeStatuses.has(status);

  return {
    ...mapped,
    display_id: (row.display_id as string | null | undefined) ?? mapped.display_id ?? null,
    resolved_name:
      (row.resolved_name as string | null | undefined) ??
      (row.contact_name as string | null | undefined) ??
      (row.user_name as string | null | undefined) ??
      mapped.userName ??
      null,
    resolved_email:
      (row.resolved_email as string | null | undefined) ??
      (row.contact_email as string | null | undefined) ??
      (row.user_email as string | null | undefined) ??
      mapped.userEmail ??
      null,
    resolved_phone:
      (row.resolved_phone as string | null | undefined) ??
      (row.contact_phone as string | null | undefined) ??
      mapped.contactPhone ??
      null,
    imei_masked:
      (row.imei_masked as string | null | undefined) ??
      (row.imei_serial
        ? `…${String(row.imei_serial).slice(-4)}`
        : null),
    is_expired:
      typeof row.is_expired === 'boolean' ? row.is_expired : computedExpired,
  };
}

/**
 * Staff queue from v_trade_requests_admin.
 * Falls back to trade_in_requests when the view is not yet migrated.
 */
export async function getAdminTradeQueue(): Promise<AdminTradeQueueItem[]> {
  const viewRes = await supabase
    .from('v_trade_requests_admin')
    .select('*')
    .order('created_at', { ascending: false });

  if (!viewRes.error) {
    return ((viewRes.data ?? []) as TradeRequestsAdminRow[]).map((r) =>
      enrichQueueItem(r as unknown as Record<string, unknown>),
    );
  }

  if (!isMissingRelationError(viewRes.error.message)) {
    throw viewRes.error;
  }

  // TODO(@dev): remove fallback once v_trade_requests_admin is on all envs
  const { data, error } = await supabase
    .from('trade_in_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => enrichQueueItem(r as Record<string, unknown>));
}

/** Single request — prefer admin view for resolved_* fields. */
export async function getAdminTradeRequest(id: string): Promise<AdminTradeQueueItem | null> {
  const key = String(id || '').trim();
  if (!key) return null;

  const tryView = async (column: 'id' | 'display_id') => {
    const { data, error } = await supabase
      .from('v_trade_requests_admin')
      .select('*')
      .eq(column, key)
      .maybeSingle();
    if (error) {
      if (isMissingRelationError(error.message)) return null;
      throw error;
    }
    return data ? enrichQueueItem(data as unknown as Record<string, unknown>) : null;
  };

  try {
    const byId = await tryView('id');
    if (byId) return byId;
    const byDisplay = await tryView('display_id');
    if (byDisplay) return byDisplay;
  } catch (e) {
    const msg = tradeAdminErrorMessage(e);
    if (!isMissingRelationError(msg)) throw e;
  }

  const byId = await supabase.from('trade_in_requests').select('*').eq('id', key).maybeSingle();
  if (byId.error) throw byId.error;
  if (byId.data) return enrichQueueItem(byId.data as Record<string, unknown>);

  const byDisplay = await supabase
    .from('trade_in_requests')
    .select('*')
    .eq('display_id', key)
    .maybeSingle();
  if (byDisplay.error) throw byDisplay.error;
  return byDisplay.data
    ? enrichQueueItem(byDisplay.data as Record<string, unknown>)
    : null;
}

/** Patch request via shared updateTradeRequest (preserves offer / stock guards). */
export async function updateAdminTradeRequest(
  id: string,
  updates: Partial<TradeInRequest> & Record<string, unknown>,
): Promise<AdminTradeQueueItem> {
  try {
    const updated = await updateTradeRequest(id, updates);
    const fresh = await getAdminTradeRequest(id);
    return fresh ?? (updated as AdminTradeQueueItem);
  } catch (e) {
    // WHY: DB check "offer requires value" must reach staff verbatim
    throw new Error(tradeAdminErrorMessage(e));
  }
}

// ─── Base values ───────────────────────────────────────────────────────────

export async function getAdminBaseValues(includeInactive = true): Promise<TradeBaseValueRow[]> {
  let q = supabase.from('trade_base_values').select('*').order('model').order('storage');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TradeBaseValueRow[];
}

export async function updateBaseValue(
  id: string,
  patch: {
    base_value?: number;
    is_active?: boolean;
    sim_variant?: string;
    storage?: string;
    model?: string;
  },
): Promise<TradeBaseValueRow> {
  const { data, error } = await supabase
    .from('trade_base_values')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await invalidateTradePricing();
  return data as TradeBaseValueRow;
}

/**
 * Insert a new model × storage × SIM base row (staff can add Physical / eSIM without SQL).
 * WHY: iPhone 14+ prices differ by sim_variant — missing rows block exact resolution.
 */
export async function createBaseValue(input: {
  model: string;
  storage: string;
  sim_variant: string;
  base_value: number;
  is_active?: boolean;
}): Promise<TradeBaseValueRow> {
  const payload = {
    model: input.model.trim(),
    storage: input.storage.trim(),
    sim_variant: input.sim_variant.trim().toLowerCase(),
    base_value: Number(input.base_value),
    is_active: input.is_active !== false,
  };
  const { data, error } = await supabase
    .from('trade_base_values')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  await invalidateTradePricing();
  return data as TradeBaseValueRow;
}

/** Clone an existing base row onto another SIM (e.g. ps → es) with optional new value. */
export async function cloneBaseValueForSim(
  sourceId: string,
  simVariant: string,
  baseValue?: number,
): Promise<TradeBaseValueRow> {
  const { data: src, error: fetchErr } = await supabase
    .from('trade_base_values')
    .select('*')
    .eq('id', sourceId)
    .single();
  if (fetchErr) throw fetchErr;
  const row = src as TradeBaseValueRow;
  return createBaseValue({
    model: row.model,
    storage: row.storage,
    sim_variant: simVariant,
    base_value: baseValue != null && Number.isFinite(baseValue) ? baseValue : Number(row.base_value),
    is_active: row.is_active,
  });
}

// ─── Fault deductions ──────────────────────────────────────────────────────

export async function getAdminDeductions(includeInactive = true): Promise<TradeFaultDeductionRow[]> {
  let q = supabase.from('trade_fault_deductions').select('*').order('model').order('fault_code');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TradeFaultDeductionRow[];
}

export async function updateDeduction(
  id: string,
  patch: { deduction?: number; is_active?: boolean; fault_label?: string },
): Promise<TradeFaultDeductionRow> {
  const { data, error } = await supabase
    .from('trade_fault_deductions')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await invalidateTradePricing();
  return data as TradeFaultDeductionRow;
}

/** Insert a fault deduction row for a model (all 7 codes typically seeded; this fills gaps). */
export async function createDeduction(input: {
  model: string;
  fault_code: string;
  fault_label: string;
  deduction: number;
  is_active?: boolean;
}): Promise<TradeFaultDeductionRow> {
  const payload = {
    model: input.model.trim(),
    fault_code: input.fault_code.trim().toLowerCase(),
    fault_label: input.fault_label.trim(),
    deduction: Number(input.deduction),
    is_active: input.is_active !== false,
  };
  const { data, error } = await supabase
    .from('trade_fault_deductions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  await invalidateTradePricing();
  return data as TradeFaultDeductionRow;
}

/** Current stock for a product_variants row (staff verify decrement on complete). */
export async function getVariantStock(variantId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('stock')
    .eq('id', variantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const n = Number((data as { stock?: number }).stock);
  return Number.isFinite(n) ? n : null;
}

/** Inventory adjustment rows logged when a trade completes (Part 3 §3 intake). */
export async function getTradeIntakeAdjustments(
  tradeRequestId: string,
): Promise<
  Array<{
    id: string;
    product_id: string | null;
    adjustment_type?: string | null;
    quantity_change?: number | null;
    reason?: string | null;
    created_at?: string | null;
  }>
> {
  const { data, error } = await supabase
    .from('inventory_adjustments')
    .select('id, product_id, adjustment_type, quantity_change, reason, created_at')
    .eq('trade_request_id', tradeRequestId)
    .order('created_at', { ascending: false });
  if (error) {
    // Column may be missing on older envs — surface empty, not a hard fail
    if (/column|does not exist|schema cache/i.test(error.message)) return [];
    throw error;
  }
  return (data ?? []) as Array<{
    id: string;
    product_id: string | null;
    adjustment_type?: string | null;
    quantity_change?: number | null;
    reason?: string | null;
    created_at?: string | null;
  }>;
}

// ─── Thresholds ────────────────────────────────────────────────────────────

export async function getThresholdWorksheet(): Promise<TradeThresholdWorksheetRow[]> {
  const { data, error } = await supabase.from('v_trade_threshold_worksheet').select('*');
  if (!error) return (data ?? []) as TradeThresholdWorksheetRow[];

  if (!isMissingRelationError(error.message)) throw error;

  // TODO(@dev): remove once v_trade_threshold_worksheet is on all envs
  const { data: devices, error: dErr } = await supabase
    .from('trade_devices')
    .select('model, device_type, threshold_value, sort_order')
    .eq('is_active', true)
    .order('sort_order');
  if (dErr) throw dErr;

  const { data: bases, error: bErr } = await supabase
    .from('trade_base_values')
    .select('model, base_value')
    .eq('is_active', true);
  if (bErr) throw bErr;

  const range = new Map<string, { min: number; max: number }>();
  for (const b of bases ?? []) {
    const cur = range.get(b.model);
    const v = Number(b.base_value);
    if (!cur) range.set(b.model, { min: v, max: v });
    else {
      cur.min = Math.min(cur.min, v);
      cur.max = Math.max(cur.max, v);
    }
  }

  return (devices ?? []).map((d) => {
    const r = range.get(d.model);
    return {
      model: d.model,
      device_type: d.device_type as TradeDeviceType,
      lowest_base: r?.min ?? null,
      highest_base: r?.max ?? null,
      current_threshold: d.threshold_value as number | null,
      status: d.threshold_value == null ? 'NEEDS CLIENT VALUE' : 'set',
    };
  });
}

export async function updateDeviceThreshold(
  model: string,
  thresholdValue: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('trade_devices')
    .update({ threshold_value: thresholdValue })
    .eq('model', model);
  if (error) throw error;
}

// ─── Config ────────────────────────────────────────────────────────────────

export async function getAdminTradeConfig(): Promise<TradeConfigRow[]> {
  const { data, error } = await supabase.from('trade_config').select('*').order('key');
  if (error) throw error;
  return (data ?? []) as TradeConfigRow[];
}

export async function updateTradeConfigValue(
  key: string,
  value: string,
): Promise<TradeConfigRow> {
  const { data, error } = await supabase
    .from('trade_config')
    .update({ value })
    .eq('key', key)
    .select()
    .single();
  if (error) throw error;
  // Config feeds compute_trade_estimate — pricing cache TTL still applies to bases;
  // dispatch pricing event so any UI listening refreshes.
  await invalidateTradePricing();
  return data as TradeConfigRow;
}

// ─── Questionnaire ─────────────────────────────────────────────────────────

/** All questions (incl. inactive) for a device type — admin editor. */
export async function getAdminQuestions(
  deviceType: TradeDeviceType,
): Promise<TradeQuestionWithAnswers[]> {
  const { data: questions, error: qErr } = await supabase
    .from('trade_questions')
    .select('*')
    .eq('device_type', deviceType)
    .order('display_order', { ascending: true });
  if (qErr) throw qErr;
  if (!questions?.length) return [];

  const ids = questions.map((q) => q.id);
  const { data: answers, error: aErr } = await supabase
    .from('trade_answers')
    .select('*')
    .in('question_id', ids)
    .order('display_order', { ascending: true });
  if (aErr) throw aErr;

  const byQ = new Map<string, TradeAnswerRow[]>();
  for (const a of (answers ?? []) as TradeAnswerRow[]) {
    const list = byQ.get(a.question_id) ?? [];
    list.push(a);
    byQ.set(a.question_id, list);
  }

  return (questions as TradeQuestionRow[]).map((q) => ({
    ...q,
    answers: byQ.get(q.id) ?? [],
  }));
}

export async function upsertQuestion(
  input: Partial<TradeQuestionRow> & {
    device_type: TradeDeviceType;
    code: string;
    question_text: string;
  },
): Promise<TradeQuestionRow> {
  if (input.id) {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from('trade_questions')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TradeQuestionRow;
  }
  const { data, error } = await supabase
    .from('trade_questions')
    .insert({
      device_type: input.device_type,
      code: input.code,
      question_text: input.question_text,
      help_text: input.help_text ?? null,
      component: input.component ?? null,
      is_gate: input.is_gate ?? false,
      display_order: input.display_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TradeQuestionRow;
}

/**
 * Soft-deactivate a question. Prefer this over hard delete when answers may
 * appear in historical answers_snapshot JSON.
 */
export async function deactivateQuestion(id: string): Promise<TradeQuestionRow> {
  const { data, error } = await supabase
    .from('trade_questions')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as TradeQuestionRow;
}

/** Hard-delete only when no answers exist (or after explicit confirm + no snapshot refs). */
export async function deleteQuestionIfSafe(id: string): Promise<'deleted' | 'deactivated'> {
  const { count, error: cErr } = await supabase
    .from('trade_answers')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', id);
  if (cErr) throw cErr;

  if ((count ?? 0) > 0) {
    await deactivateQuestion(id);
    return 'deactivated';
  }

  const { error } = await supabase.from('trade_questions').delete().eq('id', id);
  if (error) {
    // Snapshots or FK — degrade to deactivate
    await deactivateQuestion(id);
    return 'deactivated';
  }
  return 'deleted';
}

export async function reorderQuestions(
  orderedIds: string[],
): Promise<void> {
  // Sequential updates — no drag library; up/down buttons pass new order
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('trade_questions')
      .update({ display_order: i + 1 })
      .eq('id', orderedIds[i]);
    if (error) throw error;
  }
}

export async function upsertAnswer(
  input: Partial<TradeAnswerRow> & {
    question_id: string;
    answer_text: string;
    outcome: TradeAnswerOutcome;
  },
): Promise<TradeAnswerRow> {
  if (input.id) {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from('trade_answers')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TradeAnswerRow;
  }
  const { data, error } = await supabase
    .from('trade_answers')
    .insert({
      question_id: input.question_id,
      answer_text: input.answer_text,
      outcome: input.outcome,
      flag_verify: input.flag_verify ?? false,
      requires_description: input.requires_description ?? false,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TradeAnswerRow;
}

export async function deleteAnswer(id: string): Promise<void> {
  const { error } = await supabase.from('trade_answers').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderAnswers(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('trade_answers')
      .update({ display_order: i + 1 })
      .eq('id', orderedIds[i]);
    if (error) throw error;
  }
}

// ─── Aesthetics ────────────────────────────────────────────────────────────

export async function getAestheticOverrides(): Promise<TradeAestheticOverrideRow[]> {
  const { data, error } = await supabase
    .from('trade_aesthetic_overrides')
    .select('*')
    .order('model');
  if (error) throw error;
  return (data ?? []) as TradeAestheticOverrideRow[];
}

export async function upsertAestheticOverride(
  model: string,
  grade: 'a1' | 'a2',
  amount: number,
): Promise<TradeAestheticOverrideRow> {
  const { data, error } = await supabase
    .from('trade_aesthetic_overrides')
    .upsert(
      { model, grade, amount, updated_at: new Date().toISOString() },
      { onConflict: 'model,grade' },
    )
    .select()
    .single();
  if (error) throw error;
  await invalidateTradePricing();
  return data as TradeAestheticOverrideRow;
}

export async function deleteAestheticOverride(
  model: string,
  grade: 'a1' | 'a2',
): Promise<void> {
  const { error } = await supabase
    .from('trade_aesthetic_overrides')
    .delete()
    .eq('model', model)
    .eq('grade', grade);
  if (error) throw error;
  await invalidateTradePricing();
}

// ─── Audit ─────────────────────────────────────────────────────────────────

export async function getAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogRow[]> {
  let q = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.entity) q = q.eq('entity', filters.entity);
  if (filters.actor) q = q.eq('actor_id', filters.actor);
  if (filters.from) q = q.gte('created_at', filters.from);
  if (filters.to) q = q.lte('created_at', filters.to);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AuditLogRow[];
}

/** Snapshot answer entry shape written by submitTradeRequest */
export interface SnapshotAnswerEntry {
  code?: string;
  answerId?: string;
  description?: string;
}

export interface SnapshotEditEntry {
  code?: string;
  old?: string | null;
  new?: string;
  at?: string;
}

export function parseAnswersSnapshot(raw: unknown): {
  answers: SnapshotAnswerEntry[];
  editLog: SnapshotEditEntry[];
} {
  if (!raw || typeof raw !== 'object') return { answers: [], editLog: [] };
  const obj = raw as { answers?: unknown; editLog?: unknown };
  const answers = Array.isArray(obj.answers) ? (obj.answers as SnapshotAnswerEntry[]) : [];
  const editLog = Array.isArray(obj.editLog) ? (obj.editLog as SnapshotEditEntry[]) : [];
  return { answers, editLog };
}

/**
 * Resolve answer texts for a snapshot against live trade_answers + questions.
 * Missing rows (deleted answers) still show the raw answerId.
 */
export async function resolveSnapshotQa(
  snapshot: unknown,
): Promise<
  Array<{
    code: string;
    questionText: string;
    answerId: string;
    answerText: string;
    description?: string;
    flagVerify: boolean;
    outcome: string | null;
  }>
> {
  const { answers } = parseAnswersSnapshot(snapshot);
  if (answers.length === 0) return [];

  const ids = answers.map((a) => a.answerId).filter(Boolean) as string[];
  const { data, error } = await supabase
    .from('trade_answers')
    .select('id, answer_text, flag_verify, outcome, question_id')
    .in('id', ids);
  if (error) throw error;

  const answerRows = (data ?? []) as Array<{
    id: string;
    answer_text: string;
    flag_verify: boolean;
    outcome: string;
    question_id: string;
  }>;

  const qIds = [...new Set(answerRows.map((r) => r.question_id).filter(Boolean))];
  const qMap = new Map<string, { code: string; question_text: string }>();
  if (qIds.length > 0) {
    const { data: qs, error: qErr } = await supabase
      .from('trade_questions')
      .select('id, code, question_text')
      .in('id', qIds);
    if (!qErr) {
      for (const q of (qs ?? []) as Array<{ id: string; code: string; question_text: string }>) {
        qMap.set(q.id, { code: q.code, question_text: q.question_text });
      }
    }
  }

  // Fallback: match by snapshot code when answer row is gone
  const codes = answers.map((a) => a.code).filter(Boolean) as string[];
  if (codes.length > 0) {
    const { data: byCode } = await supabase
      .from('trade_questions')
      .select('code, question_text')
      .in('code', codes);
    for (const q of (byCode ?? []) as Array<{ code: string; question_text: string }>) {
      if (![...qMap.values()].some((v) => v.code === q.code)) {
        qMap.set(`code:${q.code}`, q);
      }
    }
  }

  const map = new Map(answerRows.map((r) => [r.id, r]));

  return answers.map((a) => {
    const hit = a.answerId ? map.get(a.answerId) : undefined;
    const fromQ = hit?.question_id ? qMap.get(hit.question_id) : undefined;
    const byCode = a.code ? [...qMap.values()].find((v) => v.code === a.code) : undefined;
    const qMeta = fromQ ?? byCode;
    return {
      code: qMeta?.code || a.code || '—',
      questionText: qMeta?.question_text || a.code || '—',
      answerId: a.answerId || '',
      answerText: hit?.answer_text ?? (a.answerId ? `(id ${a.answerId.slice(0, 8)}…)` : '—'),
      description: a.description,
      flagVerify: Boolean(hit?.flag_verify),
      outcome: hit?.outcome ?? null,
    };
  });
}

/** Shallow JSON key diff for audit viewer */
export function diffJson(
  oldData: Json | null | undefined,
  newData: Json | null | undefined,
): Array<{ key: string; from: string; to: string }> {
  const a =
    oldData && typeof oldData === 'object' && !Array.isArray(oldData)
      ? (oldData as Record<string, Json | undefined>)
      : {};
  const b =
    newData && typeof newData === 'object' && !Array.isArray(newData)
      ? (newData as Record<string, Json | undefined>)
      : {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Array<{ key: string; from: string; to: string }> = [];
  for (const k of keys) {
    const from = JSON.stringify(a[k] ?? null);
    const to = JSON.stringify(b[k] ?? null);
    if (from !== to) out.push({ key: k, from, to });
  }
  return out;
}
