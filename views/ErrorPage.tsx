import React from 'react';
import { AlertTriangle, HomeIcon, RefreshCw, ChevronLeft, ShieldAlert } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface ErrorPageProps {
    error?: any;
    reset?: () => void;
    theme?: 'light' | 'dark';
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ error, reset, theme = 'dark' }) => {
    const isLight = theme === 'light';

    return (
        <div className={`min-h-[80vh] flex flex-col items-center justify-center p-6 text-center transition-all duration-700 ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}>

            {/* Background Tech Motif */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[120px] rounded-full ${isLight ? 'bg-red-500/10' : 'bg-red-500/5'}`}></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            </div>

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                {/* Error Icon Plate */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                    <div className={`relative w-24 h-24 rounded-3xl border-2 flex items-center justify-center shadow-2xl ${isLight ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                        <ShieldAlert size={48} className="animate-in zoom-in duration-500" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
                        System <span className="text-red-500">Anomaly</span>
                    </h1>
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] italic opacity-40`}>
                        Protocol Breached • Operation Terminated
                    </p>
                </div>

                <div className={`p-8 rounded-[2.5rem] border backdrop-blur-xl transition-all duration-500 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5 shadow-2xl'}`}>
                    <div className="flex items-start gap-4 text-left">
                        <div className={`mt-1 p-2 rounded-lg ${isLight ? 'bg-red-100' : 'bg-red-500/10'}`}>
                            <AlertTriangle size={16} className="text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-widest text-red-500">Error Report:</p>
                            <p className={`text-sm font-bold opacity-60 leading-relaxed ${isLight ? 'text-black' : 'text-white'}`}>
                                {error?.message || "An unexpected fragment of code has failed to initialize. The repository's integrity remains intact, but the current operation could not be completed."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <button
                        onClick={() => reset ? reset() : window.location.reload()}
                        className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                    >
                        <RefreshCw size={16} />
                        Re-Initialize
                    </button>

                    <Link
                        to="/"
                        className={`w-full sm:w-auto px-10 py-5 border rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:bg-white/5 ${isLight ? 'border-black text-black' : 'border-white/10 text-white'}`}
                    >
                        <HomeIcon size={16} />
                        Abort to Base
                    </Link>
                </div>

                {/* Technical Footer */}
                <div className="pt-8 flex flex-col items-center gap-2">
                    <div className={`h-px w-24 ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>
                    <p className={`text-[8px] font-black uppercase tracking-[0.5em] italic opacity-20`}>
                        BlackBox Technical Diagnostics v4.0.1
                    </p>
                </div>
            </div>
        </div>
    );
};
