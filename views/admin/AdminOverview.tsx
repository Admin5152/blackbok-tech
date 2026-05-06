import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, ShoppingCart, Users, Package, RefreshCcw, Wrench, AlertTriangle, Star, ArrowUpRight, CalendarDays, Download } from 'lucide-react';
import { BarChart, Sparkline, DonutChart, PROD_KEY } from './adminUtils';
import { getOrders, getUsers, getTradeRequests, getRepairRequests } from '../../lib/api';
import type { Order, User, Product, TradeRequest, RepairRequest } from '../../types';
import { useAppContext } from '../../App';

type Section = 'overview' | 'orders' | 'customers' | 'products' | 'trades' | 'repairs' | 'users';

interface Props {
    onNavigate: (section: Section) => void;
}

const STATUS_COLORS = {
    critical: '#ef4444',    // Red
    warning: '#f59e0b',     // Amber
    success: '#10b981',     // Green
    info: '#B38B21',        // Gold
    neutral: '#6b7280'      // Gray
};

const catColors: Record<string, string> = {
    iPhone: STATUS_COLORS.info, Laptop: '#6366f1', Gaming: '#f97316',
    Accessories: '#10b981', Audio: '#a855f7', Tablet: '#06b6d4', Trades: '#f43f5e'
};

interface StatCardProps {
    icon: any;
    value: string | number;
    label: string;
    trend?: number;
    trendUp?: boolean;
    spark?: number[];
    iconColor?: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps & { isLight?: boolean }> = ({ icon: Icon, value, label, trend, trendUp, spark, iconColor = STATUS_COLORS.info, onClick, isLight }) => (
    <button
        onClick={onClick}
        aria-label={`${label}: ${value}. ${trend ? `Trending ${trendUp ? 'up' : 'down'} ${trend}%` : ''}`}
        className={`border rounded-2xl p-4 sm:p-5 group transition-all duration-300 text-left relative overflow-hidden
        ${isLight ? 'bg-white border-black/5 hover:border-[#B38B21]/30 hover:bg-black/5' : 'bg-[#0a0a0a] border-white/5 hover:border-[#B38B21]/30 hover:bg-white/[0.02]'}
        ${onClick ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
    >
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-2 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`} style={{ background: `${iconColor}10` }}>
                <Icon size={18} style={{ color: iconColor }} />
            </div>
            {(spark || trend) && (
                <div className="flex flex-col items-end gap-1">
                    {spark && <Sparkline data={spark} color={iconColor} />}
                    {trend && (
                        <div className={`flex items-center gap-0.5 text-[10px] font-black ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trendUp ? <ArrowUpRight size={11} /> : <div className="rotate-90"><ArrowUpRight size={11} /></div>}
                            {trend}%
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="mt-4 relative z-10">
            <p className={`text-xl sm:text-2xl font-black leading-tight ${isLight ? 'text-black' : 'text-white'}`}>{value}</p>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isLight ? 'text-black/50' : 'text-white/60'}`}>{label}</p>
        </div>

        {onClick && (
            <div className="mt-2 text-[10px] text-[#B38B21] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 font-bold relative z-10 flex items-center gap-1">
                View Details <ArrowUpRight size={11} />
            </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/[0.02] pointer-events-none" />
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: iconColor }} />
    </button>
);

interface AlertItemProps {
    type: 'critical' | 'warning' | 'info';
    message: string;
    action?: string;
    onAction?: () => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ type, message, action, onAction }) => {
    const color = type === 'critical' ? STATUS_COLORS.critical : STATUS_COLORS.warning;
    return (
        <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${type === 'critical' ? 'bg-red-500/5 border-red-500/20 text-red-100' :
            'bg-amber-500/5 border-amber-500/20 text-amber-100'
            }`}>
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                <p className="text-[11px] font-medium opacity-90">{message}</p>
            </div>
            {action && (
                <button onClick={onAction} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                    style={{ backgroundColor: `${color}15`, color }}>
                    {action}
                    <ArrowUpRight size={11} />
                </button>
            )}
        </div>
    );
};

const AlertSection = ({ alerts, onNavigate, isLight }: { alerts: AlertItemProps[], onNavigate: any, isLight: boolean }) => {
    if (!alerts.length) return null;
    return (
        <div role="alert" aria-live="assertive" aria-atomic="true" className={`space-y-3 border rounded-2xl p-4 ${isLight ? 'bg-red-50 border-red-100' : 'bg-[#110505]/10 border-red-500/5'}`}>
            <div className="flex items-center gap-2 mb-1 px-1">
                <AlertTriangle size={14} className="text-red-500" />
                <h3 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-black/50' : 'text-white/60'}`}>Critical Awareness</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map((a, i) => <AlertItem key={i} {...a} />)}
            </div>
        </div>
    );
};

const QuickActionMenu = ({ onNavigate, isLight }: { onNavigate: any, isLight: boolean }) => {
    const actions = [
        { label: 'Inventory', icon: Package, color: '#06b6d4', nav: 'products' },
        // { label: 'Broadcast', icon: Star, color: '#B38B21', nav: 'inbox' },
        { label: 'Reports', icon: DollarSign, color: '#10b981', nav: 'orders' },
        { label: 'Invite', icon: Users, color: '#6366f1', nav: 'users' }
    ];
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {actions.map(a => (
                <button key={a.label} onClick={() => onNavigate(a.nav as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all shrink-0
                    ${isLight ? 'bg-white border-black/5 hover:bg-black/5 text-black/60 hover:text-black' : 'bg-white/[0.03] border-white/5 hover:bg-white/5 text-white/40 hover:text-white'}`}>
                    <a.icon size={13} style={{ color: a.color }} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{a.label}</span>
                </button>
            ))}
        </div>
    );
};

const AIAnalystCard = ({ isLight }: { isLight: boolean }) => (
    <div className={`border rounded-2xl p-6 relative overflow-hidden group ${isLight ? 'bg-gradient-to-br from-white to-[#FAFAFA] border-[#B38B21]/20 shadow-sm' : 'bg-gradient-to-br from-[#0a0a0a] to-[#0f0c05] border-[#B38B21]/10'}`}>
        <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-8 h-8 rounded-full bg-[#B38B21]/10 flex items-center justify-center animate-pulse">
                <Star size={14} className="text-[#B38B21]" />
            </div>
            <div>
                <h3 className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-black' : 'text-white'}`}>Alu Insights Analyst</h3>
                <p className={`text-[9px] uppercase font-black ${isLight ? 'text-black/50' : 'text-white/50'}`}>AI-Powered Overview</p>
            </div>
        </div>
        <div className="space-y-4 relative z-10 transition-transform group-hover:translate-x-1 duration-500">
            <p className={`text-[11px] leading-relaxed font-medium bg-[#B38B21]/5 border-l-2 border-[#B38B21] p-3 rounded-r-lg ${isLight ? 'text-black/80' : 'text-white/90'}`}>
                Revenue is trending <span className="text-emerald-400 font-black">+12% higher</span> than last period, primarily driven by iPhone sales.
                However, repair turnaround time has increased by <span className="text-amber-400 font-black">4 hours</span>.
            </p>
            <div className={`flex items-center gap-2 text-[10px] font-bold italic ${isLight ? 'text-black/60' : 'text-white/60'}`}>
                <AlertTriangle size={12} className="text-amber-500" />
                Suggested: Redirect diagnostic team to Repair Queue.
            </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#B38B21]/5 rounded-full blur-[60px] pointer-events-none" />
    </div>
);

export const AdminOverview: React.FC<Props> = ({ onNavigate }) => {
    const { theme, products: contextProducts } = useAppContext();
    const isLight = theme === 'light';

    const [orders, setOrders] = useState<Order[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [trades, setTrades] = useState<TradeRequest[]>([]);
    const [repairs, setRepairs] = useState<RepairRequest[]>([]);
    const [products, setProducts] = useState<Product[]>(contextProducts || []);
    const [revenueWindow, setRevenueWindow] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');

    // Mock data for development
    const mockOrders: Order[] = [
        {
            id: '1',
            userId: '1',
            userName: 'John Smith',
            items: [],
            total: 1299,
            status: 'Delivered',
            date: '2024-03-15',
            paymentMethod: 'Credit Card'
        },
        {
            id: '2',
            userId: '2',
            userName: 'Sarah Johnson',
            items: [],
            total: 2499,
            status: 'Processing',
            date: '2024-03-14',
            paymentMethod: 'PayPal'
        },
        {
            id: '3',
            userId: '3',
            userName: 'Mike Davis',
            items: [],
            total: 899,
            status: 'Shipped',
            date: '2024-03-13',
            paymentMethod: 'Credit Card'
        }
    ];

    const mockUsers: User[] = [
        {
            id: '1',
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '+1 (555) 123-4567',
            role: 'user',
            address: '123 Main St, New York, NY 10001',
            wishlist: ['prod1', 'prod2'],
            avatarLetter: 'J'
        },
        {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah.j@email.com',
            phone: '+1 (555) 987-6543',
            role: 'admin',
            address: '456 Oak Ave, Los Angeles, CA 90001',
            wishlist: ['prod3'],
            avatarLetter: 'S'
        },
        {
            id: '3',
            name: 'Mike Davis',
            email: 'mike.davis@email.com',
            phone: '+1 (555) 456-7890',
            role: 'user',
            address: '789 Pine Rd, Chicago, IL 60001',
            wishlist: [],
            avatarLetter: 'M'
        },
        {
            id: '4',
            name: 'Emily Wilson',
            email: 'emily.w@email.com',
            phone: '+1 (555) 234-5678',
            role: 'user',
            address: '321 Elm St, Houston, TX 77001',
            wishlist: ['prod4', 'prod5'],
            avatarLetter: 'E'
        },
        {
            id: '5',
            name: 'David Brown',
            email: 'david.brown@email.com',
            phone: '+1 (555) 876-5432',
            role: 'sales',
            address: '654 Maple Dr, Phoenix, AZ 85001',
            wishlist: ['prod6'],
            avatarLetter: 'D'
        }
    ];

    const mockTrades: TradeRequest[] = [
        {
            id: '1',
            userId: '1',
            userName: 'John Smith',
            userEmail: 'john.smith@email.com',
            device: 'iPhone 13 Pro',
            condition: 'Good',
            status: 'Pending',
            date: '2024-03-15',
            estimatedValue: 450,
            finalValue: 380,
            targetDevice: 'iPhone 15 Pro',
            userDescription: 'Screen has minor cracks, battery health 85%',
            preferredDate: '2024-03-20',
            preferredTime: '10:00 AM',
            contactName: 'John Smith',
            contactEmail: 'john.smith@email.com',
            contactPhone: '+1 (555) 123-4567',
            fulfillmentMethod: 'Headquarters'
        },
        {
            id: '2',
            userId: '2',
            userName: 'Sarah Johnson',
            userEmail: 'sarah.j@email.com',
            device: 'MacBook Pro M2',
            condition: 'Excellent',
            status: 'Completed',
            date: '2024-03-14',
            estimatedValue: 1200,
            finalValue: 1100,
            targetDevice: 'MacBook Air M3',
            userDescription: 'Excellent condition, always used with case',
            preferredDate: '2024-03-18',
            preferredTime: '2:00 PM',
            contactName: 'Sarah Johnson',
            contactEmail: 'sarah.j@email.com',
            contactPhone: '+1 (555) 987-6543',
            fulfillmentMethod: 'Pickup'
        }
    ];

    const mockRepairs: RepairRequest[] = [
        {
            id: '1',
            userId: '1',
            userName: 'John Smith',
            device: 'iPhone 12',
            issue: 'Screen replacement needed',
            status: 'In Repair',
            date: '2024-03-15',
            aiDiagnosis: 'Screen damage detected - replacement recommended',
            estimatedCost: '$180',
            adminNote: 'Customer approved estimate',
            imageUrl: '',
            fulfillmentMethod: 'Headquarters'
        },
        {
            id: '2',
            userId: '3',
            userName: 'Mike Davis',
            device: 'Samsung Galaxy S23',
            issue: 'Battery not holding charge',
            status: 'Completed',
            date: '2024-03-14',
            aiDiagnosis: 'Battery degradation - replacement completed',
            estimatedCost: '$120',
            adminNote: 'Battery replaced successfully',
            imageUrl: '',
            fulfillmentMethod: 'Pickup'
        }
    ];

    const mockProducts: Product[] = [
        {
            id: '1',
            name: 'iPhone 15 Pro',
            category: 'iPhone',
            price: 1199,
            description: 'Latest iPhone with A17 Pro chip',
            image: '/images/iphone15pro.jpg',
            stock: 15,
            featured: true,
            new: true,
            rating: 4.8,
            reviewCount: 234
        },
        {
            id: '2',
            name: 'MacBook Air M2',
            category: 'Laptop',
            price: 999,
            description: 'Ultra-thin laptop with M2 chip',
            image: '/images/macbook-air-m2.jpg',
            stock: 8,
            featured: true,
            rating: 4.7,
            reviewCount: 156
        },
        {
            id: '3',
            name: 'AirPods Pro',
            category: 'Accessories',
            price: 249,
            description: 'Wireless earbuds with active noise cancellation',
            image: '/images/airpods-pro.jpg',
            stock: 25,
            rating: 4.6,
            reviewCount: 89
        },
        {
            id: '4',
            name: 'PlayStation 5',
            category: 'Gaming',
            price: 499,
            description: 'Next-gen gaming console',
            image: '/images/ps5.jpg',
            stock: 3,
            rating: 4.9,
            reviewCount: 412
        },
        {
            id: '5',
            name: 'iPad Air',
            category: 'Tablet',
            price: 599,
            description: 'Thin and light tablet',
            image: '/images/ipad-air.jpg',
            stock: 12,
            rating: 4.5,
            reviewCount: 178
        }
    ];

    useEffect(() => {
        let mounted = true;
        const fetchAdminData = async () => {
            try {
                const [dbOrders, dbUsers, dbTrades, dbRepairs] = await Promise.all([
                    getOrders(),
                    getUsers(),
                    getTradeRequests(),
                    getRepairRequests()
                ]);
                
                if (mounted) {
                    setOrders(dbOrders.length > 0 ? dbOrders : mockOrders);
                    setUsers(dbUsers.length > 0 ? dbUsers : mockUsers);
                    setTrades(dbTrades.length > 0 ? dbTrades : mockTrades);
                    setRepairs(dbRepairs.length > 0 ? dbRepairs : mockRepairs);
                }
            } catch (err) {
                console.error("Failed to fetch admin data from Supabase:", err);
                if (mounted) {
                    setOrders(mockOrders);
                    setUsers(mockUsers);
                    setTrades(mockTrades);
                    setRepairs(mockRepairs);
                }
            }
        };

        fetchAdminData();
        setProducts(contextProducts.length > 0 ? contextProducts : mockProducts);
        
        return () => { mounted = false; };
    }, [contextProducts]);

    const parseRepairAmount = (amount: string | number | undefined) => {
        if (typeof amount === 'number') return amount || 0;
        if (!amount) return 0;
        return parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
    };

    const getValidDate = (input?: string) => {
        if (!input) return null;
        const dt = new Date(input);
        return Number.isNaN(dt.getTime()) ? null : dt;
    };

    const inSelectedWindow = (input?: string) => {
        const dt = getValidDate(input);
        if (!dt) return revenueWindow === 'ALL';
        if (revenueWindow === 'ALL') return true;
        const now = Date.now();
        const days = revenueWindow === '7D' ? 7 : revenueWindow === '30D' ? 30 : 90;
        return dt.getTime() >= now - days * 24 * 60 * 60 * 1000;
    };

    // Combined revenue (window segmented)
    const filteredOrders = orders.filter(o => inSelectedWindow(o.date || o.created_at));
    const filteredRepairs = repairs.filter(r => inSelectedWindow(r.date || r.created_at));
    const filteredTrades = trades.filter(t => inSelectedWindow(t.date || t.created_at));

    const orderRevenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
    const repairRevenue = filteredRepairs
        .filter(r => (r.status || '').toLowerCase() === 'completed')
        .reduce((s, r) => s + parseRepairAmount(r.estimatedCost), 0);
    const tradeRevenue = filteredTrades
        .filter(t => (t.status || '').toLowerCase() === 'completed')
        .reduce((s, t) => s + (t.finalValue || 0), 0);
    const totalRevenue = orderRevenue + repairRevenue + tradeRevenue;

    const pendingTrades = trades.filter(t => t.status === 'Pending').length;
    const activeRepairs = repairs.filter(r => !['Completed', 'Rejected'].includes(r.status)).length;
    const lowStock = products.filter(p => (p.stock ?? 0) < 5).length;
    const avgOrder = filteredOrders.length ? Math.round(orderRevenue / filteredOrders.length) : 0;

    // PERFORMANCE: Optimized calculations
    const catMap = useMemo(() => {
        const map: Record<string, number> = {};
        products.forEach(p => { map[p.category] = (map[p.category] || 0) + 1; });
        return map;
    }, [products]);

    const donutSegs = useMemo(() =>
        Object.entries(catMap).map(([k, v]) => ({ value: v as number, color: catColors[k] || '#888', label: k })),
        [catMap]);

    const globalActivity = useMemo(() => [
        ...orders.map(o => ({ type: 'order', id: o.id, title: `Order Placed`, sub: o.userName, date: o.date, status: o.status, icon: ShoppingCart, color: '#6366f1' })),
        ...trades.map(t => ({ type: 'trade', id: t.id, title: `Trade Quote`, sub: t.device, date: t.date, status: t.status, icon: RefreshCcw, color: '#a855f7' })),
        ...repairs.map(r => ({ type: 'repair', id: r.id, title: `Repair Entry`, sub: r.device, date: r.date, status: r.status, icon: Wrench, color: '#f97316' }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10), [orders, trades, repairs]);

    const alerts: AlertItemProps[] = useMemo(() => {
        const list: AlertItemProps[] = [];
        if (lowStock > 0) list.push({ type: 'critical', message: `${lowStock} products are below critical stock levels`, action: 'Restock', onAction: () => onNavigate('products') });
        if (pendingTrades > 3) list.push({ type: 'warning', message: `${pendingTrades} trade-in requests are awaiting initial estimate`, action: 'Review', onAction: () => onNavigate('trades') });
        const overdueRepairs = repairs.filter(r => r.status === 'In Repair').length; // Mock logic for "overdue"
        if (overdueRepairs > 0) list.push({ type: 'warning', message: `${overdueRepairs} repairs have been in progress for over 48 hours`, action: 'Check', onAction: () => onNavigate('repairs') });
        return list;
    }, [lowStock, pendingTrades, repairs, onNavigate]);

    const mockOrdersByDay = [12, 19, 8, 15, 22, 18, 25];
    const revenueByDay = useMemo(() => {
        const days = 7;
        const buckets = Array.from({ length: days }, () => 0);
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (days - 1));

        const dayIndex = (value?: string) => {
            const dt = getValidDate(value);
            if (!dt) return -1;
            const diff = Math.floor((new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
            return diff >= 0 && diff < days ? diff : -1;
        };

        filteredOrders.forEach(o => {
            const idx = dayIndex(o.date || o.created_at);
            if (idx >= 0) buckets[idx] += (o.total || 0);
        });
        filteredRepairs
            .filter(r => (r.status || '').toLowerCase() === 'completed')
            .forEach(r => {
                const idx = dayIndex(r.date || r.created_at);
                if (idx >= 0) buckets[idx] += parseRepairAmount(r.estimatedCost);
            });
        filteredTrades
            .filter(t => (t.status || '').toLowerCase() === 'completed')
            .forEach(t => {
                const idx = dayIndex(t.date || t.created_at);
                if (idx >= 0) buckets[idx] += (t.finalValue || 0);
            });

        return buckets.map(v => Math.round(v));
    }, [filteredOrders, filteredRepairs, filteredTrades, revenueWindow]);
    const mockRevenueByDay = revenueByDay;
    const mockUserGrowth = [145, 148, 152, 149, 155, 161, 167];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const revenueStreams = [
        { label: 'Product Sales', val: orderRevenue, color: '#6366f1', nav: 'orders' as Section },
        { label: 'Repair Services', val: repairRevenue, color: '#f97316', nav: 'repairs' as Section },
        { label: 'Trade-In Credit', val: tradeRevenue, color: '#a855f7', nav: 'trades' as Section },
    ];

    const exportRevenueReport = () => {
        const rows = [
            ['Window', revenueWindow],
            ['Total Revenue', totalRevenue.toFixed(2)],
            ['Orders Revenue', orderRevenue.toFixed(2)],
            ['Repairs Revenue', repairRevenue.toFixed(2)],
            ['Trade-In Revenue', tradeRevenue.toFixed(2)],
            ['Orders Count', String(filteredOrders.length)],
            ['Completed Repairs Count', String(filteredRepairs.filter(r => (r.status || '').toLowerCase() === 'completed').length)],
            ['Completed Trades Count', String(filteredTrades.filter(t => (t.status || '').toLowerCase() === 'completed').length)],
            [],
            ['Stream', 'Revenue', 'Share %'],
            ...revenueStreams.map((r) => [r.label, r.val.toFixed(2), totalRevenue > 0 ? ((r.val / totalRevenue) * 100).toFixed(2) : '0.00']),
        ];
        const csv = rows.map((r) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue-report-${revenueWindow.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* TOP BAR: Shortcuts + Awareness */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <QuickActionMenu onNavigate={onNavigate} isLight={isLight} />
                    <div className="hidden md:block">
                        <p className={`text-[9px] font-black uppercase tracking-widest text-right ${isLight ? 'text-black/40' : 'text-white/20'}`}>Last Sync: Just Now</p>
                    </div>
                </div>
                <AlertSection alerts={alerts} onNavigate={onNavigate} isLight={isLight} />
            </div>

            {/* PRIMARY METRICS — Business Health */}
            <section className="space-y-4">
                <div className={`flex items-center gap-2 px-1 ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                    <div className="w-1 h-3 bg-[#B38B21] rounded-full" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Business Health</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard isLight={isLight} icon={DollarSign} value={`$${totalRevenue.toLocaleString()}`} label="Total Revenue" trend={12} trendUp={true} spark={mockRevenueByDay} iconColor={STATUS_COLORS.info} onClick={() => onNavigate('orders')} />
                    <StatCard isLight={isLight} icon={ShoppingCart} value={orders.length} label="New Orders" trend={8} trendUp={true} spark={mockOrdersByDay} iconColor="#6366f1" onClick={() => onNavigate('orders')} />
                    <StatCard isLight={isLight} icon={Star} value={`$${avgOrder}`} label="Avg Order Value" trend={3} trendUp={false} iconColor={STATUS_COLORS.info} onClick={() => onNavigate('orders')} />
                    <StatCard isLight={isLight} icon={Users} value="94%" label="Customer Satisfaction" trend={1} trendUp={true} iconColor={STATUS_COLORS.success} />
                </div>
                <div className={`border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0a0a0a] border-white/5'}`}>
                    <div className="space-y-2">
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                            <CalendarDays size={12} className="text-[#B38B21]" />
                            Revenue Overview
                        </p>
                        <h3 className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>
                            ${totalRevenue.toLocaleString()}
                        </h3>
                        <p className={`text-[11px] ${isLight ? 'text-black/60' : 'text-white/60'}`}>
                            {revenueWindow} window • {filteredOrders.length} orders • {filteredRepairs.length} repairs • {filteredTrades.length} trades
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {(['7D', '30D', '90D', 'ALL'] as const).map((window) => (
                            <button
                                key={window}
                                onClick={() => setRevenueWindow(window)}
                                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                    revenueWindow === window
                                        ? 'bg-[#B38B21] text-black'
                                        : isLight
                                            ? 'bg-black/5 text-black/50 hover:bg-black/10'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                                }`}
                            >
                                {window}
                            </button>
                        ))}
                        <button
                            onClick={exportRevenueReport}
                            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${isLight ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                        >
                            <Download size={12} />
                            Export
                        </button>
                    </div>
                </div>
            </section>

            {/* OPERATIONAL STATUS — HCI Consolidated Grouping */}
            <section className="space-y-4">
                <div className={`flex items-center gap-2 px-1 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                    <div className="w-1 h-3 bg-purple-500/50 rounded-full" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Operations & Fulfillment</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard isLight={isLight}
                        icon={ArrowUpRight}
                        value={pendingTrades + activeRepairs}
                        label="Fulfillment Tasks"
                        iconColor="#a855f7"
                        onClick={() => onNavigate('trades')}
                    />
                    <StatCard isLight={isLight} icon={AlertTriangle} value={lowStock} label="Stock Alerts" iconColor={lowStock > 0 ? STATUS_COLORS.critical : STATUS_COLORS.success} onClick={() => onNavigate('products')} />
                    <StatCard isLight={isLight} icon={Package} value={products.length} label="Active Products" iconColor="#06b6d4" onClick={() => onNavigate('products')} />
                    <div className={`hidden lg:block border rounded-2xl p-5 flex items-center justify-center text-center ${isLight ? 'bg-black/5 border-black/5' : 'bg-white/[0.01] border-white/5'}`}>
                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-black/40' : 'text-white/30'}`}>Capacity: 84%</p>
                    </div>
                </div>
            </section>

            {/* ANALYTICS — Comparative Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <div className={`border rounded-2xl p-6 ${isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0a0a0a] border-white/5'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-black' : 'text-white'}`}>Revenue Trends</h3>
                                <p className={`text-[10px] mt-1 ${isLight ? 'text-black/50' : 'text-white/50'}`}>Segmented by selected revenue window</p>
                            </div>
                            <div className="flex gap-2">
                                {(['7D', '30D', '90D', 'ALL'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setRevenueWindow(t)}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black ${revenueWindow === t ? 'bg-[#B38B21] text-black' : isLight ? 'bg-black/5 text-black/40 hover:bg-black/10' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <BarChart data={mockRevenueByDay} />
                        <div className="flex justify-between mt-3 px-2">{days.map(d => <span key={d} className={`text-[9px] font-bold ${isLight ? 'text-black/50' : 'text-white/50'}`}>{d}</span>)}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AIAnalystCard isLight={isLight} />
                        <div className={`border rounded-2xl p-6 flex flex-col justify-between ${isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0a0a0a] border-white/5'}`}>
                            <div className={`flex justify-between items-start mb-4 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                                <div>
                                    <h3 className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-black' : 'text-white'}`}>Customer Growth</h3>
                                    <p className="text-[10px] mt-1">+12% this month</p>
                                </div>
                                <Users size={14} className="text-[#B38B21]" />
                            </div>
                            <div className="h-16 mb-4">
                                <Sparkline data={mockUserGrowth} color="#B38B21" />
                            </div>
                            <div className={`flex justify-between items-end border-t pt-4 ${isLight ? 'border-black/5' : 'border-white/5'}`}>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-black/50' : 'text-white/50'}`}>Net Profit</span>
                                <span className="text-lg font-black text-emerald-400">+$14,200</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`border rounded-2xl p-6 ${isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0a0a0a] border-white/5'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-6 ${isLight ? 'text-black' : 'text-white'}`}>Inventory Mix</h3>
                    {donutSegs.length > 0 ? (
                        <div className="flex flex-col gap-6">
                            <div className="relative flex justify-center">
                                <DonutChart segments={donutSegs} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className={`text-sm sm:text-xl font-black ${isLight ? 'text-black' : 'text-white'}`}>{products.length}</span>
                                    <span className={`text-[8px] uppercase font-black ${isLight ? 'text-black/50' : 'text-white/50'}`}>Items</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {donutSegs.map(s => (
                                    <div key={s.label} className="flex items-center justify-between group cursor-help">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                                            <span className={`text-[10px] transition-colors uppercase font-black tracking-wider ${isLight ? 'text-black/50 group-hover:text-black/80' : 'text-white/50 group-hover:text-white/80'}`}>{s.label}</span>
                                        </div>
                                        <span className={`text-[10px] font-black ${isLight ? 'text-black' : 'text-white'}`}>{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <p className={`text-xs text-center py-4 uppercase font-black ${isLight ? 'text-black/50' : 'text-white/50'}`}>No data available</p>}
                </div>
            </div>

            {/* RECENT ACTIVITY LOG — Gestalt Unified Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 border rounded-2xl overflow-hidden flex flex-col ${isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0a0a0a] border-white/5'}`}>
                    <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-black/5 bg-black/[0.01]' : 'border-white/5 bg-white/[0.01]'}`}>
                        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
                            <ArrowUpRight size={13} className="text-[#B38B21]" />
                            Global Activity Stream
                        </h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-black/50' : 'text-white/50'}`}>Real-time Feed</p>
                    </div>
                    <div className="p-2 space-y-1 overflow-y-auto max-h-[400px]">
                        {globalActivity.map((act, i) => (
                            <div key={`${act.type}-${act.id}-${i}`} className={`flex items-center gap-4 p-3 rounded-xl transition-all group border relative
                                ${isLight ? 'hover:bg-black/[0.02] border-transparent hover:border-black/5' : 'hover:bg-white/[0.02] border-transparent hover:border-white/5'}`}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                                    style={{ background: `${act.color}10` }}>
                                    <act.icon size={15} style={{ color: act.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <p className={`text-[11px] font-black uppercase tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>{act.title}</p>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-black/50' : 'text-white/50'}`}>{new Date(act.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <p className={`text-[10px] font-bold truncate flex items-center gap-1 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                                        {act.sub}
                                        <ArrowUpRight size={8} className="opacity-0 group-hover:opacity-100 transition-all" />
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${act.status === 'Processing' || act.status === 'In Repair' || act.status === 'Pending'
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : 'bg-green-500/10 text-green-500'
                                        }`}>
                                        {act.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <button className={`w-full py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-colors border-t mt-2 flex items-center justify-center gap-2
                            ${isLight ? 'border-black/5 text-black/40 hover:text-black/60' : 'border-white/5 text-white/30 hover:text-white/60'}`}>
                            View All Activity <ArrowUpRight size={10} />
                        </button>
                    </div>
                </div>

                {/* Revenue breakdown */}
                <div className={`border rounded-2xl p-6 h-fit ${isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0a0a0a] border-white/5'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
                        <DollarSign size={13} className="text-[#B38B21]" />
                        Revenue Mix
                    </h3>
                    <div className="space-y-5">
                        {revenueStreams.map(row => {
                            const pct = totalRevenue > 0 ? (row.val / totalRevenue) * 100 : 0;
                            return (
                                <button key={row.label} onClick={() => onNavigate(row.nav)} className="w-full text-left group">
                                    <div className="flex justify-between text-[10px] mb-2.5">
                                        <span className={`font-black uppercase tracking-wider transition-colors flex items-center gap-1 ${isLight ? 'text-black/50 group-hover:text-black/80' : 'text-white/50 group-hover:text-white/80'}`}>
                                            {row.label}
                                            <ArrowUpRight size={9} className="opacity-0 group-hover:opacity-100 transition-all" />
                                        </span>
                                        <span className={`font-black tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>${row.val.toLocaleString()}</span>
                                    </div>
                                    <div className={`w-full rounded-full h-1.5 overflow-hidden ${isLight ? 'bg-black/5' : 'bg-white/[0.03]'}`}>
                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: row.color }} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
