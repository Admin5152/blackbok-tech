import React, { useState, useEffect } from 'react';
import { Wrench, Send, DollarSign, UserCheck, Settings2 } from 'lucide-react';
import { RepairStorageImage } from '../../components/RepairStorageImage';
import { Badge, SearchInput, Modal, ModalClose, EmptyState, Td, Th, TableWrapper } from './adminUtils';
import { getRepairRequests, updateRepairRequest } from '../../lib/api';
import { useAdminRepairs } from '../../hooks/useAdminRepairs';
import type { RepairRequest } from '../../types';
import { formatCurrency } from '../../lib/utils';
import {
  formatDeviceTypeLabel,
  formatPricingModeLabel,
} from '../../lib/repairDeviceTypes';
import { AdminRepairPricingModal } from './AdminRepairPricingModal';
import { AdminFlowBar } from '../../components/FlowStepper';
import {
    REPAIR_ADMIN_WORKFLOW,
    getRepairWorkflowStage,
    parseRepairIssueTypes,
    repairCustomerMatrixTotal,
    repairPricingPathDescription,
} from '../../lib/adminWorkflow';
import { PRICING_MODE } from '../../lib/repairDeviceTypes';

interface Props { canEdit?: boolean; }

/** DB-style keys for filtering (aligned with `lib/api` repair status mapping). */
const REPAIR_STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    diagnosing: 'Diagnosing',
    estimate_sent: 'Estimate Sent',
    in_repair: 'In Repair',
    ready: 'Ready',
    completed: 'Completed',
    rejected: 'Rejected',
};

const toDbRepairStatus = (status?: string) => {
    const value = String(status || '').trim();
    const lower = value.toLowerCase().replace(/\s+/g, '_');
    if (REPAIR_STATUS_LABELS[lower]) return lower;
    if (value === 'Pending') return 'pending';
    if (value === 'Diagnosing') return 'diagnosing';
    if (value === 'Estimate Sent') return 'estimate_sent';
    if (value === 'In Repair') return 'in_repair';
    if (value === 'Ready') return 'ready';
    if (value === 'Completed') return 'completed';
    if (value === 'Rejected') return 'rejected';
    return lower || 'pending';
};

const toRepairStatusLabel = (status?: string) => {
    const db = toDbRepairStatus(status);
    return REPAIR_STATUS_LABELS[db] || status || 'Pending';
};

export const AdminRepairs: React.FC<Props> = ({ canEdit = true }) => {
    const [repairs, setRepairs] = useState<RepairRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [statusF, setStatusF] = useState('All');
    const [pricingF, setPricingF] = useState<'all' | 'apple_matrix' | 'diagnostic_quote'>('all');
    const [sel, setSel] = useState<RepairRequest | null>(null);
    const [estimate, setEstimate] = useState('');
    const [estimateNote, setEstimateNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [showPricingMgr, setShowPricingMgr] = useState(false);

    const { technicians, assignTechnician } = useAdminRepairs();

    const patchRepair = async (id: string, updates: Record<string, any>) => {
        setSaving(true);
        try {
            await updateRepairRequest(id, updates as Partial<RepairRequest>);
            const fresh = await getRepairRequests();
            setRepairs(fresh as any);
            setSel((prev) => (prev && prev.id === id ? fresh.find((x) => x.id === id) ?? null : prev));
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    /** Same idea as trade-in “offer sent”: diagnosis/quote is done; customer is notified to approve. */
    const sendEstimate = async () => {
        if (!sel || !estimate) return;
        const amount = parseFloat(estimate);
        if (!Number.isFinite(amount) || amount <= 0) return;
        await patchRepair(sel.id, {
            status: 'estimate_sent',
            estimated_cost: amount,
            admin_note: estimateNote || undefined,
        });
        setEstimate('');
        setEstimateNote('');
    };

    const technicianLabel = (id: string | null | undefined) => {
        if (!id) return null;
        const tech = technicians.find(t => t.user_id === id);
        if (!tech) return id.slice(0, 8);
        return tech.name || tech.email || id.slice(0, 8);
    };

    const handleAssignTechnician = async (technicianId: string | null) => {
        if (!sel) return;
        setAssigning(true);
        try {
            await assignTechnician(sel.id, technicianId);
            const fresh = await getRepairRequests();
            setRepairs(fresh as any);
            setSel((prev) => (prev ? fresh.find((x) => x.id === prev.id) ?? prev : null));
        } catch (e) {
            console.error('Assign technician failed:', e);
        } finally {
            setAssigning(false);
        }
    };

    const statuses = ['All', 'pending', 'diagnosing', 'estimate_sent', 'in_repair', 'ready', 'completed', 'rejected'];

    useEffect(() => {
        getRepairRequests()
            .then(d => setRepairs(d as any))
            .catch(e => console.error('Repairs load error:', e))
            .finally(() => setLoading(false));
    }, []);

    const tabCount = (s: string) => {
        if (s === 'All') return repairs.length;
        return repairs.filter((r) => toDbRepairStatus(r.status) === s).length;
    };

    const pricingTabCount = (mode: 'all' | 'apple_matrix' | 'diagnostic_quote') => {
        if (mode === 'all') return repairs.length;
        return repairs.filter((r) => r.pricing_mode === mode).length;
    };

    const repairCostNum = (r: RepairRequest) => {
        const raw = (r as any).estimated_cost;
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
        return parseFloat(String(r.estimatedCost || '0').replace(/[^0-9.]/g, '')) || 0;
    };

    useEffect(() => {
        if (!sel) {
            setEstimate('');
            setEstimateNote('');
            return;
        }
        const matrixTotal = repairCustomerMatrixTotal(sel);
        const existing = repairCostNum(sel);
        if (sel.pricing_mode === PRICING_MODE.APPLE_MATRIX && matrixTotal != null && existing <= 0) {
            setEstimate(String(matrixTotal));
        } else if (existing > 0) {
            setEstimate(String(existing));
        }
    }, [sel?.id]);

    const ql = q.trim().toLowerCase();
    const filtered = repairs.filter((r) => {
        const matchQ = !ql
            || (r.device || '').toLowerCase().includes(ql)
            || (r.userName || '').toLowerCase().includes(ql)
            || (r.issue || '').toLowerCase().includes(ql)
            || (r.issue_type || '').toLowerCase().includes(ql);
        const matchS = statusF === 'All' || toDbRepairStatus(r.status) === statusF;
        const matchP =
            pricingF === 'all'
            || r.pricing_mode === pricingF
            || (pricingF === 'diagnostic_quote' && !r.pricing_mode);
        return matchQ && matchS && matchP;
    });

    const repairRevenue = repairs
        .filter((r) => toDbRepairStatus(r.status) === 'completed')
        .reduce((s, r) => s + repairCostNum(r), 0);

    const modalEstimateNum = sel ? repairCostNum(sel) : 0;
    const modalHasEstimate = sel != null && modalEstimateNum > 0;
    const showEstimateReviewCard = !!sel && (modalHasEstimate || !!(sel as any).adminNote);

    const formatRepairDate = (d?: string) => {
        if (!d) return '—';
        const dt = new Date(d);
        return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
    };

    return (
        <div className="space-y-5">
            {/* Stats — mirror trade-in admin cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total', val: repairs.length, col: '#f97316' },
                    { label: 'Pending', val: repairs.filter((r) => toDbRepairStatus(r.status) === 'pending').length, col: '#f59e0b' },
                    {
                        label: 'Estimate out',
                        val: repairs.filter((r) => toDbRepairStatus(r.status) === 'estimate_sent').length,
                        col: '#6366f1',
                    },
                    { label: 'Completed', val: repairs.filter((r) => toDbRepairStatus(r.status) === 'completed').length, col: '#10b981' },
                ].map((s) => (
                    <div key={s.label} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                        <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-2xl font-black" style={{ color: s.col }}>{s.val}</p>
                    </div>
                ))}
            </div>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">
                Completed repair revenue (GHS):{' '}
                <span className="text-[#B38B21]">{formatCurrency(repairRevenue)}</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1">iPhone matrix flow</p>
                    <p className="text-[10px] text-white/45 leading-relaxed">
                        Apple iPhone + priced issues → customer sees matrix total at submit. You confirm after inspection, then send estimate for approval.
                    </p>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Diagnostic flow</p>
                    <p className="text-[10px] text-white/45 leading-relaxed">
                        Samsung, laptops, tablets, etc. → no matrix. Diagnose, enter a manual quote, send estimate when ready.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {statuses.map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusF(s)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusF === s ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
                        >
                            {s === 'All' ? 'All' : REPAIR_STATUS_LABELS[s] || s}{' '}
                            <span className="opacity-60">({tabCount(s)})</span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    {([
                        ['all', 'All pricing'],
                        ['apple_matrix', 'iPhone matrix'],
                        ['diagnostic_quote', 'Diagnostic'],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setPricingF(key)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                pricingF === key ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-white/5 text-white/40 hover:text-white border border-transparent'
                            }`}
                        >
                            {label} <span className="opacity-60">({pricingTabCount(key)})</span>
                        </button>
                    ))}
                </div>
                <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                {canEdit && (
                    <button
                        type="button"
                        onClick={() => setShowPricingMgr(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 text-white/60 hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all shrink-0"
                    >
                        <Settings2 size={12} /> Matrix prices
                    </button>
                )}
                <SearchInput value={q} onChange={setQ} placeholder="Search repairs..." />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading repair requests...</div>
            ) : repairs.length === 0 ? (
                <EmptyState icon={<Wrench size={40} />} message="No repair requests yet. Customers can submit from the Repair page while signed in." />
            ) : filtered.length === 0 ? (
                <EmptyState icon={<Wrench size={40} />} message="No repair requests match your filters." />
            ) : (
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>Device</Th>
                            <Th>Customer</Th>
                            <Th>Issue</Th>
                            <Th>Estimate</Th>
                            <Th>Pricing</Th>
                            <Th>Date</Th>
                            <Th>Status</Th>
                            <Th></Th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r) => (
                            <tr key={r.id} className="hover:bg-white/[0.02] transition-all">
                                <Td>
                                    <p className="text-xs font-black text-white">{r.device}</p>
                                </Td>
                                <Td>
                                    <p className="text-xs font-black text-white">{r.userName || '—'}</p>
                                </Td>
                                <Td>
                                    <p className="text-xs text-white/50 max-w-[180px] truncate">{r.issue || '—'}</p>
                                </Td>
                                <Td>
                                    <p className="text-xs font-black text-[#B38B21]">
                                        {repairCostNum(r) > 0 ? formatCurrency(repairCostNum(r)) : 'TBD'}
                                    </p>
                                </Td>
                                <Td>
                                    <p className="text-[10px] text-white/50 max-w-[120px] leading-snug">
                                        {formatPricingModeLabel(r.pricing_mode)}
                                    </p>
                                </Td>
                                <Td>
                                    <p className="text-[10px] text-white/30">{formatRepairDate(r.date)}</p>
                                </Td>
                                <Td>
                                    <Badge status={toRepairStatusLabel(r.status)} />
                                </Td>
                                <Td>
                                    <button
                                        onClick={() => setSel(r)}
                                        className="text-[10px] font-black text-[#B38B21] hover:text-[#D4AF37] uppercase"
                                    >
                                        Review
                                    </button>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </TableWrapper>
            )}

            {/* Repair Detail Modal */}
            {sel && (
                <Modal onClose={() => setSel(null)}>
                    <ModalClose onClose={() => setSel(null)} />
                    <div className="p-6">
                        <AdminFlowBar
                            steps={[...REPAIR_ADMIN_WORKFLOW]}
                            activeKey={getRepairWorkflowStage(sel.status)}
                            accent="#f97316"
                        />

                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Wrench size={16} className="text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">{sel.device}</h3>
                                <p className="text-[10px] text-white/30">{sel.userName}</p>
                                {(sel as any).display_id && (
                                    <p className="text-[9px] text-[#B38B21] font-black uppercase tracking-widest mt-0.5">{(sel as any).display_id}</p>
                                )}
                                <div className="mt-1">
                                    <Badge status={toRepairStatusLabel(sel.status)} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="bg-black/40 rounded-xl p-3">
                                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Issue Description</p>
                                <p className="text-xs text-white leading-relaxed">{sel.issue || '—'}</p>
                            </div>
                            {sel.aiDiagnosis && (
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">AI Diagnosis</p>
                                    <p className="text-xs text-white/60 leading-relaxed">{sel.aiDiagnosis}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/40 rounded-xl p-2.5">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Date</p>
                                    <p className="text-xs font-bold text-white">{formatRepairDate(sel.date)}</p>
                                </div>
                                <div className="bg-black/40 rounded-xl p-2.5">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Category</p>
                                    <p className="text-xs font-bold text-white">
                                        {formatDeviceTypeLabel(sel.device_type)}
                                    </p>
                                </div>
                                <div className="bg-black/40 rounded-xl p-2.5 col-span-2">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Pricing path</p>
                                    <p className="text-xs font-bold text-white">
                                        {formatPricingModeLabel(sel.pricing_mode)}
                                    </p>
                                    <p className="text-[9px] text-white/35 mt-1 leading-relaxed">
                                        {repairPricingPathDescription(sel.pricing_mode)}
                                    </p>
                                </div>
                            </div>

                            {sel.pricing_mode === PRICING_MODE.APPLE_MATRIX && (
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 space-y-2">
                                    <p className="text-[9px] text-orange-400 uppercase tracking-widest">Customer matrix selection</p>
                                    {parseRepairIssueTypes(sel.issue_type || (sel as { issueType?: string }).issueType).length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {parseRepairIssueTypes(sel.issue_type || (sel as { issueType?: string }).issueType).map((label) => (
                                                <span key={label} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/30 text-white/70">
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-white/40">No issue tags recorded.</p>
                                    )}
                                    {repairCustomerMatrixTotal(sel) != null && (
                                        <p className="text-sm font-black text-orange-300">
                                            Matrix total at submit: {formatCurrency(repairCustomerMatrixTotal(sel)!)}
                                        </p>
                                    )}
                                </div>
                            )}

                            {sel.pricing_mode === PRICING_MODE.DIAGNOSTIC_QUOTE && (
                                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                                    <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Diagnostic path</p>
                                    <p className="text-[10px] text-white/45 leading-relaxed">
                                        No matrix pricing for this device. Complete diagnosis, then send a manual estimate below.
                                    </p>
                                </div>
                            )}

                            {!sel.pricing_mode && (
                                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                                    <p className="text-[9px] text-white/40 uppercase tracking-widest">Legacy request</p>
                                    <p className="text-[10px] text-white/45 mt-1">Pricing path not recorded — use diagnostic workflow.</p>
                                </div>
                            )}

                            {showEstimateReviewCard && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                                    <p className="text-[9px] text-green-400 uppercase tracking-widest">Current estimate</p>
                                    {modalHasEstimate && (
                                        <p className="text-xl font-black text-green-400">{formatCurrency(modalEstimateNum)}</p>
                                    )}
                                    {(sel as any).adminNote && (
                                        <p className="text-xs text-white/50 mt-1">{(sel as any).adminNote}</p>
                                    )}
                                </div>
                            )}

                            {sel.imageUrl && (
                                <div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Device Photo</p>
                                    <RepairStorageImage
                                        stored={sel.imageUrl}
                                        alt=""
                                        className="w-full max-h-40 object-cover rounded-xl bg-white/5"
                                        expiresIn={7200}
                                    />
                                </div>
                            )}
                        </div>

                        {canEdit && (
                            <div className="border-t border-white/5 pt-4 space-y-4">
                                <div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Quick status</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(['pending', 'diagnosing', 'in_repair', 'completed', 'rejected'] as const).map((db) => (
                                            <button
                                                key={db}
                                                onClick={() => patchRepair(sel.id, { status: REPAIR_STATUS_LABELS[db] })}
                                                disabled={saving}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                                    toDbRepairStatus(sel.status) === db ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'
                                                }`}
                                            >
                                                {REPAIR_STATUS_LABELS[db]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-black/40 rounded-xl p-4 space-y-3">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <UserCheck size={12} className="text-orange-400" /> Assigned Technician
                                    </p>
                                    {sel.assigned_technician ? (
                                        <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-white truncate">
                                                    {technicianLabel(sel.assigned_technician) || 'Unknown technician'}
                                                </p>
                                                <p className="text-[9px] text-white/30 uppercase tracking-widest">Currently assigned</p>
                                            </div>
                                            <button
                                                onClick={() => handleAssignTechnician(null)}
                                                disabled={assigning}
                                                className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-300/80 hover:text-red-200 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                            >
                                                {assigning ? '…' : 'Unassign'}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Not assigned</p>
                                    )}

                                    <select
                                        value={sel.assigned_technician ?? ''}
                                        onChange={(e) => handleAssignTechnician(e.target.value || null)}
                                        disabled={assigning || technicians.length === 0}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none disabled:opacity-50"
                                    >
                                        <option value="">{technicians.length === 0 ? 'No technicians available' : 'Select a technician…'}</option>
                                        {technicians.map((t) => (
                                            <option key={t.user_id} value={t.user_id}>
                                                {t.name || t.email || t.user_id.slice(0, 8)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-black/40 rounded-xl p-4 space-y-3">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Send size={12} className="text-orange-400" /> Send estimate after diagnosis
                                    </p>
                                    <p className="text-[9px] text-white/40 leading-relaxed">
                                        {sel.pricing_mode === PRICING_MODE.APPLE_MATRIX
                                            ? 'Confirm or adjust the matrix total after inspection, then send for customer approval.'
                                            : 'Enter your diagnosed repair cost. Sending sets status to Estimate sent.'}
                                    </p>
                                    {sel.pricing_mode === PRICING_MODE.APPLE_MATRIX && repairCustomerMatrixTotal(sel) != null && (
                                        <button
                                            type="button"
                                            onClick={() => setEstimate(String(repairCustomerMatrixTotal(sel)!))}
                                            className="text-[9px] font-black uppercase text-orange-400 hover:text-orange-300"
                                        >
                                            Use customer matrix total ({formatCurrency(repairCustomerMatrixTotal(sel)!)})
                                        </button>
                                    )}
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="number"
                                            value={estimate}
                                            onChange={(e) => setEstimate(e.target.value)}
                                            placeholder="Repair cost (GHS)"
                                            className="w-full pl-8 pr-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:border-[#B38B21]/50 focus:outline-none"
                                        />
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={estimateNote}
                                        onChange={(e) => setEstimateNote(e.target.value)}
                                        placeholder="Note to customer (optional)…"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none focus:border-[#B38B21]/50 focus:outline-none"
                                    />
                                    <button
                                        onClick={sendEstimate}
                                        disabled={!estimate || saving}
                                        className="w-full py-2.5 bg-[#B38B21] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                    >
                                        <Send size={13} /> {saving ? 'Sending…' : 'Send estimate to customer'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            <AdminRepairPricingModal open={showPricingMgr} onClose={() => setShowPricingMgr(false)} />
        </div>
    );
};
