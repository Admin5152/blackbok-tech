/**
 * Trade Admin subnav — secondary tabs under the universal Admin chrome.
 *
 * WHY embedded: staff toggle Orders / Shop / Trade-Ins without leaving the
 * sidebar shell. Refresh-safe deep links stay on /admin/trade/*.
 */
import React from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
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

export const TradeAdminShell: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

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
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
};
