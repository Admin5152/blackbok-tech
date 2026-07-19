/**
 * Trade Admin request detail — customer, Q→A snapshot, offer send, status actions.
 *
 * Preserves AdminTrades send-offer flow (condition + final_value → offer_made).
 * OOS on complete (D11): surface restock/switch target; target change re-snapshots
 * price via fn_trade_snapshot_target_price. Errors via staffTradeError / tradeCopy.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft, DollarSign, Package, Send, Smartphone, AlertTriangle, Flag,
} from 'lucide-react';
import { Badge } from '../adminUtils';
import { useAppContext } from '../../../lib/appContext';
import {
  getAdminTradeRequest,
  getTradeIntakeAdjustments,
  getVariantStock,
  parseAnswersSnapshot,
  resolveSnapshotQa,
  updateAdminTradeRequest,
  type AdminTradeQueueItem,
} from '../../../lib/tradeAdminApi';
import { formatGhs } from '../../../lib/money';
import { parseOfferInput, tradeOfferAmount } from '../../../lib/tradeOffer';
import { TRADE_COPY, simVariantLabel } from '../../../lib/tradeCopy';
import { isOutOfStockCompletionError, staffTradeError } from '../../../lib/tradeErrors';
import { formatTradePricingModeLabel } from '../../../lib/tradeValuation';
import { AdminFlowBar } from '../../../components/FlowStepper';
import {
  TRADE_ADMIN_WORKFLOW,
  getTradeWorkflowStage,
  tradePricingPathDescription,
} from '../../../lib/adminWorkflow';
import type { ProductVariant } from '../../../types';
import { toDbTradeStatus, tradeAdminStatusLabel } from './tradeAdminShared';

const CONDITION_OPTIONS = ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'];

const QUICK_STATUSES = [
  'submitted',
  'inspecting',
  'under_review',
  'offer_made',
  'awaiting_user',
  'accepted',
  'scheduled',
  'completed',
  'rejected',
  'cancelled',
] as const;

const OFFER_REQUIRED = new Set(['offer_made', 'awaiting_user']);

const formatCatalogVariantLabel = (v: ProductVariant): string => {
  const parts = [v.color, v.storage, v.ram].filter(Boolean) as string[];
  const head = parts.length > 0 ? parts.join(' · ') : (v.name || v.sku || 'Variant');
  const sku = v.sku && !head.includes(v.sku) ? ` · ${v.sku}` : '';
  const st = v.stock != null ? ` — stock ${v.stock}` : '';
  return `${head}${sku}${st}`;
};

export const TradeAdminRequestDetail: React.FC = () => {
  const { requestId } = useParams({ strict: false }) as { requestId?: string };
  const navigate = useNavigate();
  const { products, notify } = useAppContext();

  const [sel, setSel] = useState<AdminTradeQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [offer, setOffer] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [condition, setCondition] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [qaRows, setQaRows] = useState<
    Array<{
      code: string;
      questionText: string;
      answerId: string;
      answerText: string;
      description?: string;
      flagVerify: boolean;
      outcome: string | null;
    }>
  >([]);
  const [intakeRows, setIntakeRows] = useState<
    Array<{
      id: string;
      product_id: string | null;
      adjustment_type?: string | null;
      quantity_change?: number | null;
      reason?: string | null;
      created_at?: string | null;
    }>
  >([]);
  /** Target SKU stock before → after complete (proves decrement once). */
  const [stockCheck, setStockCheck] = useState<{
    variantId: string;
    before: number | null;
    after: number | null;
  } | null>(null);
  const [draftTargetVariantId, setDraftTargetVariantId] = useState('');
  /** Set when complete fails OOS — staff must restock or switch target (D11). */
  const [oosBlock, setOosBlock] = useState(false);
  const [draftTargetProductId, setDraftTargetProductId] = useState('');

  const load = useCallback(async () => {
    if (!requestId) return;
    setError(null);
    try {
      const row = await getAdminTradeRequest(requestId);
      if (!row) {
        setSel(null);
        setError('Trade request not found.');
        return;
      }
      setSel(row);
      setCondition(row.condition || '');
      setAdminNotes(
        (row as { admin_notes?: string }).admin_notes ||
          (row as { adminNote?: string }).adminNote ||
          '',
      );
      const existing = tradeOfferAmount(row);
      const est = Number(row.estimated_value ?? row.estimatedValue);
      if (existing != null) setOffer(String(existing));
      else if (Number.isFinite(est) && est > 0) setOffer(String(est));
      else setOffer('');

      try {
        const qa = await resolveSnapshotQa(row.answers_snapshot);
        setQaRows(qa);
      } catch {
        setQaRows([]);
      }

      if (toDbTradeStatus(row.status) === 'completed') {
        try {
          setIntakeRows(await getTradeIntakeAdjustments(row.id));
        } catch {
          setIntakeRows([]);
        }
      } else {
        setIntakeRows([]);
      }
    } catch (e) {
      setError(staffTradeError(e));
      setSel(null);
    }
  }, [requestId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const targetProduct = useMemo(() => {
    if (!sel) return null;
    const pid =
      draftTargetProductId ||
      (sel as { target_product_id?: string }).target_product_id ||
      '';
    return pid ? products.find((p) => p.id === pid) ?? null : null;
  }, [sel, products, draftTargetProductId]);

  const switchableProducts = useMemo(
    () => products.filter((p) => !p.status || p.status === 'active'),
    [products],
  );

  const catalogTargetVariants = useMemo((): (ProductVariant & { id: string })[] => {
    if (!targetProduct) return [];
    return (targetProduct.variants || []).filter(
      (v): v is ProductVariant & { id: string } => Boolean(v.id),
    );
  }, [targetProduct]);

  useEffect(() => {
    if (!sel) {
      setDraftTargetVariantId('');
      setDraftTargetProductId('');
      return;
    }
    const pid = ((sel as { target_product_id?: string }).target_product_id || '').trim();
    setDraftTargetProductId(pid);
    const saved = (
      sel.targetVariantId ??
      (sel as { target_variant_id?: string }).target_variant_id ??
      ''
    ).trim();
    if (catalogTargetVariants.length > 0) {
      const ok = Boolean(saved && catalogTargetVariants.some((v) => v.id === saved));
      setDraftTargetVariantId(ok ? saved : catalogTargetVariants[0].id);
    } else {
      setDraftTargetVariantId('');
    }
  }, [sel, catalogTargetVariants]);

  const patch = async (
    updates: Record<string, unknown>,
    opts?: { silentSuccess?: boolean; successMessage?: string },
  ) => {
    if (!sel) return false;
    setSaving(true);
    try {
      const updated = await updateAdminTradeRequest(sel.id, {
        ...updates,
        ...(updates.status ? { status: toDbTradeStatus(String(updates.status)) } : {}),
      });
      setSel(updated);
      if (!opts?.silentSuccess) {
        notify?.(opts?.successMessage ?? 'Saved.', 'success');
      }
      return true;
    } catch (e) {
      if (isOutOfStockCompletionError(e)) {
        setOosBlock(true);
        notify?.(TRADE_COPY.errors.outOfStock, 'error');
      } else {
        notify?.(staffTradeError(e), 'error');
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Switch target product/variant and re-snapshot top-up via DB trigger. */
  const applyTargetSwitch = async (productId: string, variantId: string) => {
    setDraftTargetProductId(productId);
    setDraftTargetVariantId(variantId);
    const ok = await patch(
      {
        target_product_id: productId || null,
        target_variant_id: variantId || null,
      },
      { successMessage: TRADE_COPY.errors.switchTargetSaved },
    );
    if (ok) setOosBlock(false);
  };

  const sendOffer = async () => {
    if (!sel) return;
    if (!condition.trim()) {
      notify?.('Set device condition before sending an offer.', 'error');
      return;
    }
    const amount = parseOfferInput(offer);
    if (amount == null) {
      notify?.('Enter a valid offer value greater than zero.', 'error');
      return;
    }
    await patch({
      status: 'offer_made',
      condition,
      final_value: amount,
      offered_price: amount,
      admin_note: offerNote,
    });
  };

  const resolveOfferAmount = (): number | null => {
    const fromInput = parseOfferInput(offer);
    if (fromInput != null) return fromInput;
    return tradeOfferAmount(sel);
  };

  const applyStatus = async (s: string) => {
    if (!sel) return;
    if (s === 'completed' && catalogTargetVariants.length > 0) {
      const pick = (draftTargetVariantId || catalogTargetVariants[0]?.id || '').trim();
      if (!pick) {
        notify?.('Pick a target variant before marking completed.', 'error');
        return;
      }
      let before: number | null = null;
      try {
        before = await getVariantStock(pick);
      } catch {
        before = null;
      }
      await patch({
        target_product_id: draftTargetProductId || targetProduct?.id || null,
        target_variant_id: pick,
      });
      const ok = await patch({ status: s });
      if (ok) {
        setOosBlock(false);
        let after: number | null = null;
        try {
          after = await getVariantStock(pick);
        } catch {
          after = null;
        }
        setStockCheck({ variantId: pick, before, after });
        if (before != null && after != null && after === before - 1) {
          notify?.(`Stock verified: ${before} → ${after} (−1).`, 'success');
        } else if (before != null && after != null) {
          notify?.(
            `Completed. Target stock ${before} → ${after} (expected −1). Check trigger if unchanged.`,
            after < before ? 'success' : 'error',
          );
        }
        try {
          setIntakeRows(await getTradeIntakeAdjustments(sel.id));
        } catch {
          /* keep prior */
        }
      }
      return;
    }
    if (OFFER_REQUIRED.has(s)) {
      const amount = resolveOfferAmount();
      if (amount == null) {
        notify?.('Enter an offer value before setting Offer made / Awaiting user.', 'error');
        return;
      }
      if (s === 'offer_made' && !condition.trim()) {
        notify?.('Set device condition before sending an offer.', 'error');
        return;
      }
      await patch({
        status: s,
        final_value: amount,
        offered_price: amount,
        ...(condition.trim() ? { condition } : {}),
        ...(offerNote.trim() ? { admin_note: offerNote } : {}),
      });
      return;
    }
    await patch({ status: s });
  };

  const editLog = sel ? parseAnswersSnapshot(sel.answers_snapshot).editLog : [];

  if (loading) {
    return <div className="text-center py-16 text-white/30 text-sm">Loading request…</div>;
  }

  if (error || !sel) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/admin/trade' })}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white"
        >
          <ArrowLeft size={14} /> Queue
        </button>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error || 'Not found'}
        </div>
      </div>
    );
  }

  const deviceLabel =
    sel.device ||
    `${(sel as { device_brand?: string }).device_brand || ''} ${(sel as { device_name?: string }).device_name || ''}`.trim() ||
    '—';

  return (
    <div className="space-y-5 max-w-3xl">
      <button
        type="button"
        onClick={() => navigate({ to: '/admin/trade' })}
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white"
      >
        <ArrowLeft size={14} /> Queue
      </button>

      <AdminFlowBar
        steps={[...TRADE_ADMIN_WORKFLOW]}
        activeKey={getTradeWorkflowStage(sel.status)}
      />

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone size={16} className="text-purple-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black text-[#B38B21] uppercase tracking-widest">
            {sel.display_id || sel.id.slice(0, 8)}
          </p>
          <h2 className="text-lg font-black text-white truncate">{deviceLabel}</h2>
          <p className="text-[10px] text-white/35">
            {sel.resolved_name || sel.userName || '—'} · {sel.resolved_email || sel.userEmail || '—'}
            {sel.resolved_phone ? ` · ${sel.resolved_phone}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap gap-2 items-center">
            <Badge status={tradeAdminStatusLabel(sel.status)} />
            {sel.is_expired && (
              <span className="text-[8px] font-black uppercase text-purple-300 bg-purple-500/15 px-1.5 py-0.5 rounded">
                Expired
              </span>
            )}
            {sel.needs_verification && (
              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-amber-300">
                <AlertTriangle size={10} /> Verify
              </span>
            )}
            {sel.answers_edited && (
              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-sky-300">
                <Flag size={10} /> Answers edited
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          ['Device', deviceLabel],
          ['IMEI (full)', sel.imei_serial || '—'],
          ['Storage', (sel as { storage_tier?: string }).storage_tier || '—'],
          ['SIM', simVariantLabel(String((sel as { sim_variant?: string }).sim_variant || '')) || '—'],
          ['Color', (sel as { your_color?: string }).your_color || '—'],
          ['Target', (sel as { targetDevice?: string }).targetDevice || (sel as { target_device?: string }).target_device || '—'],
          ['Pricing', formatTradePricingModeLabel((sel as { pricing_mode?: string }).pricing_mode as any)],
          ['Phone', sel.resolved_phone || '—'],
        ].map(([k, v]) => (
          <div key={k} className="bg-black/40 rounded-xl p-2.5">
            <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">{k}</p>
            <p className="text-xs text-white font-bold break-all">{v}</p>
          </div>
        ))}
        <div className="bg-black/40 rounded-xl p-2.5 col-span-2">
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Pricing path</p>
          <p className="text-[9px] text-white/35 leading-relaxed">
            {tradePricingPathDescription((sel as { pricing_mode?: string }).pricing_mode as any)}
          </p>
        </div>
      </div>

      {/* Estimate breakdown */}
      <div className="bg-[#B38B21]/10 border border-[#B38B21]/20 rounded-xl p-3 space-y-2">
        <p className="text-[9px] text-[#B38B21] uppercase tracking-widest">Estimate vs offer</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-white/40">Base</span>
            <p className="font-bold text-white">
              {(sel as { base_trade_value?: number }).base_trade_value != null
                ? formatGhs(Number((sel as { base_trade_value?: number }).base_trade_value))
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-white/40">Estimate</span>
            <p className="font-bold text-[#B38B21]">
              {formatGhs(Number(sel.estimated_value ?? sel.estimatedValue ?? 0))}
            </p>
          </div>
          <div>
            <span className="text-white/40">Final offer</span>
            <p className="font-bold text-emerald-400">
              {tradeOfferAmount(sel) != null ? formatGhs(tradeOfferAmount(sel)!) : 'TBD'}
            </p>
          </div>
          {(sel as { top_up_amount?: number }).top_up_amount != null && (
            <div>
              <span className="text-white/40">Top-up</span>
              <p className="font-bold text-white">
                {formatGhs(Number((sel as { top_up_amount?: number }).top_up_amount))}
              </p>
            </div>
          )}
        </div>
        {Array.isArray((sel as { deduction_breakdown?: Array<{ key: string; label: string; amount: number }> }).deduction_breakdown) &&
          ((sel as { deduction_breakdown: Array<{ key: string; label: string; amount: number }> }).deduction_breakdown).length > 0 && (
          <ul className="text-[10px] text-white/50 space-y-0.5 pt-1 border-t border-white/10">
            {(sel as { deduction_breakdown: Array<{ key: string; label: string; amount: number }> }).deduction_breakdown.map(
              (line) => (
                <li key={line.key}>
                  {line.label}: −{formatGhs(line.amount)}
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {/* Answers snapshot */}
      <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
        <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
            Questionnaire answers
          </p>
          {sel.answers_edited && (
            <span className="text-[9px] font-bold text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded">
              Customer edited answers before submit
            </span>
          )}
        </div>
        {qaRows.length === 0 ? (
          <p className="p-4 text-[10px] text-white/30">No answers snapshot on this request.</p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {qaRows.map((row) => (
              <li
                key={`${row.code}-${row.answerId}`}
                className={`px-3 py-2.5 ${row.flagVerify ? 'bg-amber-500/10' : ''}`}
              >
                <p className="text-[9px] text-white/35 uppercase tracking-wider">
                  {row.code}
                </p>
                <p className="text-[11px] text-white/70 mt-0.5 leading-snug">{row.questionText}</p>
                <p className="text-xs font-bold text-white mt-1">
                  → {row.answerText}
                  {row.flagVerify && (
                    <span className="ml-2 text-[8px] uppercase text-amber-300">verify</span>
                  )}
                </p>
                {row.description && (
                  <p className="text-[10px] text-white/45 mt-0.5">{row.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {editLog.length > 0 && (
          <div className="p-3 border-t border-white/10 bg-sky-500/5">
            <p className="text-[9px] font-black uppercase text-sky-300 mb-2">Edit log</p>
            <ul className="space-y-1 text-[10px] text-white/50">
              {editLog.map((e, i) => (
                <li key={i}>
                  <span className="text-white/70">{e.code}</span>: {e.old ?? '—'} → {e.new}{' '}
                  <span className="text-white/30">
                    {e.at ? new Date(e.at).toLocaleString() : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Inspection notes */}
      <div className="space-y-2">
        <label className="text-[9px] text-white/30 uppercase tracking-widest">Inspection notes</label>
        <textarea
          rows={3}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none focus:border-[#B38B21]/50 focus:outline-none"
          placeholder="Internal notes…"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void patch({ admin_notes: adminNotes, admin_note: adminNotes })}
          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-40"
        >
          Save notes
        </button>
      </div>

      {/* Target SKU — switch / restock path when completion hits OOS (D11) */}
      <div className="bg-black/40 rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Package size={12} className="text-[#B38B21]" /> Target stock
        </p>
        {oosBlock && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 space-y-2">
            <p className="text-xs text-red-200 font-bold flex items-center gap-2">
              <AlertTriangle size={14} />
              {TRADE_COPY.errors.outOfStock}
            </p>
            <p className="text-[10px] text-red-200/70 uppercase tracking-widest font-black">
              {TRADE_COPY.errors.restockOrSwitch}
            </p>
          </div>
        )}
        <div>
          <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">
            Target product
          </label>
          <select
            value={draftTargetProductId}
            onChange={(e) => {
              const pid = e.target.value;
              setDraftTargetProductId(pid);
              const prod = products.find((p) => p.id === pid);
              const first =
                (prod?.variants || []).find((v) => v.id)?.id || '';
              void applyTargetSwitch(pid, first);
            }}
            disabled={saving}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none disabled:opacity-40"
          >
            <option value="">— Cash only / no target —</option>
            {switchableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {targetProduct ? (
          catalogTargetVariants.length > 0 ? (
            <select
              value={draftTargetVariantId || catalogTargetVariants[0]?.id || ''}
              onChange={(e) => {
                const vid = e.target.value;
                setDraftTargetVariantId(vid);
                void applyTargetSwitch(draftTargetProductId || targetProduct.id, vid);
              }}
              disabled={saving}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none disabled:opacity-40"
            >
              {catalogTargetVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {formatCatalogVariantLabel(v)}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[10px] text-white/35">Product-level stock (no variant rows).</p>
          )
        ) : (
          <p className="text-[10px] text-white/35">
            Cash-only request — complete without target inventory decrement.
          </p>
        )}
        {sel.top_up_amount != null && (
          <p className="text-[11px] text-white/50">
            Top-up (server):{' '}
            <span className="font-black text-[#B38B21] tabular-nums">
              {formatGhs(Number(sel.top_up_amount))}
            </span>
          </p>
        )}
      </div>

      {/* Status actions */}
      <div>
        <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={saving}
              onClick={() => void applyStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                toDbTradeStatus(sel.status) === s
                  ? 'bg-[#B38B21] text-black'
                  : 'bg-white/5 text-white/40 hover:text-white border border-white/10'
              } disabled:opacity-30`}
            >
              {tradeAdminStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Send offer */}
      <div className="bg-black/40 rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Send size={12} className="text-purple-400" /> Send offer
        </p>
        <div>
          <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">
            Condition
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITION_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                  condition === c ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="number"
            min={1}
            step="0.01"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder="Final offer (required)"
            className="w-full pl-8 pr-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:border-[#B38B21]/50 focus:outline-none"
          />
        </div>
        <textarea
          rows={2}
          value={offerNote}
          onChange={(e) => setOfferNote(e.target.value)}
          placeholder="Note to customer (optional)"
          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none focus:border-[#B38B21]/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void sendOffer()}
          disabled={!parseOfferInput(offer) || !condition.trim() || saving}
          className="w-full py-2.5 bg-[#B38B21] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Send size={13} /> {saving ? 'Sending…' : 'Send offer to customer'}
        </button>
      </div>

      {toDbTradeStatus(sel.status) === 'completed' && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase text-emerald-300 tracking-widest">
            Completed — intake & stock
          </p>
          <p className="text-[11px] text-white/55 leading-relaxed">
            Target sellable stock decrements via{' '}
            <code className="text-white/70">fn_trade_target_inventory_on_complete</code> when{' '}
            <code className="text-white/70">target_variant_id</code> is set. Incoming device is
            logged separately (qty 0 audit — not sellable until refurbished).
          </p>
          {stockCheck && (
            <div className="rounded-lg border border-emerald-500/30 bg-black/40 px-3 py-2 text-[11px]">
              <p className="font-black uppercase text-[9px] text-emerald-300 tracking-wider mb-1">
                Target stock check
              </p>
              <p className="text-white/80">
                Variant <span className="font-mono text-white/50">{stockCheck.variantId.slice(0, 8)}…</span>
                {': '}
                {stockCheck.before != null ? stockCheck.before : '—'} →{' '}
                {stockCheck.after != null ? stockCheck.after : '—'}
                {stockCheck.before != null &&
                  stockCheck.after != null &&
                  stockCheck.after === stockCheck.before - 1 && (
                    <span className="ml-2 text-emerald-300 font-bold">verified −1</span>
                  )}
              </p>
            </div>
          )}
          {intakeRows.length === 0 ? (
            <p className="text-[10px] text-white/35 italic">
              No inventory_adjustments row found for this trade yet (trigger may be missing on this
              environment).
            </p>
          ) : (
            <ul className="space-y-2">
              {intakeRows.map((adj) => (
                <li
                  key={adj.id}
                  className="rounded-lg border border-emerald-500/20 bg-black/30 px-3 py-2 text-[11px] text-white/70"
                >
                  <p className="font-bold text-emerald-200/90">
                    {adj.adjustment_type || 'adjustment'}
                    {adj.quantity_change != null ? ` · qty ${adj.quantity_change}` : ''}
                  </p>
                  {adj.reason && <p className="mt-1 text-white/50 leading-snug">{adj.reason}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-[9px] uppercase tracking-wider">
                    {adj.product_id && (
                      <button
                        type="button"
                        onClick={() =>
                          void navigate({ to: '/admin/products' as any })
                        }
                        className="text-[#B38B21] hover:underline"
                      >
                        Open products admin
                      </button>
                    )}
                    {adj.created_at && (
                      <span className="text-white/30">
                        {new Date(adj.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
