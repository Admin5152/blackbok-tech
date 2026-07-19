import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCcw, Smartphone, Plus, Trash2, Check, X, Send, DollarSign, Package, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { Badge, SearchInput, Modal, ModalClose, EmptyState, Td, Th, TableWrapper, TRADE_DEVICES_KEY } from './adminUtils';
import { useAppContext } from '../../App';
import { useNavigate } from '@tanstack/react-router';
import { getTradeRequests, updateTradeRequest } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import {
    isEligibleTradeUpgradeProduct,
    readStoredUpgradeProductIds,
    saveUpgradeProductIds,
} from '../../lib/tradeUpgradePicks';
import type { TradeRequest, ProductVariant } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { parseOfferInput, tradeHasValidOffer, tradeOfferAmount } from '../../lib/tradeOffer';
import {
  DEFAULT_TRADE_DEVICES,
  mergeTradeDevicesFromStorageArray,
  type TradeInCatalogDevice,
  TRADE_DEVICE_TYPE_OPTIONS,
} from '../../data/tradeInDevices';
import { getBrandsForDeviceType } from '../../data/deviceBrands';
import { formatTradePricingModeLabel } from '../../lib/tradeValuation';
import { AdminTradePricingModal } from './AdminTradePricingModal';
import { AdminFlowBar } from '../../components/FlowStepper';
import {
    TRADE_ADMIN_WORKFLOW,
    getTradeWorkflowStage,
    tradePricingPathDescription,
} from '../../lib/adminWorkflow';
import { tradeAdminErrorMessage } from '../../lib/tradeAdminApi';

const CONDITION_OPTIONS = ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'];
const TRADE_STATUS_LABELS: Record<string, string> = {
    submitted: 'Pending',
    inspecting: 'Inspecting',
    offer_made: 'Offer sent',
    awaiting_user: 'Awaiting User',
    accepted: 'Accepted',
    completed: 'Completed',
    rejected: 'Rejected',
};

const QUICK_TRADE_STATUSES = [
    'submitted',
    'inspecting',
    'offer_made',
    'awaiting_user',
    'accepted',
    'completed',
    'rejected',
] as const;

type QuickTradeStatus = (typeof QUICK_TRADE_STATUSES)[number];

const tradeUpdateErrorMessage = (e: unknown): string => {
    const raw = tradeAdminErrorMessage(e);
    // WHY: offer-requires-value and similar DB checks must reach staff verbatim
    if (/offer requires|offer value/i.test(raw)) {
        return raw;
    }
    if (/out of stock|insufficient stock/i.test(raw)) {
        return 'Cannot mark completed: target product or variant is out of stock. Restock or pick another SKU.';
    }
    if (/target variant/i.test(raw)) {
        return 'Cannot mark completed: pick a valid target variant for this catalogue product.';
    }
    return raw || 'Could not save trade update. Check your connection and try again.';
};

const OFFER_REQUIRED_STATUSES = new Set<QuickTradeStatus>(['offer_made', 'awaiting_user']);

const toDbTradeStatus = (status?: string) => {
    const value = String(status || '').trim();
    const lower = value.toLowerCase();
    if (TRADE_STATUS_LABELS[lower]) return lower;
    if (value === 'Pending') return 'submitted';
    if (value === 'Inspecting') return 'inspecting';
    if (value === 'Offer Made' || value === 'Offer sent') return 'offer_made';
    if (value === 'Awaiting User') return 'awaiting_user';
    if (value === 'Accepted') return 'accepted';
    if (value === 'Completed') return 'completed';
    if (value === 'Rejected') return 'rejected';
    return lower || 'submitted';
};

const toTradeStatusLabel = (status?: string) => {
    const dbStatus = toDbTradeStatus(status);
    return TRADE_STATUS_LABELS[dbStatus] || status || 'Pending';
};

const formatCatalogVariantLabel = (v: ProductVariant): string => {
    const parts = [v.color, v.storage, v.ram].filter(Boolean) as string[];
    const head = parts.length > 0 ? parts.join(' · ') : (v.name || v.sku || 'Variant');
    const sku = v.sku && !head.includes(v.sku) ? ` · ${v.sku}` : '';
    const st = v.stock != null ? ` — stock ${v.stock}` : '';
    return `${head}${sku}${st}`;
};

interface Props { canEdit?: boolean; }

export const AdminTrades: React.FC<Props> = ({ canEdit = true }) => {
    const { products, notify } = useAppContext();
    const navigate = useNavigate();
    const [trades, setTrades] = useState<TradeRequest[]>([]);
    const [devices, setDevices] = useState<TradeInCatalogDevice[]>(DEFAULT_TRADE_DEVICES);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [statusF, setStatusF] = useState('All');
    const [sel, setSel] = useState<TradeRequest | null>(null);
    const [offer, setOffer] = useState('');
    const [offerNote, setOfferNote] = useState('');
    const [condition, setCondition] = useState('');
    const [saving, setSaving] = useState(false);
    const [showDevMgr, setShowDevMgr] = useState(false);
    const [newDevName, setNewDevName] = useState('');
    const [newDevType, setNewDevType] = useState<TradeInCatalogDevice['deviceType']>('smartphone');
    const [newDevBrand, setNewDevBrand] = useState<string>('Other');

    const adminBrandOptions = useMemo(
        () => getBrandsForDeviceType(newDevType).map((b) => b.label),
        [newDevType],
    );
    const [newVariant, setNewVariant] = useState('');
    const [editDevId, setEditDevId] = useState<string | null>(null);
    const [showUpgradeMgr, setShowUpgradeMgr] = useState(false);
    const [showPricingMgr, setShowPricingMgr] = useState(false);
    const [upgradeMgrQ, setUpgradeMgrQ] = useState('');
    const [upgradePickDraftIds, setUpgradePickDraftIds] = useState<string[]>([]);
    const [draftTargetVariantId, setDraftTargetVariantId] = useState('');

    const reloadTrades = useCallback(() => {
        return getTradeRequests()
            .then(d => setTrades(d as any))
            .catch(e => {
                console.error('Trades load error:', e);
                notify?.('Could not load trade-ins.', 'error');
            });
    }, [notify]);

    // load trades from Supabase, devices from localStorage (admin-managed list)
    useEffect(() => {
        setLoading(true);
        void reloadTrades().finally(() => setLoading(false));
        try {
            const d = localStorage.getItem(TRADE_DEVICES_KEY);
            if (d) {
                const parsed = JSON.parse(d);
                setDevices(mergeTradeDevicesFromStorageArray(parsed));
            }
        } catch { /* keep DEFAULT_TRADE_DEVICES */ }
    }, [reloadTrades]);

    // Live refresh when another admin or the customer updates a row
    useEffect(() => {
        if (!supabase) return;
        const channel = supabase
            .channel('admin-trade-in-requests')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'trade_in_requests' },
                () => { void reloadTrades(); },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [reloadTrades]);

    useEffect(() => {
        if (!showUpgradeMgr) return;
        setUpgradePickDraftIds(readStoredUpgradeProductIds() ?? []);
        setUpgradeMgrQ('');
    }, [showUpgradeMgr]);

    useEffect(() => {
        if (!sel) {
            setDraftTargetVariantId('');
            return;
        }
        const pid = (sel as { target_product_id?: string }).target_product_id;
        const product = pid ? products.find((p) => p.id === pid) : null;
        const validVariants = (product?.variants || []).filter((v): v is ProductVariant & { id: string } => Boolean(v.id));
        const saved = (sel.targetVariantId ?? (sel as { target_variant_id?: string }).target_variant_id ?? '').trim();

        if (validVariants.length > 0) {
            const savedOk = Boolean(saved && validVariants.some((v) => v.id === saved));
            setDraftTargetVariantId(savedOk ? saved : validVariants[0].id);
        } else {
            setDraftTargetVariantId('');
        }
    }, [sel, products]);

    useEffect(() => {
        if (!sel) {
            setOffer('');
            setOfferNote('');
            setCondition('');
            return;
        }
        setCondition(sel.condition || '');
        const est = Number((sel as TradeRequest).estimated_value ?? sel.estimatedValue);
        const existingOffer = tradeOfferAmount(sel);
        if (existingOffer != null && existingOffer > 0) {
            setOffer(String(existingOffer));
        } else if (Number.isFinite(est) && est > 0) {
            setOffer(String(est));
        } else {
            setOffer('');
        }
    }, [sel?.id]);

    const saveDevices = (d: TradeInCatalogDevice[]) => {
        setDevices(d);
        localStorage.setItem(TRADE_DEVICES_KEY, JSON.stringify(d));
    };

    const patchTrade = useCallback(async (id: string, updates: Record<string, any>) => {
        setSaving(true);
        try {
            const payload = { ...updates, ...(updates.status ? { status: toDbTradeStatus(updates.status) } : {}) };
            const updated = await updateTradeRequest(id, payload);
            const fresh = await getTradeRequests();
            setTrades(fresh as any);
            setSel(prev => {
                if (!prev || prev.id !== id) return prev;
                return fresh.find(x => x.id === id) ?? updated ?? null;
            });
            if (updates.status && toDbTradeStatus(updates.status) === 'completed') {
                notify?.('Trade-in marked completed. Customer history and stock are updated.', 'success');
            }
            return true;
        } catch (e) {
            console.error(e);
            notify?.(tradeUpdateErrorMessage(e), 'error');
            return false;
        } finally {
            setSaving(false);
        }
    }, [notify]);

    // When the linked catalogue product has SKUs but the trade row has none yet, default the first variant server-side so completion cannot slip through on a null.
    useEffect(() => {
        if (!sel) return;
        const pid = (sel as { target_product_id?: string }).target_product_id;
        const product = pid ? products.find((p) => p.id === pid) : null;
        const validVariants = (product?.variants || []).filter((v): v is ProductVariant & { id: string } => Boolean(v.id));
        if (validVariants.length === 0) return;
        const saved = (sel.targetVariantId ?? (sel as { target_variant_id?: string }).target_variant_id ?? '').trim();
        const savedOk = Boolean(saved && validVariants.some((v) => v.id === saved));
        if (savedOk) return;
        void patchTrade(sel.id, { target_variant_id: validVariants[0].id });
    }, [sel, products, patchTrade]);

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
        const ok = await patchTrade(sel.id, {
            status: 'offer_made',
            condition,
            final_value: amount,
            offered_price: amount,
            admin_note: offerNote,
        });
        if (ok) {
            setOffer('');
            setOfferNote('');
            setCondition('');
        }
    };

    const statuses = ['All', 'submitted', 'inspecting', 'offer_made', 'awaiting_user', 'accepted', 'completed', 'rejected'];

    const tabCount = (s: string) => {
        if (s === 'All') return trades.length;
        return trades.filter(t => toDbTradeStatus(t.status) === s).length;
    };

    const formatTradeDate = (d?: string) => {
        if (!d) return '—';
        const dt = new Date(d);
        return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
    };

    const ql = q.trim().toLowerCase();
    const filtered = trades.filter(t => {
        const matchQ = !ql
            || (t.device || '').toLowerCase().includes(ql)
            || (t.userName || '').toLowerCase().includes(ql)
            || (t.userEmail || '').toLowerCase().includes(ql)
            || ((t as any).targetDevice || '').toLowerCase().includes(ql)
            || ((t as any).userDescription || '').toLowerCase().includes(ql)
            || String((t as any).display_id || '').toLowerCase().includes(ql)
            || String((t as any).imei_serial || '').toLowerCase().includes(ql)
            || String((t as any).contactPhone || (t as any).contact_phone || '').toLowerCase().includes(ql);
        const matchS = statusF === 'All' || toDbTradeStatus(t.status) === statusF;
        return matchQ && matchS;
    });

    const offerDisplay = (t: TradeRequest) => {
        const v = t.finalValue ?? (t as any).offeredPrice;
        return v != null && Number.isFinite(Number(v)) ? formatCurrency(Number(v)) : 'TBD';
    };

    const modalOfferRaw = sel ? (sel.finalValue ?? (sel as any).offeredPrice) : undefined;
    const modalHasOfferAmount =
        modalOfferRaw != null && modalOfferRaw !== '' && Number.isFinite(Number(modalOfferRaw));
    const showOfferReviewCard = !!sel && (modalHasOfferAmount || !!sel.condition);

    const addDevice = () => {
        if (!newDevName.trim()) return;
        const row: TradeInCatalogDevice = {
            id: `dev_${Date.now()}`,
            name: newDevName.trim(),
            deviceType: newDevType,
            brand: newDevBrand,
            img: '/other_device.png',
            variants: [],
        };
        saveDevices([...devices, row]);
        setNewDevName('');
        setNewDevType('smartphone');
        setNewDevBrand('Other');
    };
    const rmDevice = (id: string) => saveDevices(devices.filter(d => d.id !== id));
    const addVariant = (devId: string) => {
        if (!newVariant.trim()) return;
        saveDevices(devices.map(d => d.id === devId ? { ...d, variants: [...d.variants, newVariant.trim()] } : d));
        setNewVariant('');
        setEditDevId(null);
    };
    const rmVariant = (devId: string, v: string) => saveDevices(devices.map(d => d.id === devId ? { ...d, variants: d.variants.filter(x => x !== v) } : d));

    const uq = upgradeMgrQ.trim().toLowerCase();
    const upgradeCatalogRows = products.filter((p) => {
        if (!isEligibleTradeUpgradeProduct(p)) return false;
        if (!uq) return true;
        return (
            p.name.toLowerCase().includes(uq)
            || (p.brand || '').toLowerCase().includes(uq)
            || String(p.category || '').toLowerCase().includes(uq)
        );
    }).slice(0, 250);

    const productById = new Map(products.map((p) => [p.id, p]));

    const targetProductForReview = sel
        ? products.find((p) => p.id === (sel as { target_product_id?: string }).target_product_id) ?? null
        : null;

    const catalogTargetVariants = useMemo((): (ProductVariant & { id: string })[] => {
        if (!targetProductForReview) return [];
        return (targetProductForReview.variants || []).filter((v): v is ProductVariant & { id: string } => Boolean(v.id));
    }, [targetProductForReview]);

    const savedTargetVariantOnSel = (t: TradeRequest) =>
        (t.targetVariantId ?? (t as { target_variant_id?: string }).target_variant_id ?? '').trim();

    const persistTradeTargetVariantId = async (variantId: string | null) => {
        if (!sel) return;
        const trimmed = variantId && String(variantId).trim() ? String(variantId).trim() : null;
        await patchTrade(sel.id, { target_variant_id: trimmed });
    };

    const saveTradeTargetVariant = async () => {
        if (!sel) return;
        if (catalogTargetVariants.length > 0) {
            if (!draftTargetVariantId.trim()) {
                window.alert('This catalogue product has variants — pick a target variant before saving.');
                return;
            }
            await persistTradeTargetVariantId(draftTargetVariantId.trim());
            return;
        }
        await persistTradeTargetVariantId(null);
    };

    const ensureTargetVariantBeforeComplete = async (): Promise<boolean> => {
        if (!sel || catalogTargetVariants.length === 0) return true;
        const saved = savedTargetVariantOnSel(sel);
        const pick = (saved || draftTargetVariantId || catalogTargetVariants[0]?.id || '').trim();
        if (!pick) {
            notify?.('Pick a target variant before marking this trade completed.', 'error');
            return false;
        }
        if (!saved || saved !== pick) {
            await persistTradeTargetVariantId(pick);
        }
        return true;
    };

    const resolveOfferAmountForStatus = (): number | null => {
        const fromInput = parseOfferInput(offer);
        if (fromInput != null) return fromInput;
        return tradeOfferAmount(sel);
    };

    const canQuickSetOfferStatus = (s: QuickTradeStatus) => {
        if (!OFFER_REQUIRED_STATUSES.has(s)) return true;
        return resolveOfferAmountForStatus() != null;
    };

    const applyQuickTradeStatus = async (s: QuickTradeStatus) => {
        if (!sel) return;
        if (s === 'completed') {
            const ok = await ensureTargetVariantBeforeComplete();
            if (!ok) return;
        }
        if (OFFER_REQUIRED_STATUSES.has(s)) {
            const amount = resolveOfferAmountForStatus();
            if (amount == null) {
                notify?.('Enter an offer value in Send offer below before setting Offer sent or Awaiting User.', 'error');
                return;
            }
            if (s === 'offer_made' && !condition.trim()) {
                notify?.('Set device condition before sending an offer.', 'error');
                return;
            }
            const payload: Record<string, unknown> = {
                status: s,
                final_value: amount,
                offered_price: amount,
            };
            if (condition.trim()) payload.condition = condition;
            if (offerNote.trim()) payload.admin_note = offerNote;
            await patchTrade(sel.id, payload);
            return;
        }
        await patchTrade(sel.id, { status: s });
    };

    const markTradeCompleted = async () => {
        if (!sel) return;
        const ok = await ensureTargetVariantBeforeComplete();
        if (!ok) return;
        await patchTrade(sel.id, { status: 'completed' });
    };

    const addUpgradePick = (id: string) => {
        setUpgradePickDraftIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };
    const rmUpgradePick = (id: string) => setUpgradePickDraftIds((prev) => prev.filter((x) => x !== id));
    const moveUpgradePick = (index: number, dir: -1 | 1) => {
        const j = index + dir;
        if (j < 0 || j >= upgradePickDraftIds.length) return;
        setUpgradePickDraftIds((prev) => {
            const next = [...prev];
            [next[index], next[j]] = [next[j], next[index]];
            return next;
        });
    };
    const saveUpgradePicks = () => {
        const eligibleIds = upgradePickDraftIds.filter((id) => {
            const p = productById.get(id);
            return p && isEligibleTradeUpgradeProduct(p);
        });
        void saveUpgradeProductIds(eligibleIds).then(() => {
            setShowUpgradeMgr(false);
            notify?.('Upgrade target list saved.', 'success');
        }).catch((e: unknown) => {
            notify?.(e instanceof Error ? e.message : 'Could not save upgrade picks', 'error');
        });
    };

    return (
        <div className="space-y-5">
            <div className="bg-[#B38B21]/10 border border-[#B38B21]/25 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21]">Trade Admin</p>
                    <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                        Full lifecycle: queue flags, pricing editors, thresholds, config, questionnaire, aesthetics, audit.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void navigate({ to: '/admin/trade' })}
                    className="inline-flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl bg-[#B38B21] text-black text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37]"
                >
                    <ExternalLink size={12} /> Open Trade Admin
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total', val: trades.length, col: '#B38B21' },
                    { label: 'Pending', val: trades.filter(t => toDbTradeStatus(t.status) === 'submitted').length, col: '#f59e0b' },
                    { label: 'Offer out', val: trades.filter(t => ['offer_made', 'awaiting_user'].includes(toDbTradeStatus(t.status))).length, col: '#6366f1' },
                    { label: 'Completed', val: trades.filter(t => toDbTradeStatus(t.status) === 'completed').length, col: '#10b981' },
                ].map(s => (
                    <div key={s.label} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                        <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-2xl font-black" style={{ color: s.col }}>{s.val}</p>
                    </div>
                ))}
            </div>

            <div className="bg-[#B38B21]/5 border border-[#B38B21]/20 rounded-xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#B38B21] mb-2">Trade-in workflow</p>
                <p className="text-[10px] text-white/45 leading-relaxed mb-3">
                    Customer submits iPhone/iPad + component checklist → you inspect → send final offer → mark complete when upgrade stock is allocated.
                </p>
                <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-wider text-white/50">
                    <span className="px-2 py-1 rounded-lg bg-black/30">1 · Submitted + estimate</span>
                    <span>→</span>
                    <span className="px-2 py-1 rounded-lg bg-black/30">2 · Inspect device</span>
                    <span>→</span>
                    <span className="px-2 py-1 rounded-lg bg-black/30">3 · Send offer</span>
                    <span>→</span>
                    <span className="px-2 py-1 rounded-lg bg-black/30">4 · Complete + stock</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    {statuses.map(s => (
                        <button key={s} onClick={() => setStatusF(s)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusF === s ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                            {s === 'All' ? 'All' : (TRADE_STATUS_LABELS[s] || s)} <span className="opacity-60">({tabCount(s)})</span>
                        </button>
                    ))}
                </div>
                <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
                    <div className="min-w-0 w-full sm:min-w-[12rem] sm:max-w-md sm:flex-1">
                    <SearchInput value={q} onChange={setQ} placeholder="Search ID / IMEI / phone / name…" />
                    </div>
                    {canEdit && (
                        <>
                            <button type="button" onClick={() => setShowPricingMgr(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 text-white/60 hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all">
                                <DollarSign size={12} /> Pricing
                            </button>
                            <button
                                type="button"
                                onClick={() => void navigate({ to: '/admin/trade/upgrades' })}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 text-white/60 hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all"
                            >
                                <Package size={12} /> Upgrade targets
                            </button>
                            <button
                                type="button"
                                onClick={() => void navigate({ to: '/admin/trade/devices' })}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 text-white/60 hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all"
                            >
                                <Smartphone size={12} /> Tradable devices
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading trade requests...</div>
            ) : trades.length === 0 ? (
                <EmptyState icon={<RefreshCcw size={40} />} message="No trade-in requests yet" />
            ) : filtered.length === 0 ? (
                <EmptyState icon={<RefreshCcw size={40} />} message="No trade-in requests match your filters" />
            ) : (
                <TableWrapper>
                    <thead><tr>
                        <Th>Device</Th><Th>Customer</Th><Th>Target</Th><Th>Est. credit</Th><Th>Offer</Th><Th>Date</Th><Th>Status</Th><Th></Th>
                    </tr></thead>
                    <tbody>
                        {filtered.map(t => (
                            <tr key={t.id} className="hover:bg-white/[0.02] transition-all">
                                <Td><p className="text-xs font-black text-white">{t.device}</p></Td>
                                <Td>
                                    <p className="text-xs font-black text-white">{t.userName || '—'}</p>
                                    <p className="text-[10px] text-white/30">{t.userEmail}</p>
                                </Td>
                                <Td>
                                    <p className="text-xs text-white/50">{(t as any).targetDevice || '—'}</p>
                                    {(t.targetVariantId || (t as any).target_variant_id) && (
                                        <p className="text-[9px] text-emerald-400/90 font-bold uppercase tracking-wider mt-0.5">SKU linked</p>
                                    )}
                                </Td>
                                <Td>
                                    <p className="text-xs font-black text-[#B38B21]">
                                        {(t as TradeRequest).estimated_value != null || t.estimatedValue
                                            ? formatCurrency(Number((t as TradeRequest).estimated_value ?? t.estimatedValue))
                                            : '—'}
                                    </p>
                                    {(t as TradeRequest).pricing_mode && (
                                        <p className="text-[9px] text-white/30 mt-0.5">
                                            {formatTradePricingModeLabel((t as TradeRequest).pricing_mode)}
                                        </p>
                                    )}
                                </Td>
                                <Td><p className="text-xs font-black text-white/80">{offerDisplay(t)}</p></Td>
                                <Td><p className="text-[10px] text-white/30">{formatTradeDate(t.date)}</p></Td>
                                <Td><Badge status={toTradeStatusLabel(t.status)} /></Td>
                                <Td>
                                    <button onClick={() => setSel(t)} className="text-[10px] font-black text-[#B38B21] hover:text-[#D4AF37] uppercase">Review</button>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </TableWrapper>
            )}

            {/* Detail Modal */}
            {sel && (
                <Modal onClose={() => setSel(null)}>
                    <ModalClose onClose={() => setSel(null)} />
                    <div className="p-6">
                        <AdminFlowBar
                            steps={[...TRADE_ADMIN_WORKFLOW]}
                            activeKey={getTradeWorkflowStage(sel.status)}
                        />

                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Smartphone size={16} className="text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">{sel.device}</h3>
                                <p className="text-[10px] text-white/30">{sel.userName} · {sel.userEmail}</p>
                                <div className="mt-1"><Badge status={toTradeStatusLabel(sel.status)} /></div>
                            </div>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {[
                                ['Device', sel.device],
                                ['Type', (sel as TradeRequest).device_type === 'tablet' ? 'iPad' : (sel as TradeRequest).device_type === 'smartphone' ? 'iPhone' : '—'],
                                ['Pricing', formatTradePricingModeLabel((sel as TradeRequest).pricing_mode)],
                                ['Storage', (sel as TradeRequest).storage_tier || '—'],
                                ['SIM', (sel as TradeRequest).sim_variant || '—'],
                                ['Target', (sel as any).targetDevice || '—'],
                                ['Description', (sel as any).userDescription || '—'],
                                ['Preferred Date', (sel as any).preferredDate || '—'],
                                ['Contact', (sel as any).contactName || '—'],
                                ['Phone', (sel as any).contactPhone || '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="bg-black/40 rounded-xl p-2.5">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">{k}</p>
                                    <p className="text-xs text-white font-bold break-words">{v}</p>
                                </div>
                            ))}
                            <div className="bg-black/40 rounded-xl p-2.5 col-span-2">
                                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Pricing path</p>
                                <p className="text-xs font-bold text-white">
                                    {formatTradePricingModeLabel((sel as TradeRequest).pricing_mode)}
                                </p>
                                <p className="text-[9px] text-white/35 mt-1 leading-relaxed">
                                    {tradePricingPathDescription((sel as TradeRequest).pricing_mode)}
                                </p>
                            </div>
                            {Boolean((sel as { target_product_id?: string }).target_product_id) && (
                                <div className="bg-black/40 rounded-xl p-2.5 col-span-2">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Catalogue product</p>
                                    <p className="text-xs text-white font-bold break-words">
                                        {targetProductForReview?.name || (sel as { target_product_id?: string }).target_product_id || '—'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {(sel as TradeRequest).base_trade_value != null && (
                          <div className="bg-[#B38B21]/10 border border-[#B38B21]/20 rounded-xl p-3 mb-4 space-y-2">
                            <p className="text-[9px] text-[#B38B21] uppercase tracking-widest">Customer estimate</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-white/40">Base purchase</span>
                                <p className="font-bold text-white">{formatCurrency(Number((sel as TradeRequest).base_trade_value))}</p>
                              </div>
                              <div>
                                <span className="text-white/40">Est. credit</span>
                                <p className="font-bold text-[#B38B21]">{formatCurrency(Number(sel.estimatedValue || sel.estimated_value))}</p>
                              </div>
                              {(sel as TradeRequest).top_up_amount != null && (
                                <div className="col-span-2">
                                  <span className="text-white/40">Top-up quoted</span>
                                  <p className="font-bold text-white">{formatCurrency(Number((sel as TradeRequest).top_up_amount))}</p>
                                </div>
                              )}
                            </div>
                            {Array.isArray((sel as TradeRequest).deduction_breakdown) &&
                              (sel as TradeRequest).deduction_breakdown!.length > 0 && (
                                <ul className="text-[10px] text-white/50 space-y-0.5 pt-1 border-t border-white/10">
                                  {(sel as TradeRequest).deduction_breakdown!.map((line) => (
                                    <li key={line.key}>
                                      {line.label}: −{formatCurrency(line.amount)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </div>
                        )}

                        {/* Approved offer */}
                        {showOfferReviewCard && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                                <p className="text-[9px] text-green-400 uppercase tracking-widest">Current Offer</p>
                                {modalHasOfferAmount && (
                                    <p className="text-xl font-black text-green-400">
                                        {formatCurrency(Number(sel.finalValue ?? (sel as any).offeredPrice))}
                                    </p>
                                )}
                                {sel.condition && <p className="text-[10px] text-green-400/70 mt-0.5">Condition: {sel.condition}</p>}
                                {(sel as any).adminNote && <p className="text-xs text-white/50 mt-1">{(sel as any).adminNote}</p>}
                            </div>
                        )}

                        {canEdit && (
                            <div className="border-t border-white/5 pt-4 space-y-4">
                                {/* Target SKU for inventory on completion */}
                                <div className="bg-black/40 rounded-xl p-4 space-y-3">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Package size={12} className="text-[#B38B21]" /> Target stock (completed trade)
                                    </p>
                                    <p className="text-[9px] text-white/40 leading-relaxed">
                                        When you mark this trade <span className="text-white/60">Completed</span>, inventory decrements on the catalogue SKU below. If the linked product has no variant rows, stock uses product-level totals instead.
                                    </p>
                                    {targetProductForReview ? (
                                        <>
                                            {catalogTargetVariants.length > 0 ? (
                                                <>
                                                    <p className="text-[9px] text-white/40 leading-relaxed">
                                                        This product has multiple SKUs — a specific variant is required. The first SKU is selected by default; change it if stock should come from another row. Updates save immediately when you change the dropdown.
                                                    </p>
                                                    <div>
                                                        <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Variant / SKU</label>
                                                        <select
                                                            value={draftTargetVariantId || catalogTargetVariants[0]?.id || ''}
                                                            onChange={(e) => {
                                                                const next = e.target.value;
                                                                setDraftTargetVariantId(next);
                                                                void persistTradeTargetVariantId(next);
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
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-[9px] text-white/40 leading-relaxed">
                                                        This catalogue product has no variant rows — completed trades use <span className="text-white/60">product-level</span> stock only.
                                                    </p>
                                                    {savedTargetVariantOnSel(sel) ? (
                                                        <p className="text-[9px] text-amber-400/90">
                                                            A variant ID is still stored on this trade. Save to clear it and align with product-level inventory.
                                                        </p>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => void saveTradeTargetVariant()}
                                                        disabled={saving}
                                                        className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/10 text-white border border-white/10 hover:bg-[#B38B21]/20 hover:border-[#B38B21]/40 transition-all disabled:opacity-40"
                                                    >
                                                        {saving ? 'Saving…' : 'Save product-level target'}
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-[10px] text-white/35">
                                            No catalogue product linked yet — the customer has not chosen an upgrade target on the trade-in flow.
                                        </p>
                                    )}
                                </div>

                                {/* Quick status */}
                                <div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Quick Status</p>
                                    <div className="flex flex-wrap gap-2">
                                        {QUICK_TRADE_STATUSES.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => void applyQuickTradeStatus(s)}
                                                disabled={saving || !canQuickSetOfferStatus(s)}
                                                title={
                                                    !canQuickSetOfferStatus(s)
                                                        ? 'Enter offer value in Send offer section first'
                                                        : undefined
                                                }
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${toDbTradeStatus(sel.status) === s ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                            >
                                                {TRADE_STATUS_LABELS[s]}
                                            </button>
                                        ))}
                                    </div>
                                    {toDbTradeStatus(sel.status) !== 'completed' && (
                                        <button
                                            type="button"
                                            onClick={() => void markTradeCompleted()}
                                            disabled={saving}
                                            className="mt-3 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all disabled:opacity-40"
                                        >
                                            {saving ? 'Saving…' : 'Mark trade-in completed'}
                                        </button>
                                    )}
                                </div>

                                {/* Send offer */}
                                <div className="bg-black/40 rounded-xl p-4 space-y-3">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Send size={12} className="text-purple-400" /> Send offer after inspection
                                    </p>
                                    <p className="text-[9px] text-white/40 leading-relaxed">
                                        Compare with the customer estimate below after inspection. Sending sets status to Offer sent — the customer can accept or decline.
                                    </p>
                                    {(sel as TradeRequest).estimated_value != null && (
                                        <button
                                            type="button"
                                            onClick={() => setOffer(String(Number((sel as TradeRequest).estimated_value ?? sel.estimatedValue)))}
                                            className="text-[9px] font-black uppercase text-[#B38B21] hover:text-[#D4AF37]"
                                        >
                                            Use customer estimate ({formatCurrency(Number((sel as TradeRequest).estimated_value ?? sel.estimatedValue))})
                                        </button>
                                    )}
                                    <div>
                                        <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Set Condition (Admin Only)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {CONDITION_OPTIONS.map(c => (
                                                <button key={c} onClick={() => setCondition(c)}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${condition === c ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
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
                                            required
                                            value={offer}
                                            onChange={e => setOffer(e.target.value)}
                                            placeholder="Offer value (required)"
                                            className="w-full pl-8 pr-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:border-[#B38B21]/50 focus:outline-none"
                                        />
                                    </div>
                                    <textarea rows={2} value={offerNote} onChange={e => setOfferNote(e.target.value)} placeholder="Note to user (optional)..."
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none focus:border-[#B38B21]/50 focus:outline-none" />
                                    <button
                                        type="button"
                                        onClick={() => void sendOffer()}
                                        disabled={!parseOfferInput(offer) || !condition.trim() || saving}
                                        className="w-full py-2.5 bg-[#B38B21] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Send size={13} /> {saving ? 'Sending...' : 'Send offer to customer'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            <AdminTradePricingModal open={showPricingMgr} onClose={() => setShowPricingMgr(false)} />

            {/* Upgrade target picks (shop products shown on trade-in step 2) */}
            {showUpgradeMgr && (
                <Modal onClose={() => setShowUpgradeMgr(false)} maxW="max-w-4xl">
                    <ModalClose onClose={() => setShowUpgradeMgr(false)} />
                    <div className="p-6">
                        <h3 className="text-base font-black text-white mb-1">Manage upgrade picks</h3>
                        <p className="text-[10px] text-white/30 mb-4 leading-relaxed">
                            Choose which iPhone and iPad catalogue products appear as &quot;upgrade to&quot; options in the customer trade-in flow (step 2). Order is preserved. Saves to this browser only; clear the list to show all eligible iPhone / iPad products.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
                            <div className="flex flex-col min-h-0 border border-white/10 rounded-xl overflow-hidden bg-black/30">
                                <div className="p-3 border-b border-white/10 shrink-0">
                                    <SearchInput value={upgradeMgrQ} onChange={setUpgradeMgrQ} placeholder="Search catalogue..." />
                                </div>
                                <div className="max-h-[48vh] overflow-y-auto p-2 space-y-1">
                                    {upgradeCatalogRows.length === 0 ? (
                                        <p className="text-[10px] text-white/30 p-3">No products match.</p>
                                    ) : (
                                        upgradeCatalogRows.map((p) => (
                                            <div key={p.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
                                                {p.image && (
                                                    <img src={p.image} alt="" className="h-8 w-8 object-contain shrink-0 rounded" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                                                    <p className="text-[9px] text-white/35">{p.category} · ${p.price}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => addUpgradePick(p.id)}
                                                    disabled={upgradePickDraftIds.includes(p.id)}
                                                    className="shrink-0 px-2 py-1 rounded-lg bg-[#B38B21]/20 text-[#B38B21] text-[10px] font-black uppercase disabled:opacity-30 disabled:pointer-events-none hover:bg-[#B38B21]/30"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col min-h-0 border border-white/10 rounded-xl overflow-hidden bg-black/30">
                                <div className="p-3 border-b border-white/10 shrink-0 flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">Order ({upgradePickDraftIds.length})</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!window.confirm('Clear all picks and use default category filter on the trade-in page?')) return;
                                            setUpgradePickDraftIds([]);
                                        }}
                                        className="text-[9px] font-black uppercase text-white/40 hover:text-red-400"
                                    >
                                        Clear list
                                    </button>
                                </div>
                                <div className="max-h-[48vh] overflow-y-auto p-2 space-y-1 flex-1">
                                    {upgradePickDraftIds.length === 0 ? (
                                        <p className="text-[10px] text-white/30 p-3">Nothing selected — customers see all iPhone / iPad products.</p>
                                    ) : (
                                        upgradePickDraftIds.map((id, i) => {
                                            const p = productById.get(id);
                                            return (
                                                <div key={id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
                                                    {p?.image && (
                                                        <img src={p.image} alt="" className="h-8 w-8 object-contain shrink-0 rounded" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] font-bold text-white truncate">{p?.name || id}</p>
                                                        {p && <p className="text-[9px] text-white/35">${p.price}</p>}
                                                    </div>
                                                    <div className="flex flex-col shrink-0 gap-0.5">
                                                        <button type="button" aria-label="Move up" onClick={() => moveUpgradePick(i, -1)} disabled={i === 0} className="p-0.5 rounded text-white/40 hover:text-white disabled:opacity-20">
                                                            <ChevronUp size={14} />
                                                        </button>
                                                        <button type="button" aria-label="Move down" onClick={() => moveUpgradePick(i, 1)} disabled={i === upgradePickDraftIds.length - 1} className="p-0.5 rounded text-white/40 hover:text-white disabled:opacity-20">
                                                            <ChevronDown size={14} />
                                                        </button>
                                                    </div>
                                                    <button type="button" onClick={() => rmUpgradePick(id)} className="p-1.5 rounded-lg text-red-400/90 hover:bg-red-500/10 shrink-0" aria-label="Remove">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2 justify-end">
                            <button type="button" onClick={() => setShowUpgradeMgr(false)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white/50 border border-white/10 hover:text-white">
                                Cancel
                            </button>
                            <button type="button" onClick={saveUpgradePicks} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-[#B38B21] text-black hover:bg-[#D4AF37]">
                                Save picks
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Device Manager Modal */}
            {showDevMgr && (
                <Modal onClose={() => setShowDevMgr(false)} maxW="max-w-2xl">
                    <ModalClose onClose={() => setShowDevMgr(false)} />
                    <div className="p-6">
                        <h3 className="text-base font-black text-white mb-1">Manage Trade-In Devices</h3>
                        <p className="text-[10px] text-white/30 mb-4">
                            Edits save to this browser&apos;s storage and sync to the customer trade-in flow. Each row needs a <strong className="text-white/50">type</strong> and <strong className="text-white/50">brand</strong> so devices show under the right steps.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!window.confirm('Reset catalog to built-in defaults? Your custom devices will be removed from this browser.')) return;
                                    saveDevices([...DEFAULT_TRADE_DEVICES]);
                                }}
                                className="text-[10px] font-black uppercase text-white/40 hover:text-[#B38B21] border border-white/10 rounded-lg px-2 py-1.5"
                            >
                                Restore defaults
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            <input
                                value={newDevName}
                                onChange={e => setNewDevName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDevice(); } }}
                                placeholder="Device line name (e.g. Surface Pro)"
                                className="sm:col-span-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none"
                            />
                            <select
                                value={newDevType}
                                onChange={e => {
                                    const next = e.target.value as TradeInCatalogDevice['deviceType'];
                                    setNewDevType(next);
                                    const allowed = getBrandsForDeviceType(next).map((b) => b.label);
                                    if (!allowed.includes(newDevBrand)) setNewDevBrand('Other');
                                }}
                                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none"
                            >
                                {TRADE_DEVICE_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                            <select
                                value={newDevBrand}
                                onChange={e => setNewDevBrand(e.target.value)}
                                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none"
                            >
                                {adminBrandOptions.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 mb-5">
                            <button type="button" onClick={addDevice} className="w-full sm:w-auto px-4 py-2 bg-[#B38B21] text-black font-black text-xs uppercase rounded-xl hover:bg-[#D4AF37] transition-all flex items-center justify-center gap-1">
                                <Plus size={13} /> Add device line
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                            {devices.map(dev => (
                                <div key={dev.id} className="bg-black/40 border border-white/5 rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0">
                                            <span className="text-sm font-black text-white block truncate">{dev.name}</span>
                                            <span className="text-[9px] text-white/35 uppercase tracking-wider">{dev.deviceType} · {dev.brand}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button type="button" onClick={() => setEditDevId(editDevId === dev.id ? null : dev.id)} className="text-[10px] text-[#B38B21] font-black uppercase whitespace-nowrap">+ Variant</button>
                                            <button type="button" onClick={() => rmDevice(dev.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" aria-label={`Remove ${dev.name}`}><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                    {editDevId === dev.id && (
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                value={newVariant}
                                                onChange={e => setNewVariant(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariant(dev.id); } }}
                                                placeholder="e.g. iPhone 17 Pro"
                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                                            />
                                            <button type="button" onClick={() => addVariant(dev.id)} className="px-2.5 py-1.5 bg-[#B38B21] text-black font-black text-[10px] rounded-lg shrink-0" aria-label="Add variant"><Check size={12} /></button>
                                            <button type="button" onClick={() => { setEditDevId(null); setNewVariant(''); }} className="px-2.5 py-1.5 bg-white/5 text-white/40 text-[10px] rounded-lg shrink-0" aria-label="Cancel"><X size={12} /></button>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-1.5">
                                        {dev.variants.map(v => (
                                            <div key={`${dev.id}-${v}`} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
                                                <span className="text-[10px] text-white/50">{v}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => rmVariant(dev.id, v)}
                                                    className="text-red-400/90 hover:text-red-300 p-0.5 shrink-0"
                                                    aria-label={`Remove variant ${v}`}
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
