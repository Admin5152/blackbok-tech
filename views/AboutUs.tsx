import React, { useState } from 'react';
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
            <section className={`relative bb-theme-transition pt-40 md:pt-48 pb-20 overflow-hidden flex flex-col items-center ${isLight ? 'bg-[#ffffff]' : ''}`}>
                {/* Background photo layer */}
                <div className="absolute inset-0 z-0" aria-hidden>
                    <img
                        src="/about-hero.jpg"
                        alt=""
                        className="h-full w-full object-cover"
                        style={{ filter: isLight ? 'blur(4px) brightness(0.9)' : 'blur(3px) brightness(0.55)' }}
                    />
                    {/* Overlay so text stays legible over the photo */}
                    <div
                        className={`absolute inset-0 bb-theme-transition ${
                            isLight
                                ? 'bg-gradient-to-b from-white/70 via-white/60 to-white'
                                : 'bg-gradient-to-b from-black/70 via-black/75 to-black'
                        }`}
                    />
                </div>

                <div className="absolute top-28 left-4 sm:left-8 z-20">
                    <PageBackButton isLight={isLight} fallbackTo="/" />
                </div>
                <div className="absolute inset-0 z-[1] pointer-events-none" aria-hidden>
                    <div
                        className={`bb-theme-transition absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 via-transparent to-transparent ${isLight ? 'opacity-0' : 'opacity-50'
                            }`}
                    />
                    <div
                        className={`bb-theme-transition absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 ${isLight ? 'opacity-0' : 'opacity-100'
                            }`}
                    />
                    <div
                        className={`bb-theme-transition absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 ${isLight ? 'opacity-0' : 'opacity-100'
                            }`}
                    />
                </div>

                <div className="relative z-10 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <TypographyLogo prefix="We Are" size="hero" isLight={isLight} prefixClassName="text-6xl md:text-9xl" />

                    <div className="space-y-6 -mt-4">
                        <p className={`text-xl md:text-3xl ${isLight ? 'text-black/60' : 'text-white/60'} font-medium max-w-3xl mx-auto leading-relaxed tracking-tight`}>
                            Your reliable home for <span className="text-[#D4AF37] font-bold">innovation</span> and digital <span className="text-[#D4AF37] font-bold">excellence</span>.
                        </p>
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <div className={`h-[1px] w-12 ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${isLight ? 'text-black/30' : 'text-white/30'}`}></span>
                            <div className={`h-[1px] w-12 ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>
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
            <section className={`bb-theme-transition py-32 px-8 relative z-10 ${isLight ? 'bg-[#ffffff]' : 'bg-[#0a0a0a]'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-16 md:gap-32 items-center">
                        <div className="space-y-16 reveal-on-scroll">
                            <div className="space-y-6 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-[2px] bg-[#D4AF37]"></div>
                                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[#D4AF37]">Our Mission</h2>
                                </div>
                                <h3 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[0.9] italic">
                                    Precision &<br />Respect.
                                </h3>
                                <p className={`text-lg md:text-xl ${isLight ? 'text-black/70' : 'text-gray-400'} leading-relaxed max-w-md font-medium`}>
                                    We care about you and your devices, treating each piece of technology with precision and respect to deliver the best experience possible.
                                </p>
                            </div>

                            <div className="space-y-6 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-[2px] bg-[#D4AF37]"></div>
                                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[#D4AF37]">Our Vision</h2>
                                </div>
                                <h3 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[0.9] italic">
                                    Ahead of the<br />Curve.
                                </h3>
                                <p className={`text-lg md:text-xl ${isLight ? 'text-black/70' : 'text-gray-400'} leading-relaxed max-w-md font-medium`}>
                                    Your reliable home for innovation, keeping you ahead with the latest tech improvements and sustainable upgrade solutions.
                                </p>
                            </div>

                            <div className="pt-8">
                                <Link
                                    to="/contact"
                                    className="group relative inline-flex items-center gap-4 px-10 py-5 bg-[#D4AF37] text-black rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 hover:scale-105 shadow-[0_20px_40px_rgba(212,175,55,0.2)] overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <Mail size={18} className="relative z-10" />
                                    <span className="relative z-10">Get in Touch</span>
                                    <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        <div className="relative group reveal-on-scroll reveal-delay-2">
                            <div className={`absolute -inset-4 bg-[#D4AF37]/5 blur-2xl rounded-[4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                            <div className={`bb-theme-transition relative aspect-square rounded-[3rem] p-12 flex flex-col items-center justify-center text-center transition-all duration-700 shadow-2xl border ${isLight ? 'bg-[#f5f5f7] border-black/5 hover:border-black/10' : 'bg-black border-white/5 hover:border-white/10'}`}>
                                <div className="transform group-hover:scale-110 transition-transform duration-1000">
                                    <TypographyLogo size="medium" isLight={isLight} prefix="" />
                                </div>
                                <h3 className="text-3xl font-bold mt-12 mb-2 tracking-tight">BlackBox</h3>
                                <p className={`text-lg ${isLight ? 'text-black/50' : 'text-white/50'} font-medium tracking-wide`}>Your Tech Partner</p>

                                <div className="absolute top-8 right-8 flex gap-1">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className={`w-1 h-1 rounded-full ${isLight ? 'bg-black/20' : 'bg-white/20'}`}></div>
                                    ))}
                                </div>
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
                            <h2 className="text-4xl font-black italic leading-[0.95] tracking-tighter md:text-6xl lg:text-7xl">
                                Trusted by{' '}
                                <span className="bg-gradient-to-r from-[#B38B21] to-[#F4E4C1] bg-clip-text text-transparent">
                                    Thousands.
                                </span>
                            </h2>
                            <p className={`max-w-md text-base font-medium leading-relaxed md:text-lg ${isLight ? 'text-black/60' : 'text-white/55'}`}>
                                Join our community of satisfied customers who trust BlackBox for their premium tech needs.
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
                        <h2 className="text-4xl font-black italic tracking-tighter md:text-6xl">
                            Where We&apos;re <span className="text-[#D4AF37]">Headed.</span>
                        </h2>
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
                        <h2 className="text-4xl font-black italic tracking-tighter md:text-6xl">
                            What We <span className="text-[#D4AF37]">Stand For.</span>
                        </h2>
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