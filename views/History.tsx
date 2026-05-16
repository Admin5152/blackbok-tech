import React, { useEffect, useMemo, useState } from 'react';
import {
    ShoppingBag,
    ArrowLeftRight,
    Wrench,
    ChevronRight,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Package,
    ArrowRight
} from 'lucide-react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useAppContext } from '../App';
import { Order, RepairRequest, TradeRequest } from '../types';
import { formatCurrency } from '../lib/utils';
import { getUserOrdersFromItems } from '../lib/api';
import { supabase } from '../lib/supabase';
import { customerStatusBadgeClasses, formatCustomerStatusShort } from '../lib/customerStatusLabels';
import { PageBackButton } from '../components/PageBackButton';

type HistoryTab = 'orders' | 'trades' | 'repairs';

export const History: React.FC = () => {
    const { theme, orders = [], repairs = [], trades = [], user } = useAppContext();
    const isLight = theme === 'light';
    const navigate = useNavigate();
    const { tab } = useSearch({ from: '/history' } as any);
    const [activeTab, setActiveTab] = useState<HistoryTab>((tab as any) || 'orders');

    // Keep tab in sync with ?tab= when navigating from mobile menu (UI-04).
    useEffect(() => {
        const t = tab as string;
        if (t === 'orders' || t === 'trades' || t === 'repairs') setActiveTab(t as HistoryTab);
    }, [tab]);
    const [searchQuery, setSearchQuery] = useState('');
    const [historyOrders, setHistoryOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (!user?.id) {
            setHistoryOrders([]);
            return;
        }

        const loadDeliveredOrders = async () => {
            try {
                const data = await getUserOrdersFromItems(user.id);
                setHistoryOrders(data || []);
            } catch (err) {
                console.error('Failed to load order history:', err);
                setHistoryOrders([]);
            }
        };

        loadDeliveredOrders();

        const channel = supabase
            ? supabase
                .channel(`history-orders-${user.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
                    () => {
                        loadDeliveredOrders();
                    }
                )
                .subscribe()
            : null;

        const onFocus = () => loadDeliveredOrders();
        window.addEventListener('focus', onFocus);

        return () => {
            window.removeEventListener('focus', onFocus);
            if (supabase && channel) supabase.removeChannel(channel);
        };
    }, [user?.id]);

    // Trades and repairs come from real Supabase data via App.tsx context.

    // HST-05: filter each list by the search term. We match against the
    // human-readable display_id (e.g. "ORD00001", "TRD00001", "REP00001"),
    // the raw UUID, tracking number, device, item names, and status so
    // any reasonable identifier the user remembers will resolve.
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = (...fields: Array<string | undefined | null>) => {
        if (!q) return true;
        return fields.some(
            (f) => typeof f === 'string' && f.toLowerCase().includes(q),
        );
    };

    const filteredOrders = useMemo<Order[]>(() => {
        if (!q) return historyOrders;
        return historyOrders.filter((o) => {
            const itemNames = (o.items || []).map((i: any) => i.name).join(' ');
            return matchesQuery(
                (o as any).display_id,
                o.id,
                (o as any).tracking_number,
                (o as any).status,
                itemNames,
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyOrders, q]);

    const filteredTrades = useMemo<TradeRequest[]>(() => {
        if (!q) return trades;
        return trades.filter((t) =>
            matchesQuery(
                (t as any).display_id,
                t.id,
                (t as any).device,
                (t as any).device_brand,
                (t as any).device_name,
                (t as any).status,
            ),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trades, q]);

    const filteredRepairs = useMemo<RepairRequest[]>(() => {
        if (!q) return repairs;
        return repairs.filter((r) =>
            matchesQuery(
                (r as any).display_id,
                r.id,
                (r as any).device,
                (r as any).device_brand,
                (r as any).device_model,
                (r as any).issue,
                (r as any).issue_description,
                (r as any).status,
            ),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [repairs, q]);

    // HST-04 still passes: badges show the unfiltered totals so users
    // can see at a glance how many records exist on each tab even while
    // they're typing into the search box.
    const tabs = [
        { id: 'orders', label: 'Orders', icon: ShoppingBag, count: historyOrders.length },
        { id: 'trades', label: 'Trade-ins', icon: ArrowLeftRight, count: trades.length },
        { id: 'repairs', label: 'Repairs', icon: Wrench, count: repairs.length }
    ];

    return (
        <div className={`min-h-screen pt-32 pb-20 px-4 md:px-8 transition-colors duration-500 ${isLight ? 'bg-[#FAFAFA]' : 'bg-gradient-to-b from-[#050508] via-[#08080f] to-[#050508]'}`}>
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <PageBackButton isLight={isLight} fallbackTo="/profile" />
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#CDA032]/20 flex items-center justify-center text-[#CDA032]">
                                <Clock size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Account Dashboard</span>
                        </div>
                        <h1 className={`text-4xl md:text-6xl font-black italic tracking-tighter uppercase ${isLight ? 'text-black' : 'text-white'}`}>
                            Activity <span className="text-[#CDA032]">History</span>
                        </h1>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#CDA032] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find reference ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all outline-none text-sm font-medium ${isLight ? 'bg-white border-black/5 focus:border-black' : 'bg-white/5 border-white/5 focus:border-[#CDA032] focus:bg-white/10'}`}
                        />
                    </div>
                </div>

                {/* Perspective Tabs */}
                <div className="flex flex-wrap gap-2 md:gap-4 p-2 rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-xl w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as HistoryTab);
                                navigate({ to: '/history', search: { tab: tab.id } as any });
                            }}
                            className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-[#CDA032] text-black shadow-lg shadow-[#CDA032]/20'
                                : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] ${activeTab === tab.id ? 'bg-black text-white' : 'bg-white/10 text-white/60'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="grid gap-6">
                    {activeTab === 'orders' && (
                        filteredOrders.length > 0 ? (
                            filteredOrders.map(order => (
                                <div
                                    key={order.id}
                                    className={`group p-6 md:p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-8 ${isLight ? 'bg-white border-black/5 hover:border-black' : 'bg-white/5 border-white/5 hover:border-[#CDA032]/30 hover:bg-white/[0.07] shadow-2xl shadow-black'}`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors ${isLight ? 'bg-gray-100' : 'bg-white/5 group-hover:bg-[#CDA032]/10'}`}>
                                            <Package size={28} className={isLight ? 'text-black' : 'text-white/60 group-hover:text-[#CDA032]'} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Order #{order.id.slice(-8).toUpperCase()}</p>
                                            <h3 className={`text-xl font-black italic tracking-tight uppercase ${isLight ? 'text-black' : 'text-white'}`}>
                                                {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'} • {formatCurrency(order.total)}
                                            </h3>
                                            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Placed on {new Date(order.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-0 pt-6 md:pt-0 border-white/5">
                                        <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest max-w-[11rem] truncate ${customerStatusBadgeClasses(order.status, 'order', isLight)}`} title={formatCustomerStatusShort('order', order.status)}>
                                            {formatCustomerStatusShort('order', order.status)}
                                        </span>
                                        <Link
                                            to={`/receipt/${order.id}` as any}
                                            className="px-4 py-2 rounded-xl bg-[#CDA032]/10 text-[#CDA032] border border-[#CDA032]/20 text-[9px] font-black uppercase tracking-widest hover:bg-[#CDA032]/20 transition-colors whitespace-nowrap"
                                        >
                                            View Receipt
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-6">
                                <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center text-white/20">
                                    <ShoppingBag size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black italic tracking-tight uppercase text-white/40">No orders found</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Your purchase history will appear here once you make an order.</p>
                                </div>
                                <Link to="/store" className="inline-flex px-8 py-4 bg-[#CDA032] text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">Start Shopping</Link>
                            </div>
                        )
                    )}

                    {activeTab === 'trades' && (
                        filteredTrades.length > 0 ? (
                            filteredTrades.map(trade => (
                                <Link
                                    key={trade.id}
                                    to={`/tracking/trade/${trade.id}`}
                                    className={`group p-6 md:p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-8 ${isLight ? 'bg-white border-black/5 hover:border-black' : 'bg-white/5 border-white/5 hover:border-[#CDA032]/30 hover:bg-white/[0.07] shadow-2xl shadow-black'}`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors ${isLight ? 'bg-gray-100' : 'bg-white/5 group-hover:bg-[#CDA032]/10'}`}>
                                            <ArrowLeftRight size={28} className={isLight ? 'text-black' : 'text-white/60 group-hover:text-[#CDA032]'} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Trade Reference #{trade.id}</p>
                                            <h3 className={`text-xl font-black italic tracking-tight uppercase ${isLight ? 'text-black' : 'text-white'}`}>
                                                {trade.device} • <span className="text-[#CDA032]">GHC {trade.finalValue || trade.estimatedValue}</span>
                                            </h3>
                                            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Initiated {new Date(trade.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-6 md:pt-0 border-white/5">
                                        <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest max-w-[11rem] truncate ${customerStatusBadgeClasses(trade.status, 'trade', isLight)}`} title={formatCustomerStatusShort('trade', trade.status)}>
                                            {formatCustomerStatusShort('trade', trade.status)}
                                        </span>
                                        <div className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:text-[#CDA032] group-hover:border-[#CDA032] transition-all`}>
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-6">
                                <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center text-white/20">
                                    <ArrowLeftRight size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black italic tracking-tight uppercase text-white/40">No Trade-ins found</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Your trade-in history will appear here once you initiate a trade.</p>
                                </div>
                                <Link to="/trades" className="inline-flex px-8 py-4 bg-[#CDA032] text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">Initiate Trade</Link>
                            </div>
                        )
                    )}

                    {activeTab === 'repairs' && (
                        filteredRepairs.length > 0 ? (
                            filteredRepairs.map(repair => (
                                <Link
                                    key={repair.id}
                                    to={`/tracking/repair/${repair.id}`}
                                    className={`group p-6 md:p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-8 ${isLight ? 'bg-white border-black/5 hover:border-black' : 'bg-white/5 border-white/5 hover:border-[#CDA032]/30 hover:bg-white/[0.07] shadow-2xl shadow-black'}`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors ${isLight ? 'bg-gray-100' : 'bg-white/5 group-hover:bg-[#CDA032]/10'}`}>
                                            <Wrench size={28} className={isLight ? 'text-black' : 'text-white/60 group-hover:text-[#CDA032]'} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Repair Ticket #{repair.id}</p>
                                            <h3 className={`text-xl font-black italic tracking-tight uppercase ${isLight ? 'text-black' : 'text-white'}`}>
                                                {repair.device} • <span className="opacity-40">{repair.issue}</span>
                                            </h3>
                                            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Logged {new Date(repair.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-6 md:pt-0 border-white/5">
                                        <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest max-w-[11rem] truncate ${customerStatusBadgeClasses(repair.status, 'repair', isLight)}`} title={formatCustomerStatusShort('repair', repair.status)}>
                                            {formatCustomerStatusShort('repair', repair.status)}
                                        </span>
                                        <div className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:text-[#CDA032] group-hover:border-[#CDA032] transition-all`}>
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-6">
                                <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center text-white/20">
                                    <Wrench size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black italic tracking-tight uppercase text-white/40">No repair tickets</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Your device repair history will appear here.</p>
                                </div>
                                <Link to="/repair" className="inline-flex px-8 py-4 bg-[#CDA032] text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">Book a Repair</Link>
                            </div>
                        )
                    )}
                </div>

                {/* Info Deck */}
                <div className="grid md:grid-cols-3 gap-6 pt-12">
                    <div className={`p-8 rounded-[2rem] border ${isLight ? 'bg-white border-black/5' : 'bg-white/5 border-white/5'}`}>
                        <TrendingUp size={24} className="text-[#CDA032] mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest mb-2">Total Value Saved</h4>
                        <p className="text-3xl font-black italic tracking-tighter text-[#CDA032]">GHC 7,850</p>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">Across all trade-ins & repairs</p>
                    </div>
                    <div className={`p-8 rounded-[2rem] border ${isLight ? 'bg-white border-black/5' : 'bg-white/5 border-white/5'}`}>
                        <CheckCircle2 size={24} className="text-green-500 mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest mb-2">Successful Handled</h4>
                        <p className="text-3xl font-black italic tracking-tighter text-green-500">24 Items</p>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">100% Satisfaction Rate</p>
                    </div>
                    <div className={`p-8 rounded-[2rem] border ${isLight ? 'bg-white border-black/5' : 'bg-white/5 border-white/5'}`}>
                        <AlertCircle size={24} className="text-blue-500 mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest mb-2">Ongoing Actions</h4>
                        <p className="text-3xl font-black italic tracking-tighter text-blue-500">03 Tasks</p>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">Current active tracking items</p>
                    </div>
                </div>

            </div>
        </div>
    );
};
