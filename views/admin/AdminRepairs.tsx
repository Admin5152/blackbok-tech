import React, { useState, useEffect } from 'react';
import { Wrench, Send, DollarSign } from 'lucide-react';
import { Badge, SearchInput, Modal, ModalClose, EmptyState, Td, Th, TableWrapper } from './adminUtils';
import { getRepairRequests, updateRepairRequest } from '../../lib/api';
import type { RepairRequest } from '../../types';

interface Props { canEdit?: boolean; }

export const AdminRepairs: React.FC<Props> = ({ canEdit = true }) => {
    const [repairs, setRepairs] = useState<RepairRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [statusF, setStatusF] = useState('All');
    const [sel, setSel] = useState<RepairRequest | null>(null);
    const [estimate, setEstimate] = useState('');
    const [estimateNote, setEstimateNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getRepairRequests()
            .then(d => setRepairs(d as any))
            .catch(e => console.error('Repairs load error:', e))
            .finally(() => setLoading(false));
    }, []);

    const patchRepair = async (id: string, updates: Record<string, any>) => {
        setSaving(true);
        try {
            await updateRepairRequest(id, updates);
            setRepairs(prev => prev.map(r => r.id === id ? { ...r, ...updates, status: updates.status ?? r.status } : r));
            setSel(prev => prev?.id === id ? { ...prev, ...updates } : prev);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const sendEstimate = async () => {
        if (!sel || !estimate) return;
        await patchRepair(sel.id, {
            status: 'Estimate Sent',
            estimated_cost: `$${estimate}`,
            admin_note: estimateNote,
        });
        setEstimate(''); setEstimateNote('');
    };

    const statuses = ['All', 'Received', 'Diagnosing', 'Estimate Sent', 'In Repair', 'Ready', 'Completed', 'Rejected'];

    const filtered = repairs.filter(r => {
        const matchQ = (r.device || '').toLowerCase().includes(q.toLowerCase())
            || (r.userName || '').toLowerCase().includes(q.toLowerCase());
        const matchS = statusF === 'All' || r.status === statusF;
        return matchQ && matchS;
    });

    const repairRevenue = repairs
        .filter(r => r.status === 'Completed')
        .reduce((s, r) => s + parseFloat((r.estimatedCost || '0').replace(/[^0-9.]/g, '')) || 0, 0);

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Repairs', val: repairs.length, col: '#f97316' },
                    { label: 'Active', val: repairs.filter(r => !['Completed', 'Rejected'].includes(r.status)).length, col: '#f59e0b' },
                    { label: 'Completed', val: repairs.filter(r => r.status === 'Completed').length, col: '#10b981' },
                    { label: 'Revenue', val: `$${repairRevenue.toLocaleString()}`, col: '#B38B21' },
                ].map(s => (
                    <div key={s.label} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                        <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-2xl font-black" style={{ color: s.col }}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {statuses.map(s => (
                        <button key={s} onClick={() => setStatusF(s)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusF === s ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                            {s}
                        </button>
                    ))}
                </div>
                <SearchInput value={q} onChange={setQ} placeholder="Search repairs..." />
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading repair requests...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={<Wrench size={40} />} message="No repair requests match your filters" />
            ) : (
                <TableWrapper>
                    <thead><tr>
                        <Th>Device</Th><Th>Customer</Th><Th>Issue</Th><Th>Est. Cost</Th><Th>Date</Th><Th>Status</Th><Th></Th>
                    </tr></thead>
                    <tbody>
                        {filtered.map(r => (
                            <tr key={r.id} className="hover:bg-white/[0.02] transition-all">
                                <Td><p className="text-xs font-black text-white">{r.device}</p></Td>
                                <Td><p className="text-xs font-black text-white">{r.userName || '—'}</p></Td>
                                <Td><p className="text-xs text-white/50 max-w-[180px] truncate">{r.issue || '—'}</p></Td>
                                <Td><p className="text-xs font-black text-[#B38B21]">{r.estimatedCost || 'TBD'}</p></Td>
                                <Td><p className="text-[10px] text-white/30">{new Date(r.date).toLocaleDateString()}</p></Td>
                                <Td><Badge status={r.status} /></Td>
                                <Td>
                                    <button onClick={() => setSel(r)} className="text-[10px] font-black text-[#B38B21] hover:text-[#D4AF37] uppercase">Review</button>
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
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Wrench size={16} className="text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">{sel.device}</h3>
                                <p className="text-[10px] text-white/30">{sel.userName}</p>
                                <div className="mt-1"><Badge status={sel.status} /></div>
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
                                    <p className="text-xs font-bold text-white">{new Date(sel.date).toLocaleDateString()}</p>
                                </div>
                                {sel.estimatedCost && (
                                    <div className="bg-[#B38B21]/10 border border-[#B38B21]/20 rounded-xl p-2.5">
                                        <p className="text-[9px] text-[#B38B21] uppercase tracking-widest mb-0.5">Sent Estimate</p>
                                        <p className="text-sm font-black text-[#B38B21]">{sel.estimatedCost}</p>
                                    </div>
                                )}
                            </div>
                            {(sel as any).adminNote && (
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[9px] text-white/30 uppercase mb-0.5">Admin Note</p>
                                    <p className="text-xs text-white/50">{(sel as any).adminNote}</p>
                                </div>
                            )}
                            {sel.imageUrl && (
                                <div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Device Photo</p>
                                    <img src={sel.imageUrl} alt="" className="w-full max-h-40 object-cover rounded-xl bg-white/5" />
                                </div>
                            )}
                        </div>

                        {canEdit && (
                            <div className="border-t border-white/5 pt-4 space-y-4">
                                {/* Status pipeline */}
                                <div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Update Status</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(['Received', 'Diagnosing', 'In Repair', 'Ready', 'Completed', 'Rejected'] as RepairRequest['status'][]).map(s => (
                                            <button key={s} onClick={() => patchRepair(sel.id, { status: s })} disabled={saving}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${sel.status === s ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Send estimate */}
                                <div className="bg-black/40 rounded-xl p-4 space-y-3">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Send size={12} className="text-orange-400" /> Send Repair Estimate to User
                                    </p>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input type="number" value={estimate} onChange={e => setEstimate(e.target.value)} placeholder="Repair cost"
                                            className="w-full pl-8 pr-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:border-[#B38B21]/50 focus:outline-none" />
                                    </div>
                                    <textarea rows={2} value={estimateNote} onChange={e => setEstimateNote(e.target.value)} placeholder="Note to user..."
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none focus:border-[#B38B21]/50 focus:outline-none" />
                                    <button onClick={sendEstimate} disabled={!estimate || saving}
                                        className="w-full py-2.5 bg-[#B38B21] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                        <Send size={13} /> {saving ? 'Sending...' : 'Send Estimate'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};
