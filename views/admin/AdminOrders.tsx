import React, { useState, useEffect } from 'react';
import { ShoppingCart, Eye, X } from 'lucide-react';
import { Badge, SearchInput, Modal, ModalClose, Td, Th, TableWrapper, EmptyState } from './adminUtils';
import { getOrders } from '../../lib/api';
import type { Order } from '../../types';

export const AdminOrders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sel, setSel] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getOrders().then(d => { setOrders(d); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const statuses = ['All', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    const filtered = orders.filter(o => {
        const matchQ = (o.userName || '').toLowerCase().includes(q.toLowerCase());
        const matchS = statusFilter === 'All' || o.status === statusFilter;
        return matchQ && matchS;
    });

    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const avgOrder = orders.length ? (revenue / orders.length).toFixed(0) : '0';

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Orders', val: orders.length, col: '#B38B21' },
                    { label: 'Order Revenue', val: `$${revenue.toLocaleString()}`, col: '#6366f1' },
                    { label: 'Avg Order Value', val: `$${avgOrder}`, col: '#10b981' },
                    { label: 'Cancelled', val: orders.filter(o => o.status === 'Cancelled').length, col: '#ef4444' },
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
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === s ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                            {s}
                        </button>
                    ))}
                </div>
                <SearchInput value={q} onChange={setQ} placeholder="Search orders..." />
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading orders...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={<ShoppingCart size={40} />} message="No orders found" />
            ) : (
                <TableWrapper>
                    <thead><tr>
                        <Th>Order ID</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Date</Th><Th>Status</Th><Th></Th>
                    </tr></thead>
                    <tbody>
                        {filtered.map(o => (
                            <tr key={o.id} className="hover:bg-white/[0.02] transition-all">
                                <Td><span className="text-xs font-black text-white/50">#{o.id.slice(-6)}</span></Td>
                                <Td><p className="text-xs font-black text-white">{o.userName || '—'}</p></Td>
                                <Td><span className="text-xs text-white/40">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</span></Td>
                                <Td><span className="text-xs font-black text-[#B38B21]">${o.total}</span></Td>
                                <Td><span className="text-[10px] text-white/30">{new Date(o.date).toLocaleDateString()}</span></Td>
                                <Td><Badge status={o.status} /></Td>
                                <Td>
                                    <button onClick={() => setSel(o)} className="p-1.5 rounded-lg bg-white/5 hover:bg-[#B38B21]/20 text-white/30 hover:text-[#B38B21] transition-all">
                                        <Eye size={13} />
                                    </button>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </TableWrapper>
            )}

            {/* Order Detail Modal */}
            {sel && (
                <Modal onClose={() => setSel(null)}>
                    <ModalClose onClose={() => setSel(null)} />
                    <div className="p-6">
                        <h3 className="text-base font-black text-white mb-1">Order #{sel.id.slice(-6)}</h3>
                        <div className="mb-3"><Badge status={sel.status} /></div>
                        <div className="space-y-2 text-xs mb-4">
                            <p className="text-white/40">Customer: <span className="text-white font-bold">{sel.userName || '—'}</span></p>
                            <p className="text-white/40">Date: <span className="text-white font-bold">{new Date(sel.date).toLocaleDateString()}</span></p>
                        </div>
                        <div className="border-t border-white/5 pt-4 space-y-2 text-xs">
                            {sel.items.map((item, i) => (
                                <div key={i} className="flex justify-between">
                                    <span className="text-white/60">{item.name} ×{item.quantity}</span>
                                    <span className="text-white font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-white/5 mt-3 pt-3 flex justify-between text-sm">
                            <span className="text-white font-black">Total</span>
                            <span className="text-[#B38B21] font-black text-base">${sel.total}</span>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
