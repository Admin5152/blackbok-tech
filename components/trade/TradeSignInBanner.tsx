/**
 * Guest prompt on trade-in: Sign in link + returnTo so login resumes this step.
 * Wizard state already persists in sessionStorage via TradeFlowProvider.
 * Extra-visible on mobile (sticky) so guests always see how to continue signed-in.
 */
import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LogIn } from 'lucide-react';
import { useAppContext } from '../../lib/appContext';
import { saveReturnTo } from '../../lib/returnTo';
import { TRADE_COPY } from '../../lib/tradeCopy';

type Props = {
  /** Extra class on the outer card */
  className?: string;
  /** Force a specific return path (default: current trade URL) */
  returnPath?: string;
};

function resolveTradeReturnPath(pathname: string, returnPath?: string): string {
  if (returnPath && returnPath.startsWith('/trade')) return returnPath;
  if (pathname.startsWith('/trade')) return pathname;
  return '/trade/type';
}

export function TradeSignInBanner({ className = '', returnPath }: Props) {
  const { user, authReady, theme } = useAppContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLight = theme === 'light';

  if (!authReady || user?.id) return null;

  const dest = resolveTradeReturnPath(pathname, returnPath);

  const onSignInClick = () => {
    saveReturnTo(dest);
  };

  return (
    <div
      className={`sticky top-0 z-30 flex flex-col gap-3 px-3.5 py-3 rounded-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md ${
        isLight
          ? 'border-[#CDA032]/40 bg-[#CDA032]/14'
          : 'border-[#CDA032]/45 bg-[#121212]/95'
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-2.5 items-start min-w-0">
        <LogIn size={18} className="text-[#CDA032] shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">
            {TRADE_COPY.layout.signInBannerTitle}
          </p>
          <p
            className={`text-xs leading-snug font-medium ${
              isLight ? 'text-black/75' : 'text-white/80'
            }`}
          >
            {TRADE_COPY.layout.signInBannerBody}{' '}
            <Link
              to="/auth"
              search={{ returnTo: dest } as any}
              onClick={onSignInClick}
              className="font-black text-[#CDA032] underline underline-offset-2 hover:brightness-110"
            >
              {TRADE_COPY.layout.signInBannerCta}
            </Link>
            {TRADE_COPY.layout.signInBannerLinkSuffix}
          </p>
        </div>
      </div>
      <Link
        to="/auth"
        search={{ returnTo: dest } as any}
        onClick={onSignInClick}
        className="w-full sm:w-auto sm:self-start inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#CDA032] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-105 active:scale-[0.98] transition-all"
      >
        <LogIn size={14} aria-hidden />
        {TRADE_COPY.layout.signInBannerCta}
      </Link>
    </div>
  );
}
