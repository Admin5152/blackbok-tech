import React, { useState, useEffect } from 'react';
import {
    RefreshCw,
    ChevronRight,
    Lock,
    ShoppingBag,
    Repeat,
    Wrench,
    Receipt,
    ScrollText,
} from 'lucide-react';
import { Link, useSearch } from '@tanstack/react-router';
import type { Theme } from '../App';
import { useAppContext } from '../App';

interface PoliciesProps {
    theme?: Theme;
}

type PolicyTab =
    | 'privacy'
    | 'returns'
    | 'purchase'
    | 'trade-in'
    | 'repair'
    | 'refund'
    | 'terms';

const TABS: Array<{ id: PolicyTab; label: string; Icon: React.FC<{ size?: number }> }> = [
    { id: 'privacy',  label: 'Privacy Policy',      Icon: Lock },
    { id: 'returns',  label: 'Returns & Exchanges', Icon: RefreshCw },
    { id: 'purchase', label: 'Purchase Policy',     Icon: ShoppingBag },
    { id: 'trade-in', label: 'Trade-in Policy',     Icon: Repeat },
    { id: 'repair',   label: 'Repair Policy',       Icon: Wrench },
    { id: 'refund',   label: 'Refund Policy',       Icon: Receipt },
    { id: 'terms',    label: 'Terms & Conditions',  Icon: ScrollText },
];

export const Policies: React.FC<PoliciesProps> = ({ theme: themeProp }) => {
    const { theme: ctxTheme } = useAppContext();
    const theme = themeProp ?? ctxTheme;
    const isLight = theme === 'light';
    const search = useSearch({ from: '/policies' } as any) as { tab?: string };

    const resolveTab = (t: unknown): PolicyTab => {
        const allowed = TABS.map(x => x.id);
        return (typeof t === 'string' && (allowed as string[]).includes(t)) ? (t as PolicyTab) : 'privacy';
    };

    const [activeTab, setActiveTab] = useState<PolicyTab>(resolveTab(search.tab));

    useEffect(() => {
        setActiveTab(resolveTab(search.tab));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search.tab]);

    const containerClass = isLight ? 'bg-white border-black/10 text-black' : 'bg-[#0A0A0A] border-white/5 text-white';
    const textMuted = isLight ? 'text-black/50' : 'text-white/40';
    const bodyText  = isLight ? 'text-black/70' : 'text-white/60';
    const bulletDot = isLight ? 'bg-black/30'  : 'bg-white/30';

    // ---- Reusable section block ----
    const Section: React.FC<{
        number: string;
        title: string;
        children: React.ReactNode;
        first?: boolean;
    }> = ({ number, title, children, first }) => (
        <section className={`space-y-6 ${first ? '' : 'border-t border-inherit pt-8'}`}>
            <h3 className="text-sm font-black uppercase tracking-widest text-[#CDA032]">
                {number}. {title}
            </h3>
            <div className={`text-base leading-relaxed font-medium space-y-3 ${bodyText}`}>
                {children}
            </div>
        </section>
    );

    const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <li className="flex gap-3 items-start">
            <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${bulletDot}`} />
            <span>{children}</span>
        </li>
    );

    // ---- Tab header (icon + title) ----
    const TabHeader: React.FC<{ Icon: React.FC<{ size?: number }>; title: string }> = ({ Icon, title }) => (
        <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                <Icon size={24} />
            </div>
            <h2 className={`text-2xl font-black uppercase italic tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>{title}</h2>
        </div>
    );

    return (
        <div className={`min-h-screen pt-24 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${isLight ? 'bg-[#F0F0F0] text-black' : 'bg-gradient-to-b from-[#050508] via-[#08080f] to-[#050508] text-white'}`}>
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="text-center mb-12 sm:mb-20 space-y-4">
                    <h1 className={`text-4xl sm:text-6xl font-black italic tracking-tighter uppercase ${isLight ? 'text-black' : 'text-white'}`}>
                        Legal <span className={isLight ? 'text-black/40' : 'text-white/25'}>Manifesto</span>
                    </h1>
                    <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-[0.4em] italic ${textMuted}`}>
                        Operational protocols & structural safeguards
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex justify-center mb-12 sm:mb-16">
                    <div className={`p-1.5 rounded-2xl border flex items-center gap-1 flex-wrap max-w-full ${isLight ? 'bg-white border-black/5' : 'bg-white/5 border-white/5'}`}>
                        {TABS.map(({ id, label }) => {
                            const active = activeTab === id;
                            const activeCls = isLight ? 'bg-black text-white' : 'bg-white text-black shadow-lg shadow-white/5';
                            const inactiveCls = isLight
                                ? 'text-black/70 hover:bg-black/5'
                                : 'text-white/60 hover:bg-white/5';
                            return (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`px-5 sm:px-7 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? activeCls : inactiveCls}`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Card */}
                <div className={`rounded-[2.5rem] border shadow-2xl p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-10 duration-700 ${containerClass}`}>

                    {/* PRIVACY — left intact for QA (STC-10) */}
                    {activeTab === 'privacy' && (
                        <div className="space-y-12">
                            <TabHeader Icon={Lock} title="Privacy Protocol" />

                            <Section number="01" title="Data Acquisition" first>
                                <p>
                                    We collect information essential for transactional accuracy and structural
                                    diagnostics. This includes your identity logs (name, email), terminal
                                    addresses (shipping location), and hardware interaction history.
                                </p>
                            </Section>

                            <Section number="02" title="Encryption Measures">
                                <p>
                                    All data is processed through industry-standard military-grade encryption
                                    cycles. We do not store financial credentials locally; all transactions are
                                    routed through certified external processors.
                                </p>
                            </Section>

                            <Section number="03" title="User Rights">
                                <p>
                                    You maintain absolute sovereignty over your logged data. You may request a
                                    complete data wipe or identity update at any time through your Profile
                                    dashboard.
                                </p>
                            </Section>
                        </div>
                    )}

                    {/* RETURNS — left intact for QA (STC-11), refund details cross-link */}
                    {activeTab === 'returns' && (
                        <div className="space-y-12">
                            <TabHeader Icon={RefreshCw} title="Return & Exchange" />

                            <Section number="01" title="Eligibility Window" first>
                                <p>
                                    Standard returns are authorized within 14 Earth days from the timestamp of
                                    delivery. Units must be returned in their original, sealed structural state.
                                </p>
                            </Section>

                            <Section number="02" title="Exchange Protocol">
                                <p>
                                    Faulty hardware identified during our standard 48-hour burn-in period is
                                    eligible for immediate 1-to-1 swap, subject to unit availability in the
                                    repository.
                                </p>
                            </Section>

                            <Section number="03" title="Non-Returnable Items">
                                <p>
                                    Custom-configured terminals, opened peripheral accessories, and repair
                                    service fees are non-refundable once the execution has been initiated.
                                </p>
                            </Section>

                            <div className={`p-6 rounded-2xl border border-dashed transition-colors ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed text-center opacity-60 italic">
                                    All returns are subject to a standard structural inspection by our lab technicians.
                                    See the <button onClick={() => setActiveTab('refund')} className="underline hover:text-[#CDA032] transition-colors">Refund Policy</button> for monetary terms.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* PURCHASE POLICY */}
                    {activeTab === 'purchase' && (
                        <div className="space-y-12">
                            <TabHeader Icon={ShoppingBag} title="Purchase Policy" />
                            <p className={`text-base leading-relaxed font-medium ${bodyText}`}>
                                At BlackBox, we ensure all purchases are transparent and secure.
                            </p>

                            <Section number="01" title="Payment & Release" first>
                                <ul className="space-y-2">
                                    <Bullet>Full payment is required before any item is released unless covered under our payment plan policy.</Bullet>
                                    <Bullet>Prices are subject to change without prior notice.</Bullet>
                                </ul>
                            </Section>

                            <Section number="02" title="Quality Assurance">
                                <ul className="space-y-2">
                                    <Bullet>All devices are thoroughly tested before sale.</Bullet>
                                    <Bullet>Customers are encouraged to inspect devices before leaving the store.</Bullet>
                                </ul>
                            </Section>

                            <Section number="03" title="Finality of Sale">
                                <ul className="space-y-2">
                                    <Bullet>Once a purchase is completed, it is considered final unless covered under our <button onClick={() => setActiveTab('refund')} className="underline hover:text-[#CDA032]">Refund Policy</button>.</Bullet>
                                </ul>
                            </Section>
                        </div>
                    )}

                    {/* TRADE-IN POLICY */}
                    {activeTab === 'trade-in' && (
                        <div className="space-y-12">
                            <TabHeader Icon={Repeat} title="Trade-in Policy" />
                            <p className={`text-base leading-relaxed font-medium ${bodyText}`}>
                                We offer fair value for devices traded in at BlackBox.
                            </p>

                            <Section number="01" title="Device Evaluation" first>
                                <p>Devices must be evaluated by our team before a value is assigned. The final trade-in value depends on:</p>
                                <ul className="space-y-2 mt-3">
                                    <Bullet>Physical condition</Bullet>
                                    <Bullet>Battery health</Bullet>
                                    <Bullet>Original parts status</Bullet>
                                    <Bullet>Market value at the time</Bullet>
                                </ul>
                            </Section>

                            <Section number="02" title="Customer Responsibility">
                                <ul className="space-y-2">
                                    <Bullet>All trade-ins are final once agreed upon.</Bullet>
                                    <Bullet>Customers must remove personal accounts (e.g., iCloud) before trade-in.</Bullet>
                                    <Bullet>BlackBox is not responsible for any data left on traded devices.</Bullet>
                                </ul>
                            </Section>
                        </div>
                    )}

                    {/* REPAIR POLICY */}
                    {activeTab === 'repair' && (
                        <div className="space-y-12">
                            <TabHeader Icon={Wrench} title="Repair Policy" />
                            <p className={`text-base leading-relaxed font-medium ${bodyText}`}>
                                We handle all repairs with professionalism and care.
                            </p>

                            <Section number="01" title="Diagnostics & Authorization" first>
                                <ul className="space-y-2">
                                    <Bullet>Diagnostic fees may apply and are non-refundable.</Bullet>
                                    <Bullet>Customers will be informed of repair costs before work begins.</Bullet>
                                    <Bullet>Full or partial payment may be required before repair begins, depending on the job.</Bullet>
                                </ul>
                            </Section>

                            <Section number="02" title="Warranty & Liability">
                                <p>Repairs may void manufacturer warranties. BlackBox is not responsible for:</p>
                                <ul className="space-y-2 mt-3">
                                    <Bullet>Pre-existing faults not related to the repair</Bullet>
                                    <Bullet>Data loss during repair</Bullet>
                                </ul>
                            </Section>

                            <Section number="03" title="Uncollected Devices">
                                <ul className="space-y-2">
                                    <Bullet>Devices not collected within 30 days of completion may be resold to recover costs.</Bullet>
                                </ul>
                            </Section>
                        </div>
                    )}

                    {/* REFUND POLICY */}
                    {activeTab === 'refund' && (
                        <div className="space-y-12">
                            <TabHeader Icon={Receipt} title="Refund Policy" />
                            <p className={`text-base leading-relaxed font-medium ${bodyText}`}>
                                We maintain a strict but fair refund structure.
                            </p>

                            <Section number="01" title="Eligibility Conditions" first>
                                <p>Refunds are only applicable under the following conditions:</p>
                                <ul className="space-y-2 mt-3">
                                    <Bullet>Device has a verified fault not caused by the user.</Bullet>
                                    <Bullet>Issue is reported within 48 hours of purchase.</Bullet>
                                </ul>
                            </Section>

                            <Section number="02" title="Exclusions">
                                <p>No refunds are issued for:</p>
                                <ul className="space-y-2 mt-3">
                                    <Bullet>Change of mind.</Bullet>
                                    <Bullet>Physical damage after purchase.</Bullet>
                                </ul>
                            </Section>

                            <Section number="03" title="Resolution Options">
                                <p>Approved refunds may be processed as:</p>
                                <ul className="space-y-2 mt-3">
                                    <Bullet>Store credit</Bullet>
                                    <Bullet>Exchange</Bullet>
                                    <Bullet>Partial refund (depending on condition)</Bullet>
                                </ul>
                            </Section>
                        </div>
                    )}

                    {/* TERMS & CONDITIONS */}
                    {activeTab === 'terms' && (
                        <div className="space-y-12">
                            <TabHeader Icon={ScrollText} title="Terms & Conditions" />
                            <p className={`text-base leading-relaxed font-medium ${bodyText}`}>
                                By engaging with BlackBox, you agree to the following.
                            </p>

                            <Section number="01" title="Governing Terms" first>
                                <ul className="space-y-2">
                                    <Bullet>All transactions are governed by BlackBox policies.</Bullet>
                                    <Bullet>Customers are responsible for providing accurate information.</Bullet>
                                </ul>
                            </Section>

                            <Section number="02" title="Right of Refusal">
                                <ul className="space-y-2">
                                    <Bullet>BlackBox reserves the right to refuse service when necessary.</Bullet>
                                    <Bullet>Prices and policies may be updated at any time without prior notice.</Bullet>
                                </ul>
                            </Section>

                            <Section number="03" title="Storage Fees">
                                <ul className="space-y-2">
                                    <Bullet>Devices left in-store beyond the agreed period may incur storage fees.</Bullet>
                                </ul>
                            </Section>
                        </div>
                    )}
                </div>

                {/* External FAQ — STC-13 */}
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
