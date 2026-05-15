import React from 'react';
import { Instagram, Linkedin, MapPin, Phone } from 'lucide-react';
import { WhatsAppIcon } from './Icons';
import { Link } from '@tanstack/react-router';
import { SUPPORT_PHONE_TEL, WHATSAPP_DISPLAY, whatsAppUrl } from '../lib/contact';

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
    <div className="min-w-0 space-y-2.5">
      <h4 className={`text-[10px] font-black uppercase tracking-[0.35em] ${isLight ? 'text-black/35' : 'text-white/25'}`}>
        {title}
      </h4>
      <ul className={`space-y-2 text-[10px] font-black uppercase tracking-[0.28em] ${isLight ? 'text-black/55' : 'text-white/45'}`}>
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
    <footer className={`border-t px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${isLight ? 'bg-[#E8E8E8] border-black/10 text-black' : 'bg-black border-white/5 text-white'}`}>
      <div className="mx-auto max-w-[1440px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6 xl:gap-8">
          {/* Brand */}
          <div className="space-y-3 lg:col-span-3">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase sm:text-3xl">BLACKBOX</h2>
            <p className={`text-[10px] leading-relaxed max-w-[260px] font-black uppercase tracking-[0.28em] italic ${isLight ? 'text-black/50' : 'text-white/25'}`}>
              Elite hardware repository & specialized diagnostics. Precision establishes the baseline.
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <a
                href={whatsAppUrl()}
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-2 sm:gap-x-5 md:grid-cols-4 lg:col-span-9 lg:gap-x-6 lg:gap-y-5">
            {footCol(
              'Shop',
              <>
                {item('/store', 'Browse all')}
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
                  <a href={`tel:${SUPPORT_PHONE_TEL}`} className={a}>
                    {WHATSAPP_DISPLAY}
                  </a>
                </li>
              </>,
            )}
          </div>
        </div>

        <div className={`mt-4 flex flex-col items-center justify-between gap-1.5 border-t pt-4 sm:flex-row sm:gap-2 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
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
