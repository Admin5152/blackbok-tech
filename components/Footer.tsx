import React from 'react';
import { Instagram, Linkedin, MapPin, Phone } from 'lucide-react';
import { WhatsAppIcon } from './Icons';
import { Link } from '@tanstack/react-router';

type Theme = 'light' | 'dark';

interface FooterProps {
  theme?: Theme;
}

export const Footer: React.FC<FooterProps> = ({ theme }) => {
  const isLight = theme === 'light';
  const a = isLight ? 'hover:text-black transition-colors' : 'hover:text-white transition-colors';

  const footCol = (
    title: string,
    children: React.ReactNode,
  ) => (
    <div className="space-y-5 min-w-0">
      <h4 className={`text-[10px] font-black uppercase tracking-[0.35em] ${isLight ? 'text-black/35' : 'text-white/25'}`}>
        {title}
      </h4>
      <ul className={`space-y-3 text-[10px] font-black uppercase tracking-[0.28em] ${isLight ? 'text-black/55' : 'text-white/45'}`}>
        {children}
      </ul>
    </div>
  );

  const item = (to: string, label: string, search?: Record<string, unknown>) => (
    <li key={`${to}-${label}`}>
      {search ? (
        <Link to={to as any} search={search as any} className={a}>
          {label}
        </Link>
      ) : (
        <Link to={to as any} className={a}>
          {label}
        </Link>
      )}
    </li>
  );

  return (
    <footer className={`py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-t ${isLight ? 'bg-[#E8E8E8] border-black/10 text-black' : 'bg-black border-white/5 text-white'}`}>
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-16">
          {/* Brand */}
          <div className="space-y-6 lg:col-span-3">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">BLACKBOX</h2>
            <p className={`text-[10px] leading-relaxed max-w-[260px] font-black uppercase tracking-[0.28em] italic ${isLight ? 'text-black/50' : 'text-white/25'}`}>
              Elite hardware repository & specialized diagnostics. Precision establishes the baseline.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://wa.me/+233543217272"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-[#25D366] hover:text-white transition-all hover:scale-110 active:scale-90"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon size={18} />
              </a>
              <a
                href="https://www.instagram.com/blackbox_gh/"
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

          {/* Link columns — 2×2 on small screens, 4 across on large */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 sm:gap-x-8 lg:col-span-9 lg:gap-x-10">
            {footCol(
              'Shop',
              <>
                {item('/store', 'All products')}
                {item('/store', 'iPhone', { category: 'iPhone' })}
                {item('/store', 'Laptop', { category: 'Laptop' })}
                {item('/store', 'Gaming', { category: 'Gaming' })}
                {item('/store', 'Accessories', { category: 'Accessories' })}
                {item('/store', 'Audio', { category: 'Audio' })}
                {item('/compare', 'Compare')}
                {item('/promotions', 'Special offers')}
              </>,
            )}
            {footCol(
              'Services & tracking',
              <>
                {item('/repair', 'Repairs')}
                {item('/trades', 'Trade-ins')}
                {item('/returns', 'Returns')}
                {item('/history', 'Track orders', { tab: 'orders' })}
                {item('/history', 'Repair history', { tab: 'repairs' })}
                {item('/history', 'Trade-in history', { tab: 'trades' })}
              </>,
            )}
            {footCol(
              'Company',
              <>
                {item('/about', 'About')}
                {item('/contact', 'Contact')}
                {item('/faq', 'Help / FAQ')}
                {item('/profile', 'Account')}
              </>,
            )}
            {footCol(
              'Policies & visit',
              <>
                {item('/policies', 'All policies')}
                {item('/policies', 'Returns policy', { tab: 'returns' })}
                {item('/policies', 'Privacy', { tab: 'privacy' })}
                {item('/policies', 'Terms', { tab: 'terms' })}
                <li className={`flex items-start gap-2 pt-1 normal-case font-semibold tracking-normal text-xs ${isLight ? 'text-black/50' : 'text-white/40'}`}>
                  <MapPin size={14} className="shrink-0 mt-0.5" aria-hidden />
                  <span>KNUST, Kumasi, GH</span>
                </li>
                <li className={`flex items-start gap-2 normal-case font-semibold tracking-normal text-xs ${isLight ? 'text-black/50' : 'text-white/40'}`}>
                  <Phone size={14} className="shrink-0 mt-0.5" aria-hidden />
                  <a href="tel:+233501234567" className={a}>
                    +233 50 123 4567
                  </a>
                </li>
              </>,
            )}
          </div>
        </div>

        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 mt-10 border-t ${isLight ? 'border-black/10' : 'border-white/10'}`}>
          <p className={`text-[9px] font-black uppercase tracking-[0.35em] italic ${isLight ? 'text-black/35' : 'text-white/20'}`}>
            © 2026 BLACKBOX. EST. KUMASI.
          </p>
          <p className={`text-[9px] font-black uppercase tracking-[0.32em] italic ${isLight ? 'text-black/35' : 'text-white/20'}`}>
            Built by C Colt.
          </p>
        </div>
      </div>
    </footer>
  );
};
