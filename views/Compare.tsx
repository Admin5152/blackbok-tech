import React, { useMemo, useState } from 'react';
import {
    Plus, Search, Info, Trash2, ArrowLeft,
    ShoppingCart, GitCompare, ChevronRight, Scale
} from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAppContext } from '../App';
import { PageBackButton } from '../components/PageBackButton';

export const Compare: React.FC = () => {
    const {
        products: allProducts,
        compareIds,
        onToggleCompare,
        onAddToCart,
        theme
    } = useAppContext();

    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDevices, setShowAddDevices] = useState(false);
    const isLight = theme === 'light';

    const compareProducts = useMemo(() =>
        allProducts.filter(p => compareIds.includes(p.id)),
        [allProducts, compareIds]);

    // CMP-11: forgive partial / lower-case / multi-word / token-out-of-order
    // queries. The previous filter only matched against `p.name` with a
    // single `.includes`, so a user typing "iphone 15" against a product
    // named "Apple iPhone 15 Pro Max" would get a hit, but "15 pro" or
    // "macbook m3" against "Apple MacBook Pro M3 14-inch" wouldn't unless
    // the words appeared in the exact same order. We now split the query
    // into tokens and require every token to appear somewhere in the
    // combined "name + brand + category + description" haystack.
    const normalize = (s: unknown) =>
        String(s ?? '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();

    const availableProducts = useMemo(() => {
        const tokens = normalize(searchTerm).split(' ').filter(Boolean);
        return allProducts.filter(p => {
            if (compareIds.includes(p.id)) return false;
            if (tokens.length === 0) return true;
            const haystack = normalize(
                [
                    p.name,
                    (p as any).brand,
                    p.category,
                    (p as any).description,
                ].filter(Boolean).join(' '),
            );
            return tokens.every(t => haystack.includes(t));
        });
    }, [allProducts, compareIds, searchTerm]);

    const containerClass = isLight ? 'bg-white border-black/10' : 'bg-[#121212] border-white/5';
    const textMuted = isLight ? 'text-black/40' : 'text-white/20';
    const cardBg = isLight ? 'bg-black/[0.02]' : 'bg-white/[0.02]';

    return (
        <div className={`min-h-screen pt-24 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${isLight ? 'bg-[#F0F0F0]' : 'bg-gradient-to-b from-[#050508] via-[#0a0a12] to-[#050508]'}`}>
            <div className="max-w-[1440px] mx-auto">

                <div className="mb-6">
                    <PageBackButton isLight={isLight} fallbackTo="/store" />
                </div>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 sm:mb-16">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center transition-all ${isLight ? 'bg-black text-white' : 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.15)]'}`}>
                                <GitCompare size={32} />
                            </div>
                            <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-none">
                                Compare <br /> <span className="text-[#CDA032]">Matrix</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAddDevices(!showAddDevices)}
                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all active:scale-95 ${showAddDevices
                                ? 'bg-[#CDA032] text-black shadow-lg shadow-[#CDA032]/20'
                                : isLight ? 'bg-black text-white hover:bg-black/80' : 'bg-white text-black hover:bg-white/90'
                                }`}
                        >
                            <Plus size={16} /> {showAddDevices ? 'Finalize Selection' : 'Inject Hardware'}
                        </button>
                    </div>
                </div>

                {/* Add Devices Overlay */}
                {showAddDevices && (
                    <div className={`mb-12 p-8 rounded-[2.5rem] border animate-in slide-in-from-top-10 duration-500 ${containerClass}`}>
                        <div className="relative mb-8">
                            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20" />
                            <input
                                type="text"
                                placeholder="SEARCH REPOSITORY FOR UNITS..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`w-full pl-16 pr-8 py-5 bg-transparent border rounded-2xl text-xs font-black uppercase tracking-widest outline-none transition-all ${isLight ? 'border-black/10 focus:border-black' : 'border-white/10 focus:border-[#CDA032]'}`}
                            />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {availableProducts.slice(0, 12).map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => onToggleCompare(p.id)}
                                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-4 group ${isLight ? 'border-black/5 hover:border-black hover:bg-black/5' : 'border-white/5 hover:border-[#CDA032] hover:bg-white/5'}`}
                                >
                                    <div className="aspect-square bg-black rounded-xl p-3 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-tight truncate mb-1">{p.name}</p>
                                        <p className="text-[9px] font-black text-[#CDA032]">{formatCurrency(p.price)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comparison Table */}
                {compareProducts.length === 0 ? (
                    <div className={`py-40 rounded-[3rem] border border-dashed flex flex-col items-center justify-center ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                        <Info size={48} className="mb-6 opacity-10" />
                        <p className={`text-[11px] font-black uppercase tracking-[0.5em] italic ${textMuted}`}>Repository empty. Inject units to begin analysis.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto pb-12 no-scrollbar">
                        <div className="flex gap-6 min-w-max px-2">
                            {compareProducts.map(p => (
                                <div key={p.id} className="w-[320px] group animate-in fade-in zoom-in duration-500">
                                    <div className={`h-full flex flex-col rounded-[2.5rem] border transition-all ${containerClass} ${isLight ? 'hover:shadow-2xl' : 'hover:shadow-[0_20px_80px_rgba(205,160,50,0.1)] hover:border-[#CDA032]/30'}`}>

                                        {/* Unit Header */}
                                        <div className="p-8 border-b border-inherit relative">
                                            <button
                                                onClick={() => onToggleCompare(p.id)}
                                                className={`absolute top-6 right-6 p-2 rounded-full transition-all ${isLight ? 'hover:bg-red-50 text-black/20 hover:text-red-500' : 'hover:bg-red-500/10 text-white/10 hover:text-red-400'}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                            <div className="flex flex-col items-center text-center space-y-6">
                                                <div className={`w-32 h-32 rounded-3xl bg-black p-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-2xl`}>
                                                    <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-black uppercase tracking-tight line-clamp-2 leading-none">{p.name}</h3>
                                                    <p className="text-[9px] font-black text-[#CDA032] uppercase tracking-[0.4em] italic">{p.category}</p>
                                                </div>
                                                <div className="text-2xl font-black italic tracking-tighter h-8 flex items-center justify-center">
                                                    {formatCurrency(p.price)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Matrix Specs */}
                                        <div className="p-8 space-y-8 flex-1">

                                            {/* Comparison Highlights */}
                                            <div className="space-y-3 min-h-[80px]">
                                                <h4 className={`text-[9px] font-black uppercase tracking-[0.4em] italic ${textMuted}`}>Unit Benchmarks</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {(() => {
                                                        const minPrice = Math.min(...compareProducts.map(x => x.price));
                                                        const maxRating = Math.max(...compareProducts.map(x => x.rating || 0));
                                                        const wins = [];
                                                        if (p.price === minPrice) wins.push("Optimal Price");
                                                        if ((p.rating || 0) === maxRating) wins.push("Peak Rating");
                                                        if (p.stock > 0) wins.push("Available");

                                                        return wins.map((win, i) => (
                                                            <span key={i} className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${win === "Optimal Price" ? 'bg-[#CDA032] text-black shadow-lg shadow-[#CDA032]/20' : cardBg}`}>
                                                                {win}
                                                            </span>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Hardware Specifications */}
                                            <div className="space-y-4 min-h-[220px]">
                                                <h4 className={`text-[9px] font-black uppercase tracking-[0.4em] italic ${textMuted}`}>Hardware Specs</h4>
                                                <div className="space-y-2">
                                                    {(p.specs && p.specs.length > 0) ? (
                                                        p.specs.slice(0, 4).map((spec, i) => (
                                                            <div key={i} className={`p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-transparent ${cardBg} hover:border-[#CDA032]/20 transition-all`}>
                                                                {spec}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className={`p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-dashed ${cardBg} ${textMuted}`}>
                                                            No specifications added yet
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Additional Metrics */}
                                            <div className="pt-4 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Condition</span>
                                                    <span className="text-[10px] font-black">NEW / RETAIL</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Logistics</span>
                                                    <span className="text-[10px] font-black flex items-center gap-2"><Scale size={12} className="text-[#CDA032]" /> FREE SHIPPING</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Block — CMP-13: switched to brand-gold so the
                                            CTA is unmistakable against either light or dark cards.
                                            Previously it used bg-white / bg-black which blended into
                                            the surrounding card surface and was hard to spot. */}
                                        <div className="p-8 pt-0 mt-auto">
                                            <button
                                                type="button"
                                                onClick={() => onAddToCart(p)}
                                                aria-label={`Add ${p.name} to cart`}
                                                disabled={(p.stock ?? 0) <= 0}
                                                className="w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all active:scale-95 flex items-center justify-center gap-3 bg-[#CDA032] text-black shadow-lg shadow-[#CDA032]/20 hover:bg-[#B38B21] hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#CDA032] disabled:hover:scale-100"
                                            >
                                                <ShoppingCart size={16} />
                                                {(p.stock ?? 0) > 0 ? 'Deploy Unit' : 'Out of Stock'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add More Unit Placeholder */}
                            <button
                                onClick={() => setShowAddDevices(true)}
                                className={`w-[320px] self-stretch rounded-[2.5rem] border border-dashed flex flex-col items-center justify-center gap-6 group hover:border-[#CDA032] transition-colors ${isLight ? 'border-black/10' : 'border-white/10'}`}
                            >
                                <div className={`w-20 h-20 rounded-full border border-dashed flex items-center justify-center group-hover:bg-[#CDA032] group-hover:text-black group-hover:border-transparent transition-all ${isLight ? 'border-black/10 text-black/40' : 'border-white/10 text-white/20'}`}>
                                    <Plus size={32} />
                                </div>
                                <p className={`text-[9px] font-black uppercase tracking-[0.4em] italic transition-colors ${isLight ? 'text-black/40 group-hover:text-black' : 'text-white/20 group-hover:text-[#CDA032]'}`}>Inject Hardware</p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
