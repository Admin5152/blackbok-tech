import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, ChevronRight, Lock, FileText, Scale, ArrowLeft } from 'lucide-react';
import { Link, useSearch } from '@tanstack/react-router';
import type { Theme } from '../App';

interface PoliciesProps {
    theme?: Theme;
}

export const Policies: React.FC<PoliciesProps> = ({ theme }) => {
    const isLight = theme === 'light';
    const search = useSearch({ from: '/policies' } as any) as { tab?: string };
    const [activeTab, setActiveTab] = useState<'privacy' | 'returns'>(
        (search.tab as any) === 'returns' ? 'returns' : 'privacy'
    );

    useEffect(() => {
        if (search.tab === 'returns') setActiveTab('returns');
        else if (search.tab === 'privacy') setActiveTab('privacy');
    }, [search.tab]);

    const containerClass = isLight ? 'bg-white border-black/10' : 'bg-[#0A0A0A] border-white/5';
    const textMuted = isLight ? 'text-black/50' : 'text-white/40';

    return (
        <div className={`min-h-screen pt-24 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${isLight ? 'bg-[#F0F0F0] text-black' : 'bg-black text-white'}`}>
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="text-center mb-12 sm:mb-20 space-y-4">
                    <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase">
                        Legal <span className={isLight ? 'text-black/20' : 'text-white/20'}>Manifesto</span>
                    </h1>
                    <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-[0.4em] italic ${textMuted}`}>
                        Operational protocols & structural safeguards
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex justify-center mb-12 sm:mb-16">
                    <div className={`p-1.5 rounded-2xl border flex items-center gap-1 ${isLight ? 'bg-white border-black/5' : 'bg-white/5 border-white/5'}`}>
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'privacy' ? (isLight ? 'bg-black text-white' : 'bg-white text-black shadow-lg shadow-white/5') : 'hover:bg-white/5 opacity-40'}`}
                        >
                            Privacy Policy
                        </button>
                        <button
                            onClick={() => setActiveTab('returns')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'returns' ? (isLight ? 'bg-black text-white' : 'bg-white text-black shadow-lg shadow-white/5') : 'hover:bg-white/5 opacity-40'}`}
                        >
                            Returns & Exchanges
                        </button>
                    </div>
                </div>

                <div className={`rounded-[2.5rem] border shadow-2xl p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-10 duration-700 ${containerClass}`}>

                    {activeTab === 'privacy' ? (
                        <div className="space-y-12">
                            <div className="flex items-center gap-4 mb-8">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                    <Lock size={24} />
                                </div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Privacy Protocol</h2>
                            </div>

                            <section className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[#CDA032]">01. Data Acquisition</h3>
                                <p className={`text-base leading-relaxed font-medium ${isLight ? 'text-black/70' : 'text-white/60'}`}>
                                    We collect information essential for transactional accuracy and structural diagnostics. This includes your identity logs (name, email), terminal addresses (shipping location), and hardware interaction history.
                                </p>
                            </section>

                            <section className="space-y-6 border-t border-inherit pt-8">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[#CDA032]">02. Encryption Measures</h3>
                                <p className={`text-base leading-relaxed font-medium ${isLight ? 'text-black/70' : 'text-white/60'}`}>
                                    All data is processed through industry-standard military-grade encryption cycles. We do not store financial credentials locally; all transactions are routed through certified external processors.
                                </p>
                            </section>

                            <section className="space-y-6 border-t border-inherit pt-8">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[#CDA032]">03. User Rights</h3>
                                <p className={`text-base leading-relaxed font-medium ${isLight ? 'text-black/70' : 'text-white/60'}`}>
                                    You maintain absolute sovereignty over your logged data. You may request a complete data wipe or identity update at any time through your Profile dashboard.
                                </p>
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            <div className="flex items-center gap-4 mb-8">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                    <RefreshCw size={24} />
                                </div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Return & Exchange</h2>
                            </div>

                            <section className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[#CDA032]">01. Eligibility Window</h3>
                                <p className={`text-base leading-relaxed font-medium ${isLight ? 'text-black/70' : 'text-white/60'}`}>
                                    Standard returns are authorized within 14 Earth days from the timestamp of delivery. Units must be returned in their original, sealed structural state.
                                </p>
                            </section>

                            <section className="space-y-6 border-t border-inherit pt-8">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[#CDA032]">02. Exchange Protocol</h3>
                                <p className={`text-base leading-relaxed font-medium ${isLight ? 'text-black/70' : 'text-white/60'}`}>
                                    Faulty hardware identified during our standard 48-hour burn-in period is eligible for immediate 1-to-1 swap, subject to unit availability in the repository.
                                </p>
                            </section>

                            <section className="space-y-6 border-t border-inherit pt-8">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[#CDA032]">03. Non-Returnable Items</h3>
                                <p className={`text-base leading-relaxed font-medium ${isLight ? 'text-black/70' : 'text-white/60'}`}>
                                    Custom-configured terminals, opened peripheral accessories, and repair service fees are non-refundable once the execution has been initiated.
                                </p>
                            </section>

                            <div className={`p-6 rounded-2xl border border-dashed transition-colors ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed text-center opacity-60 italic">
                                    All returns are subject to a standard structural inspection by our lab technicians.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-12 flex justify-center">
                    <Link
                        to="/faq"
                        className={`group px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] border transition-all flex items-center gap-4 ${isLight ? 'bg-black text-white border-black' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                    >
                        View External FAQ <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>
        </div>
    );
};
