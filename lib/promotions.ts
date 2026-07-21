/**
 * Promotions client layer — types, RPC wrappers, TanStack Query hooks.
 *
 * Money: integer pesewas everywhere until formatGHS at the UI edge.
 * Discount math: never computed here — only promo_quote / promo_reserve.
 * Denominations: always read from promo_denominations (no hardcoded ladder).
 * Usage limits: always from promo_preset_limits (no local preset→counters map).
 *
 * Repo path is lib/promotions.ts (BlackBox has no src/ tree). Import as
 * `@/lib/promotions` or `../lib/promotions`.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Currency display (edge only)
// ---------------------------------------------------------------------------

/** GHS 1.00 = 100 pesewas. Display conversion only — never for discount math. */
export const PESEWAS_PER_CEDI = 100;

const ghsFormatter = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format integer pesewas as Ghana Cedis for display.
 * Never show raw pesewas to a user.
 */
export function formatGHS(pesewas: number): string {
  if (!Number.isFinite(pesewas)) return ghsFormatter.format(0);
  return ghsFormatter.format(Math.round(pesewas) / PESEWAS_PER_CEDI);
}

/** Convert a GHS decimal the user typed into integer pesewas (input edge only). */
export function ghsToPesewas(ghs: number): number {
  if (!Number.isFinite(ghs)) return 0;
  return Math.round(ghs * PESEWAS_PER_CEDI);
}

/** Convert integer pesewas to a GHS number for controlled inputs (display edge only). */
export function pesewasToGhs(pesewas: number): number {
  if (!Number.isFinite(pesewas)) return 0;
  return Math.round(pesewas) / PESEWAS_PER_CEDI;
}

// ---------------------------------------------------------------------------
// Enums / row types (mirror DB; no numeric magic)
// ---------------------------------------------------------------------------

export type PromoDiscountType = 'percentage' | 'fixed';
export type PromoStatus = 'draft' | 'active' | 'paused' | 'expired' | 'archived';
export type PromoScopeType = 'global' | 'campus';
export type PromoTriggerType = 'code' | 'automatic';
export type PromoAppliesTo =
  | 'order'
  | 'category'
  | 'product'
  | 'delivery'
  | 'repair'
  | 'tradein_topup';
export type PromoRedemptionStatus = 'reserved' | 'applied' | 'reversed';
export type PromoUsagePreset =
  | 'single'
  | 'personal'
  | 'public_once'
  | 'public_open'
  | 'batch'
  | 'first_n'
  | 'custom';

export type PromoLineKind =
  | 'product'
  | 'delivery'
  | 'repair'
  | 'tradein_topup';

/** Cart / order line shape accepted by promo_quote / promo_evaluate. */
export interface PromoQuoteItem {
  kind: PromoLineKind;
  product_id?: string | null;
  category_id?: string | null;
  unit_price_pesewas: number;
  qty: number;
}

export interface PromoDenomination {
  id: string;
  kind: PromoDiscountType;
  value_pesewas: number | null;
  percent: number | null;
  label: string;
  sort_order: number;
  recommended_min_order_pesewas: number;
  recommended_max_discount_pesewas: number | null;
  is_active: boolean;
  is_default: boolean;
  is_preset: boolean;
  created_at: string;
}

export interface PromoSettings {
  id: boolean;
  fixed_min_order_multiple: number;
  require_percentage_cap: boolean;
  liability_review_pesewas: number;
  updated_at: string;
}

export interface Campus {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  name: string;
  internal_note: string | null;
  description: string | null;
  trigger_type: PromoTriggerType;
  discount_type: PromoDiscountType;
  percent_off: number | null;
  amount_off_pesewas: number | null;
  max_discount_pesewas: number | null;
  min_order_pesewas: number;
  applies_to: PromoAppliesTo;
  target_ids: string[];
  scope_type: PromoScopeType;
  priority: number;
  stackable: boolean;
  starts_at: string;
  ends_at: string | null;
  max_redemptions: number | null;
  max_redemptions_per_user: number | null;
  times_redeemed: number;
  status: PromoStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  denomination_id: string | null;
  bypass_denomination: boolean;
  bypass_reason: string | null;
  usage_preset: PromoUsagePreset;
  published_by: string | null;
  published_at: string | null;
}

export interface PromotionCode {
  id: string;
  promotion_id: string;
  code: string;
  max_redemptions: number | null;
  times_redeemed: number;
  is_active: boolean;
  assigned_user_id: string | null;
  expires_at: string | null;
  batch_label: string | null;
  created_at: string;
}

export interface PromotionCampus {
  promotion_id: string;
  campus_id: string;
}

export interface PromotionRedemption {
  id: string;
  promotion_id: string;
  code_id: string | null;
  order_id: string;
  user_id: string | null;
  guest_phone: string | null;
  amount_discounted_pesewas: number;
  eligible_subtotal_pesewas: number;
  status: PromoRedemptionStatus;
  reserved_at: string;
  applied_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

export interface PromoSpendRow {
  promotion_id: string;
  name: string;
  status: PromoStatus;
  times_redeemed: number;
  max_redemptions: number | null;
  spent_pesewas: number;
  applied_count: number;
  reserved_count: number;
  max_liability_pesewas: number | null;
}

/** Soft-failure / success payload from promo_evaluate (and nested in quote/reserve). */
export interface PromoEvaluateResult {
  ok: boolean;
  reason: string;
  message: string;
  promotion_id?: string;
  code_id?: string | null;
  name?: string;
  description?: string | null;
  discount_type?: PromoDiscountType;
  priority?: number;
  discount_pesewas?: number;
  eligible_subtotal_pesewas?: number;
  min_order_pesewas?: number;
}

export interface PromoQuoteResult {
  applied: PromoEvaluateResult | null;
  code_result: PromoEvaluateResult | null;
  discount_pesewas: number;
}

export interface PromoReserveResult {
  ok: boolean;
  reason: string;
  message: string;
  promotion_id?: string;
  code_id?: string | null;
  discount_pesewas?: number;
  name?: string;
}

/** Counters returned by promo_preset_limits — never invent these in TS. */
export interface PromoPresetLimits {
  code_max: number | null;
  promo_max: number | null;
  per_user: number | null;
  codes: number;
}

export interface PromoCreateBatchArgs {
  name: string;
  usage_preset: PromoUsagePreset;
  count: number;
  denomination_id?: string | null;
  discount_type?: PromoDiscountType | null;
  amount_off_pesewas?: number | null;
  percent_off?: number | null;
  max_discount_pesewas?: number | null;
  min_order_pesewas?: number | null;
  applies_to?: PromoAppliesTo;
  target_ids?: string[];
  campus_ids?: string[];
  prefix?: string;
  starts_at?: string;
  ends_at?: string | null;
  assigned_user_id?: string | null;
  code_expires_at?: string | null;
  bypass_reason?: string | null;
}

export interface PromoCreateBatchResult {
  promotion_id: string;
  label: string;
  status: 'draft';
  count: number;
  codes: string[];
}

export interface PromoPublishResult {
  ok: boolean;
  promotion_id: string;
  max_liability_pesewas: number | null;
}

export interface PromoGenerateCodesArgs {
  promotion_id: string;
  count: number;
  prefix?: string;
  max_redemptions?: number | null;
  batch_label?: string | null;
  assigned_user_id?: string | null;
  expires_at?: string | null;
}

export interface PromoSetCodesExpiryArgs {
  promotion_id: string;
  code_ids?: string[];
  expires_at: string | null;
}

export interface PromoQuoteArgs {
  items: PromoQuoteItem[];
  code?: string | null;
  campus_id?: string | null;
  guest_phone?: string | null;
}

export interface PromoReserveArgs {
  order_id: string;
  code?: string | null;
  guest_phone?: string | null;
}

// ---------------------------------------------------------------------------
// Parsing helpers (no `any`)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function requireString(value: unknown, field: string): string {
  const s = asString(value);
  if (s === null) throw new Error(`Expected string for ${field}`);
  return s;
}

function requireNumber(value: unknown, field: string): number {
  const n = asNumber(value);
  if (n === null) throw new Error(`Expected number for ${field}`);
  return n;
}

function throwOnError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function parseEvaluateResult(value: unknown): PromoEvaluateResult | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error('Invalid promo evaluate payload');
  const ok = asBoolean(value.ok);
  const reason = asString(value.reason);
  const message = asString(value.message);
  if (ok === null || reason === null || message === null) {
    throw new Error('Invalid promo evaluate payload');
  }
  return {
    ok,
    reason,
    message,
    promotion_id: asString(value.promotion_id) ?? undefined,
    code_id: value.code_id === null ? null : asString(value.code_id) ?? undefined,
    name: asString(value.name) ?? undefined,
    description:
      value.description === null ? null : asString(value.description) ?? undefined,
    discount_type: asString(value.discount_type) as PromoDiscountType | undefined,
    priority: asNumber(value.priority) ?? undefined,
    discount_pesewas: asNumber(value.discount_pesewas) ?? undefined,
    eligible_subtotal_pesewas: asNumber(value.eligible_subtotal_pesewas) ?? undefined,
    min_order_pesewas: asNumber(value.min_order_pesewas) ?? undefined,
  };
}

function parseQuoteResult(value: unknown): PromoQuoteResult {
  if (!isRecord(value)) throw new Error('Invalid promo_quote payload');
  return {
    applied: parseEvaluateResult(value.applied),
    code_result: parseEvaluateResult(value.code_result),
    discount_pesewas: requireNumber(value.discount_pesewas, 'discount_pesewas'),
  };
}

function parseReserveResult(value: unknown): PromoReserveResult {
  if (!isRecord(value)) throw new Error('Invalid promo_reserve payload');
  return {
    ok: asBoolean(value.ok) === true,
    reason: requireString(value.reason, 'reason'),
    message: requireString(value.message, 'message'),
    promotion_id: asString(value.promotion_id) ?? undefined,
    code_id: value.code_id === null ? null : asString(value.code_id) ?? undefined,
    discount_pesewas: asNumber(value.discount_pesewas) ?? undefined,
    name: asString(value.name) ?? undefined,
  };
}

function parsePresetLimits(value: unknown): PromoPresetLimits {
  if (!isRecord(value)) throw new Error('Invalid promo_preset_limits payload');
  const codeMax = value.code_max;
  const promoMax = value.promo_max;
  const perUser = value.per_user;
  return {
    code_max: codeMax === null ? null : requireNumber(codeMax, 'code_max'),
    promo_max: promoMax === null ? null : requireNumber(promoMax, 'promo_max'),
    per_user: perUser === null ? null : requireNumber(perUser, 'per_user'),
    codes: requireNumber(value.codes, 'codes'),
  };
}

function parseCreateBatchResult(value: unknown): PromoCreateBatchResult {
  if (!isRecord(value)) throw new Error('Invalid promo_create_batch payload');
  const codesRaw = value.codes;
  const codes = Array.isArray(codesRaw)
    ? codesRaw.filter((c): c is string => typeof c === 'string')
    : [];
  const status = asString(value.status);
  if (status !== 'draft') throw new Error('promo_create_batch must return draft');
  return {
    promotion_id: requireString(value.promotion_id, 'promotion_id'),
    label: requireString(value.label, 'label'),
    status: 'draft',
    count: requireNumber(value.count, 'count'),
    codes,
  };
}

function parsePublishResult(value: unknown): PromoPublishResult {
  if (!isRecord(value)) throw new Error('Invalid promo_publish payload');
  const liab = value.max_liability_pesewas;
  return {
    ok: asBoolean(value.ok) === true,
    promotion_id: requireString(value.promotion_id, 'promotion_id'),
    max_liability_pesewas: liab === null ? null : asNumber(liab),
  };
}

function parseDenomination(row: Record<string, unknown>): PromoDenomination {
  return {
    id: requireString(row.id, 'id'),
    kind: requireString(row.kind, 'kind') as PromoDiscountType,
    value_pesewas: row.value_pesewas === null ? null : requireNumber(row.value_pesewas, 'value_pesewas'),
    percent: row.percent === null ? null : requireNumber(row.percent, 'percent'),
    label: requireString(row.label, 'label'),
    sort_order: requireNumber(row.sort_order, 'sort_order'),
    recommended_min_order_pesewas: requireNumber(
      row.recommended_min_order_pesewas,
      'recommended_min_order_pesewas',
    ),
    recommended_max_discount_pesewas:
      row.recommended_max_discount_pesewas === null
        ? null
        : requireNumber(row.recommended_max_discount_pesewas, 'recommended_max_discount_pesewas'),
    is_active: asBoolean(row.is_active) === true,
    is_default: asBoolean(row.is_default) === true,
    is_preset: row.is_preset === undefined ? true : asBoolean(row.is_preset) === true,
    created_at: requireString(row.created_at, 'created_at'),
  };
}

function parseSettings(row: Record<string, unknown>): PromoSettings {
  return {
    id: asBoolean(row.id) === true,
    fixed_min_order_multiple: requireNumber(row.fixed_min_order_multiple, 'fixed_min_order_multiple'),
    require_percentage_cap: asBoolean(row.require_percentage_cap) === true,
    liability_review_pesewas: requireNumber(row.liability_review_pesewas, 'liability_review_pesewas'),
    updated_at: requireString(row.updated_at, 'updated_at'),
  };
}

function parseCampus(row: Record<string, unknown>): Campus {
  return {
    id: requireString(row.id, 'id'),
    name: requireString(row.name, 'name'),
    slug: requireString(row.slug, 'slug'),
    is_active: asBoolean(row.is_active) === true,
    created_at: requireString(row.created_at, 'created_at'),
    updated_at: requireString(row.updated_at, 'updated_at'),
  };
}

function parsePromotion(row: Record<string, unknown>): Promotion {
  return {
    id: requireString(row.id, 'id'),
    name: requireString(row.name, 'name'),
    internal_note: row.internal_note === null ? null : asString(row.internal_note),
    description: row.description === null ? null : asString(row.description),
    trigger_type: requireString(row.trigger_type, 'trigger_type') as PromoTriggerType,
    discount_type: requireString(row.discount_type, 'discount_type') as PromoDiscountType,
    percent_off: row.percent_off === null ? null : asNumber(row.percent_off),
    amount_off_pesewas:
      row.amount_off_pesewas === null ? null : asNumber(row.amount_off_pesewas),
    max_discount_pesewas:
      row.max_discount_pesewas === null ? null : asNumber(row.max_discount_pesewas),
    min_order_pesewas: requireNumber(row.min_order_pesewas, 'min_order_pesewas'),
    applies_to: requireString(row.applies_to, 'applies_to') as PromoAppliesTo,
    target_ids: asStringArray(row.target_ids),
    scope_type: requireString(row.scope_type, 'scope_type') as PromoScopeType,
    priority: requireNumber(row.priority, 'priority'),
    stackable: asBoolean(row.stackable) === true,
    starts_at: requireString(row.starts_at, 'starts_at'),
    ends_at: row.ends_at === null ? null : asString(row.ends_at),
    max_redemptions: row.max_redemptions === null ? null : asNumber(row.max_redemptions),
    max_redemptions_per_user:
      row.max_redemptions_per_user === null ? null : asNumber(row.max_redemptions_per_user),
    times_redeemed: requireNumber(row.times_redeemed, 'times_redeemed'),
    status: requireString(row.status, 'status') as PromoStatus,
    created_by: row.created_by === null ? null : asString(row.created_by),
    created_at: requireString(row.created_at, 'created_at'),
    updated_at: requireString(row.updated_at, 'updated_at'),
    denomination_id: row.denomination_id === null ? null : asString(row.denomination_id),
    bypass_denomination: asBoolean(row.bypass_denomination) === true,
    bypass_reason: row.bypass_reason === null ? null : asString(row.bypass_reason),
    usage_preset: (asString(row.usage_preset) ?? 'custom') as PromoUsagePreset,
    published_by: row.published_by === null ? null : asString(row.published_by),
    published_at: row.published_at === null ? null : asString(row.published_at),
  };
}

function parsePromotionCode(row: Record<string, unknown>): PromotionCode {
  return {
    id: requireString(row.id, 'id'),
    promotion_id: requireString(row.promotion_id, 'promotion_id'),
    code: requireString(row.code, 'code'),
    max_redemptions: row.max_redemptions === null ? null : asNumber(row.max_redemptions),
    times_redeemed: requireNumber(row.times_redeemed, 'times_redeemed'),
    is_active: asBoolean(row.is_active) === true,
    assigned_user_id: row.assigned_user_id === null ? null : asString(row.assigned_user_id),
    expires_at: row.expires_at === null ? null : asString(row.expires_at),
    batch_label: row.batch_label === null ? null : asString(row.batch_label),
    created_at: requireString(row.created_at, 'created_at'),
  };
}

function parseRedemption(row: Record<string, unknown>): PromotionRedemption {
  return {
    id: requireString(row.id, 'id'),
    promotion_id: requireString(row.promotion_id, 'promotion_id'),
    code_id: row.code_id === null ? null : asString(row.code_id),
    order_id: requireString(row.order_id, 'order_id'),
    user_id: row.user_id === null ? null : asString(row.user_id),
    guest_phone: row.guest_phone === null ? null : asString(row.guest_phone),
    amount_discounted_pesewas: requireNumber(
      row.amount_discounted_pesewas,
      'amount_discounted_pesewas',
    ),
    eligible_subtotal_pesewas: requireNumber(
      row.eligible_subtotal_pesewas,
      'eligible_subtotal_pesewas',
    ),
    status: requireString(row.status, 'status') as PromoRedemptionStatus,
    reserved_at: requireString(row.reserved_at, 'reserved_at'),
    applied_at: row.applied_at === null ? null : asString(row.applied_at),
    reversed_at: row.reversed_at === null ? null : asString(row.reversed_at),
    reversal_reason: row.reversal_reason === null ? null : asString(row.reversal_reason),
  };
}

function parseSpendRow(row: Record<string, unknown>): PromoSpendRow {
  return {
    promotion_id: requireString(row.promotion_id, 'promotion_id'),
    name: requireString(row.name, 'name'),
    status: requireString(row.status, 'status') as PromoStatus,
    times_redeemed: requireNumber(row.times_redeemed, 'times_redeemed'),
    max_redemptions: row.max_redemptions === null ? null : asNumber(row.max_redemptions),
    spent_pesewas: requireNumber(row.spent_pesewas, 'spent_pesewas'),
    applied_count: requireNumber(row.applied_count, 'applied_count'),
    reserved_count: requireNumber(row.reserved_count, 'reserved_count'),
    max_liability_pesewas:
      row.max_liability_pesewas === null ? null : asNumber(row.max_liability_pesewas),
  };
}

function rowsFromUnknown(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord);
}

// ---------------------------------------------------------------------------
// RPC + table accessors
// ---------------------------------------------------------------------------

export async function fetchPromoDenominations(
  activeOnly = true,
): Promise<PromoDenomination[]> {
  let q = supabase
    .from('promo_denominations')
    .select('*')
    .order('sort_order', { ascending: true });
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  throwOnError(error);
  return rowsFromUnknown(data).map(parseDenomination);
}

export async function fetchPromoSettings(): Promise<PromoSettings> {
  const { data, error } = await supabase
    .from('promo_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle();
  throwOnError(error);
  if (!isRecord(data)) throw new Error('promo_settings row missing');
  return parseSettings(data);
}

export async function fetchCampuses(activeOnly = true): Promise<Campus[]> {
  let q = supabase.from('campuses').select('*').order('name', { ascending: true });
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  throwOnError(error);
  return rowsFromUnknown(data).map(parseCampus);
}

export async function fetchPromotions(filters?: {
  status?: PromoStatus | PromoStatus[];
  scope_type?: PromoScopeType;
}): Promise<Promotion[]> {
  let q = supabase.from('promotions').select('*').order('created_at', { ascending: false });
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      q = q.in('status', filters.status);
    } else {
      q = q.eq('status', filters.status);
    }
  }
  if (filters?.scope_type) q = q.eq('scope_type', filters.scope_type);
  const { data, error } = await q;
  throwOnError(error);
  return rowsFromUnknown(data).map(parsePromotion);
}

export async function fetchPromotion(id: string): Promise<Promotion | null> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwOnError(error);
  if (data === null) return null;
  if (!isRecord(data)) throw new Error('Invalid promotion row');
  return parsePromotion(data);
}

export async function fetchPromotionCodes(promotionId: string): Promise<PromotionCode[]> {
  const { data, error } = await supabase
    .from('promotion_codes')
    .select('*')
    .eq('promotion_id', promotionId)
    .order('created_at', { ascending: true });
  throwOnError(error);
  return rowsFromUnknown(data).map(parsePromotionCode);
}

export async function fetchPromotionCampuses(
  promotionId: string,
): Promise<PromotionCampus[]> {
  const { data, error } = await supabase
    .from('promotion_campuses')
    .select('promotion_id, campus_id')
    .eq('promotion_id', promotionId);
  throwOnError(error);
  return rowsFromUnknown(data).map((row) => ({
    promotion_id: requireString(row.promotion_id, 'promotion_id'),
    campus_id: requireString(row.campus_id, 'campus_id'),
  }));
}

export async function fetchPromotionRedemptions(
  promotionId: string,
): Promise<PromotionRedemption[]> {
  const { data, error } = await supabase
    .from('promotion_redemptions')
    .select('*')
    .eq('promotion_id', promotionId)
    .order('reserved_at', { ascending: false });
  throwOnError(error);
  return rowsFromUnknown(data).map(parseRedemption);
}

export async function fetchPromoSpend(
  promotionId?: string,
): Promise<PromoSpendRow[]> {
  let q = supabase.from('promo_spend').select('*');
  if (promotionId) q = q.eq('promotion_id', promotionId);
  const { data, error } = await q;
  throwOnError(error);
  return rowsFromUnknown(data).map(parseSpendRow);
}

export async function promoQuote(args: PromoQuoteArgs): Promise<PromoQuoteResult> {
  const { data, error } = await supabase.rpc('promo_quote', {
    p_items: args.items,
    p_code: args.code ?? null,
    p_campus_id: args.campus_id ?? null,
    p_guest_phone: args.guest_phone ?? null,
  });
  throwOnError(error);
  return parseQuoteResult(data);
}

export async function promoReserve(args: PromoReserveArgs): Promise<PromoReserveResult> {
  const { data, error } = await supabase.rpc('promo_reserve', {
    p_order_id: args.order_id,
    p_code: args.code ?? null,
    p_guest_phone: args.guest_phone ?? null,
  });
  throwOnError(error);
  return parseReserveResult(data);
}

/** Attach campus to own order before promo_reserve (server-side scope). */
export async function promoSetOrderCampus(
  orderId: string,
  campusId: string,
): Promise<void> {
  const { error } = await supabase.rpc('promo_set_order_campus', {
    p_order_id: orderId,
    p_campus_id: campusId,
  });
  throwOnError(error);
}

/** Read the post-reserve order total the client must charge (GHS). */
export async function fetchOrderChargeTotalGhs(orderId: string): Promise<number> {
  const { data, error } = await supabase
    .from('orders')
    .select('total_price, discount_pesewas, discount_amount')
    .eq('id', orderId)
    .single();
  throwOnError(error);
  if (!isRecord(data)) throw new Error('order not found');
  return requireNumber(data.total_price, 'total_price');
}

export async function promoPresetLimits(
  preset: PromoUsagePreset,
  count: number,
): Promise<PromoPresetLimits> {
  const { data, error } = await supabase.rpc('promo_preset_limits', {
    p_preset: preset,
    p_count: count,
  });
  throwOnError(error);
  return parsePresetLimits(data);
}

export async function promoCreateBatch(
  args: PromoCreateBatchArgs,
): Promise<PromoCreateBatchResult> {
  const { data, error } = await supabase.rpc('promo_create_batch', {
    p_name: args.name,
    p_usage_preset: args.usage_preset,
    p_count: args.count,
    p_denomination_id: args.denomination_id ?? null,
    p_discount_type: args.discount_type ?? null,
    p_amount_off_pesewas: args.amount_off_pesewas ?? null,
    p_percent_off: args.percent_off ?? null,
    p_max_discount_pesewas: args.max_discount_pesewas ?? null,
    p_min_order_pesewas: args.min_order_pesewas ?? null,
    p_applies_to: args.applies_to ?? 'order',
    p_target_ids: args.target_ids ?? [],
    p_campus_ids: args.campus_ids ?? [],
    p_prefix: args.prefix ?? 'BBX',
    p_starts_at: args.starts_at ?? new Date().toISOString(),
    p_ends_at: args.ends_at ?? null,
    p_assigned_user_id: args.assigned_user_id ?? null,
    p_code_expires_at: args.code_expires_at ?? null,
    p_bypass_reason: args.bypass_reason ?? null,
  });
  throwOnError(error);
  return parseCreateBatchResult(data);
}

export async function promoPublish(promotionId: string): Promise<PromoPublishResult> {
  const { data, error } = await supabase.rpc('promo_publish', {
    p_promotion_id: promotionId,
  });
  throwOnError(error);
  return parsePublishResult(data);
}

export async function promoGenerateCodes(args: PromoGenerateCodesArgs): Promise<string[]> {
  const { data, error } = await supabase.rpc('promo_generate_codes', {
    p_promotion_id: args.promotion_id,
    p_count: args.count,
    p_prefix: args.prefix ?? 'BBX',
    p_max_redemptions: args.max_redemptions ?? 1,
    p_batch_label: args.batch_label ?? null,
    p_assigned_user_id: args.assigned_user_id ?? null,
    p_expires_at: args.expires_at ?? null,
  });
  throwOnError(error);
  if (!Array.isArray(data)) return [];
  return data.filter((c): c is string => typeof c === 'string');
}

export async function promoSetCodesExpiry(args: PromoSetCodesExpiryArgs): Promise<number> {
  const { data, error } = await supabase.rpc('promo_set_codes_expiry', {
    p_promotion_id: args.promotion_id,
    p_code_ids: args.code_ids ?? [],
    p_expires_at: args.expires_at,
  });
  throwOnError(error);
  return requireNumber(data, 'promo_set_codes_expiry');
}

/** Pause / resume / archive via direct update (admin RLS). Discount fields stay untouched. */
export async function updatePromotionStatus(
  promotionId: string,
  status: Extract<PromoStatus, 'paused' | 'active' | 'archived' | 'expired'>,
): Promise<Promotion> {
  const { data, error } = await supabase
    .from('promotions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', promotionId)
    .select('*')
    .single();
  throwOnError(error);
  if (!isRecord(data)) throw new Error('Invalid promotion after status update');
  return parsePromotion(data);
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const promoQueryKeys = {
  all: ['promotions'] as const,
  denominations: (activeOnly: boolean) =>
    [...promoQueryKeys.all, 'denominations', activeOnly] as const,
  settings: () => [...promoQueryKeys.all, 'settings'] as const,
  campuses: (activeOnly: boolean) =>
    [...promoQueryKeys.all, 'campuses', activeOnly] as const,
  list: (filters?: { status?: PromoStatus | PromoStatus[]; scope_type?: PromoScopeType }) =>
    [...promoQueryKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...promoQueryKeys.all, 'detail', id] as const,
  codes: (promotionId: string) => [...promoQueryKeys.all, 'codes', promotionId] as const,
  campusesForPromo: (promotionId: string) =>
    [...promoQueryKeys.all, 'promo-campuses', promotionId] as const,
  redemptions: (promotionId: string) =>
    [...promoQueryKeys.all, 'redemptions', promotionId] as const,
  spend: (promotionId?: string) =>
    [...promoQueryKeys.all, 'spend', promotionId ?? 'all'] as const,
  presetLimits: (preset: PromoUsagePreset, count: number) =>
    [...promoQueryKeys.all, 'preset-limits', preset, count] as const,
  quote: (args: PromoQuoteArgs) => [...promoQueryKeys.all, 'quote', args] as const,
};

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

type DenomQueryOpts = Omit<
  UseQueryOptions<PromoDenomination[], Error>,
  'queryKey' | 'queryFn'
>;

export function usePromoDenominations(activeOnly = true, options?: DenomQueryOpts) {
  return useQuery({
    queryKey: promoQueryKeys.denominations(activeOnly),
    queryFn: () => fetchPromoDenominations(activeOnly),
    ...options,
  });
}

export function usePromoSettings(
  options?: Omit<UseQueryOptions<PromoSettings, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.settings(),
    queryFn: () => fetchPromoSettings(),
    ...options,
  });
}

export function useCampuses(
  activeOnly = true,
  options?: Omit<UseQueryOptions<Campus[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.campuses(activeOnly),
    queryFn: () => fetchCampuses(activeOnly),
    ...options,
  });
}

export function usePromoPresetLimits(
  preset: PromoUsagePreset,
  count: number,
  options?: Omit<UseQueryOptions<PromoPresetLimits, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.presetLimits(preset, count),
    queryFn: () => promoPresetLimits(preset, count),
    enabled: Number.isFinite(count) && count >= 0,
    ...options,
  });
}

export function usePromoQuote(
  args: PromoQuoteArgs,
  options?: Omit<UseQueryOptions<PromoQuoteResult, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.quote(args),
    queryFn: () => promoQuote(args),
    enabled: Array.isArray(args.items),
    ...options,
  });
}

export function usePromotionsList(
  filters?: { status?: PromoStatus | PromoStatus[]; scope_type?: PromoScopeType },
  options?: Omit<UseQueryOptions<Promotion[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.list(filters),
    queryFn: () => fetchPromotions(filters),
    ...options,
  });
}

export function usePromotion(
  id: string | undefined,
  options?: Omit<UseQueryOptions<Promotion | null, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.detail(id ?? ''),
    queryFn: () => fetchPromotion(id!),
    enabled: Boolean(id),
    ...options,
  });
}

export function usePromotionCodes(
  promotionId: string | undefined,
  options?: Omit<UseQueryOptions<PromotionCode[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.codes(promotionId ?? ''),
    queryFn: () => fetchPromotionCodes(promotionId!),
    enabled: Boolean(promotionId),
    ...options,
  });
}

export function usePromotionCampuses(
  promotionId: string | undefined,
  options?: Omit<UseQueryOptions<PromotionCampus[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.campusesForPromo(promotionId ?? ''),
    queryFn: () => fetchPromotionCampuses(promotionId!),
    enabled: Boolean(promotionId),
    ...options,
  });
}

export function usePromotionRedemptions(
  promotionId: string | undefined,
  options?: Omit<UseQueryOptions<PromotionRedemption[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.redemptions(promotionId ?? ''),
    queryFn: () => fetchPromotionRedemptions(promotionId!),
    enabled: Boolean(promotionId),
    ...options,
  });
}

export function usePromoSpend(
  promotionId?: string,
  options?: Omit<UseQueryOptions<PromoSpendRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: promoQueryKeys.spend(promotionId),
    queryFn: () => fetchPromoSpend(promotionId),
    ...options,
  });
}

export function usePromoReserve(
  options?: UseMutationOptions<PromoReserveResult, Error, PromoReserveArgs>,
) {
  return useMutation({
    ...options,
    mutationFn: promoReserve,
  });
}

export function usePromoCreateBatch(
  options?: UseMutationOptions<PromoCreateBatchResult, Error, PromoCreateBatchArgs>,
) {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    ...rest,
    mutationFn: promoCreateBatch,
    onSuccess: async (data, vars, onMutateResult, context) => {
      await qc.invalidateQueries({ queryKey: promoQueryKeys.all });
      await onSuccess?.(data, vars, onMutateResult, context);
    },
  });
}

export function usePromoPublish(
  options?: UseMutationOptions<PromoPublishResult, Error, string>,
) {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    ...rest,
    mutationFn: promoPublish,
    onSuccess: async (data, vars, onMutateResult, context) => {
      await qc.invalidateQueries({ queryKey: promoQueryKeys.all });
      await onSuccess?.(data, vars, onMutateResult, context);
    },
  });
}

export function usePromoGenerateCodes(
  options?: UseMutationOptions<string[], Error, PromoGenerateCodesArgs>,
) {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    ...rest,
    mutationFn: promoGenerateCodes,
    onSuccess: async (data, vars, onMutateResult, context) => {
      await qc.invalidateQueries({ queryKey: promoQueryKeys.codes(vars.promotion_id) });
      await onSuccess?.(data, vars, onMutateResult, context);
    },
  });
}

export function usePromoSetCodesExpiry(
  options?: UseMutationOptions<number, Error, PromoSetCodesExpiryArgs>,
) {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    ...rest,
    mutationFn: promoSetCodesExpiry,
    onSuccess: async (data, vars, onMutateResult, context) => {
      await qc.invalidateQueries({ queryKey: promoQueryKeys.codes(vars.promotion_id) });
      await onSuccess?.(data, vars, onMutateResult, context);
    },
  });
}

export function useUpdatePromotionStatus(
  options?: UseMutationOptions<
    Promotion,
    Error,
    {
      promotionId: string;
      status: Extract<PromoStatus, 'paused' | 'active' | 'archived' | 'expired'>;
    }
  >,
) {
  const qc = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};
  return useMutation({
    ...rest,
    mutationFn: ({ promotionId, status }) => updatePromotionStatus(promotionId, status),
    onSuccess: async (data, vars, onMutateResult, context) => {
      await qc.invalidateQueries({ queryKey: promoQueryKeys.all });
      await onSuccess?.(data, vars, onMutateResult, context);
    },
  });
}
