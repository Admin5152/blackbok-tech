import React from 'react';
import { Instagram, Linkedin, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Link } from '@tanstack/react-router';

type Theme = 'light' | 'dark';

interface FooterProps {
  theme?: Theme;
}

export const Footer: React.FC<FooterProps> = ({ theme }) => {
  const isLight = theme === 'light';
  return (
    <footer className={`py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-t ${isLight ? 'bg-[#E8E8E8] border-black/10 text-black' : 'bg-black border-white/5 text-white'}`}>
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 sm:gap-16 md:gap-24">
        <div className="space-y-8">
           <h2 className="text-3xl font-black italic tracking-tighter uppercase">BLACKBOX</h2>
           <p className={`text-[10px] leading-relaxed max-w-[240px] font-black uppercase tracking-[0.3em] italic ${isLight ? 'text-black/50' : 'text-white/20'}`}>
             Elite hardware repository & specialized diagnostics. Precision establishes the baseline.
           </p>
           <div className="flex items-center gap-3">
             <a
               href="https://wa.me/"
               target="_blank"
               rel="noreferrer"
               aria-label="WhatsApp"
               className={`glow-border w-11 h-11 inline-flex items-center justify-center ${isLight ? 'bg-white text-black' : 'bg-black/30 text-white'}`}
             >
               <MessageCircle size={18} />
             </a>
             <a
               href="https://instagram.com/"
               target="_blank"
               rel="noreferrer"
               aria-label="Instagram"
               className={`glow-border w-11 h-11 inline-flex items-center justify-center ${isLight ? 'bg-white text-black' : 'bg-black/30 text-white'}`}
             >
               <Instagram size={18} />
             </a>
             <a
               href="https://linkedin.com/"
               target="_blank"
               rel="noreferrer"
               aria-label="LinkedIn"
               className={`glow-border w-11 h-11 inline-flex items-center justify-center ${isLight ? 'bg-white text-black' : 'bg-black/30 text-white'}`}
             >
               <Linkedin size={18} />
             </a>
           </div>
        </div>
        <div className="space-y-6">
          <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] ${isLight ? 'text-black/30' : 'text-white/10'}`}>Directory</h4>
          <ul className={`space-y-4 text-[10px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-black/50' : 'text-white/40'}`}>
            <li><Link to="/repair" className={isLight ? 'hover:text-black transition-colors' : 'hover:text-white transition-colors'}>Lab Diagnostics</Link></li>
            <li><Link to="/store" className={isLight ? 'hover:text-black transition-colors' : 'hover:text-white transition-colors'}>Hardware Bench</Link></li>
            <li><Link to="/profile" className={isLight ? 'hover:text-black transition-colors' : 'hover:text-white transition-colors'}>Identity Log</Link></li>
          </ul>
        </div>
        <div className="space-y-6">
          <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] ${isLight ? 'text-black/30' : 'text-white/10'}`}>Branch</h4>
          <ul className={`space-y-4 text-[10px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-black/50' : 'text-white/40'}`}>
            <li className="flex items-center gap-3 italic"><MapPin size={14}/> KNUST, Kumasi, GH</li>
            <li className="flex items-center gap-3 italic"><Phone size={14}/> +233 50 123 4567</li>
          </ul>
        </div>
        <div className="flex flex-col items-start md:items-end justify-start md:justify-end gap-2">
          <p className={`text-[9px] font-black uppercase tracking-[0.4em] italic ${isLight ? 'text-black/30' : 'text-white/10'}`}>© 2025 BLACKBOX. EST. KUMASI.</p>
          <p className={`text-[9px] font-black uppercase tracking-[0.35em] italic ${isLight ? 'text-black/30' : 'text-white/10'}`}>Built by C Colt.</p>
        </div>
      </div>
    </footer>
  );
};
