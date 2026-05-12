import React from 'react';
import { AlertTriangle, HomeIcon, RefreshCw, ChevronLeft, ShieldAlert } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface ErrorPageProps {
    error?: any;
    reset?: () => void;
    theme?: 'light' | 'dark';
}

function safeErrorMessage(err: unknown): string {
    if (err == null) return '';
    if (typeof err === 'string') return err;
    if (typeof err === 'object' && err !== null && 'message' in err) {
        const m = (err as { message?: unknown }).message;
        if (typeof m === 'string' && m.trim()) return m;
    }
    try {
        return JSON.stringify(err);
    } catch {
        return 'An unexpected error occurred';
    }
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ error, reset, theme = 'dark' }) => {
    const isLight = theme === 'light';
    const message = safeErrorMessage(error);

    return (
        <div className={`h-[100dvh] w-full flex flex-col items-center justify-center p-6 text-center transition-all duration-700 relative overflow-hidden ${isLight ? 'bg-[#FAFAFA] text-black' : 'bg-[#050505] text-white'}`}>

            {/* Background Tech Motif - Enhanced */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-0 right-0 w-[800px] h-[800px] blur-[160px] rounded-full opacity-20 ${isLight ? 'bg-red-400' : 'bg-red-900/40'}`}></div>
                <div className={`absolute bottom-0 left-0 w-[600px] h-[600px] blur-[140px] rounded-full opacity-10 ${isLight ? 'bg-red-300' : 'bg-red-800/30'}`}></div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-0 pointer-events-none bg-[length:100%_4px,3px_100%]"></div>
            </div>

            <div className="max-w-3xl w-full space-y-4 relative z-10">
                {/* Error Icon Plate - Glitchy Feel */}
                <div className="relative inline-block group">
                    <div className="absolute inset-0 bg-red-500/30 blur-3xl rounded-full scale-150 animate-pulse transition-transform group-hover:scale-[1.8]"></div>
                    <div className={`relative w-16 h-16 rounded-[1.5rem] border-2 flex items-center justify-center shadow-2xl transition-all duration-500 transform group-hover:-rotate-3 ${isLight ? 'bg-white border-red-200 text-red-600' : 'bg-black border-red-500/30 text-red-500'}`}>
                        <ShieldAlert size={32} className="animate-in zoom-in duration-700" />
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-current opacity-40"></div>
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-current opacity-40"></div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none select-none">
                        <span className="relative inline-block overflow-hidden">
                            SYSTEM
                            <span className="absolute top-0 left-0 -translate-x-full h-full w-full bg-red-500 mix-blend-overlay opacity-20 animate-in slide-in-from-left duration-1000 delay-300"></span>
                        </span>
                        <br />
                        <span className="text-red-500 italic drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">ANOMALY</span>
                    </h1>
                    <div className="flex items-center justify-center gap-4">
                        <div className={`h-px flex-1 ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] italic opacity-40 whitespace-nowrap">
                            Protocol Breached • Operation Terminated
                        </p>
                        <div className={`h-px flex-1 ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>
                    </div>
                </div>

                {/* Technical Error Window */}
                <div className={`group p-1 rounded-[1.5rem] transition-all duration-700 hover:shadow-[0_0_50px_rgba(239,68,68,0.1)] ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
                    <div className={`p-4 md:p-6 rounded-[1.3rem] border backdrop-blur-3xl transition-all relative overflow-hidden ${isLight ? 'bg-white/80 border-white text-black' : 'bg-black/60 border-white/5 text-white'}`}>
                        {/* Design Details */}
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <RefreshCw size={80} className="animate-spin-slow" />
                        </div>

                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                            <div className={`p-4 rounded-2xl shrink-0 ${isLight ? 'bg-red-50' : 'bg-red-500/10'}`}>
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                            <div className="space-y-4 text-center md:text-left flex-1">
                                <div className="flex items-center justify-center md:justify-start gap-3">
                                    <span className="px-3 py-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Error Code 500</span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${isLight ? 'text-black' : 'text-white'}`}>// Diagnostic Report</span>
                                </div>
                                <h3 className="text-2xl font-black tracking-tight uppercase italic underline decoration-red-500/50 decoration-4 underline-offset-8">Critical Fault Detected</h3>
                                <p className={`text-base font-medium opacity-60 leading-relaxed max-w-xl break-words ${isLight ? 'text-black' : 'text-white'}`}>
                                    {message || "Internal core execution halted. The system detected an unauthorized logic fragment or missing dependency. Re-initialization protocol recommended to restore operational status."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                        onClick={() => reset ? reset() : window.location.reload()}
                        className="w-full sm:w-auto px-12 py-6 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-red-500 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-red-600/20 group"
                    >
                        <RefreshCw size={18} className="transition-transform group-hover:rotate-180 duration-700" />
                        Re-Initialize
                    </button>

                    <Link
                        to="/"
                        className={`w-full sm:w-auto px-12 py-6 border rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 ${isLight ? 'bg-black text-white border-black' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                    >
                        <HomeIcon size={18} />
                        Return to Base
                    </Link>
                </div>

                {/* Footer Metrics */}
                <div className="pt-4 flex flex-col items-center gap-2 opacity-30">
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black">404.0.1</span>
                            <span className="text-[7px] uppercase tracking-widest">Build ID</span>
                        </div>
                        <div className={`h-8 w-px ${isLight ? 'bg-black' : 'bg-white'}`}></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black">X-ALPHA</span>
                            <span className="text-[7px] uppercase tracking-widest">Protocol</span>
                        </div>
                        <div className={`h-8 w-px ${isLight ? 'bg-black' : 'bg-white'}`}></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black">SECURE</span>
                            <span className="text-[7px] uppercase tracking-widest">Enc State</span>
                        </div>
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.6em] italic`}>
                        BlackBox Technical Diagnostics
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
            `}</style>
        </div>
    );
};
