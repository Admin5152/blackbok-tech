import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Mail, Star, Quote, ChevronRight, ArrowRight } from 'lucide-react';
import type { Theme } from '../App';

interface AboutUsProps {
    theme?: Theme;
}

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
        <div className={`min-h-screen ${isLight ? 'bg-[#f5f5f7] text-black' : 'bg-black text-white'}`}>
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 px-8 overflow-hidden flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 via-transparent to-transparent opacity-50"></div>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                        We Are <span className="text-[#D4AF37]">BlackBox</span>
                    </h1>
                    <p className={`text-xl md:text-2xl ${isLight ? 'text-black/60' : 'text-white/60'} font-medium max-w-2xl mx-auto leading-relaxed`}>
                        Premium tech repository. Your reliable home for innovation and digital excellence.
                    </p>
                </div>
            </section>

            {/* Mission & Vision grid */}
            <section className={`py-24 px-8 ${isLight ? 'bg-white' : 'bg-[#111]'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
                        <div className="space-y-12">
                            <div className="space-y-4">
                                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#D4AF37]">Our Mission</h2>
                                <h3 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                                    Precision &<br />Respect.
                                </h3>
                                <p className={`text-lg ${isLight ? 'text-black/70' : 'text-gray-400'} leading-relaxed max-w-md`}>
                                    We care about you and your devices, treating each piece of technology with precision and respect to deliver the best experience possible.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#D4AF37]">Our Vision</h2>
                                <h3 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                                    Ahead of the<br />Curve.
                                </h3>
                                <p className={`text-lg ${isLight ? 'text-black/70' : 'text-gray-400'} leading-relaxed max-w-md`}>
                                    Your reliable home for innovation, keeping you ahead with the latest tech improvements and sustainable upgrade solutions.
                                </p>
                            </div>

                            <div className="pt-4">
                                <Link
                                    to="/profile"
                                    className="inline-flex px-8 py-4 bg-[#D4AF37] text-black rounded-full text-sm font-bold tracking-wide items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg"
                                >
                                    <Mail size={18} />
                                    Get in Touch
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <div className={`aspect-square rounded-[3rem] p-12 flex flex-col items-center justify-center text-center transition-colors duration-500 shadow-2xl ${isLight ? 'bg-[#f5f5f7]' : 'bg-black border border-white/10'}`}>
                                <img src="/blacklogo.png" alt="BlackBox Logo" className="w-48 mx-auto rounded-full drop-shadow-2xl mb-8 transform hover:scale-105 transition duration-700" />
                                <h3 className="text-3xl font-bold mb-2">BlackBox</h3>
                                <p className={`text-lg ${isLight ? 'text-black/50' : 'text-white/50'} font-medium tracking-wide`}>Your Tech Partner</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Us Section */}
            <section className={`py-24 px-8 ${isLight ? 'bg-[#f5f5f7]' : 'bg-[#060605]'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20 space-y-6">
                        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                            Trusted by Thousands
                        </h2>
                        <p className={`text-xl ${isLight ? 'text-black/60' : 'text-gray-400'} max-w-2xl mx-auto`}>
                            Join our community of satisfied customers who trust BlackBox for their premium tech needs.
                        </p>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-24">
                        <div className="text-center space-y-4">
                            <div className="text-5xl md:text-6xl font-bold text-[#D4AF37] tracking-tighter">
                                10k+
                            </div>
                            <p className={`font-medium tracking-wide ${isLight ? 'text-black/80' : 'text-gray-300'}`}>Satisfied Customers</p>
                            <div className="flex justify-center gap-1 mt-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} className="text-[#D4AF37] fill-current" />
                                ))}
                            </div>
                        </div>
                        <div className="text-center space-y-4">
                            <div className="text-5xl md:text-6xl font-bold text-[#D4AF37] tracking-tighter">
                                5+
                            </div>
                            <p className={`font-medium tracking-wide ${isLight ? 'text-black/80' : 'text-gray-300'}`}>Years of Excellence</p>
                            <p className={`text-sm ${isLight ? 'text-black/50' : 'text-gray-500'} font-medium`}>KNUST Certified</p>
                        </div>
                        <div className="text-center space-y-4">
                            <div className="text-5xl md:text-6xl font-bold text-[#D4AF37] tracking-tighter">
                                98%
                            </div>
                            <p className={`font-medium tracking-wide ${isLight ? 'text-black/80' : 'text-gray-300'}`}>Recommendation Rate</p>
                            <p className={`text-sm ${isLight ? 'text-black/50' : 'text-gray-500'} font-medium`}>Industry Leading</p>
                        </div>
                    </div>

                    {/* Reviews List (Simplified elegant layout for About Us) */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {customerReviews.map((review, index) => (
                            <div
                                key={index}
                                className={`rounded-[2rem] p-8 flex flex-col justify-between transition-transform duration-500 hover:-translate-y-2 ${isLight ? 'bg-white shadow-xl' : 'bg-[#111] border border-white/5'}`}
                            >
                                <div>
                                    <div className="flex items-center gap-1 mb-6">
                                        {[...Array(review.rating)].map((_, i) => (
                                            <Star key={i} size={16} className="text-[#D4AF37] fill-current" />
                                        ))}
                                    </div>
                                    <Quote className="text-[#D4AF37]/30 mb-4" size={32} />
                                    <p className={`mb-8 leading-relaxed text-lg ${isLight ? 'text-black/80' : 'text-gray-300'}`}>
                                        "{review.text}"
                                    </p>
                                </div>
                                <p className="font-bold text-lg">
                                    {review.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};
