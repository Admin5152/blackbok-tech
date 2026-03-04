import React, { useMemo } from 'react';
import {
    Package,
    Truck,
    CheckCircle2,
    Clock,
    MapPin,
    ShieldCheck,
    Wrench,
    ArrowLeftRight,
    FileText,
    AlertCircle,
    ChevronLeft,
    ArrowRight,
    RefreshCw,
    XCircle
} from 'lucide-react';
import { Link, useParams } from '@tanstack/react-router';
import { useAppContext } from '../App';
import { formatCurrency } from '../lib/utils';

interface TimelineStep {
    id: string;
    label: string;
    description: string;
    date?: string;
    status: 'completed' | 'current' | 'upcoming';
    icon: any;
}

export const Tracking: React.FC = () => {
    const { type, id } = useParams({ from: '/tracking/$type/$id' });
    const { theme, orders = [], repairs = [], trades = [], user, setTrades, setRepairs, notify } = useAppContext();
    const isLight = theme === 'light';

    // Data Resolution
    const trackingData = useMemo(() => {
        if (type === 'order') {
            const order = orders.find(o => o.id === id);
            if (!order) return null;

            const steps: TimelineStep[] = [
                { id: '1', label: 'Order Placed', description: 'Your order has been received.', date: order.date, status: 'completed', icon: FileText },
                { id: '2', label: 'Processing', description: 'We are preparing your items.', status: order.status === 'Pending' ? 'current' : 'completed', icon: Package },
                { id: '3', label: 'Shipped', description: 'Your package is on its way.', status: order.status === 'Shipped' ? 'current' : (order.status === 'Delivered' ? 'completed' : 'upcoming'), icon: Truck },
                { id: '4', label: 'Delivered', description: 'Package reached its destination.', status: order.status === 'Delivered' ? 'completed' : 'upcoming', icon: CheckCircle2 },
            ];

            return {
                title: `Order #${id}`,
                subtitle: 'Shipment Tracking',
                mainIcon: Package,
                steps,
                details: [
                    { label: 'Carrier', value: 'BlackBox Logistics' },
                    { label: 'Method', value: order.shipping_method || 'Standard Express' },
                    { label: 'Address', value: order.shipping_address || 'Customer Pick-up' }
                ]
            };
        }

        if (type === 'repair') {
            const repair = repairs.find(r => r.id === id);
            if (!repair) return null;

            const steps: TimelineStep[] = [
                { id: '1', label: 'Ticket Created', description: 'Repair request logged.', date: repair.date, status: 'completed', icon: FileText },
                { id: '2', label: 'Received', description: 'Device arrived at our facility.', status: repair.status === 'Received' ? 'current' : 'completed', icon: MapPin },
                { id: '3', label: 'In Repair', description: 'Our engineers are working on it.', status: repair.status === 'In Repair' ? 'current' : (repair.status === 'Ready' || repair.status === 'Completed' ? 'completed' : 'upcoming'), icon: Wrench },
                { id: '4', label: 'Completed', description: 'Device is ready for pickup/delivery.', status: repair.status === 'Completed' ? 'completed' : 'upcoming', icon: ShieldCheck },
            ];

            return {
                title: `Repair #${id}`,
                subtitle: 'Service Status',
                mainIcon: Wrench,
                steps,
                details: [
                    { label: 'Device', value: repair.device },
                    { label: 'Estimate', value: repair.estimatedCost || 'TBD' },
                    { label: 'Technician', value: 'Senior Engineer X' }
                ]
            };
        }

        if (type === 'trade') {
            const trade = trades.find(t => t.id === id);
            if (!trade) return null;

            const steps: TimelineStep[] = [
                { id: '1', label: 'Request Initiated', description: 'You started the trade-in process.', date: trade.date, status: 'completed', icon: FileText },
                { id: '2', label: 'Inspecting', description: 'Our lab is verifying device condition.', status: trade.status === 'Inspecting' ? 'current' : (trade.status === 'Pending' ? 'upcoming' : 'completed'), icon: ArrowLeftRight },
                { id: '3', label: 'Offer Made', description: 'valuation complete, offer issued.', status: trade.status === 'Offer Made' ? 'current' : (trade.status === 'Accepted' || trade.status === 'Completed' ? 'completed' : 'upcoming'), icon: ShieldCheck },
                { id: '4', label: 'Completed', description: 'Credits applied to your account.', status: trade.status === 'Completed' ? 'completed' : 'upcoming', icon: CheckCircle2 },
            ];

            if (trade.status === 'Rejected') {
                steps[2] = { id: '3', label: 'Offer Rejected', description: 'The trade-in offer was declined.', status: 'completed', icon: XCircle as any };
                steps[3] = { id: '4', label: 'Trade Closed', description: 'Process terminated.', status: 'current', icon: AlertCircle };
            }

            return {
                title: `Trade-In #${id}`,
                subtitle: 'Valuation Tracking',
                mainIcon: RefreshCw,
                steps,
                details: [
                    { label: 'Item', value: trade.device },
                    { label: 'Condition', value: trade.condition },
                    { label: 'Final Value', value: trade.finalValue ? formatCurrency(trade.finalValue) : 'Pending Inspection' },
                    { label: 'Est. Value', value: formatCurrency(trade.estimatedValue) }
                ],
                originalData: trade
            };
        }

        return null;
    }, [type, id, orders, repairs, trades]);

    if (!trackingData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-6">
                    <AlertCircle size={64} className="mx-auto text-red-500 opacity-20" />
                    <h2 className="text-3xl font-black italic uppercase text-white/40">Reference Not Found</h2>
                    <Link to="/history" className="inline-flex px-8 py-4 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors">Return to History</Link>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen pt-32 pb-20 px-4 md:px-8 transition-colors duration-500 ${isLight ? 'bg-[#FAFAFA]' : 'bg-black'}`}>
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Back Button */}
                <Link to="/history" className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#CDA032] transition-colors">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to History
                </Link>

                {/* Hero Header */}
                <div className="grid md:grid-cols-2 gap-12 items-end">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#CDA032]/20 flex items-center justify-center text-[#CDA032]">
                                <trackingData.mainIcon size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">{trackingData.subtitle}</span>
                        </div>
                        <h1 className={`text-4xl md:text-6xl font-black italic tracking-tighter uppercase ${isLight ? 'text-black' : 'text-white'}`}>
                            {trackingData.title}
                        </h1>
                    </div>

                    <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-white/5 border-white/5'}`}>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            {trackingData.details.map((detail, idx) => (
                                <div key={idx} className="space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{detail.label}</p>
                                    <p className={`text-xs font-bold ${detail.label.includes('Value') || detail.label.includes('Estimate') ? 'text-[#CDA032]' : (isLight ? 'text-black' : 'text-white')}`}>{detail.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Timeline UI */}
                <div className={`p-8 md:p-12 rounded-[3rem] border backdrop-blur-3xl overflow-hidden relative ${isLight ? 'bg-white border-black/5 shadow-xl' : 'bg-white/5 border-white/5 shadow-2xl shadow-black'}`}>

                    {/* Background Detail */}
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <trackingData.mainIcon size={180} />
                    </div>

                    <div className="relative space-y-12">
                        {trackingData.steps.map((step, index) => (
                            <div key={step.id} className="relative flex gap-8 group">
                                {/* Connector Line */}
                                {index !== trackingData.steps.length - 1 && (
                                    <div className={`absolute left-7 top-14 bottom-[-3rem] w-1 transition-all duration-1000 ${step.status === 'completed' ? 'bg-[#CDA032]' : 'bg-white/10'}`}></div>
                                )}

                                {/* Status Icon */}
                                <div className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${step.status === 'completed' ? 'bg-[#CDA032] border-[#CDA032] text-black scale-110 shadow-lg shadow-[#CDA032]/20' :
                                    step.status === 'current' ? 'bg-white/10 border-[#CDA032] text-[#CDA032] animate-pulse' :
                                        'bg-white/5 border-white/5 text-white/20'
                                    }`}>
                                    <step.icon size={24} />
                                </div>

                                {/* Step Info */}
                                <div className="space-y-2 pt-1 flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <h3 className={`text-xl font-black italic tracking-tight uppercase ${step.status === 'upcoming' ? 'opacity-20' : 'text-white'
                                            }`}>
                                            {step.label}
                                        </h3>
                                        {step.date && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] bg-[#CDA032]/10 px-3 py-1 rounded-full">
                                                {new Date(step.date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs font-medium leading-relaxed max-w-md ${step.status === 'upcoming' ? 'opacity-10' : 'opacity-40'
                                        }`}>
                                        {step.description}
                                    </p>

                                    {/* Action Buttons for Offer Made */}
                                    {step.label === 'Offer Made' && step.status === 'current' && (
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => {
                                                    if (type === 'trade') {
                                                        const updated = trades.map(t => t.id === id ? { ...t, status: 'Accepted' } : t);
                                                        setTrades(updated as any);
                                                        notify('Trade-in offer accepted!', 'success');
                                                    }
                                                }}
                                                className="px-6 py-2.5 bg-[#CDA032] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-[#CDA032]/20"
                                            >
                                                Accept Offer
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (type === 'trade') {
                                                        const updated = trades.map(t => t.id === id ? { ...t, status: 'Rejected' } : t);
                                                        setTrades(updated as any);
                                                        notify('Offer declined.', 'error');
                                                    }
                                                }}
                                                className="px-6 py-2.5 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Assistance Area */}
                <div className={`p-8 rounded-[2.5rem] border flex flex-col md:flex-row items-center justify-between gap-8 transition-all ${isLight ? 'bg-black text-white' : 'bg-[#CDA032] text-black'}`}>
                    <div className="space-y-2 text-center md:text-left">
                        <h4 className="text-xl font-black italic tracking-tighter uppercase">Need assistance?</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Speak with our specialist about this {type}.</p>
                    </div>
                    <Link to="/contact" className={`px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 ${isLight ? 'bg-white text-black' : 'bg-black text-white shadow-xl shadow-black/20 hover:scale-105'}`}>
                        Support Hub
                        <ArrowRight size={16} />
                    </Link>
                </div>

            </div>
        </div>
    );
};
