import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { SearchInput, EmptyState } from './adminUtils';
import { getOrders, getUsers } from '../../lib/api';
import type { Order, User } from '../../types';

export const AdminCustomers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getUsers(), getOrders()])
            .then(([u, o]) => { setUsers(u); setOrders(o); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())
    );

    const getUserStats = (userId: string) => {
        const userOrders = orders.filter(o => o.userId === userId);
        return {
            orderCount: userOrders.length,
            totalSpent: userOrders.reduce((s, o) => s + o.total, 0),
            lastOrder: userOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date,
        };
    };

    const roleColors: Record<string, string> = { admin: '#6366f1', sales: '#B38B21', repair: '#f97316', user: '#6b7280' };

    return (
        <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4"><p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Total Customers</p><p className="text-2xl font-black text-[#B38B21]">{users.length}</p></div>
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4"><p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">With Orders</p><p className="text-2xl font-black text-[#10b981]">{users.filter(u => orders.some(o => o.userId === u.id)).length}</p></div>
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4"><p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Total Revenue</p><p className="text-2xl font-black text-white">${orders.reduce((s, o) => s + o.total, 0).toLocaleString()}</p></div>
            </div>

            <div className="flex justify-between items-center">
                <p className="text-[10px] text-white/30">{filtered.length} customers</p>
                <SearchInput value={q} onChange={setQ} placeholder="Search customers..." />
            </div>

            {loading ? <div className="text-center py-12 text-white/30 text-sm">Loading...</div> :
                filtered.length === 0 ? <EmptyState icon={<Users size={40} />} message="No customers found" /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map(u => {
                            const stats = getUserStats(u.id);
                            return (
                                <div key={u.id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-black text-sm shrink-0" style={{ background: roleColors[u.role] || '#6b7280' }}>
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-white truncate">{u.name}</p>
                                            <p className="text-[10px] text-white/30 truncate">{u.email}</p>
                                        </div>
                                        <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full shrink-0" style={{ background: `${roleColors[u.role] || '#6b7280'}20`, color: roleColors[u.role] || '#6b7280' }}>
                                            {u.role}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-black/30 rounded-xl p-2.5 text-center">
                                            <p className="text-[8px] text-white/20 uppercase tracking-widest">Orders</p>
                                            <p className="text-sm font-black text-white">{stats.orderCount}</p>
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-2.5 text-center">
                                            <p className="text-[8px] text-white/20 uppercase tracking-widest">Spent</p>
                                            <p className="text-sm font-black text-[#B38B21]">${stats.totalSpent}</p>
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-2.5 text-center">
                                            <p className="text-[8px] text-white/20 uppercase tracking-widest">Last</p>
                                            <p className="text-[9px] font-black text-white/50">{stats.lastOrder ? new Date(stats.lastOrder).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
        </div>
    );
};
