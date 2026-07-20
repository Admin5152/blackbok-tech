import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Package, Calendar, MapPin, CreditCard, ChevronRight, ChevronDown } from 'lucide-react';
import { Badge, SearchInput, Modal, ModalClose, Td, Th, TableWrapper, EmptyState, DateFilterDropdown } from './adminUtils';
import { getAdminOrdersFromItems, updateOrderStatus } from '../../lib/api';
import { friendlyError } from '../../lib/friendlyErrors';
import { useAppContext } from '../../lib/appContext';
import type { Order } from '../../types';
import { formatCurrency } from '../../lib/utils';

function isStorePickupOrder(order: Pick<Order, 'shipping_method'>): boolean {
    const m = String(order.shipping_method || '').toLowerCase();
    return m === 'pickup' || m.includes('pick');
}

/** Admin-facing status label (pickup reuses Shipped as “ready”). */
function adminOrderStatusLabel(order: Order, status: string): string {
    if (isStorePickupOrder(order) && status === 'Shipped') return 'Ready for pickup';
    if (isStorePickupOrder(order) && status === 'Delivered') return 'Picked up';
    return status;
}

function primaryOrderAction(order: Order): { label: string; next: Order['status'] } | null {
    const s = order.status;
    if (s === 'Delivered' || s === 'Cancelled' || s === 'Refunded') return null;

    if (isStorePickupOrder(order)) {
        if (s === 'Shipped') {
            return { label: 'Mark as picked up', next: 'Delivered' };
        }
        return { label: 'Mark ready for pickup', next: 'Shipped' };
    }

    if (s === 'Shipped') {
        return { label: 'Mark as delivered', next: 'Delivered' };
    }
    return { label: 'Mark as shipped', next: 'Shipped' };
}

export const AdminOrders: React.FC = () => {
    const { theme } = useAppContext();
    const isLight = theme === 'light';
    const [orders, setOrders] = useState<Order[]>([]);
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All Time');
    const [sel, setSel] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const ORDER_STATUS_OPTIONS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'] as const;
    const DATE_FILTER_OPTIONS = ['All Time', 'Today', 'Past 7 Days', 'Past 30 Days', 'Past 3 Months'] as const;

    const modalLineSubtotal = useMemo(() => {
        if (!sel?.items?.length) return 0;
        return sel.items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    }, [sel]);

    const paymentMethodLabel = (raw?: string) => {
        const r = String(raw || '').toLowerCase();
        if (r === 'in_person' || r === 'pickup_cash') return 'Pay on pickup';
        if (r === 'mobile_money') return 'Mobile Money';
        if (r === 'card') return 'Card';
        return raw ? String(raw) : 'N/A';
    };

    const shippingMethodLabel = (raw?: string) => {
        const r = String(raw || '').toLowerCase();
        if (r === 'pickup' || r.includes('pick')) return 'Store pickup';
        if (r === 'delivery' || r.includes('deliver')) return 'Delivery';
        return raw ? String(raw) : 'Standard';
    };

    const paymentStatusLabel = (raw?: string) => {
        const r = String(raw || 'pending').toLowerCase();
        if (r === 'paid') return 'Paid';
        if (r === 'failed') return 'Failed';
        if (r === 'refunded') return 'Refunded';
        return 'Pending';
    };

    useEffect(() => {
        getAdminOrdersFromItems().then(d => {
            setOrders(d || []);
            setLoadError('');
            setLoading(false);
        }).catch((err) => {
            console.error('Failed to load orders:', err);
            setOrders([]);
            setLoadError(friendlyError(err, 'load orders'));
            setLoading(false);
        });
    }, []);

    const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
        if (updatingOrderId === orderId) return;

        setUpdatingOrderId(orderId);
        try {
            // Always persist status changes to Supabase.
            await updateOrderStatus(orderId, newStatus);

            // Update local state
            setOrders(prev => prev.map(o => o.id === orderId ? {
                ...o,
                status: newStatus,
                ...(String(newStatus).toLowerCase() === 'delivered' ? { payment_status: 'paid' } : {})
            } : o));
            if (sel && sel.id === orderId) {
                setSel(prev => prev ? {
                    ...prev,
                    status: newStatus,
                    ...(String(newStatus).toLowerCase() === 'delivered' ? { payment_status: 'paid' } : {})
                } : null);
            }
            setToast({ type: 'success', message: 'Order status updated.' });
            setTimeout(() => setToast(null), 3000);
        } catch (error) {
            console.error('Failed to update status:', error);
            const msg = friendlyError(error, 'update this order');
            setToast({ type: 'error', message: msg });
            setTimeout(() => setToast(null), 5000);
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const StatusDropdown = ({ order }: { order: Order }) => {
        const [isOpen, setIsOpen] = useState(false);
        const isUpdating = updatingOrderId === order.id;

        const handleSelect = (status: Order['status']) => {
            setIsOpen(false);
            if (status !== order.status) {
                handleStatusChange(order.id, status);
            }
        };

        return (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={isUpdating}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all
                        ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}
                        ${order.status === 'Delivered' ? 'text-emerald-400 bg-emerald-400/10' :
                            order.status === 'Cancelled' ? 'text-red-400 bg-red-400/10' :
                                order.status === 'Refunded' ? 'text-rose-500 bg-rose-500/10' :
                                    order.status === 'Processing' ? 'text-blue-400 bg-blue-400/10' :
                                        order.status === 'Shipped' ? 'text-emerald-400 bg-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.3)]' :
                                            'text-amber-400 bg-amber-400/10'}`}
                >
                    {isUpdating ? 'Updating...' : adminOrderStatusLabel(order, order.status)}
                    <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div
                            className={`absolute top-full left-0 mt-1 w-40 rounded-xl shadow-xl overflow-hidden z-50 py-1 border ${
                                isLight
                                    ? 'bg-white border-black/10'
                                    : 'bg-[#1a1a1a] border-white/10'
                            }`}
                        >
                            {ORDER_STATUS_OPTIONS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleSelect(s)}
                                    className={`w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                                        order.status === s
                                            ? 'text-[#B38B21] bg-[#B38B21]/10'
                                            : isLight
                                              ? 'text-black/75 hover:bg-black/5 hover:text-black'
                                              : 'text-[#E5E5E5] hover:bg-white/10 hover:text-[#F5F5F5]'
                                    }`}
                                >
                                    {adminOrderStatusLabel(order, s)}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const statuses = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];
    const statusFilterLabel = (s: string) => {
        if (s === 'Shipped') return 'Shipped / Ready';
        return s;
    };

    const filtered = useMemo(() => {
        const isDateInRange = (dateString: string, filterStr: string) => {
            if (filterStr === 'All Time') return true;
            const orderDate = new Date(dateString);
            if (Number.isNaN(orderDate.getTime())) return false;
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfToday = new Date(startOfToday);
            endOfToday.setDate(endOfToday.getDate() + 1);

            switch (filterStr) {
                case 'Today':
                    return orderDate >= startOfToday && orderDate < endOfToday;
                case 'Past 7 Days':
                    return orderDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                case 'Past 30 Days':
                    return orderDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                case 'Past 3 Months': {
                    const cutoff = new Date();
                    cutoff.setMonth(cutoff.getMonth() - 3);
                    return orderDate >= cutoff;
                }
                default:
                    return true;
            }
        };

        return orders.filter(o => {
            const query = q.trim().toLowerCase();
            const dateStr = new Date(o.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
            const displayRef = (o.display_id || '').toLowerCase();
            const idCompact = o.id.replace(/-/g, '').toLowerCase();
            const qCompact = query.replace(/-/g, '');
            const shortTail = o.id.slice(-6).toLowerCase();

            const matchQ =
                !query ||
                (o.userName || '').toLowerCase().includes(query) ||
                o.id.toLowerCase().includes(query) ||
                idCompact.includes(qCompact) ||
                displayRef.includes(query) ||
                shortTail.includes(query) ||
                (o.shipping_address || '').toLowerCase().includes(query) ||
                dateStr.includes(query) ||
                o.items.some(item => {
                    const cfg = (item.configurationLine || '').toLowerCase();
                    const optBlob = Object.values(item.selectedOptions || {}).join(' ').toLowerCase();
                    return (item.name || '').toLowerCase().includes(query) || cfg.includes(query) || optBlob.includes(query);
                });

            const matchS = statusFilter === 'All' || o.status === statusFilter;

            const matchD = isDateInRange(o.date, dateFilter);

            return matchQ && matchS && matchD;
        });
    }, [orders, q, statusFilter, dateFilter]);

    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const avgOrder = orders.length ? (revenue / orders.length).toFixed(0) : '0';
    const activeOrderCount = orders.filter(o => !['Delivered', 'Cancelled', 'Refunded'].includes(o.status)).length;

    return (
        <div className="space-y-5">
            {toast && (
                <div className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wider ${
                    toast.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                    {toast.message}
                </div>
            )}
            {loadError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 font-medium normal-case tracking-normal">
                    {loadError}
                </div>
            )}
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Orders', val: orders.length, col: '#B38B21' },
                    { label: 'Total Revenue', val: formatCurrency(revenue), col: '#B38B21' },
                    { label: 'Avg Order Value', val: formatCurrency(Number(avgOrder) || 0), col: '#B38B21' },
                    { label: 'Active Orders', val: activeOrderCount, col: '#B38B21' },
                ].map(s => (
                    <div key={s.label} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 md:p-5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest font-bold mb-2">{s.label}</p>
                        <p className="text-lg md:text-xl font-black" style={{ color: s.col }}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-1.5 overflow-x-auto bb-scrollbar pb-1 sm:pb-0 flex-1 min-w-0 -mx-0.5 px-0.5">
                {[...statuses].map(s => {
                    const count =
                        s === 'All'
                            ? orders.length
                            : orders.filter(o => o.status === s).length;
                    return (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-2.5 py-1 md:py-1.5 rounded-xl text-[9px] md:text-[11px] font-black uppercase whitespace-nowrap transition-all 
                                ${statusFilter === s ? 'bg-[#B38B21] text-black shadow-[0_0_15px_rgba(179,139,33,0.3)]' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>
                            {statusFilterLabel(s)} <span className="opacity-70">({count})</span>
                        </button>
                    );
                })}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    {/* Animated Custom Date Dropdown */}
                    <DateFilterDropdown
                        value={dateFilter}
                        onChange={setDateFilter}
                        options={DATE_FILTER_OPTIONS}
                    />

                    <div className="w-full sm:w-64 shrink-0">
                        <SearchInput value={q} onChange={setQ} placeholder="Search ID, Customer, Address, Item..." />
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-12 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-t-[#B38B21] border-white/10 animate-spin mb-4" />
                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Loading Orders...</p>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={<ShoppingCart size={40} className="text-white/20" />} message={orders.length === 0 ? 'No orders yet. Completed checkouts will appear here.' : 'No orders match your filters.'} />
            ) : (
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>Order Info</Th>
                            <Th>Customer Details</Th>
                            <Th>Amount</Th>
                            <Th>Date</Th>
                            <Th>Status</Th>
                            <Th>Items</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(o => (
                            <tr key={o.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setSel(o)}>
                                <Td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#B38B21]/10 group-hover:text-[#B38B21] transition-colors">
                                            <Package size={14} className={o.items.length > 1 ? "text-[#B38B21]" : "text-white/40"} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white group-hover:text-[#B38B21] transition-colors">
                                                {o.display_id ? o.display_id : `#${o.id.slice(-6).toUpperCase()}`}
                                            </p>
                                            <p className="text-[10px] text-white/40 font-bold">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                </Td>
                                <Td>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-white/90">{o.userName || 'Guest User'}</p>
                                        <p className="text-[10px] text-white/50">{o.userEmail || 'No email'}</p>
                                        <p className="text-[10px] text-white/40">{o.userPhone || 'No phone'}</p>
                                        <p className="text-[9px] text-[#B38B21]/60 truncate">{o.shipping_address}</p>
                                    </div>
                                </Td>
                                <Td><p className="text-xs font-black text-white">{formatCurrency(o.total)}</p></Td>
                                <Td><p className="text-[11px] font-bold text-white/50">{new Date(o.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p></Td>
                                <Td><StatusDropdown order={o} /></Td>
                                <Td>
                                    <div className="flex flex-col gap-1 max-w-[150px] sm:max-w-[200px]">
                                        {o.items.slice(0, 2).map((item, i) => (
                                            <div key={i} className="min-w-0">
                                                <p className="text-[11px] text-white/70 truncate group-hover:text-white transition-colors">
                                                    <span className="font-black text-[#B38B21]">{item.quantity}x</span> {item.name}
                                                </p>
                                                {item.configurationLine ? (
                                                    <p className="text-[9px] text-[#B38B21]/80 font-bold truncate mt-0.5" title={item.configurationLine}>
                                                        {item.configurationLine}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ))}
                                        {o.items.length > 2 && (
                                            <p className="text-[9px] font-bold text-white/30 uppercase mt-0.5">
                                                + {o.items.length - 2} more item{o.items.length - 2 > 1 ? 's' : ''}
                                            </p>
                                        )}
                                        {/* Mobile Tap-to-view Hint */}
                                        <p className="text-[9px] font-black text-[#B38B21]/0 group-hover:text-[#B38B21]/100 transition-colors uppercase pt-1 hidden md:block">
                                            Click to view details <ChevronRight size={10} className="inline mb-0.5" />
                                        </p>
                                    </div>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </TableWrapper>
            )}

            {/* Premium Order Details Modal */}
            {sel && (
                <Modal onClose={() => setSel(null)} isLight={isLight}>
                    <div className="max-w-3xl w-full mx-auto pb-6">
                        {(() => {
                            const action = primaryOrderAction(sel);
                            const titleCls = isLight ? 'text-black' : 'text-white';
                            const mutedCls = isLight ? 'text-black/45' : 'text-white/40';
                            const cardCls = isLight
                                ? 'bg-black/[0.03] border border-black/10 rounded-xl p-4'
                                : 'bg-white/[0.02] border border-white/5 rounded-xl p-4';
                            const bodyCls = isLight ? 'text-black/70' : 'text-white/50';
                            const strongCls = isLight ? 'text-black' : 'text-white';
                            const headerCls = isLight
                                ? 'sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-black/10 p-5 md:p-6 flex items-start justify-between rounded-t-2xl'
                                : 'sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 p-5 md:p-6 flex items-start justify-between rounded-t-2xl';
                            return (
                                <>
                        <div className={headerCls}>
                            <div className="min-w-0 flex-1 pr-3">
                                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                                    <h2 className={`text-lg md:text-xl font-black tracking-tight uppercase ${titleCls}`}>
                                        Order {sel.display_id ? sel.display_id : `#${sel.id.slice(-6).toUpperCase()}`}
                                    </h2>
                                    <StatusDropdown order={sel} />
                                    {action && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleStatusChange(sel.id, action.next);
                                            }}
                                            disabled={updatingOrderId === sel.id}
                                            className="px-4 py-1.5 md:py-2 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                        >
                                            {updatingOrderId === sel.id ? 'Updating…' : action.label}
                                        </button>
                                    )}
                                </div>
                                <p className={`text-xs font-bold flex items-center gap-1.5 ${mutedCls}`}>
                                    <Calendar size={12} /> Placed on {new Date(sel.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(sel.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <ModalClose onClose={() => setSel(null)} isLight={isLight} />
                        </div>

                        <div className="p-5 md:p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={cardCls}>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] mb-3 flex items-center gap-2">
                                        <MapPin size={12} /> Customer & Delivery
                                    </h3>
                                    <p className={`text-sm font-bold mb-1 ${strongCls}`}>{sel.userName || 'Guest User'}</p>
                                    <p className={`text-xs mb-1 ${bodyCls}`}>{sel.userEmail || 'N/A'}</p>
                                    <p className={`text-xs mb-1 ${bodyCls}`}>{sel.userPhone || 'No phone'}</p>
                                    <p className={`text-xs mb-3 ${bodyCls}`}>{sel.shipping_address || 'No address provided'}</p>
                                    <div className={`pt-3 border-t flex items-center justify-between text-xs ${isLight ? 'border-black/10' : 'border-white/5'}`}>
                                        <span className={`font-bold ${mutedCls}`}>Shipping method</span>
                                        <span className={`font-bold ${strongCls}`}>{shippingMethodLabel(sel.shipping_method)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs mt-2">
                                        <span className={`font-bold ${mutedCls}`}>Shipping cost</span>
                                        <span className={`font-bold ${strongCls}`}>{formatCurrency(sel.shipping_cost ?? 0)}</span>
                                    </div>
                                </div>

                                <div className={cardCls}>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] mb-3 flex items-center gap-2">
                                        <CreditCard size={12} /> Payment Info
                                    </h3>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className={`font-bold ${bodyCls}`}>Status</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                                                String(sel.payment_status || '').toLowerCase() === 'paid'
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-amber-500/10 text-amber-500'
                                            }`}>
                                                {paymentStatusLabel(sel.payment_status)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className={`font-bold ${bodyCls}`}>Method</span>
                                            <span className={`font-bold ${strongCls}`}>{paymentMethodLabel(sel.paymentMethod || sel.payment_method)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ml-1 ${mutedCls}`}>
                                    Items Ordered ({sel.items.length})
                                </h3>
                                <div className={`${cardCls} !p-0 overflow-hidden divide-y ${isLight ? 'divide-black/10' : 'divide-white/5'}`}>
                                    {sel.items.map((item, idx) => (
                                        <div key={idx} className={`p-4 flex gap-4 items-center transition-colors ${isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.01]'}`}>
                                            <div className={`w-16 h-16 rounded-lg flex-shrink-0 border overflow-hidden relative ${isLight ? 'bg-black/5 border-black/10' : 'bg-black border-white/10'}`}>
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className={`w-full h-full flex items-center justify-center ${mutedCls}`}><Package size={20} /></div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-bold truncate ${strongCls}`}>{item.name}</h4>
                                                {item.configurationLine ? (
                                                    <p className="text-[11px] font-bold text-[#B38B21] mt-1.5 leading-snug" title={item.configurationLine}>
                                                        {item.configurationLine}
                                                    </p>
                                                ) : item.selectedOptions && Object.keys(item.selectedOptions).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {Object.entries(item.selectedOptions).map(([k, v]) => (
                                                            v ? (
                                                                <span key={k} className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#B38B21]/15 text-[#B38B21] border border-[#B38B21]/25">
                                                                    {k}: {v}
                                                                </span>
                                                            ) : null
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className={`text-xs truncate mt-0.5 ${mutedCls}`}>{item.description || item.category}</p>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-sm font-black ${strongCls}`}>{formatCurrency(item.price)}</p>
                                                <p className={`text-[10px] ${bodyCls}`}>each</p>
                                                <p className={`text-xs font-bold ${mutedCls}`}>Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <div className={`w-full md:w-1/2 lg:w-1/3 space-y-3 ${cardCls}`}>
                                    <div className="flex justify-between items-start gap-3 text-xs">
                                        <span className={`font-bold ${bodyCls}`}>Subtotal</span>
                                        <span className={`font-bold text-right break-all ${strongCls}`}>{formatCurrency(modalLineSubtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-start gap-3 text-xs">
                                        <span className={`font-bold ${bodyCls}`}>Shipping</span>
                                        <span className={`font-bold text-right break-all ${strongCls}`}>{formatCurrency(sel.shipping_cost ?? 0)}</span>
                                    </div>
                                    {Math.abs(modalLineSubtotal + (sel.shipping_cost ?? 0) - sel.total) > 0.02 && (
                                        <p className={`text-[10px] font-bold text-right ${mutedCls}`}>Order total reflects discounts or adjustments from checkout.</p>
                                    )}
                                    <div className={`pt-3 border-t flex justify-between items-start gap-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                                        <span className={`text-xs font-black uppercase ${isLight ? 'text-black/60' : 'text-white/70'}`}>Total</span>
                                        <span className="text-base sm:text-lg font-black text-[#B38B21] text-right break-all leading-tight">{formatCurrency(sel.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                                </>
                            );
                        })()}
                    </div>
                </Modal>
            )}
        </div>
    );
};

