import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, Users, Package, RefreshCcw, Wrench, AlertTriangle, Star, ArrowUpRight } from 'lucide-react';
import { BarChart, Sparkline, DonutChart, PROD_KEY } from './adminUtils';
import { getOrders, getUsers, getTradeRequests, getRepairRequests } from '../../lib/api';
import type { Order, User, Product, TradeRequest, RepairRequest } from '../../types';

type Section = 'overview' | 'orders' | 'customers' | 'products' | 'trades' | 'repairs' | 'users';

interface Props {
    onNavigate: (section: Section) => void;
}

const catColors: Record<string, string> = {
    iPhone: '#B38B21', Laptop: '#6366f1', Gaming: '#f97316',
    Accessories: '#10b981', Audio: '#a855f7', Tablet: '#06b6d4', Trades: '#f43f5e'
};

const StatCard = ({ icon: Icon, value, label, change, spark, iconColor = '#B38B21', onClick }: any) => (
    <button onClick={onClick}
        className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group text-left w-full cursor-pointer active:scale-[0.98]">
        <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110" style={{ background: `${iconColor}20` }}>
                <Icon size={18} style={{ color: iconColor }} />
            </div>
            <div className="flex flex-col items-end gap-1">
                {spark && <Sparkline data={spark} color={iconColor} />}
                {change !== undefined && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-black text-emerald-400`}>
                        <ArrowUpRight size={11} /> {change}%
                    </div>
                )}
            </div>
        </div>
        <p className="text-2xl font-black text-white mb-1">{value}</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</p>
        <p className="text-[9px] text-[#B38B21] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 font-bold">Click to view →</p>
    </button>
);

export const AdminOverview: React.FC<Props> = ({ onNavigate }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [trades, setTrades] = useState<TradeRequest[]>([]);
    const [repairs, setRepairs] = useState<RepairRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        getOrders().then(setOrders).catch(() => { });
        getUsers().then(setUsers).catch(() => { });
        getTradeRequests().then(d => setTrades(d as any)).catch(() => { });
        getRepairRequests().then(d => setRepairs(d as any)).catch(() => { });
        try {
            const p = localStorage.getItem(PROD_KEY); if (p) setProducts(JSON.parse(p));
        } catch { }
    }, []);

    // Combined revenue
    const orderRevenue = orders.reduce((s, o) => s + o.total, 0);
    const repairRevenue = repairs.filter(r => r.status === 'Completed').reduce((s, r) => s + parseFloat((r.estimatedCost || '0').replace(/[^0-9.]/g, '')) || 0, 0);
    const tradeRevenue = trades.filter(t => t.status === 'Completed').reduce((s, t) => s + (t.finalValue || 0), 0);
    const totalRevenue = orderRevenue + repairRevenue + tradeRevenue;

    const pendingTrades = trades.filter(t => t.status === 'Pending').length;
    const activeRepairs = repairs.filter(r => !['Completed', 'Rejected'].includes(r.status)).length;
    const lowStock = products.filter(p => (p.stock ?? 0) < 5).length;
    const avgOrder = orders.length ? Math.round(orderRevenue / orders.length) : 0;

    // 7-day sparklines
    const dayData = (arr: { date: string }[], getValue?: (item: any) => number) =>
        Array.from({ length: 7 }, (_, i) => {
            const day = new Date('2026-03-15'); day.setDate(day.getDate() - (6 - i));
            const ds = day.toDateString();
            if (getValue) return arr.filter(x => new Date(x.date).toDateString() === ds).reduce((s, x) => s + getValue(x), 0);
            return arr.filter(x => new Date(x.date).toDateString() === ds).length;
        });

    const ordersByDay = dayData(orders);
    const revenueByDay = dayData(orders, (o: Order) => o.total);

    // Category breakdown for donut
    const catMap: Record<string, number> = {};
    products.forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + 1; });
    const donutSegs = Object.entries(catMap).map(([k, v]) => ({ value: v, color: catColors[k] || '#888', label: k }));

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="space-y-6">
            {/* Primary KPIs - clickable */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={DollarSign} value={`$${totalRevenue.toLocaleString()}`} label="Revenue (All Logic)" change={12} spark={revenueByDay} iconColor="#B38B21" onClick={() => onNavigate('orders')} />
                <StatCard icon={ShoppingCart} value={orders.length} label="New Orders" change={8} spark={ordersByDay} iconColor="#6366f1" onClick={() => onNavigate('orders')} />
                <StatCard icon={Users} value={users.length} label="Total Customers" spark={Array.from({ length: 7 }, (_, i) => Math.max(0, users.length - (6 - i)))} iconColor="#10b981" onClick={() => onNavigate('users')} />
                <StatCard icon={Package} value={products.length} label="Active Products" iconColor="#f97316" onClick={() => onNavigate('products')} />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={RefreshCcw} value={pendingTrades} label="Pending Trade-Ins" iconColor="#a855f7" onClick={() => onNavigate('trades')} />
                <StatCard icon={Wrench} value={activeRepairs} label="Active Repairs" iconColor="#f97316" onClick={() => onNavigate('repairs')} />
                <StatCard icon={AlertTriangle} value={lowStock} label="Low Stock Items" iconColor={lowStock > 0 ? '#ef4444' : '#10b981'} onClick={() => onNavigate('products')} />
                <StatCard icon={Star} value={`$${avgOrder}`} label="Avg Order Value" iconColor="#B38B21" onClick={() => onNavigate('orders')} />
            </div>

            {/* Revenue breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="col-span-2 bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Orders (Last 7 Days)</h3>
                        <button onClick={() => onNavigate('orders')} className="text-[9px] text-[#B38B21] font-black uppercase hover:text-[#D4AF37]">View All →</button>
                    </div>
                    <p className="text-[10px] text-white/20 mb-4">Daily order volume</p>
                    <BarChart data={ordersByDay} />
                    <div className="flex justify-between mt-2">{days.map(d => <span key={d} className="text-[9px] text-white/20 font-bold">{d}</span>)}</div>
                </div>

                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Inventory Mix</h3>
                    {donutSegs.length > 0 ? (
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                <DonutChart segments={donutSegs} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-base font-black text-white">{products.length}</span>
                                    <span className="text-[8px] text-white/30">items</span>
                                </div>
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                                {donutSegs.map(s => (
                                    <div key={s.label} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                                            <span className="text-[10px] text-white/40 truncate">{s.label}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-white shrink-0">{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <p className="text-white/20 text-xs text-center py-4">No products yet</p>}
                </div>
            </div>

            {/* Revenue split + Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Combined revenue breakdown */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={13} className="text-[#B38B21]" />Revenue Breakdown</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Product Orders', val: orderRevenue, color: '#6366f1', nav: 'orders' as Section },
                            { label: 'Repair Services', val: repairRevenue, color: '#f97316', nav: 'repairs' as Section },
                            { label: 'Trade-In Credit', val: tradeRevenue, color: '#a855f7', nav: 'trades' as Section },
                        ].map(row => {
                            const pct = totalRevenue > 0 ? (row.val / totalRevenue) * 100 : 0;
                            return (
                                <button key={row.label} onClick={() => onNavigate(row.nav)} className="w-full text-left group">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-white/40 group-hover:text-white/60 transition-colors">{row.label}</span>
                                        <span className="font-black text-white">${row.val.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: row.color }} />
                                    </div>
                                </button>
                            );
                        })}
                        <div className="border-t border-white/5 pt-3 flex justify-between text-xs">
                            <span className="text-white/40">Total</span>
                            <span className="font-black text-[#B38B21]">${totalRevenue.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Recent Trades */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><RefreshCcw size={12} className="text-purple-400" />Trade-Ins</h3>
                        <button onClick={() => onNavigate('trades')} className="text-[9px] text-[#B38B21] font-black uppercase hover:text-[#D4AF37]">View All →</button>
                    </div>
                    {trades.length === 0 ? <p className="text-white/20 text-xs py-4 text-center">None yet</p> : trades.slice(0, 4).map(t => (
                        <div key={t.id} className="flex items-center gap-2 py-2 border-b border-white/[0.03] last:border-0">
                            <div className="w-7 h-7 bg-purple-500/10 rounded-lg flex items-center justify-center shrink-0"><RefreshCcw size={12} className="text-purple-400" /></div>
                            <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-white truncate">{t.device}</p><p className="text-[9px] text-white/20">{t.userName}</p></div>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap ${t.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' : t.status === 'Completed' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>{t.status}</span>
                        </div>
                    ))}
                </div>

                {/* Recent Repairs */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><Wrench size={12} className="text-orange-400" />Repairs</h3>
                        <button onClick={() => onNavigate('repairs')} className="text-[9px] text-[#B38B21] font-black uppercase hover:text-[#D4AF37]">View All →</button>
                    </div>
                    {repairs.length === 0 ? <p className="text-white/20 text-xs py-4 text-center">None yet</p> : repairs.slice(0, 4).map(r => (
                        <div key={r.id} className="flex items-center gap-2 py-2 border-b border-white/[0.03] last:border-0">
                            <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0"><Wrench size={12} className="text-orange-400" /></div>
                            <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-white truncate">{r.device}</p><p className="text-[9px] text-white/20 truncate">{r.issue?.slice(0, 30)}</p></div>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap ${r.status === 'Completed' ? 'bg-green-500/20 text-green-400' : r.status === 'In Repair' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-white/40'}`}>{r.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
