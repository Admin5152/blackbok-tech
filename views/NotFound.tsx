import React from 'react';
import { HomeIcon, ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface NotFoundProps {
    theme?: 'light' | 'dark';
}

export const NotFound: React.FC<NotFoundProps> = ({ theme = 'dark' }) => {
    const isLight = theme === 'light';

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-700 overflow-hidden relative ${isLight ? 'bg-white' : 'bg-[#0A0A0A]'}`}>

            {/* Background Glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[120px] rounded-full opacity-20 ${isLight ? 'bg-pink-200' : 'bg-[#CDA032]/10'}`}></div>
            </div>

            <div className="max-w-2xl w-full space-y-10 relative z-10 flex flex-col items-center">

                {/* 3D Character Illustration */}
                <div className="relative group animate-in fade-in zoom-in duration-1000">
                    <div className={`absolute inset-0 blur-3xl rounded-full opacity-20 transition-all duration-1000 group-hover:opacity-40 ${isLight ? 'bg-pink-400' : 'bg-[#CDA032]'}`}></div>
                    <img
                        src="/error404.png"
                        alt="Error 404"
                        className="w-72 md:w-96 h-auto relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-transform duration-700 group-hover:scale-105"
                    />
                </div>

                {/* Message Content */}
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
                    <div className="space-y-2">
                        <p className="text-red-500 font-black tracking-[0.5em] uppercase text-sm animate-pulse">
                            Error Code: 404
                        </p>
                        <h2 className={`text-xl font-black uppercase tracking-[0.3em] ${isLight ? 'text-gray-400' : 'text-white/20'}`}>
                            Page Not Found
                        </h2>
                    </div>

                    <h1 className={`text-4xl md:text-6xl font-black tracking-tight leading-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        Uh-oh... I think I <br />took a wrong turn.
                    </h1>
                    <p className={`text-lg md:text-xl font-medium tracking-tight ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                        Let's get you back to where the cute things live.
                    </p>
                </div>

                {/* Action Button */}
                <div className="pt-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                    <Link
                        to="/"
                        className={`inline-flex px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl ${isLight
                            ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                            : 'bg-white text-black hover:bg-white/90'
                            }`}
                    >
                        Go home
                        <HomeIcon size={18} />
                    </Link>
                </div>
            </div>

            <style jsx>{`
                .animate-in {
                    animation-fill-mode: forwards;
                }
            `}</style>
        </div>
    );
};
