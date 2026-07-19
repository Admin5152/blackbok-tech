/**
 * Trade v2 layout — Repair-matched: hero, Change rows, sticky summary.
 */
import React from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { RefreshCcw } from 'lucide-react';
import { PageBackButton } from '../../components/PageBackButton';
import { TradeCollapsedSteps } from '../../components/trade/TradeCollapsedSteps';
import { TradeSummarySidebar } from '../../components/trade/TradeSummarySidebar';
import { TradeFlowProvider } from '../../components/trade/TradeFlowProvider';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { useAppContext } from '../../lib/appContext';
import { isTradeV2Enabled } from '../../lib/tradeFeatureFlags';

const STEP_PATHS = [
  { id: 1, path: '/trade/type' },
  { id: 2, path: '/trade/category' },
  { id: 3, path: '/trade/model' },
  { id: 4, path: '/trade/config' },
  { id: 5, path: '/trade/target' },
  { id: 6, path: '/trade/condition' },
  { id: 7, path: '/trade/summary' },
  { id: 8, path: '/trade/details' },
] as const;

function stepFromPath(pathname: string): number {
  const hit = STEP_PATHS.find((s) => pathname === s.path || pathname.startsWith(s.path + '/'));
  return hit?.id ?? 1;
}

function TradeLayoutInner() {
  const { theme } = useAppContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentStep = stepFromPath(pathname);
  const isConfirmation = pathname.includes('/confirmation');
  const showFullHero = currentStep <= 1 && !isConfirmation;
  /** Sidebar like Repair — once past device type */
  const showSidebar = currentStep >= 2 && !isConfirmation;

  const backFallback =
    currentStep <= 1
      ? '/'
      : STEP_PATHS[currentStep - 2]?.path ?? '/trade/type';

  return (
    <div
      className="min-h-screen pb-28 relative"
      style={{ backgroundColor: 'var(--bb-bg)', color: 'var(--bb-text)' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #CDA032 0%, transparent 60%)',
            filter: 'blur(100px)',
            transform: 'translate(30%, -30%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{
            background: 'radial-gradient(circle, #CDA032 0%, transparent 70%)',
            filter: 'blur(100px)',
            transform: 'translate(-30%, 30%)',
          }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pt-6 sm:pt-10 z-10 relative">
        <header className="mb-6 sm:mb-8">
          <div className="mb-4">
            <PageBackButton
              isLight={theme === 'light'}
              fallbackTo={isConfirmation ? '/' : backFallback}
              label={TRADE_COPY.back}
            />
          </div>

          {showFullHero ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#CDA032]/10 border border-[#CDA032]/30">
                  <RefreshCcw size={20} className="text-[#CDA032]" aria-hidden />
                </div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#CDA032]">
                  {TRADE_COPY.layout.eyebrow}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[1.1]">
                {TRADE_COPY.layout.heroLine1}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CDA032] to-[#FCE69B]">
                  {TRADE_COPY.layout.heroLine2}
                </span>
              </h1>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#CDA032]/10 border border-[#CDA032]/30 shrink-0">
                <RefreshCcw size={16} className="text-[#CDA032]" aria-hidden />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032]">
                {TRADE_COPY.layout.eyebrow}
              </span>
            </div>
          )}
        </header>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          <div className="flex-1 w-full min-w-0 space-y-2">
            {!isConfirmation && <TradeCollapsedSteps />}
            <Outlet />
          </div>
          {showSidebar && (
            <aside className="hidden lg:block w-[320px] xl:w-[350px] shrink-0 sticky top-28">
              <TradeSummarySidebar />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

export function TradeLayout() {
  // Gate + provider in one place so child screens always mount under context
  if (!isTradeV2Enabled()) {
    return <TradeV2OffRedirect />;
  }
  return (
    <TradeFlowProvider>
      <TradeLayoutInner />
    </TradeFlowProvider>
  );
}

function TradeV2OffRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    void navigate({ to: '/trades', replace: true });
  }, [navigate]);
  return (
    <p className="text-sm text-[color:var(--bb-muted)] text-center py-12">
      {TRADE_COPY.states.loading}
    </p>
  );
}

export function TradeIndexRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    void navigate({ to: '/trade/type', replace: true });
  }, [navigate]);
  return (
    <p className="text-sm text-[color:var(--bb-muted)] text-center py-12">
      {TRADE_COPY.states.loading}
    </p>
  );
}
