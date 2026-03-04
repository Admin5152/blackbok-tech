import React from 'react';
import { Settings, Mail, Phone, ArrowRight, Zap, RefreshCcw } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface MaintenanceProps {
    theme?: 'light' | 'dark';
}

export const Maintenance: React.FC<MaintenanceProps> = ({ theme = 'dark' }) => {
    const isLight = theme === 'light';

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-500 ${isLight ? 'bg-[#F5F5F7] text-[#1d1d1f]' : 'bg-[#060605] text-white'}`}>

            {/* Brand Header */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 group">
                <div className="w-8 h-8 bg-[#B38B21] rounded-lg flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                    <Settings size={18} className="text-black animate-spin-slow" />
                </div>
                <span className="text-xl font-black uppercase tracking-[0.3em] italic">BlackBox</span>
            </div>

            <div className="max-w-3xl w-full space-y-12">
                {/* Main Heading */}
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-tight">
                        The site is currently <br />
                        <span className="text-[#B38B21] drop-shadow-[0_0_15px_rgba(179,139,33,0.3)]">down for maintenance</span>
                    </h1>
                    <p className={`text-lg font-bold opacity-60 uppercase tracking-widest max-w-xl mx-auto leading-relaxed ${isLight ? 'text-black/60' : 'text-white/40'}`}>
                        We apologize for any inconveniences caused. <br />
                        We've almost done.
                    </p>
                </div>

                {/* Plug Illustration (Inspired by guide) */}
                <div className="relative h-48 flex items-center justify-center overflow-hidden">
                    <div className="flex items-center gap-0 md:gap-4 relative animate-pulse-subtle">
                        {/* Blue Side Plane/Plug */}
                        <div className="flex items-center">
                            <div className={`h-[6px] w-24 md:w-48 rounded-full ${isLight ? 'bg-sky-400/30' : 'bg-sky-400/20'}`}></div>
                            <div className="w-16 h-10 bg-sky-500 rounded-xl relative flex items-center justify-end pr-1 shadow-[0_0_30px_rgba(14,165,233,0.2)]">
                                <div className="w-4 h-6 bg-sky-300/50 rounded-md"></div>
                            </div>
                        </div>

                        {/* Gap / Sparkles */}
                        <div className="flex flex-col items-center gap-2 px-2 md:px-6">
                            <Zap className="text-[#B38B21] animate-pulse" size={24} />
                        </div>

                        {/* Green Side Plane/Plug */}
                        <div className="flex items-center">
                            <div className="w-16 h-10 bg-emerald-500 rounded-xl relative flex items-center pl-1 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                <div className="w-4 h-6 bg-emerald-300/50 rounded-md"></div>
                            </div>
                            <div className={`h-[6px] w-24 md:w-48 rounded-full ${isLight ? 'bg-emerald-400/30' : 'bg-emerald-400/20'}`}></div>
                        </div>
                    </div>

                    {/* Animated floaties */}
                    <div className="absolute top-0 w-full h-full pointer-events-none overflow-hidden">
                        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-[#B38B21]/40 rounded-full animate-ping"></div>
                        <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-sky-400/40 rounded-full animate-ping delay-700"></div>
                    </div>
                </div>

                {/* CTA Button */}
                <div>
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-transparent border-2 border-white/10 hover:border-[#B38B21] rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all group active:scale-95"
                    >
                        <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                        Check Connection
                    </button>
                </div>
            </div>

            {/* Footer Info (Matching guide) */}
            <div className={`absolute bottom-12 inset-x-0 px-8 flex flex-col md:flex-row items-center justify-center gap-8 ${isLight ? 'text-black/40' : 'text-white/20'}`}>
                <div className="flex items-center gap-2 group cursor-pointer hover:text-[#B38B21] transition-colors">
                    <Phone size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">+233 (0) 555-BLACK</span>
                </div>
                <div className="hidden md:block w-1.5 h-1.5 bg-[#B38B21] rounded-full"></div>
                <div className="flex items-center gap-2 group cursor-pointer hover:text-[#B38B21] transition-colors">
                    <Mail size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">tech@blackbox.gh</span>
                </div>
            </div>

            <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 4s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};
