/**
 * Trade Admin subnav — secondary tabs under the universal Admin chrome.
 *
 * WHY embedded: staff toggle Orders / Shop / Trade-Ins without leaving the
 * sidebar shell. Refresh-safe deep links stay on /admin/trade/*.
 */
import React, { useMemo } from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { Info } from 'lucide-react';
import {
  TRADE_ADMIN_PAGE_INTRO,
  TRADE_ADMIN_SETUP_STEPS,
} from '../../../lib/tradeAdminCopy';
import { TRADE_ADMIN_NAV } from './tradeAdminShared';

function isTradeNavActive(path: string, to: string, end: boolean): boolean {
  if (end) {
    if (path === '/admin/trade' || path === '/admin/trade/') return true;
    const rest = path.replace(/^\/admin\/trade\/?/, '');
    if (!rest) return true;
    const staticSeg = TRADE_ADMIN_NAV.some(
      (n) => n.to !== '/admin/trade' && (path === n.to || path.startsWith(`${n.to}/`)),
    );
    return !staticSeg;
  }
  return path === to || path.startsWith(`${to}/`);
}

function introForPath(path: string) {
  for (const n of TRADE_ADMIN_NAV) {
    if (n.end) continue;
    if (path === n.to || path.startsWith(`${n.to}/`)) {
      return TRADE_ADMIN_PAGE_INTRO[n.introKey];
    }
  }
  return TRADE_ADMIN_PAGE_INTRO.queue;
}

export const TradeAdminShell: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const intro = useMemo(() => introForPath(path), [path]);

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <nav
        className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1"
        aria-label="Trade admin sections"
      >
        {TRADE_ADMIN_NAV.map((item) => {
          const active = isTradeNavActive(path, item.to, item.end);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`shrink-0 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                active
                  ? 'bg-[#B38B21] text-black border-[#B38B21]'
                  : 'bg-white/[0.08] text-white/85 border-white/20 hover:bg-white/15 hover:text-white hover:border-white/35'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">
          Setup order (do this once, then handle requests)
        </p>
        <ol className="flex flex-wrap gap-1.5">
          {TRADE_ADMIN_SETUP_STEPS.map((s) => {
            const active = path === s.to || path.startsWith(`${s.to}/`);
            return (
              <li key={s.to}>
                <Link
                  to={s.to}
                  title={s.tip}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                    active
                      ? 'border-[#B38B21]/60 bg-[#B38B21]/15 text-[#B38B21]'
                      : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-[#B38B21]/40 hover:text-white'
                  }`}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[9px] font-black">
                    {s.step}
                  </span>
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-xl border border-[#B38B21]/25 bg-[#B38B21]/5 px-3.5 py-3 flex gap-2.5">
        <Info size={16} className="shrink-0 mt-0.5 text-[#B38B21]" aria-hidden />
        <div>
          <p className="text-xs font-black text-[#B38B21] tracking-tight">{intro.title}</p>
          <p className="text-[11px] text-white/60 leading-relaxed mt-0.5">{intro.body}</p>
          {intro.next && (
            <p className="text-[11px] text-[#B38B21]/90 leading-relaxed mt-1.5 font-medium">
              {intro.next}
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
};
