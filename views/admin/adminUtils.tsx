import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';

// Shared utilities, types and helpers for admin modules
export const TRADE_KEY = 'bb_v4_trades';
export const REPAIR_KEY = 'bb_v4_repairs';
export const PROD_KEY = 'bb_v4_products';
export const TRADE_DEVICES_KEY = 'bb_v4_trade_devices';

export const statusColors: Record<string, string> = {
    Pending: 'bg-yellow-500/20 text-yellow-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    Inspecting: 'bg-blue-500/20 text-blue-400',
    inspecting: 'bg-blue-500/20 text-blue-400',
    'Offer sent': 'bg-purple-500/20 text-purple-400',
    'Offer Made': 'bg-purple-500/20 text-purple-400',
    under_review: 'bg-blue-500/20 text-blue-400',
    'Under Review': 'bg-blue-500/20 text-blue-400',
    offer_made: 'bg-purple-500/20 text-purple-400',
    'Awaiting User': 'bg-indigo-500/20 text-indigo-400',
    awaiting_user: 'bg-indigo-500/20 text-indigo-400',
    Accepted: 'bg-green-500/20 text-green-400',
    accepted: 'bg-green-500/20 text-green-400',
    Completed: 'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    Rejected: 'bg-red-500/20 text-red-400',
    rejected: 'bg-red-500/20 text-red-400',
    Received: 'bg-yellow-500/20 text-yellow-400',
    Diagnosing: 'bg-blue-500/20 text-blue-400',
    diagnosing: 'bg-blue-500/20 text-blue-400',
    'In Repair': 'bg-orange-500/20 text-orange-400',
    in_repair: 'bg-orange-500/20 text-orange-400',
    Ready: 'bg-purple-500/20 text-purple-400',
    ready: 'bg-purple-500/20 text-purple-400',
    Shipped: 'bg-purple-500/20 text-purple-400',
    Delivered: 'bg-green-500/20 text-green-400',
    Processing: 'bg-blue-500/20 text-blue-400',
    Cancelled: 'bg-red-500/20 text-red-400',
    'Estimate Sent': 'bg-indigo-500/20 text-indigo-400',
    estimate_sent: 'bg-indigo-500/20 text-indigo-400',
};

export const Badge = ({ status }: { status: string }) => {
    const colors = statusColors[status] || 'bg-white/10 text-white/50';
    return (
        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap ${colors}`}>
            {status}
        </span>
    );
};

export const SearchInput = ({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div className="relative min-w-0 w-full max-w-full sm:max-w-xs md:max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" /></svg>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="min-w-0 w-full pl-9 pr-4 py-2 sm:py-1.5 bg-black/40 border border-white/10 rounded-2xl text-white text-xs focus:border-[#B38B21]/50 focus:outline-none" />
    </div>
);

export const Modal = ({
    onClose,
    children,
    maxW = 'max-w-lg',
    isLight = false,
}: {
    onClose: () => void;
    children: React.ReactNode;
    maxW?: string;
    isLight?: boolean;
}) => (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div
            className={`absolute inset-0 backdrop-blur-xl ${isLight ? 'bg-black/40' : 'bg-black/90'}`}
            onClick={onClose}
        />
        <div
            className={`relative w-full ${maxW} rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] ${
                isLight ? 'bg-white border border-black/10 text-black' : 'bg-[#0d0d0d] border border-white/10'
            }`}
        >
            {children}
        </div>
    </div>
);

export const ModalClose = ({ onClose, isLight = false }: { onClose: () => void; isLight?: boolean }) => (
    <button
        onClick={onClose}
        className={`absolute top-4 right-4 p-1.5 rounded-full z-10 ${
            isLight ? 'bg-black/5 hover:bg-black/10 text-black/70' : 'bg-white/5 hover:bg-white/10 text-white'
        }`}
    >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
);

export const SectionHeader = ({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">{title}</h2>
            {count !== undefined && <span className="text-[9px] font-black bg-white/5 text-white/30 px-2 py-0.5 rounded-full">{count}</span>}
        </div>
        {action}
    </div>
);

export const TableWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full">{children}</table>
        </div>
    </div>
);

export const Th = ({ children }: { children?: React.ReactNode }) => (
    <th className="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest text-white/30 border-b border-white/5">{children}</th>
);

export const Td = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
    <td className={`py-3 px-4 border-b border-white/[0.03] ${className}`}>{children}</td>
);

export const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl py-16 text-center">
        <div className="opacity-10 flex justify-center mb-3">{icon}</div>
        <p className="text-white/20 text-sm">{message}</p>
    </div>
);

// Mini SVG bar chart
export const BarChart = ({ data, color = '#B38B21' }: { data: number[]; color?: string }) => {
    const len = Math.max(data.length, 1);
    const max = Math.max(...data, 1);
    const w = 280; const h = 60; const barW = Math.max(1, w / len - 4);
    return (
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            {data.map((v, i) => {
                const bh = Math.max(2, (v / max) * h);
                return (
                    <g key={i}>
                        <rect x={i * (w / len)} y={h - bh} width={barW} height={bh} rx="3" fill={color} opacity="0.2" />
                        <rect x={i * (w / len)} y={h - bh} width={barW} height={Math.min(4, bh)} rx="2" fill={color} />
                    </g>
                );
            })}
        </svg>
    );
};

export const Sparkline = ({ data, color = '#B38B21' }: { data: number[]; color?: string }) => {
    const series = data.length === 0 ? [0, 0] : data.length === 1 ? [data[0], data[0]] : data;
    const max = Math.max(...series, 1); const w = 100; const h = 36;
    const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - (v / max) * h}`).join(' ');
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={(series.length - 1) / (series.length - 1) * w} cy={h - (series[series.length - 1] / max) * h} r="3" fill={color} />
        </svg>
    );
};

export const DonutChart = ({ segments }: { segments: { value: number; color: string; label: string }[] }) => {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const r = 34; const cx = 42; const cy = 42; const strokeW = 12;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    return (
        <svg width="84" height="84" viewBox="0 0 84 84">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeW} />
            {segments.map((s, i) => {
                const dash = (s.value / total) * circ;
                const gap = circ - dash;
                const el = (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
                        strokeWidth={strokeW} strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset} strokeLinecap="round"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />
                );
                offset += dash;
                return el;
            })}
        </svg>
    );
};


export const DateFilterDropdown = ({ value, onChange, options }: { value: string; onChange: (val: string) => void; options: readonly string[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative group shrink-0" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/70 text-[9px] sm:text-[11px] font-bold uppercase rounded-2xl px-2.5 sm:px-3 py-1.5 hover:bg-white/10 hover:border-[#B38B21]/50 focus:outline-none transition-colors w-[100px] sm:w-[130px] justify-between shadow-sm"
            >
                <div className="flex items-center gap-1.5 truncate">
                    <Calendar size={13} className="text-[#B38B21] shrink-0 hidden sm:block" />
                    <span className="truncate">{value}</span>
                </div>
                <ChevronDown size={14} className={`text-white/40 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white/70' : ''}`} />
            </button>

            {/* Animated Dropdown Menu */}
            <div className={`absolute top-full right-0 sm:left-0 sm:right-auto mt-2 w-40 bg-[#111] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden transform transition-all duration-200 origin-top
                ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => {
                            onChange(opt);
                            setIsOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase transition-colors flex items-center justify-between group
                            ${value === opt ? 'text-[#B38B21] bg-[#B38B21]/10' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                    >
                        {opt}
                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${value === opt ? 'bg-[#B38B21]' : 'bg-transparent group-hover:bg-white/20'}`} />
                    </button>
                ))}
            </div>
        </div>
    );
};
