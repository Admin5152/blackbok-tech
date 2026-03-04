import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Mail, Star, Quote, ChevronRight, ArrowRight } from 'lucide-react';
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

const TypographyLogo = ({
    prefix = "",
    mainText = "BLACKBOX",
    isLight = false,
    size = "large"
}: {
    prefix?: string,
    mainText?: string,
    isLight?: boolean,
    size?: 'small' | 'medium' | 'large' | 'hero'
}) => {
    const sizeMap = {
        small: "text-2xl md:text-3xl",
        medium: "text-4xl md:text-5xl",
        large: "text-6xl md:text-7xl shadow-glow",
        hero: "text-7xl md:text-[10rem]"
    };

    const iconSizeMap = {
        small: "w-6 h-6 md:w-8 md:h-8",
        medium: "w-10 h-10 md:w-12 md:h-12",
        large: "w-16 h-16 md:w-20 md:h-20",
        hero: "w-20 h-20 md:w-32 md:h-32"
    };

    return (
        <div className="flex flex-col items-center select-none">
            {prefix && (
                <span className={`text-xl md:text-3xl font-black uppercase tracking-[0.4em] mb-4 md:mb-8 transition-colors duration-500 ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                    {prefix}
                </span>
            )}
            <div className={`flex items-center gap-1 md:gap-4 font-black tracking-tighter uppercase italic leading-none transition-all duration-500 ${sizeMap[size]} ${isLight ? 'text-black' : 'text-white'}`}>
                <span>BLACKB</span>
                <div className={`${iconSizeMap[size]} flex items-center justify-center text-[#D4AF37] transform hover:scale-110 transition-transform duration-500`}>
                    <ViewfinderLogo />
                </div>
                <span>X</span>
            </div>
            <div className={`mt-4 h-1 w-1/4 rounded-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50`}></div>
        </div>
    );
};

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
        <div className={`min-h-screen transition-colors duration-500 ${isLight ? 'bg-[#f5f5f7] text-black' : 'bg-black text-white'}`}>
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 px-8 overflow-hidden flex flex-col items-center justify-center min-h-[85vh] text-center">
                <div className="absolute inset-0 z-0">
                    <div className={`absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 via-transparent to-transparent opacity-50 ${isLight ? 'mix-blend-multiply' : ''}`}></div>
                    <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2`}></div>
                    <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2`}></div>
                </div>

                <div className="relative z-10 max-w-6xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <TypographyLogo prefix="We Are" size="hero" isLight={isLight} />

                    <div className="space-y-6">
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
            <section className={`py-32 px-8 relative z-10 ${isLight ? 'bg-white' : 'bg-[#0a0a0a]'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-16 md:gap-32 items-center">
                        <div className="space-y-16">
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
                                    to="/profile"
                                    className="group relative inline-flex items-center gap-4 px-10 py-5 bg-[#D4AF37] text-black rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 hover:scale-105 shadow-[0_20px_40px_rgba(212,175,55,0.2)] overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <Mail size={18} className="relative z-10" />
                                    <span className="relative z-10">Get in Touch</span>
                                    <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        <div className={`relative group`}>
                            <div className={`absolute -inset-4 bg-[#D4AF37]/5 blur-2xl rounded-[4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                            <div className={`relative aspect-square rounded-[3rem] p-12 flex flex-col items-center justify-center text-center transition-all duration-700 shadow-2xl border ${isLight ? 'bg-[#f5f5f7] border-black/5 hover:border-black/10' : 'bg-black border-white/5 hover:border-white/10'}`}>
                                <div className="transform group-hover:scale-110 transition-transform duration-1000">
                                    <TypographyLogo size="medium" isLight={isLight} />
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
                    <div className="text-center mb-24 space-y-8">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-32">
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
                                className={`rounded-[2.5rem] p-10 flex flex-col justify-between transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl border ${isLight ? 'bg-white shadow-xl border-black/5' : 'bg-[#111] border-white/5'}`}
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
        </div>
    );
};
