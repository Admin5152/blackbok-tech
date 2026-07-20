import React, { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
    Mail,
    Star,
    Quote,
    ArrowRight,
    Target,
    Eye,
    HeartHandshake,
    Award,
    Sparkles,
    Users,
    ShieldCheck,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    Box,
    Lightbulb,
    Scale,
    Heart,
    Wrench,
} from 'lucide-react';
import type { Theme } from '../App';
import { PageBackButton } from '../components/PageBackButton';

interface AboutUsProps {
    theme?: Theme;
}

const ViewfinderLogo = ({ className = "w-full h-full" }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M25 40V28C25 26.3431 26.3431 25 28 25H40" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
        <path d="M60 25H72C73.6569 25 75 26.3431 75 28V40" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
        <path d="M75 60V72C75 73.6569 73.6569 75 72 75H60" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
        <path d="M40 75H28C26.3431 75 25 73.6569 25 72V60" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
        <rect x="38" y="44" width="24" height="12" rx="6" fill="currentColor" />
    </svg>
);

const TypographyLogo: React.FC<{ prefix?: string, mainText?: string, isLight?: boolean, size?: 'small' | 'medium' | 'large' | 'hero', prefixClassName?: string }> = ({
    prefix = "We Are",
    mainText = "BlackBox",
    isLight = false,
    size = 'medium',
    prefixClassName = ""
}) => {
    const sizeMap = {
        small: 'text-2xl',
        medium: 'text-3xl md:text-5xl',
        large: 'text-4xl md:text-6xl',
        hero: 'text-5xl md:text-9xl'
    };

    const iconSizeMap = {
        small: "w-6 h-6 md:w-8 md:h-8",
        medium: "w-10 h-10 md:w-12 md:h-12",
        large: "w-16 h-16 md:w-20 md:h-20",
        hero: "w-[10vw] h-[10vw] sm:w-20 sm:h-20 md:w-32 md:h-32"
    };

    return (
        <div className="flex flex-col items-center select-none transition-all duration-500 w-full">
            {prefix && (
                <span className={`text-7xl md:text-[10rem] font-black uppercase tracking-[0.4em] mb-6 md:mb-10 transition-colors duration-500 leading-none ${isLight ? 'text-black/40' : 'text-white/40'} ${prefixClassName}`}>
                    {prefix}
                </span>
            )}

            {size === 'hero' ? (
                <div className="w-[85%] max-w-4xl flex justify-center items-center">
                    <img
                        src="/BlackBox.jpeg"
                        alt="BlackBox"
                        className="w-full h-auto object-contain transition-[filter] [transition-duration:var(--bb-theme-duration)] [transition-timing-function:var(--bb-theme-easing)]"
                        style={{ filter: isLight ? 'invert(1) brightness(1.2)' : 'none' }}
                    />
                </div>
            ) : (
                <div className={`flex items-center gap-1 md:gap-4 font-black tracking-tighter uppercase italic leading-none transition-all duration-500 ${sizeMap[size]} ${isLight ? 'text-black' : 'text-white'}`}>
                    <span>BLACKB</span>
                    <div className={`${iconSizeMap[size]} flex items-center justify-center text-[#D4AF37] transform hover:scale-110 transition-transform duration-500`}>
                        <ViewfinderLogo />
                    </div>
                    <span>X</span>
                </div>
            )}

            <div className={`mt-4 h-1 w-1/4 rounded-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50`}></div>
        </div>
    );
};

const SectionEyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center justify-center gap-4">
        <div className="h-px w-8 bg-[#D4AF37]" />
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#D4AF37]">{children}</span>
        <div className="h-px w-8 bg-[#D4AF37]" />
    </div>
);

const panelClass = (isLight: boolean, extra = '') =>
    `bb-theme-transition rounded-[1.75rem] border transition-all duration-500 ${extra} ${
        isLight ? 'bg-white border-black/[0.06] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]' : 'bg-[#0f0f12] border-white/[0.07] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]'
    }`;

export const AboutUs: React.FC<AboutUsProps> = ({ theme = 'dark' }) => {
    const isLight = theme === 'light';
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

    useEffect(() => {
        window.requestAnimationFrame(() => {
            window.dispatchEvent(new Event('bb-scroll-reveal-scan'));
        });
    }, [theme]);

    const customerReviews = [
        {
            name: "Kwame Osei",
            text: "BlackBox completely transformed how I buy tech in Ghana. The quality is unmatched and delivery was incredibly fast.",
            rating: 5,
        },
        {
            name: "Ama Mensah",
            text: "Traded in my old iPhone for a new Mac. The process was seamless and I got great value. Highly recommend!",
            rating: 5,
        },
        {
            name: "David Kusi",
            text: "Outstanding customer service. They went above and beyond to help me choose the right laptop for my design work.",
            rating: 5,
        },
    ];

    return (
        <div data-about-page className={`min-h-screen bb-theme-transition ${isLight ? 'bg-[#ffffff] text-black' : 'bg-black text-white'}`}>
            {/* Hero Section */}
            <section className={`relative bb-theme-transition overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:pt-36 ${isLight ? 'bg-[#ffffff]' : 'bg-black'}`}>
                {/* Background photo layer */}
                <div className="absolute inset-0 z-0" aria-hidden>
                    <img
                        src="/Group2.jpeg"
                        alt=""
                        className="h-full w-full object-cover"
                        style={{ filter: isLight ? 'brightness(0.96)' : 'brightness(0.5)' }}
                    />
                    {/* Overlay so text stays legible over the photo */}
                    <div
                        className={`absolute inset-0 bb-theme-transition ${
                            isLight
                                ? 'bg-gradient-to-br from-white via-white/90 to-white/76'
                                : 'bg-gradient-to-br from-black via-black/88 to-black/76'
                        }`}
                    />
                    <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-t from-white via-white/50 to-transparent' : 'bg-gradient-to-t from-black via-black/50 to-transparent'}`} />
                </div>

                <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
                    <PageBackButton isLight={isLight} fallbackTo="/" />
                </div>

                <div className="relative z-10 mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-6xl items-center gap-10 animate-in fade-in slide-in-from-bottom-12 duration-1000 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.78fr)] lg:gap-16">
                    <div className="max-w-3xl text-left">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="h-px w-10 bg-[#D4AF37]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.34em] text-[#D4AF37]">About BlackBox</span>
                        </div>

                        <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                            We are{' '}
                            <span className="block bg-gradient-to-r from-[#D4AF37] via-[#F4E4C1] to-[#D4AF37] bg-clip-text text-transparent">
                                BlackBox.
                            </span>
                        </h1>

                        <p className={`mt-6 max-w-2xl text-lg font-medium leading-8 sm:text-xl md:text-2xl md:leading-9 ${isLight ? 'text-black/68' : 'text-white/68'}`}>
                            Your reliable home for <span className="font-bold text-[#D4AF37]">innovation</span> and digital <span className="font-bold text-[#D4AF37]">excellence</span>.
                        </p>

                        <p className={`mt-5 max-w-xl text-sm font-medium leading-7 sm:text-base ${isLight ? 'text-black/55' : 'text-white/52'}`}>
                            Built around clarity, care, and confidence, we help people buy, repair, and upgrade their tech without the usual uncertainty.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {[
                                { icon: ShieldCheck, label: 'Trusted devices' },
                                { icon: Wrench, label: 'Expert repairs' },
                                { icon: Scale, label: 'Fair trade-ins' },
                            ].map(({ icon: Icon, label }) => (
                                <div
                                    key={label}
                                    className={`bb-theme-transition inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
                                        isLight
                                            ? 'border-black/10 bg-white/72 text-black/72 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]'
                                            : 'border-white/12 bg-black/42 text-white/76 shadow-[0_14px_36px_-18px_rgba(0,0,0,0.9)]'
                                    }`}
                                >
                                    <Icon size={14} className="text-[#D4AF37]" />
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`bb-theme-transition relative rounded-[1.5rem] border p-5 shadow-2xl sm:p-6 lg:justify-self-end ${
                        isLight
                            ? 'border-black/[0.08] bg-white shadow-[0_24px_70px_-36px_rgba(0,0,0,0.38)]'
                            : 'border-white/[0.1] bg-[#0b0b0d] shadow-[0_28px_80px_-30px_rgba(0,0,0,0.9)]'
                    }`}>
                        <div className={`aspect-[4/3] overflow-hidden rounded-[1rem] border ${isLight ? 'border-black/[0.06] bg-[#f5f5f7]' : 'border-white/[0.08] bg-black'}`}>
                            <img
                                src="/BlackBox.jpeg"
                                alt="BlackBox"
                                className="h-full w-full object-contain p-8 transition-[filter] [transition-duration:var(--bb-theme-duration)] [transition-timing-function:var(--bb-theme-easing)]"
                                style={{ filter: isLight ? 'invert(1) brightness(1.2)' : 'none' }}
                            />
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                ['10k+', 'Customers'],
                                ['5+', 'Years'],
                                ['98%', 'Recommend'],
                            ].map(([value, label]) => (
                                <div key={label} className={`rounded-xl border px-3 py-4 text-center ${isLight ? 'border-black/[0.08] bg-[#f5f5f7]' : 'border-white/[0.1] bg-white/[0.06]'}`}>
                                    <div className="text-2xl font-black tracking-tight text-[#D4AF37]">{value}</div>
                                    <div className={`mt-1 text-[9px] font-black uppercase tracking-[0.18em] ${isLight ? 'text-black/60' : 'text-white/62'}`}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-20 z-10">
                    <div className={`bb-theme-transition w-6 h-10 rounded-full border-2 ${isLight ? 'border-black' : 'border-white'} flex justify-center p-1`}>
                        <div className={`bb-theme-transition w-1 h-2 rounded-full ${isLight ? 'bg-black' : 'bg-white'}`}></div>
                    </div>
                </div> */}
            </section>

            {/* Mission & Vision grid */}
            <section className={`bb-theme-transition relative z-10 px-4 py-24 sm:px-8 md:py-32 ${isLight ? 'bg-[#ffffff]' : 'bg-[#0a0a0a]'}`}>
                <div className="mx-auto max-w-6xl">
                    <div className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:items-end">
                        <div className="reveal-on-scroll">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="h-px w-10 bg-[#D4AF37]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.34em] text-[#D4AF37]">Why We Exist</span>
                            </div>
                            <h2 className="text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl md:text-6xl">
                                Tech should feel clear,
                                <span className="block text-[#D4AF37]">not confusing.</span>
                            </h2>
                        </div>
                        <p className={`max-w-2xl text-base font-medium leading-8 sm:text-lg ${isLight ? 'text-black/62' : 'text-white/58'}`}>
                            We saw people spending too much money on devices they could not fully trust, repairs they could not follow, and trade-in offers they could not understand. BlackBox exists to make every step feel simple, fair, and well guided.
                        </p>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] lg:gap-8">
                        <div className="grid gap-4 reveal-on-scroll reveal-delay-1 sm:grid-cols-3 lg:grid-cols-1">
                            {[
                                {
                                    label: 'We inspect',
                                    title: 'Every detail matters.',
                                    body: 'From device condition to repair diagnosis, we slow down where it matters so customers do not have to guess.',
                                    icon: Eye,
                                },
                                {
                                    label: 'We explain',
                                    title: 'No hidden language.',
                                    body: 'Pricing, options, risks, and timelines are communicated in plain terms before a decision is made.',
                                    icon: Lightbulb,
                                },
                                {
                                    label: 'We stand by it',
                                    title: 'The relationship continues.',
                                    body: 'Buying, repairing, or trading in should feel like the start of support, not the end of a transaction.',
                                    icon: HeartHandshake,
                                },
                            ].map(({ label, title, body, icon: Icon }) => (
                                <div key={label} className={panelClass(isLight, 'p-6 sm:p-7')}>
                                    <div className="mb-5 flex items-center justify-between gap-4">
                                        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">{label}</span>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/12 text-[#D4AF37]">
                                            <Icon size={18} />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h3>
                                    <p className={`mt-3 text-sm font-medium leading-7 ${isLight ? 'text-black/60' : 'text-white/56'}`}>{body}</p>
                                </div>
                            ))}
                        </div>

                        <div className={`bb-theme-transition overflow-hidden rounded-[1.75rem] border reveal-on-scroll reveal-delay-2 ${isLight ? 'border-black/[0.06] bg-[#f5f5f7]' : 'border-white/[0.08] bg-black'}`}>
                            <div className="relative aspect-[4/3] min-h-[18rem]">
                                <img key={theme} src="/BlackRun.jpeg" alt="BlackBox team at work" className="h-full w-full object-cover" loading="eager" decoding="async" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
                                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#D4AF37]">Our Promise</p>
                                    <h3 className="mt-3 max-w-sm text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                                        Precision, respect, and real support.
                                    </h3>
                                </div>
                            </div>
                            <div className="grid gap-px sm:grid-cols-2">
                                {[
                                    {
                                        label: 'Our Mission',
                                        title: 'Precision & Respect.',
                                        body: 'We care about you and your devices, treating each piece of technology with precision and respect to deliver the best experience possible.',
                                    },
                                    {
                                        label: 'Our Vision',
                                        title: 'Ahead of the Curve.',
                                        body: 'Your reliable home for innovation, keeping you ahead with the latest tech improvements and sustainable upgrade solutions.',
                                    },
                                ].map(({ label, title, body }) => (
                                    <div key={label} className={`p-6 sm:p-7 ${isLight ? 'bg-white' : 'bg-[#0f0f12]'}`}>
                                        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#D4AF37]">{label}</p>
                                        <h3 className="mt-3 text-2xl font-black italic leading-tight tracking-tight sm:text-3xl">
                                            {title}
                                        </h3>
                                        <p className={`mt-4 text-sm font-medium leading-7 ${isLight ? 'text-black/68' : 'text-white/64'}`}>{body}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Trust & social proof ── */}
            <section className={`bb-theme-transition relative overflow-hidden py-24 md:py-32 px-4 sm:px-8 ${isLight ? 'bg-[#f2f2f7]' : 'bg-[#050508]'}`}>
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                    <div className={`absolute -top-32 right-0 h-96 w-96 rounded-full blur-[120px] ${isLight ? 'bg-[#D4AF37]/10' : 'bg-[#D4AF37]/8'}`} />
                    <div className={`absolute bottom-0 left-0 h-80 w-80 rounded-full blur-[100px] ${isLight ? 'bg-black/[0.03]' : 'bg-white/[0.03]'}`} />
                </div>

                <div className="relative mx-auto max-w-6xl">
                    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16 lg:items-start">
                        {/* Left: headline */}
                        <div className="space-y-6 reveal-on-scroll lg:sticky lg:top-28">
                            <SectionEyebrow>The Numbers</SectionEyebrow>
                            <h2 className="text-4xl font-black leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
                                Trusted by{' '}
                                <span className="bg-gradient-to-r from-[#B38B21] to-[#F4E4C1] bg-clip-text text-transparent">
                                    Thousands.
                                </span>
                            </h2>
                            <p className={`max-w-md text-base font-medium leading-relaxed md:text-lg ${isLight ? 'text-black/60' : 'text-white/55'}`}>
                                Trust is not a claim we make once. It is earned through every diagnosis, every product handoff, and every message after the sale.
                            </p>
                        </div>

                        {/* Right: stat bento */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 reveal-on-scroll reveal-delay-1">
                            {[
                                { value: '10k+', label: 'Satisfied Customers', sub: '5-star community', icon: Users },
                                { value: '5+', label: 'Years of Excellence', sub: 'Since 2021', icon: Award },
                                { value: '98%', label: 'Recommendation Rate', sub: 'Industry leading', icon: TrendingUp },
                                { value: '100%', label: 'Certified Technicians', sub: 'Expert repairs', icon: ShieldCheck },
                            ].map(({ value, label, sub, icon: Icon }) => (
                                <div
                                    key={label}
                                    className={`${panelClass(isLight, 'group p-5 sm:p-6 hover:-translate-y-1 hover:border-[#D4AF37]/25 hover:shadow-xl')}`}
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/12 text-[#D4AF37]">
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={8} className="fill-[#D4AF37] text-[#D4AF37]" />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black tracking-tighter text-[#D4AF37] sm:text-4xl">{value}</div>
                                    <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.22em] ${isLight ? 'text-black/80' : 'text-white/85'}`}>{label}</p>
                                    <p className={`mt-1 text-[9px] font-bold uppercase tracking-widest ${isLight ? 'text-black/40' : 'text-white/35'}`}>{sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Testimonials */}
                    <div className="mt-16 md:mt-20 reveal-on-scroll reveal-delay-2">
                        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isLight ? 'text-black/40' : 'text-white/40'}`}>Customer voices</p>
                                <h3 className="mt-2 text-2xl font-black italic tracking-tight md:text-3xl">Real people. Real trust.</h3>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentReviewIndex((i) => (i - 1 + customerReviews.length) % customerReviews.length)}
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${isLight ? 'border-black/10 hover:bg-black hover:text-white' : 'border-white/15 hover:bg-[#D4AF37] hover:text-black hover:border-transparent'}`}
                                    aria-label="Previous review"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentReviewIndex((i) => (i + 1) % customerReviews.length)}
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${isLight ? 'border-black/10 hover:bg-black hover:text-white' : 'border-white/15 hover:bg-[#D4AF37] hover:text-black hover:border-transparent'}`}
                                    aria-label="Next review"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Featured quote */}
                        <div className={`${panelClass(isLight, 'relative overflow-hidden p-8 md:p-12 mb-6')}`}>
                            <Quote className="absolute right-6 top-6 text-[#D4AF37]/15 md:right-10 md:top-10" size={64} />
                            <div className="relative z-10 max-w-3xl">
                                <div className="mb-6 flex gap-1">
                                    {[...Array(customerReviews[currentReviewIndex].rating)].map((_, i) => (
                                        <Star key={i} size={16} className="fill-[#D4AF37] text-[#D4AF37]" />
                                    ))}
                                </div>
                                <blockquote className={`text-xl font-medium italic leading-relaxed md:text-2xl md:leading-relaxed ${isLight ? 'text-black/85' : 'text-white/85'}`}>
                                    &ldquo;{customerReviews[currentReviewIndex].text}&rdquo;
                                </blockquote>
                                <footer className="mt-8 flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B38B21] text-sm font-black text-black">
                                        {customerReviews[currentReviewIndex].name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-widest">{customerReviews[currentReviewIndex].name}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isLight ? 'text-black/40' : 'text-white/40'}`}>Verified customer</p>
                                    </div>
                                </footer>
                            </div>
                            <div className="mt-8 flex justify-center gap-2">
                                {customerReviews.map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setCurrentReviewIndex(i)}
                                        aria-label={`Show review ${i + 1}`}
                                        className={`h-2 rounded-full transition-all ${currentReviewIndex === i ? 'w-8 bg-[#D4AF37]' : `w-2 ${isLight ? 'bg-black/15' : 'bg-white/20'}`}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Compact review strip */}
                        <div className="grid gap-4 md:grid-cols-3">
                            {customerReviews.map((review, index) => (
                                <button
                                    key={review.name}
                                    type="button"
                                    onClick={() => setCurrentReviewIndex(index)}
                                    className={`${panelClass(isLight, `text-left p-5 hover:-translate-y-0.5 ${currentReviewIndex === index ? 'ring-2 ring-[#D4AF37]/40 border-[#D4AF37]/30' : ''}`)}`}
                                >
                                    <p className={`line-clamp-3 text-sm font-medium leading-relaxed ${isLight ? 'text-black/70' : 'text-white/65'}`}>
                                        &ldquo;{review.text}&rdquo;
                                    </p>
                                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">{review.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Goals ── */}
            <section className={`bb-theme-transition py-24 md:py-32 px-4 sm:px-8 ${isLight ? 'bg-white' : 'bg-[#0a0a0c]'}`}>
                <div className="mx-auto max-w-6xl">
                    <div className="mb-14 space-y-5 text-center reveal-on-scroll md:mb-20">
                        <SectionEyebrow>Our Goals</SectionEyebrow>
                        <h2 className="text-4xl font-black tracking-tight md:text-6xl">
                            What Happens <span className="text-[#D4AF37]">Next.</span>
                        </h2>
                        <p className={`mx-auto max-w-2xl text-base font-medium leading-8 sm:text-lg ${isLight ? 'text-black/60' : 'text-white/56'}`}>
                            The goal is not just to sell more tech. It is to make the BlackBox experience easier to trust, easier to understand, and easier to return to.
                        </p>
                    </div>

                    <div className="relative reveal-on-scroll reveal-delay-1">
                        <div className={`absolute left-4 top-0 hidden h-full w-px md:block ${isLight ? 'bg-black/10' : 'bg-white/10'}`} aria-hidden />
                        <div className="space-y-4 md:space-y-6">
                            {[
                                { Icon: Target, num: '01', title: 'Most Trusted', body: 'Become the most trusted tech solutions brand in the country and beyond, while eliminating the fear of buying inferior products.' },
                                { Icon: Award, num: '02', title: 'Quality, Fair Price', body: 'Deliver high-quality devices at competitive prices — without compromising on the experience that backs them.' },
                                { Icon: HeartHandshake, num: '03', title: 'Long-term Relationships', body: 'Build long-term relationships with every customer — one repair, one trade-in, one device at a time.' },
                                { Icon: Sparkles, num: '04', title: 'Full-scale Tech', body: 'Expand into a full-scale tech solutions company that serves every layer of the modern digital life.' },
                            ].map(({ Icon, num, title, body }) => (
                                <div
                                    key={num}
                                    className={`${panelClass(isLight, 'group relative md:ml-8 md:pl-10 p-6 md:p-8 hover:border-[#D4AF37]/25')}`}
                                >
                                    <div className={`absolute -left-[1.125rem] top-8 hidden h-9 w-9 items-center justify-center rounded-full border-2 md:flex ${isLight ? 'border-[#f2f2f7] bg-[#D4AF37] text-black' : 'border-[#0a0a0c] bg-[#D4AF37] text-black'}`}>
                                        <Icon size={14} />
                                    </div>
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
                                        <div className="flex shrink-0 items-center gap-3 md:w-48">
                                            <span className="text-3xl font-black tracking-tighter text-[#D4AF37]/80">{num}</span>
                                            <h4 className="text-lg font-black uppercase italic tracking-tight md:text-xl">{title}</h4>
                                        </div>
                                        <p className={`flex-1 text-base leading-relaxed font-medium md:text-lg ${isLight ? 'text-black/65' : 'text-white/60'}`}>{body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Values ── */}
            <section className={`bb-theme-transition py-24 md:py-32 px-4 sm:px-8 ${isLight ? 'bg-[#f2f2f7]' : 'bg-[#050508]'}`}>
                <div className="mx-auto max-w-6xl">
                    <div className="mb-14 space-y-5 text-center reveal-on-scroll md:mb-16">
                        <SectionEyebrow>Our Values</SectionEyebrow>
                        <h2 className="text-4xl font-black tracking-tight md:text-6xl">
                            What We <span className="text-[#D4AF37]">Stand For.</span>
                        </h2>
                        <p className={`mx-auto max-w-2xl text-base font-medium leading-8 sm:text-lg ${isLight ? 'text-black/60' : 'text-white/56'}`}>
                            These are the standards that shape the small decisions customers feel, even when they never see the work behind them.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 reveal-on-scroll reveal-delay-1">
                        {[
                            { num: '01', title: 'Transparency', body: 'We are honest about pricing, device condition, and repairs. Every step is fully documented and shared with the customer.', icon: Scale },
                            { num: '02', title: 'Quality First', body: 'Every product and service must meet our standards before reaching the customer.', icon: ShieldCheck },
                            { num: '03', title: 'Customer Respect', body: 'The real boss of the company is every customer we serve — treated with care, professionalism and fairness.', icon: Heart },
                            { num: '04', title: 'Accountability', body: 'We take responsibility for our work and decisions — even when no one is watching.', icon: Eye },
                            { num: '05', title: 'Innovation', body: 'We constantly improve our systems, services, and customer experience.', icon: Lightbulb },
                        ].map((v, i) => {
                            const ValueIcon = v.icon;
                            return (
                            <div
                                key={v.num}
                                className={`${panelClass(isLight, `group flex flex-col p-6 hover:-translate-y-1 hover:border-[#D4AF37]/20 ${['', 'sm:mt-6', 'sm:mt-3', 'sm:mt-6', 'sm:mt-0'][i]}`)}`}
                            >
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D4AF37]/12 text-[#D4AF37] transition-colors group-hover:bg-[#D4AF37] group-hover:text-black">
                                    <ValueIcon size={20} />
                                </div>
                                <span className="text-2xl font-black tracking-tighter text-[#D4AF37]/70">{v.num}</span>
                                <h4 className="mt-3 text-sm font-black uppercase italic tracking-tight">{v.title}</h4>
                                <p className={`mt-3 flex-1 text-sm leading-relaxed font-medium ${isLight ? 'text-black/60' : 'text-white/55'}`}>{v.body}</p>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Our Story (timeline narrative) ── */}
            <section className={`bb-theme-transition py-24 md:py-32 px-4 sm:px-8 ${isLight ? 'bg-white' : 'bg-[#0a0a0c]'}`}>
                <div className="mx-auto max-w-5xl">
                    <div className="mb-14 space-y-5 text-center reveal-on-scroll md:mb-16">
                        <SectionEyebrow>Our Story</SectionEyebrow>
                        <h2 className="text-4xl font-black italic tracking-tighter md:text-6xl">
                            Started With <span className="text-[#D4AF37]">Belief.</span>
                        </h2>
                        <p className={`mx-auto max-w-2xl text-lg font-medium italic md:text-xl ${isLight ? 'text-black/70' : 'text-white/60'}`}>
                            BlackBox didn&apos;t start with a shop. It started with belief.
                        </p>
                    </div>

                    <div className="relative mx-auto max-w-3xl space-y-6 reveal-on-scroll reveal-delay-1">
                        <div className={`absolute left-6 top-2 bottom-2 w-px ${isLight ? 'bg-black/10' : 'bg-white/10'}`} aria-hidden />

                        {[
                            {
                                phase: 'The Habit',
                                icon: HeartHandshake,
                                body: 'Long before there was a name, a logo, or a space, there was a student with a deep love for technology — helping friends answer "Is this phone original?", "Is this worth the price?", and "Can you fix this?" Not for profit, but because he genuinely cared.',
                            },
                            {
                                phase: 'The Black Box',
                                icon: Box,
                                body: 'With no perfect setup, he painted a small wooden box black, added simple lighting, and turned it into a studio for photographing devices. That box became how every product was carefully presented and shared online.',
                            },
                            {
                                phase: 'The Name',
                                icon: Sparkles,
                                body: 'People noticed the clean look, the attention to detail, and the intention behind it. That simple black box told a story of effort, creativity, and belief — and the name BlackBox stuck.',
                            },
                            {
                                phase: 'The Impact',
                                icon: Users,
                                body: 'People didn\'t just come for answers — they came back with trust. BlackBox was born as a statement: you can start small, stay real, and still build something meaningful.',
                            },
                            {
                                phase: 'Today',
                                icon: Wrench,
                                body: 'Today, BlackBox serves tens of thousands of customers every year. Every device sold, repair completed, and customer served is proof that doing things right still works — and that trust beats shortcuts every time.',
                            },
                        ].map(({ phase, icon: PhaseIcon, body }, i) => (
                            <div key={phase} className="relative pl-16 md:pl-20">
                                <div className={`absolute left-3 top-6 flex h-7 w-7 items-center justify-center rounded-full md:left-4 ${isLight ? 'bg-[#D4AF37] text-black ring-4 ring-white' : 'bg-[#D4AF37] text-black ring-4 ring-[#0a0a0c]'}`}>
                                    <PhaseIcon size={13} />
                                </div>
                                <div className={panelClass(isLight, 'p-6 md:p-8')}>
                                    <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[#D4AF37]">
                                        Chapter {String(i + 1).padStart(2, '0')} · {phase}
                                    </span>
                                    <p className={`mt-4 text-base leading-relaxed font-medium md:text-lg ${isLight ? 'text-black/70' : 'text-white/65'}`}>{body}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pillars + closing */}
                    <div className={`mt-4 reveal-on-scroll reveal-delay-2 ${panelClass(isLight, 'overflow-hidden p-8 md:p-12')}`}>
                        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Start Small', icon: Sparkles },
                                        { label: 'Stay Real', icon: Eye },
                                        { label: 'Build Big', icon: Award },
                                    ].map(({ label, icon: Icon }) => (
                                        <div key={label} className={`rounded-2xl border p-4 text-center ${isLight ? 'border-black/5 bg-[#fafafa]' : 'border-white/5 bg-black/30'}`}>
                                            <Icon size={18} className="mx-auto mb-2 text-[#D4AF37]" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className={`text-base leading-relaxed font-medium md:text-lg ${isLight ? 'text-black/70' : 'text-white/65'}`}>
                                    BlackBox is more than a brand. It&apos;s a reminder that where you start doesn&apos;t define how far you can go — and that with the right mindset, nothing is out of reach.
                                </p>
                                <p className="text-xl font-black italic tracking-tight md:text-2xl">
                                    This is not just our story. <span className="text-[#D4AF37]">It&apos;s yours too.</span>
                                </p>
                            </div>
                            <div className="flex justify-center md:justify-end">
                                <div className={`relative aspect-square w-full max-w-[200px] overflow-hidden rounded-[2rem] border ${isLight ? 'border-black/5 bg-[#f5f5f7]' : 'border-white/10 bg-black'}`}>
                                    <img
                                        src="/BlackBox.jpeg"
                                        alt="The original BlackBox studio"
                                        className="h-full w-full object-cover"
                                        style={{ filter: isLight ? 'invert(1) brightness(1.1)' : undefined }}
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <p className="absolute bottom-4 left-4 right-4 text-center text-[9px] font-black uppercase tracking-[0.3em] text-white/90">
                                        The box that started it all
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                            <Link
                                to="/store"
                                className={`inline-flex items-center gap-3 rounded-full border-2 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] ${isLight ? 'border-black/10 hover:border-[#D4AF37]/50 hover:bg-black/5' : 'border-white/15 hover:border-[#D4AF37]/40 hover:bg-white/5'}`}
                            >
                                Browse the shop
                                <ArrowRight size={16} />
                            </Link>
                            <Link
                                to="/contact"
                                className="group relative inline-flex items-center gap-4 overflow-hidden rounded-full bg-[#D4AF37] px-10 py-4 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_20px_40px_rgba(212,175,55,0.25)] transition-all hover:scale-[1.02]"
                            >
                                <Mail size={18} />
                                Be Part of the Story
                                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};
