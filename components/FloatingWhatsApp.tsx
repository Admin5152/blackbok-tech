import React from 'react';
import { WhatsAppIcon } from './Icons';

interface FloatingWhatsAppProps {
    phoneNumber: string;
    theme?: 'light' | 'dark';
    hasNotification?: boolean;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ phoneNumber, theme = 'dark', hasNotification = false }) => {
    const isLight = theme === 'light';

    return (
        <div className={`fixed bottom-8 right-8 z-[100] group transition-all duration-500 ${hasNotification ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}>
            {/* Tooltip */}
            <div className={`absolute bottom-full right-0 mb-4 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none shadow-2xl border ${isLight ? 'bg-white text-black border-black/5' : 'bg-black text-white border-white/10'
                }`}>
                Chat with Support
                <div className={`absolute top-full right-6 border-8 border-transparent ${isLight ? 'border-t-white' : 'border-t-black'
                    }`}></div>
            </div>

            {/* Floating Button */}
            <a
                href={`https://wa.me/${phoneNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex items-center justify-center w-16 h-16 rounded-[2rem] bg-[#25D366] text-white shadow-[0_20px_40px_rgba(37,211,102,0.3)] hover:shadow-[0_25px_50px_rgba(37,211,102,0.5)] transition-all duration-500 hover:scale-110 active:scale-95 group"
            >
                {/* Animated Glow */}
                <div className="absolute inset-0 rounded-[2rem] bg-[#25D366] animate-ping opacity-20 group-hover:opacity-40"></div>

                <WhatsAppIcon size={32} />

                {/* Status Indicator */}
                <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-green-400 border-4 border-[#25D366] animate-pulse"></div>
            </a>
        </div>
    );
};
