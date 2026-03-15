import React, { useState, useEffect } from 'react';
import { RefreshCcw, Smartphone, Plus, Trash2, Check, X, ChevronDown, Send, DollarSign } from 'lucide-react';
import { Badge, SearchInput, Modal, ModalClose, EmptyState, Td, Th, TableWrapper, TRADE_DEVICES_KEY } from './adminUtils';
import { getTradeRequests, updateTradeRequest } from '../../lib/api';
import type { TradeRequest } from '../../types';

const DEFAULT_TRADE_DEVICES = [
    { id: 'iphone', name: 'iPhone', variants: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone 11', 'iPhone X', 'Other iPhone'] },
    { id: 'samsung', name: 'Samsung Phone', variants: ['Galaxy S25 Ultra', 'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23', 'Galaxy Z Fold', 'Galaxy Z Flip', 'Galaxy A Series', 'Other Samsung'] },
    { id: 'pixel', name: 'Google Pixel', variants: ['Pixel 9 Pro', 'Pixel 9', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7', 'Other Pixel'] },
    { id: 'macbook', name: 'MacBook', variants: ['MacBook Pro M4', 'MacBook Pro M3', 'MacBook Air M3', 'MacBook Air M2', 'MacBook Air M1', 'MacBook Pro M1', 'Older MacBook'] },
    { id: 'ipad', name: 'iPad', variants: ['iPad Pro M4', 'iPad Pro M2', 'iPad Air M2', 'iPad Air M1', 'iPad (10th gen)', 'iPad mini', 'Older iPad'] },
    { id: 'laptop', name: 'Laptop', variants: ['Dell XPS', 'HP Spectre', 'Lenovo ThinkPad', 'Microsoft Surface', 'Asus ZenBook', 'Other Laptop'] },
    { id: 'gaming', name: 'Gaming Console', variants: ['PS5', 'PS4 Pro', 'PS4', 'Xbox Series X', 'Xbox Series S', 'Xbox One', 'Nintendo Switch OLED', 'Nintendo Switch'] },
    { id: 'watch', name: 'Smartwatch', variants: ['Apple Watch Series 10', 'Apple Watch Ultra 2', 'Apple Watch SE', 'Galaxy Watch 7', 'Pixel Watch 3', 'Other Smartwatch'] },
    { id: 'other', name: 'Other Device', variants: ['AirPods Pro', 'AirPods', 'Headphones', 'Camera', 'Monitor', 'Other'] },
];

const CONDITION_OPTIONS = ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'];

interface Props { canEdit?: boolean; }

export const AdminTrades: React.FC<Props> = ({ canEdit = true }) => {
    const [trades, setTrades] = useState<TradeRequest[]>([]);
    const [devices, setDevices] = useState(DEFAULT_TRADE_DEVICES);
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
    const [newVariant, setNewVariant] = useState('');
    const [editDevId, setEditDevId] = useState<string | null>(null);

    // load trades from Supabase, devices from localStorage (admin-managed list)
    useEffect(() => {
        getTradeRequests()
            .then(d => setTrades(d as any))
            .catch(e => console.error('Trades load error:', e))
            .finally(() => setLoading(false));
        try {
            const d = localStorage.getItem(TRADE_DEVICES_KEY);
            if (d) setDevices(JSON.parse(d));
        } catch { }
    }, []);

    const saveDevices = (d: typeof devices) => {
        setDevices(d);
        localStorage.setItem(TRADE_DEVICES_KEY, JSON.stringify(d));
    };

    const patchTrade = async (id: string, updates: Record<string, any>) => {
        setSaving(true);
        try {
            await updateTradeRequest(id, updates);
            setTrades(prev => prev.map(t => t.id === id ? { ...t, ...updates, status: updates.status ?? t.status } : t));
            setSel(prev => prev?.id === id ? { ...prev, ...updates } : prev);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const sendOffer = async () => {
        if (!sel || !offer || !condition) return;
        await patchTrade(sel.id, {
            status: 'Awaiting User',
            condition,
            final_value: parseFloat(offer),
            admin_note: offerNote,
        });
        setOffer(''); setOfferNote(''); setCondition('');
    };

    const statuses = ['All', 'Pending', 'Inspecting', 'Offer Made', 'Awaiting User', 'Accepted', 'Completed', 'Rejected'];

    const filtered = trades.filter(t => {
        const matchQ = (t.device || '').toLowerCase().includes(q.toLowerCase())
            || (t.userName || '').toLowerCase().includes(q.toLowerCase());
        const matchS = statusF === 'All' || t.status === statusF;
        return matchQ && matchS;
    });

    const addDevice = () => { if (!newDevName.trim()) return; saveDevices([...devices, { id: `dev_${Date.now()}`, name: newDevName.trim(), variants: [] }]); setNewDevName(''); };
    const rmDevice = (id: string) => saveDevices(devices.filter(d => d.id !== id));
    const addVariant = (devId: string) => { if (!newVariant.trim()) return; saveDevices(devices.map(d => d.id === devId ? { ...d, variants: [...d.variants, newVariant.trim()] } : d)); setNewVariant(''); setEditDevId(null); };
    const rmVariant = (devId: string, v: string) => saveDevices(devices.map(d => d.id === devId ? { ...d, variants: d.variants.filter(x => x !== v) } : d));

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total', val: trades.length, col: '#B38B21' },
                    { label: 'Pending', val: trades.filter(t => t.status === 'Pending').length, col: '#f59e0b' },
                    { label: 'Awaiting', val: trades.filter(t => t.status === 'Awaiting User').length, col: '#6366f1' },
                    { label: 'Completed', val: trades.filter(t => t.status === 'Completed').length, col: '#10b981' },
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
                <div className="flex gap-2 items-center">
                    <SearchInput value={q} onChange={setQ} placeholder="Search trades..." />
                    {canEdit && (
                        <button onClick={() => setShowDevMgr(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 text-white/60 hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all">
                            <Smartphone size={12} /> Manage Devices
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading trade requests...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={<RefreshCcw size={40} />} message="No trade-in requests match your filters" />
            ) : (
                <TableWrapper>
                    <thead><tr>
                        <Th>Device</Th><Th>Customer</Th><Th>Target</Th><Th>Offer</Th><Th>Condition</Th><Th>Date</Th><Th>Status</Th><Th></Th>
                    </tr></thead>
                    <tbody>
                        {filtered.map(t => (
                            <tr key={t.id} className="hover:bg-white/[0.02] transition-all">
                                <Td><p className="text-xs font-black text-white">{t.device}</p></Td>
                                <Td>
                                    <p className="text-xs font-black text-white">{t.userName || '—'}</p>
                                    <p className="text-[10px] text-white/30">{t.userEmail}</p>
                                </Td>
                                <Td><p className="text-xs text-white/50">{(t as any).targetDevice || '—'}</p></Td>
                                <Td><p className="text-xs font-black text-[#B38B21]">{t.finalValue ? `$${t.finalValue}` : 'TBD'}</p></Td>
                                <Td><p className="text-xs text-white/50">{t.condition || <span className="text-white/20 italic">Pending</span>}</p></Td>
                                <Td><p className="text-[10px] text-white/30">{new Date(t.date).toLocaleDateString()}</p></Td>
                                <Td><Badge status={t.status} /></Td>
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
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Smartphone size={16} className="text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">{sel.device}</h3>
                                <p className="text-[10px] text-white/30">{sel.userName} · {sel.userEmail}</p>
                                <div className="mt-1"><Badge status={sel.status} /></div>
                            </div>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {[
                                ['Device', sel.device],
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
                        </div>

                        {/* Approved offer */}
                        {(sel.finalValue || sel.condition) && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                                <p className="text-[9px] text-green-400 uppercase tracking-widest">Current Offer</p>
                                {sel.finalValue && <p className="text-xl font-black text-green-400">${sel.finalValue}</p>}
                                {sel.condition && <p className="text-[10px] text-green-400/70 mt-0.5">Condition: {sel.condition}</p>}
                                {(sel as any).adminNote && <p className="text-xs text-white/50 mt-1">{(sel as any).adminNote}</p>}
                            </div>
                        )}

                        {canEdit && (
                            <div className="border-t border-white/5 pt-4 space-y-4">
                                {/* Quick status */}
                                <div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Quick Status</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(['Pending', 'Inspecting', 'Completed', 'Rejected'] as TradeRequest['status'][]).map(s => (
                                            <button key={s} onClick={() => patchTrade(sel.id, { status: s })} disabled={saving}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${sel.status === s ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Send offer */}
                                <div className="bg-black/40 rounded-xl p-4 space-y-3">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Send size={12} className="text-purple-400" /> Send Approval Offer to User
                                    </p>
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
                                        <input type="number" value={offer} onChange={e => setOffer(e.target.value)} placeholder="Offer value"
                                            className="w-full pl-8 pr-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:border-[#B38B21]/50 focus:outline-none" />
                                    </div>
                                    <textarea rows={2} value={offerNote} onChange={e => setOfferNote(e.target.value)} placeholder="Note to user (optional)..."
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none focus:border-[#B38B21]/50 focus:outline-none" />
                                    <button onClick={sendOffer} disabled={!offer || !condition || saving}
                                        className="w-full py-2.5 bg-[#B38B21] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                        <Send size={13} /> {saving ? 'Sending...' : 'Send Offer to User'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Device Manager Modal */}
            {showDevMgr && (
                <Modal onClose={() => setShowDevMgr(false)} maxW="max-w-2xl">
                    <ModalClose onClose={() => setShowDevMgr(false)} />
                    <div className="p-6">
                        <h3 className="text-base font-black text-white mb-1">Manage Trade-In Devices</h3>
                        <p className="text-[10px] text-white/30 mb-5">These devices will appear in the user-facing trade-in form.</p>
                        <div className="flex gap-2 mb-5">
                            <input value={newDevName} onChange={e => setNewDevName(e.target.value)} placeholder="New device category"
                                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none" />
                            <button onClick={addDevice} className="px-4 py-2 bg-[#B38B21] text-black font-black text-xs uppercase rounded-xl hover:bg-[#D4AF37] transition-all flex items-center gap-1"><Plus size={13} />Add</button>
                        </div>
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                            {devices.map(dev => (
                                <div key={dev.id} className="bg-black/40 border border-white/5 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-black text-white">{dev.name}</span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setEditDevId(editDevId === dev.id ? null : dev.id)} className="text-[10px] text-[#B38B21] font-black uppercase">+ Variant</button>
                                            <button onClick={() => rmDevice(dev.id)} className="p-1 rounded-lg bg-red-500/10 text-red-400"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                    {editDevId === dev.id && (
                                        <div className="flex gap-2 mb-2">
                                            <input value={newVariant} onChange={e => setNewVariant(e.target.value)} placeholder="e.g. iPhone 17 Pro"
                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none" />
                                            <button onClick={() => addVariant(dev.id)} className="px-2.5 py-1.5 bg-[#B38B21] text-black font-black text-[10px] rounded-lg"><Check size={12} /></button>
                                            <button onClick={() => setEditDevId(null)} className="px-2.5 py-1.5 bg-white/5 text-white/40 text-[10px] rounded-lg"><X size={12} /></button>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-1.5">
                                        {dev.variants.map(v => (
                                            <div key={v} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 group">
                                                <span className="text-[10px] text-white/50">{v}</span>
                                                <button onClick={() => rmVariant(dev.id, v)} className="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity"><X size={10} /></button>
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
