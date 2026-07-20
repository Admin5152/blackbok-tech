import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  ChevronDown,
  DollarSign,
  Package,
  Send,
  Smartphone,
  AlertTriangle,
  Flag,
  ClipboardList,
  StickyNote,
  CheckCircle2,
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

type SectionKey = 'device' | 'estimate' | 'questions' | 'notes' | 'target' | 'completed';

const formatCatalogVariantLabel = (v: ProductVariant): string => {
  const parts = [v.color, v.storage, v.ram].filter(Boolean) as string[];
  const head = parts.length > 0 ? parts.join(' · ') : (v.name || v.sku || 'Configuration');
  const sku = v.sku && !head.includes(v.sku) ? ` · ${v.sku}` : '';
  const st = v.stock != null ? ` — stock ${v.stock}` : '';
  return `${head}${sku}${st}`;
};

const DetailSection: React.FC<{
  id: SectionKey;
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  isLight: boolean;
  badge?: React.ReactNode;
  summary?: string;
  children: React.ReactNode;
}> = ({ title, icon, open, onToggle, isLight, badge, summary, children }) => (
  <section
    className={`rounded-xl border overflow-hidden ${
      isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-black/30'
    }`}
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`w-full flex items-center gap-2.5 px-3.5 py-3 text-left transition-colors ${
        isLight ? 'hover:bg-black/[0.03]' : 'hover:bg-white/[0.04]'
      }`}
    >
      <span className="text-[#B38B21] shrink-0">{icon}</span>
      <span className={`flex-1 min-w-0 text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-black' : 'text-[#F5F5F5]'}`}>
        {title}
      </span>
      {badge}
      {!open && summary && (
        <span className={`hidden sm:inline truncate max-w-[40%] text-[10px] ${isLight ? 'text-black/45' : 'text-[#A3A3A3]'}`}>
          {summary}
        </span>
      )}
      <ChevronDown
        size={14}
        className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${isLight ? 'text-black/40' : 'text-[#A3A3A3]'}`}
      />
    </button>
    {open && (
      <div className={`px-3.5 pb-3.5 pt-0 border-t ${isLight ? 'border-black/5' : 'border-white/5'}`}>
        <div className="pt-3">{children}</div>
      </div>
    )}
  </section>
);

export const TradeAdminRequestDetail: React.FC = () => {
  const { requestId } = useParams({ strict: false }) as { requestId?: string };
  const navigate = useNavigate();
  const { products, notify, theme } = useAppContext();
  const isLight = theme === 'light';

  const [sel, setSel] = useState<AdminTradeQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [offer, setOffer] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [condition, setCondition] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  /** Collapsed by default except estimate — keep the page short; open on demand. */
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    device: false,
    estimate: true,
    questions: false,
    notes: false,
    target: false,
    completed: true,
  });
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

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const muted = isLight ? 'text-black/50' : 'text-[#A3A3A3]';
  const title = isLight ? 'text-black' : 'text-[#F5F5F5]';
  const panel = isLight ? 'bg-white border-black/10' : 'bg-black/40 border-white/10';
  const field = isLight
    ? 'bg-[#F5F5F7] border-black/12 text-black'
    : 'bg-black/50 border-white/10 text-[#F5F5F5]';
  const chipIdle = isLight
    ? 'bg-black/[0.04] text-black/55 border border-black/10'
    : 'bg-white/5 text-[#A3A3A3] border border-white/10';

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
        notify?.('Pick an upgrade configuration before marking completed.', 'error');
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

  useEffect(() => {
    if (!sel) return;
    setOpenSections((prev) => ({
      ...prev,
      questions: prev.questions || Boolean(sel.needs_verification) || Boolean(sel.answers_edited),
      target: prev.target || oosBlock,
    }));
  }, [sel?.id, sel?.needs_verification, sel?.answers_edited, oosBlock]);

  const editLog = sel ? parseAnswersSnapshot(sel.answers_snapshot).editLog : [];

  if (loading) {
    return (
      <div className={`text-center py-16 text-sm ${muted}`}>Loading request…</div>
    );
  }

  if (error || !sel) {
    return (
      <div className="space-y-4 max-w-3xl">
        <button
          type="button"
          onClick={() => navigate({ to: '/admin/trade' })}
          className={`inline-flex items-center gap-2 text-[10px] font-black uppercase ${muted} hover:text-[#B38B21]`}
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

  const targetLabel =
    (sel as { targetDevice?: string }).targetDevice ||
    (sel as { target_device?: string }).target_device ||
    'Cash only';

  const estimateVal = Number(sel.estimated_value ?? sel.estimatedValue ?? 0);
  const offerVal = tradeOfferAmount(sel);
  const verifyCount = qaRows.filter((r) => r.flagVerify).length;
  const deductions =
    (sel as { deduction_breakdown?: Array<{ key: string; label: string; amount: number }> })
      .deduction_breakdown;

  return (
    <div className="space-y-4 max-w-4xl pb-8">
      <button
        type="button"
        onClick={() => navigate({ to: '/admin/trade' })}
        className={`inline-flex items-center gap-2 text-[10px] font-black uppercase ${muted} hover:text-[#B38B21]`}
      >
        <ArrowLeft size={14} /> Queue
      </button>

      {/* Compact header + money strip */}
      <div className={`rounded-2xl border p-4 sm:p-5 ${panel}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone size={16} className="text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black text-[#B38B21] uppercase tracking-widest">
                {sel.display_id || sel.id.slice(0, 8)}
              </p>
              <Badge status={tradeAdminStatusLabel(sel.status)} />
              {sel.is_expired && (
                <span className="text-[8px] font-black uppercase text-purple-300 bg-purple-500/15 px-1.5 py-0.5 rounded">
                  Expired
                </span>
              )}
              {sel.needs_verification && (
                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded">
                  <AlertTriangle size={10} /> Verify
                </span>
              )}
              {sel.answers_edited && (
                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-sky-600 bg-sky-500/15 px-1.5 py-0.5 rounded">
                  <Flag size={10} /> Edited
                </span>
              )}
            </div>
            <h2 className={`text-lg font-black truncate mt-0.5 ${title}`}>{deviceLabel}</h2>
            <p className={`text-[11px] truncate ${muted}`}>
              {sel.resolved_name || sel.userName || '—'}
              {(sel.resolved_email || sel.userEmail) ? ` · ${sel.resolved_email || sel.userEmail}` : ''}
              {sel.resolved_phone ? ` · ${sel.resolved_phone}` : ''}
            </p>
            <p className={`text-[10px] mt-1 ${muted}`}>
              Upgrade: <span className={title}>{targetLabel}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ['Estimate', formatGhs(estimateVal)],
            ['Offer', offerVal != null ? formatGhs(offerVal) : 'TBD'],
            ['Answers', `${qaRows.length}${verifyCount ? ` · ${verifyCount} verify` : ''}`],
          ].map(([k, v]) => (
            <div
              key={k}
              className={`rounded-xl px-2.5 py-2 text-center ${isLight ? 'bg-black/[0.03]' : 'bg-white/[0.04]'}`}
            >
              <p className={`text-[8px] font-black uppercase tracking-widest ${muted}`}>{k}</p>
              <p className={`text-xs font-black mt-0.5 tabular-nums ${k === 'Estimate' ? 'text-[#B38B21]' : title}`}>
                {v}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <AdminFlowBar
            steps={[...TRADE_ADMIN_WORKFLOW]}
            activeKey={getTradeWorkflowStage(sel.status)}
          />
        </div>
      </div>

      {/* Primary actions — always visible */}
      <div className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${panel}`}>
        <div>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${muted}`}>Status</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={saving}
                onClick={() => void applyStatus(s)}
                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                  toDbTradeStatus(sel.status) === s
                    ? 'bg-[#B38B21] text-black'
                    : chipIdle
                } disabled:opacity-30`}
              >
                {tradeAdminStatusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-3.5 space-y-3 ${isLight ? 'border-[#B38B21]/25 bg-[#B38B21]/5' : 'border-[#B38B21]/20 bg-[#B38B21]/10'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${title}`}>
            <Send size={12} className="text-[#B38B21]" /> Send offer
          </p>
          <div>
            <label className={`text-[9px] uppercase tracking-widest block mb-1.5 ${muted}`}>
              Condition
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                    condition === c ? 'bg-[#B38B21] text-black' : chipIdle
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <DollarSign size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
            <input
              type="number"
              min={1}
              step="0.01"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="Final offer (GHS)"
              className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm focus:border-[#B38B21]/50 focus:outline-none ${field}`}
            />
          </div>
          <textarea
            rows={2}
            value={offerNote}
            onChange={(e) => setOfferNote(e.target.value)}
            placeholder="Note to customer (optional)"
            className={`w-full border rounded-xl px-3 py-2 text-xs resize-none focus:border-[#B38B21]/50 focus:outline-none ${field}`}
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
      </div>

      {/* Collapsible details */}
      <div className="space-y-2">
        <DetailSection
          id="estimate"
          title="Estimate & deductions"
          icon={<DollarSign size={14} />}
          open={openSections.estimate}
          onToggle={() => toggleSection('estimate')}
          isLight={isLight}
          summary={formatGhs(estimateVal)}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className={muted}>Base</span>
              <p className={`font-bold ${title}`}>
                {(sel as { base_trade_value?: number }).base_trade_value != null
                  ? formatGhs(Number((sel as { base_trade_value?: number }).base_trade_value))
                  : '—'}
              </p>
            </div>
            <div>
              <span className={muted}>Estimate</span>
              <p className="font-bold text-[#B38B21]">{formatGhs(estimateVal)}</p>
            </div>
            <div>
              <span className={muted}>Final offer</span>
              <p className="font-bold text-emerald-500">
                {offerVal != null ? formatGhs(offerVal) : 'TBD'}
              </p>
            </div>
            {(() => {
              const credit = estimateVal;
              const targetPrice = Number(
                (sel as { target_product_price?: number | null }).target_product_price ?? 0,
              );
              const topUp = Number((sel as { top_up_amount?: number | null }).top_up_amount ?? NaN);
              if (!Number.isFinite(topUp) && !(targetPrice > 0)) return null;
              const refund =
                targetPrice > 0 && credit > targetPrice ? Math.round(credit - targetPrice) : 0;
              if (refund > 0) {
                return (
                  <div>
                    <span className={muted}>Customer refund</span>
                    <p className="font-bold text-emerald-500">{formatGhs(refund)}</p>
                  </div>
                );
              }
              if (Number.isFinite(topUp)) {
                return (
                  <div>
                    <span className={muted}>{topUp > 0 ? 'Top-up' : 'Balance'}</span>
                    <p className={`font-bold ${title}`}>
                      {topUp > 0 ? formatGhs(topUp) : 'Even'}
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <p className={`text-[10px] mt-3 leading-relaxed ${muted}`}>
            Pricing: {formatTradePricingModeLabel((sel as { pricing_mode?: string }).pricing_mode as any)}
            {' — '}
            {tradePricingPathDescription((sel as { pricing_mode?: string }).pricing_mode as any)}
          </p>
          {Array.isArray(deductions) && deductions.length > 0 && (
            <ul className={`text-[10px] space-y-0.5 pt-2 mt-2 border-t ${isLight ? 'border-black/5 text-black/55' : 'border-white/10 text-[#A3A3A3]'}`}>
              {deductions.map((line) => (
                <li key={line.key}>
                  {line.label}: −{formatGhs(line.amount)}
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection
          id="device"
          title="Device & customer"
          icon={<Smartphone size={14} />}
          open={openSections.device}
          onToggle={() => toggleSection('device')}
          isLight={isLight}
          summary={deviceLabel}
        >
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Device', deviceLabel],
              ['IMEI 1', (sel as { imei_1?: string }).imei_1 || sel.imei_serial || '—'],
              ['IMEI 2', (sel as { imei_2?: string }).imei_2 || '—'],
              ['Serial', (sel as { serial_number?: string }).serial_number || '—'],
              ['Storage', (sel as { storage_tier?: string }).storage_tier || '—'],
              ['SIM', simVariantLabel(String((sel as { sim_variant?: string }).sim_variant || '')) || '—'],
              ['Color', (sel as { your_color?: string }).your_color || '—'],
              ['Target', targetLabel],
              ['Phone', sel.resolved_phone || '—'],
              ['Email', sel.resolved_email || sel.userEmail || '—'],
            ].map(([k, v]) => (
              <div
                key={k}
                className={`rounded-xl p-2.5 ${isLight ? 'bg-black/[0.03]' : 'bg-black/40'}`}
              >
                <p className={`text-[9px] uppercase tracking-widest mb-0.5 ${muted}`}>{k}</p>
                <p className={`text-xs font-bold break-all ${title}`}>{v}</p>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection
          id="questions"
          title="Questionnaire answers"
          icon={<ClipboardList size={14} />}
          open={openSections.questions}
          onToggle={() => toggleSection('questions')}
          isLight={isLight}
          summary={qaRows.length ? `${qaRows.length} answers` : 'None'}
          badge={
            verifyCount > 0 ? (
              <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded">
                {verifyCount} verify
              </span>
            ) : undefined
          }
        >
          {qaRows.length === 0 ? (
            <p className={`text-[10px] ${muted}`}>No answers snapshot on this request.</p>
          ) : (
            <ul className={`divide-y rounded-xl overflow-hidden border ${isLight ? 'divide-black/5 border-black/5' : 'divide-white/[0.04] border-white/5'}`}>
              {qaRows.map((row) => (
                <li
                  key={`${row.code}-${row.answerId}`}
                  className={`px-3 py-2.5 ${row.flagVerify ? 'bg-amber-500/10' : ''}`}
                >
                  <p className={`text-[9px] uppercase tracking-wider ${muted}`}>{row.code}</p>
                  <p className={`text-[11px] mt-0.5 leading-snug ${isLight ? 'text-black/70' : 'text-[#D4D4D4]'}`}>
                    {row.questionText}
                  </p>
                  <p className={`text-xs font-bold mt-1 ${title}`}>
                    → {row.answerText}
                    {row.flagVerify && (
                      <span className="ml-2 text-[8px] uppercase text-amber-500">verify</span>
                    )}
                  </p>
                  {row.description && (
                    <p className={`text-[10px] mt-0.5 ${muted}`}>{row.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editLog.length > 0 && (
            <div className="mt-3 p-3 rounded-xl border border-sky-500/20 bg-sky-500/5">
              <p className="text-[9px] font-black uppercase text-sky-500 mb-2">Edit log</p>
              <ul className={`space-y-1 text-[10px] ${muted}`}>
                {editLog.map((e, i) => (
                  <li key={i}>
                    <span className={title}>{e.code}</span>: {e.old ?? '—'} → {e.new}{' '}
                    <span className="opacity-60">
                      {e.at ? new Date(e.at).toLocaleString() : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DetailSection>

        <DetailSection
          id="notes"
          title="Inspection notes"
          icon={<StickyNote size={14} />}
          open={openSections.notes}
          onToggle={() => toggleSection('notes')}
          isLight={isLight}
          summary={adminNotes.trim() ? 'Has notes' : 'Empty'}
        >
          <textarea
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-xs resize-none focus:border-[#B38B21]/50 focus:outline-none ${field}`}
            placeholder="Internal notes…"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void patch({ admin_notes: adminNotes, admin_note: adminNotes })}
            className={`mt-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase border disabled:opacity-40 ${chipIdle}`}
          >
            Save notes
          </button>
        </DetailSection>

        <DetailSection
          id="target"
          title="Target stock"
          icon={<Package size={14} />}
          open={openSections.target}
          onToggle={() => toggleSection('target')}
          isLight={isLight}
          summary={targetProduct?.name || 'Cash only'}
          badge={
            oosBlock ? (
              <span className="text-[8px] font-black uppercase text-red-500 bg-red-500/15 px-1.5 py-0.5 rounded">
                OOS
              </span>
            ) : undefined
          }
        >
          {oosBlock && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 space-y-2 mb-3">
              <p className="text-xs text-red-200 font-bold flex items-center gap-2">
                <AlertTriangle size={14} />
                {TRADE_COPY.errors.outOfStock}
              </p>
              <p className="text-[10px] text-red-200/70 uppercase tracking-widest font-black">
                {TRADE_COPY.errors.restockOrSwitch}
              </p>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className={`text-[9px] uppercase tracking-widest block mb-1 ${muted}`}>
                Target product
              </label>
              <select
                value={draftTargetProductId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setDraftTargetProductId(pid);
                  const prod = products.find((p) => p.id === pid);
                  const first = (prod?.variants || []).find((v) => v.id)?.id || '';
                  void applyTargetSwitch(pid, first);
                }}
                disabled={saving}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:border-[#B38B21]/50 focus:outline-none disabled:opacity-40 ${field}`}
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
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:border-[#B38B21]/50 focus:outline-none disabled:opacity-40 ${field}`}
                >
                  {catalogTargetVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {formatCatalogVariantLabel(v)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className={`text-[10px] ${muted}`}>Overall product stock (no per-version stock).</p>
              )
            ) : (
              <p className={`text-[10px] ${muted}`}>
                Cash-only request — complete without target inventory decrement.
              </p>
            )}
            {sel.top_up_amount != null && (
              <p className={`text-[11px] ${muted}`}>
                {Number(sel.top_up_amount) > 0 ? (
                  <>
                    Customer top-up:{' '}
                    <span className="font-black text-[#B38B21] tabular-nums">
                      {formatGhs(Number(sel.top_up_amount))}
                    </span>
                  </>
                ) : Number(sel.target_product_price) > 0 &&
                  estimateVal > Number(sel.target_product_price) ? (
                  <>
                    No top-up — credit exceeds upgrade (refund ~
                    <span className="font-black text-emerald-500 tabular-nums">
                      {formatGhs(
                        Math.round(estimateVal - Number(sel.target_product_price)),
                      )}
                    </span>
                    )
                  </>
                ) : (
                  <>Balance even</>
                )}
              </p>
            )}
          </div>
        </DetailSection>

        {toDbTradeStatus(sel.status) === 'completed' && (
          <DetailSection
            id="completed"
            title="Completed — intake & stock"
            icon={<CheckCircle2 size={14} />}
            open={openSections.completed}
            onToggle={() => toggleSection('completed')}
            isLight={isLight}
          >
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 space-y-3">
              <p className={`text-[11px] leading-relaxed ${muted}`}>
                Target stock decrements on complete when a configuration is set. Incoming device is
                logged separately until refurbished.
              </p>
              {stockCheck && (
                <div className={`rounded-lg border border-emerald-500/30 px-3 py-2 text-[11px] ${isLight ? 'bg-white' : 'bg-black/40'}`}>
                  <p className="font-black uppercase text-[9px] text-emerald-500 tracking-wider mb-1">
                    Target stock check
                  </p>
                  <p className={title}>
                    {stockCheck.before != null ? stockCheck.before : '—'} →{' '}
                    {stockCheck.after != null ? stockCheck.after : '—'}
                    {stockCheck.before != null &&
                      stockCheck.after != null &&
                      stockCheck.after === stockCheck.before - 1 && (
                        <span className="ml-2 text-emerald-500 font-bold">verified −1</span>
                      )}
                  </p>
                </div>
              )}
              {intakeRows.length === 0 ? (
                <p className={`text-[10px] italic ${muted}`}>
                  No inventory adjustments found for this trade yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {intakeRows.map((adj) => (
                    <li
                      key={adj.id}
                      className={`rounded-lg border border-emerald-500/20 px-3 py-2 text-[11px] ${isLight ? 'bg-white text-black/70' : 'bg-black/30 text-[#D4D4D4]'}`}
                    >
                      <p className="font-bold text-emerald-600">
                        {adj.adjustment_type || 'adjustment'}
                        {adj.quantity_change != null ? ` · qty ${adj.quantity_change}` : ''}
                      </p>
                      {adj.reason && <p className={`mt-1 ${muted}`}>{adj.reason}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-[9px] uppercase tracking-wider">
                        {adj.product_id && (
                          <button
                            type="button"
                            onClick={() => void navigate({ to: '/admin/products' as any })}
                            className="text-[#B38B21] hover:underline"
                          >
                            Open products
                          </button>
                        )}
                        {adj.created_at && (
                          <span className={muted}>{new Date(adj.created_at).toLocaleString()}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DetailSection>
        )}
      </div>
    </div>
  );
};
