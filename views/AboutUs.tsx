import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import {
    Mail,
    Star,
    Quote,
    ChevronRight,
    ArrowRight,
    Target,
    Eye,
    HeartHandshake,
    Award,
    Sparkles,
    ScrollText,
} from 'lucide-react';
import type { Theme } from '../App';

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
                        className="w-full h-auto object-contain"
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

export const AboutUs: React.FC<AboutUsProps> = ({ theme = 'dark' }) => {
    const isLight = theme === 'light';
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

    // Scroll Reveal Logic
    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                }
            });
        }, observerOptions);

        const elements = document.querySelectorAll('.reveal-on-scroll');
        elements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

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
        <div className={`min-h-screen transition-colors duration-500 ${isLight ? 'bg-[#ffffff] text-black' : 'bg-black text-white'}`}>
            {/* Hero Section */}
            <section className={`relative pt-40 md:pt-48 pb-20 overflow-hidden flex flex-col items-center ${isLight ? 'bg-[#ffffff]' : ''}`}>
                <div className="absolute inset-0 z-0">
                    {!isLight && (
                        <>
                            <div className={`absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 via-transparent to-transparent opacity-50`}></div>
                            <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2`}></div>
                            <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2`}></div>
                        </>
                    )}
                </div>

                <div className="relative z-10 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <TypographyLogo prefix="We Are" size="hero" isLight={isLight} prefixClassName="text-6xl md:text-9xl" />

                    <div className="space-y-6 -mt-4">
                        <p className={`text-xl md:text-3xl ${isLight ? 'text-black/60' : 'text-white/60'} font-medium max-w-3xl mx-auto leading-relaxed tracking-tight`}>
                            Your reliable home for <span className="text-[#D4AF37] font-bold">innovation</span> and digital <span className="text-[#D4AF37] font-bold">excellence</span>.
                        </p>
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <div className={`h-[1px] w-12 ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${isLight ? 'text-black/30' : 'text-white/30'}`}>EST. 2021</span>
                            <div className={`h-[1px] w-12 ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
                    <div className={`w-6 h-10 rounded-full border-2 ${isLight ? 'border-black' : 'border-white'} flex justify-center p-1`}>
                        <div className={`w-1 h-2 rounded-full ${isLight ? 'bg-black' : 'bg-white'}`}></div>
                    </div>
                </div>
            </section>

            {/* Mission & Vision grid */}
            <section className={`py-32 px-8 relative z-10 ${isLight ? 'bg-[#ffffff]' : 'bg-[#0a0a0a]'}`}>
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
                            <div className={`relative aspect-square rounded-[3rem] p-12 flex flex-col items-center justify-center text-center transition-all duration-700 shadow-2xl border ${isLight ? 'bg-[#f5f5f7] border-black/5 hover:border-black/10' : 'bg-black border-white/5 hover:border-white/10'}`}>
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

            {/* Trust Us Section */}
            <section className={`py-32 px-8 ${isLight ? 'bg-[#f5f5f7]' : 'bg-[#060605]'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-24 space-y-8 reveal-on-scroll">
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] w-8 bg-[#D4AF37]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#D4AF37]">The Numbers</span>
                            <div className="h-[1px] w-8 bg-[#D4AF37]"></div>
                        </div>
                        <h2 className="text-5xl md:text-8xl font-black tracking-tighter italic leading-none">
                            Trusted by <br /><span className="text-[#D4AF37]">Thousands.</span>
                        </h2>
                        <p className={`text-xl md:text-2xl ${isLight ? 'text-black/60' : 'text-gray-400'} max-w-2xl mx-auto font-medium`}>
                            Join our community of satisfied customers who trust BlackBox for their premium tech needs.
                        </p>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-32 reveal-on-scroll reveal-delay-1">
                        <div className="text-center space-y-6 group">
                            <div className="text-6xl md:text-8xl font-black text-[#D4AF37] tracking-tighter group-hover:scale-110 transition-transform duration-500">
                                10k+
                            </div>
                            <div className="space-y-2">
                                <p className={`text-sm font-black uppercase tracking-[0.3em] ${isLight ? 'text-black/80' : 'text-gray-300'}`}>Satisfied Customers</p>
                                <div className="flex justify-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={12} className="text-[#D4AF37] fill-current" />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="text-center space-y-6 group">
                            <div className="text-6xl md:text-8xl font-black text-[#D4AF37] tracking-tighter group-hover:scale-110 transition-transform duration-500">
                                5+
                            </div>
                            <div className="space-y-2">
                                <p className={`text-sm font-black uppercase tracking-[0.3em] ${isLight ? 'text-black/80' : 'text-gray-300'}`}>Years of Excellence</p>
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-black/40' : 'text-gray-500'}`}>Certified Technicians</p>
                            </div>
                        </div>
                        <div className="text-center space-y-6 group">
                            <div className="text-6xl md:text-8xl font-black text-[#D4AF37] tracking-tighter group-hover:scale-110 transition-transform duration-500">
                                98%
                            </div>
                            <div className="space-y-2">
                                <p className={`text-sm font-black uppercase tracking-[0.3em] ${isLight ? 'text-black/80' : 'text-gray-300'}`}>Recommendation Rate</p>
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-black/40' : 'text-gray-500'}`}>Industry Leading</p>
                            </div>
                        </div>
                    </div>

                    {/* Reviews List */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {customerReviews.map((review, index) => (
                            <div
                                key={index}
                                className={`reveal-on-scroll rounded-[2.5rem] p-10 flex flex-col justify-between transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl border ${isLight ? 'bg-white shadow-xl border-black/5' : 'bg-[#111] border-white/5'} reveal-delay-${(index % 3) + 1}`}
                            >
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            {[...Array(review.rating)].map((_, i) => (
                                                <Star key={i} size={14} className="text-[#D4AF37] fill-current" />
                                            ))}
                                        </div>
                                        <Quote className="text-[#D4AF37]/20" size={32} />
                                    </div>
                                    <p className={`leading-relaxed text-xl font-medium italic ${isLight ? 'text-black/80' : 'text-gray-300'}`}>
                                        "{review.text}"
                                    </p>
                                </div>
                                <div className="pt-10 flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-black text-xs`}>
                                        {review.name.charAt(0)}
                                    </div>
                                    <p className="font-black text-sm uppercase tracking-widest">
                                        {review.name}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* GOALS SECTION */}
            <section className={`py-32 px-8 ${isLight ? 'bg-[#ffffff]' : 'bg-[#0a0a0a]'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20 space-y-6 reveal-on-scroll">
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] w-8 bg-[#D4AF37]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#D4AF37]">Our Goals</span>
                            <div className="h-[1px] w-8 bg-[#D4AF37]"></div>
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black tracking-tighter italic leading-none">
                            Where We're <span className="text-[#D4AF37]">Headed.</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 reveal-on-scroll reveal-delay-1">
                        {[
                            {
                                Icon: Target,
                                title: 'Most Trusted',
                                body: 'Become the most trusted tech solutions brand in the country and beyond, while eliminating the fear of buying inferior products.',
                            },
                            {
                                Icon: Award,
                                title: 'Quality, Fair Price',
                                body: 'Deliver high-quality devices at competitive prices — without compromising on the experience that backs them.',
                            },
                            {
                                Icon: HeartHandshake,
                                title: 'Long-term Relationships',
                                body: 'Build long-term relationships with every customer — one repair, one trade-in, one device at a time.',
                            },
                            {
                                Icon: Sparkles,
                                title: 'Full-scale Tech',
                                body: 'Expand into a full-scale tech solutions company that serves every layer of the modern digital life.',
                            },
                        ].map(({ Icon, title, body }, i) => (
                            <div
                                key={title}
                                className={`group relative rounded-[2rem] p-8 md:p-10 border transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${
                                    isLight
                                        ? 'bg-[#fafafa] border-black/5 hover:border-[#D4AF37]/30'
                                        : 'bg-[#111] border-white/5 hover:border-[#D4AF37]/30'
                                }`}
                            >
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
                                        <Icon size={22} />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">0{i + 1}</span>
                                            <span className="h-[1px] w-8 bg-[#D4AF37]/40"></span>
                                        </div>
                                        <h4 className="text-xl md:text-2xl font-black tracking-tight italic uppercase">{title}</h4>
                                        <p className={`text-base leading-relaxed font-medium ${isLight ? 'text-black/65' : 'text-white/60'}`}>{body}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* VALUES SECTION */}
            <section className={`py-32 px-8 ${isLight ? 'bg-[#f5f5f7]' : 'bg-[#060605]'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20 space-y-6 reveal-on-scroll">
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] w-8 bg-[#D4AF37]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#D4AF37]">Our Values</span>
                            <div className="h-[1px] w-8 bg-[#D4AF37]"></div>
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black tracking-tighter italic leading-none">
                            What We <span className="text-[#D4AF37]">Stand For.</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {[
                            { num: '01', title: 'Transparency',     body: 'We are honest about pricing, device condition, and repairs. Every step is fully documented and shared with the customer.' },
                            { num: '02', title: 'Quality First',    body: 'Every product and service must meet our standards before reaching the customer.' },
                            { num: '03', title: 'Customer Respect', body: 'The real boss of the company is every customer we serve — treated with care, professionalism and fairness.' },
                            { num: '04', title: 'Accountability',   body: 'We take responsibility for our work and decisions — even when no one is watching.' },
                            { num: '05', title: 'Innovation',       body: 'We constantly improve our systems, services, and customer experience.' },
                        ].map((v, i) => (
                            <div
                                key={v.num}
                                className={`reveal-on-scroll rounded-[1.75rem] p-6 md:p-7 border transition-all duration-500 hover:-translate-y-2 hover:shadow-xl reveal-delay-${(i % 3) + 1} ${
                                    isLight ? 'bg-white border-black/5' : 'bg-[#101010] border-white/5'
                                }`}
                            >
                                <div className="text-3xl md:text-4xl font-black text-[#D4AF37] tracking-tighter">{v.num}</div>
                                <h4 className="mt-4 text-base md:text-lg font-black uppercase tracking-tight italic">{v.title}</h4>
                                <p className={`mt-3 text-sm leading-relaxed font-medium ${isLight ? 'text-black/65' : 'text-white/55'}`}>{v.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* OUR STORY SECTION */}
            <section className={`py-32 px-8 ${isLight ? 'bg-[#ffffff]' : 'bg-[#0a0a0a]'}`}>
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16 space-y-6 reveal-on-scroll">
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] w-8 bg-[#D4AF37]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#D4AF37]">Our Story</span>
                            <div className="h-[1px] w-8 bg-[#D4AF37]"></div>
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black tracking-tighter italic leading-none">
                            Started With <span className="text-[#D4AF37]">Belief.</span>
                        </h2>
                        <div className="flex items-center justify-center pt-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                <ScrollText size={22} />
                            </div>
                        </div>
                    </div>

                    <div className={`space-y-8 text-lg leading-relaxed font-medium reveal-on-scroll reveal-delay-1 ${isLight ? 'text-black/75' : 'text-white/65'}`}>
                        <p className={`text-2xl md:text-3xl italic font-bold leading-snug ${isLight ? 'text-black' : 'text-white'}`}>
                            BlackBox didn't start with a shop. It started with belief.
                        </p>

                        <p>
                            Long before there was a name, a logo, or a space, there was just a student with a deep love for technology
                            and a simple habit — helping people make the right choices. Friends would come around asking,
                            <span className="italic text-[#D4AF37]"> "Is this phone original?"</span>,
                            <span className="italic text-[#D4AF37]"> "Is this worth the price?"</span>,
                            <span className="italic text-[#D4AF37]"> "Can you fix this?"</span>
                            {' '}And every time, he showed up — not for profit, but because he genuinely cared.
                        </p>

                        <p>
                            There were no big resources. No perfect setup. Just consistency, curiosity, and a refusal to do things the wrong way.
                        </p>

                        <p>
                            When he decided to take it a step further and get into tech retail, he didn't wait for the perfect conditions.
                            Instead, he created his own.
                        </p>

                        <div className={`my-12 border-l-4 border-[#D4AF37] pl-6 py-2 ${isLight ? 'bg-[#fafafa]' : 'bg-[#111]'} rounded-r-2xl`}>
                            <p className={`italic text-xl ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                                With a small wooden box, he painted it black, fixed simple lighting into it, and turned it into a
                                backdrop for photographing his devices. That box became his studio — where every product was carefully
                                presented and shared online to reach new customers.
                            </p>
                        </div>

                        <p>
                            People began to notice. The clean, consistent look. The attention to detail. The intention behind it.
                            That simple black box didn't just showcase products — it told a story of effort, creativity, and belief.
                        </p>

                        <p className={`text-2xl md:text-3xl italic font-bold ${isLight ? 'text-black' : 'text-white'}`}>
                            And from that moment, the name stuck: <span className="text-[#D4AF37]">BlackBox</span>.
                        </p>

                        <p>
                            Slowly, something powerful began to happen. People didn't just come for answers — they came back with trust.
                            They told others. They relied on him. And in that moment, something clicked: this wasn't just about tech anymore…
                            it was about impact.
                        </p>

                        <p>
                            So BlackBox was born — not as a business chasing sales, but as a statement: that you can start small,
                            stay real, and still build something meaningful.
                        </p>

                        <p>
                            Every device sold, every repair completed, every customer served became part of a bigger story —
                            proof that doing things right still works.
                        </p>

                        <p>
                            Today, BlackBox serves tens of thousands of customers every year. But the mission hasn't changed.
                            Because every time you choose BlackBox, you're not just buying a device. You're supporting a journey that
                            started with nothing but belief — and a simple black box. You're choosing trust over shortcuts.
                            You're proving that dreams are valid — and possible.
                        </p>

                        <div className="grid sm:grid-cols-3 gap-4 my-12">
                            {[
                                { label: 'Start Small', icon: Sparkles },
                                { label: 'Stay Real',    icon: Eye },
                                { label: 'Build Big',    icon: Award },
                            ].map(({ label, icon: Icon }) => (
                                <div
                                    key={label}
                                    className={`rounded-2xl p-5 flex items-center gap-3 border ${isLight ? 'bg-[#fafafa] border-black/5' : 'bg-[#111] border-white/5'}`}
                                >
                                    <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-[0.25em]">{label}</span>
                                </div>
                            ))}
                        </div>

                        <p className={`text-xl ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                            BlackBox is more than a brand. It's a reminder that where you start doesn't define how far you can go.
                            And that with the right mindset, nothing is out of reach.
                        </p>

                        <p className={`text-2xl md:text-3xl italic font-bold pt-4 ${isLight ? 'text-black' : 'text-white'}`}>
                            This is not just our story. <span className="text-[#D4AF37]">It's yours too.</span>
                        </p>
                    </div>

                    <div className="mt-16 flex justify-center reveal-on-scroll reveal-delay-2">
                        <Link
                            to="/contact"
                            className="group relative inline-flex items-center gap-4 px-10 py-5 bg-[#D4AF37] text-black rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 hover:scale-105 shadow-[0_20px_40px_rgba(212,175,55,0.2)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <Mail size={18} className="relative z-10" />
                            <span className="relative z-10">Be Part of the Story</span>
                            <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>

            <style>{`
                .reveal-on-scroll {
                    opacity: 0;
                    transform: translateY(30px) scale(0.95);
                    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                .reveal-visible {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }

                .reveal-entrance {
                    animation: revealEntrance 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                @keyframes revealEntrance {
                    0% {
                        opacity: 0;
                        transform: translateY(60px) scale(0.9);
                        filter: blur(20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                        filter: blur(0);
                    }
                }

                .reveal-delay-1 { transition-delay: 0.1s; }
                .reveal-delay-2 { transition-delay: 0.2s; }
                .reveal-delay-3 { transition-delay: 0.3s; }

                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
