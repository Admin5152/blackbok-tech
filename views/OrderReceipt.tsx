import React, { useEffect, useState } from 'react';
import {
    Package,
    CheckCircle2,
    Truck,
    FileText,
    User,
    Mail,
    MapPin,
    CreditCard,
    ChevronLeft,
    Printer,
    ShoppingBag,
    ArrowRight,
} from 'lucide-react';
import { Link, useParams } from '@tanstack/react-router';
import { useAppContext } from '../App';
import { getOrder } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { Order } from '../types';

const StatusStep = ({ label, icon: Icon, active, done }: { label: string; icon: any; active: boolean; done: boolean }) => (
    <div className="flex flex-col items-center gap-2 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500
            ${done ? 'bg-[#B38B21] border-[#B38B21] text-black' :
                active ? 'bg-white/10 border-[#B38B21] text-[#B38B21] animate-pulse' :
                    'bg-white/5 border-white/10 text-white/20'}`}>
            <Icon size={18} />
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest text-center ${done || active ? 'text-white/70' : 'text-white/20'}`}>
            {label}
        </span>
    </div>
);

const StatusConnector = ({ done }: { done: boolean }) => (
    <div className={`flex-1 h-0.5 mb-7 transition-all duration-700 ${done ? 'bg-[#B38B21]' : 'bg-white/10'}`} />
);

export const OrderReceipt: React.FC = () => {
    const { orderId } = useParams({ from: '/receipt/$orderId' } as any);
    const { theme, orders: contextOrders, user } = useAppContext();
    const isLight = theme === 'light';

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const local = contextOrders.find(o => o.id === orderId);
        if (local) {
            setOrder(local);
            setLoading(false);
            return;
        }
        getOrder(orderId)
            .then(o => {
                if (o) setOrder(o);
                else setError('Order not found.');
            })
            .catch(() => setError('Could not load order. Please try again.'))
            .finally(() => setLoading(false));
    }, [orderId]);

    const getStatusStepState = (stepKey: string, currentStatus: unknown): 'done' | 'active' | 'upcoming' => {
        const hierarchy = ['Pending', 'Processing', 'Shipped', 'Delivered'];
        const currentStatusStr = String(currentStatus ?? '').trim();
        const statusIdx = hierarchy.indexOf(currentStatusStr);
        const stepIdx = hierarchy.indexOf(stepKey);
        if (stepIdx < statusIdx) return 'done';
        if (stepIdx === statusIdx) return 'active';
        return 'upcoming';
    };

    const displayStatus = (s: unknown) =>
        String(s ?? '').trim().toLowerCase() === 'shipped' ? 'Ready' : String(s ?? '');

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-t-[#B38B21] border-white/10 rounded-full animate-spin" />
                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Loading Receipt...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-6 px-4">
                <Package size={64} className="text-white/10" />
                <h2 className="text-2xl font-black text-white/40 uppercase italic">{error || 'Order Not Found'}</h2>
                <Link to="/history" className="px-8 py-4 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors">
                    Back to History
                </Link>
            </div>
        );
    }

    const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping = order.shipping_cost || 0;

    const statusSteps: { label: string; key: string; icon: any }[] = [
        { label: 'Order Placed', key: 'Pending', icon: FileText },
        { label: 'Processing', key: 'Processing', icon: Package },
        { label: 'Ready', key: 'Shipped', icon: Truck },
        { label: 'Delivered', key: 'Delivered', icon: CheckCircle2 },
    ];

    return (
        <div className={`min-h-screen pt-28 pb-20 px-4 md:px-8 transition-colors duration-500 ${isLight ? 'bg-[#F0F0F0]' : 'bg-black'}`}>
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Back + Print */}
                <div className="flex items-center justify-between">
                    <Link to="/history" className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#B38B21] transition-colors">
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Order History
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-wider"
                    >
                        <Printer size={14} /> Print Receipt
                    </button>
                </div>

                {/* Receipt Card */}
                <div className={`rounded-3xl border overflow-hidden ${isLight ? 'bg-white border-black/5 shadow-xl' : 'bg-[#0a0a0a] border-white/5 shadow-2xl shadow-black'}`}>

                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-[#B38B21]/20 via-[#B38B21]/10 to-transparent p-8 border-b border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#B38B21]/10 rounded-full blur-3xl" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-[#B38B21]/20 flex items-center justify-center">
                                    <CheckCircle2 size={22} className="text-[#B38B21]" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#B38B21]">Order Receipt</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black italic text-white uppercase tracking-tight">
                                #{order.id.slice(-8).toUpperCase()}
                            </h1>
                            <p className="text-xs text-white/40 font-bold mt-1">
                                Placed on {new Date(order.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-8">

                        {/* Status Tracker */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-5">Order Progress</p>
                            <div className="flex items-center">
                                {statusSteps.map((step, idx) => {
                                    const state = getStatusStepState(step.key, order.status);
                                    return (
                                        <React.Fragment key={step.key}>
                                            <StatusStep label={step.label} icon={step.icon} active={state === 'active'} done={state === 'done'} />
                                            {idx < statusSteps.length - 1 && (
                                                <StatusConnector done={
                                                    getStatusStepState(statusSteps[idx + 1].key, order.status) !== 'upcoming'
                                                } />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                            <div className="mt-4 text-center">
                                <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest
                                    ${order.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                                        order.status === 'Shipped' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.2)]' :
                                            order.status === 'Processing' ? 'bg-blue-500/10 text-blue-400' :
                                                order.status === 'Cancelled' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-amber-500/10 text-amber-400'}`}>
                                    Current Status: {displayStatus(order.status)}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-white/5" />

                        {/* Customer Info */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] flex items-center gap-2">
                                    <User size={12} /> Customer Details
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-sm">
                                        <User size={14} className="text-white/30 flex-shrink-0" />
                                        <span className="text-white font-bold">{order.userName || user?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail size={14} className="text-white/30 flex-shrink-0" />
                                        <span className="text-white/60">{order.userEmail || user?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm">
                                        <MapPin size={14} className="text-white/30 flex-shrink-0 mt-0.5" />
                                        <span className="text-white/60">{order.shipping_address || 'Customer Pick-up / No address provided'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] flex items-center gap-2">
                                    <CreditCard size={12} /> Payment Details
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-white/50">Method</span>
                                        <span className="text-white font-bold capitalize">{order.paymentMethod || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">Payment Status</span>
                                        <span className={`font-bold capitalize ${order.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {order.payment_status || 'Pending'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">Delivery Method</span>
                                        <span className="text-white font-bold">{order.shipping_method || 'Standard'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                                <ShoppingBag size={12} /> Items Ordered ({order.items.length})
                            </h3>
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                                <div className="hidden md:grid grid-cols-12 px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">
                                    <span className="col-span-6">Product</span>
                                    <span className="col-span-2 text-center">Qty</span>
                                    <span className="col-span-2 text-right">Unit Price</span>
                                    <span className="col-span-2 text-right">Line Total</span>
                                </div>
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 items-center gap-2 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                                        <div className="col-span-7 md:col-span-6 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 overflow-hidden flex-shrink-0">
                                                {item.image
                                                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={14} className="text-white/20" /></div>
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                                <p className="text-[10px] text-white/40 truncate">{item.description || item.category}</p>
                                                {/* Mobile-only qty */}
                                                <p className="text-[10px] text-white/50 font-bold md:hidden">Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <p className="hidden md:block col-span-2 text-center text-xs font-bold text-white/60">{item.quantity}</p>
                                        <p className="hidden md:block col-span-2 text-right text-xs font-bold text-white/70">{formatCurrency(item.price)}</p>
                                        <p className="col-span-5 md:col-span-2 text-right text-xs font-black text-white">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-full md:w-72 space-y-3 bg-white/[0.03] border border-white/5 rounded-2xl p-5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50 font-bold">Subtotal</span>
                                    <span className="text-white font-bold">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50 font-bold">Delivery Fee</span>
                                    <span className="text-white font-bold">{formatCurrency(shipping)}</span>
                                </div>
                                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                                    <span className="text-sm font-black uppercase text-white">Grand Total</span>
                                    <span className="text-2xl font-black text-[#B38B21]">{formatCurrency(order.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notification Note */}
                        <div className="bg-[#B38B21]/10 border border-[#B38B21]/20 rounded-2xl px-6 py-4 text-center">
                            <p className="text-xs text-[#B38B21] font-bold">
                                You will be notified when your order is ready for pickup or dispatch.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                to={`/tracking/order/${order.id}`}
                                className="flex-1 py-4 bg-[#B38B21] text-black rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                            >
                                Track Order <ArrowRight size={16} />
                            </Link>
                            <Link
                                to="/store"
                                className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                            >
                                Continue Shopping
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
