/**
 * Customer notification center — /account/notifications
 *
 * Renders in-app rows from `notifications` (written by notify_on_trade_status).
 * Trade lifecycle deep links: submitted / offer / completed → My trade-ins or tracking.
 */
import React, { useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Bell, CheckCheck, RefreshCcw, Package, Wrench, Info } from 'lucide-react';
import { useAppContext } from '../../lib/appContext';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { saveReturnTo } from '../../lib/returnTo';
import { PageBackButton } from '../../components/PageBackButton';

function tradeDeepLink(n: Notification): string {
  if (n.type !== 'trade' || !n.reference_id) return '/account/trade-ins';
  const title = (n.title || '').toLowerCase();
  // Offer-ready → My trade-ins (accept/decline). Otherwise tracking timeline.
  if (
    title.includes('offer') ||
    title.includes('awaiting') ||
    /offer ready|awaiting your response/i.test(n.body || '')
  ) {
    return '/account/trade-ins';
  }
  return `/tracking/trade/${n.reference_id}`;
}

function linkFor(n: Notification): string | null {
  if (n.type === 'trade') return tradeDeepLink(n);
  if (!n.reference_id) return null;
  if (n.type === 'order') return `/tracking/order/${n.reference_id}`;
  if (n.type === 'repair') return `/tracking/repair/${n.reference_id}`;
  return null;
}

function iconFor(type: Notification['type']) {
  switch (type) {
    case 'trade':
      return RefreshCcw;
    case 'order':
      return Package;
    case 'repair':
      return Wrench;
    default:
      return Info;
  }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const sec = Math.floor(Math.max(0, Date.now() - then) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString();
}

/** Highlight the three lifecycle trade events for acceptance QA. */
function isLifecycleTradeEvent(n: Notification): boolean {
  if (n.type !== 'trade') return false;
  const t = `${n.title} ${n.body}`.toLowerCase();
  return (
    t.includes('received') ||
    t.includes('submitted') ||
    t.includes('offer') ||
    t.includes('awaiting') ||
    t.includes('completed')
  );
}

export function NotificationsPage() {
  const { theme, user, authReady } = useAppContext();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    unreadCount,
  } = useNotifications();

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [notifications],
  );

  return (
    <div
      className={`min-h-[70vh] px-4 py-6 sm:px-6 sm:py-10 max-w-2xl mx-auto ${
        isLight ? 'text-black' : 'text-white'
      }`}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <PageBackButton isLight={isLight} fallbackTo="/" label="Back" />
          <h1 className="text-2xl font-black tracking-tight">
            {TRADE_COPY.notifications.centerHeading}
          </h1>
        </div>
        {user && unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#CDA032]"
          >
            <CheckCheck size={14} />
            {TRADE_COPY.notifications.markAllRead}
          </button>
        )}
      </div>

      {!authReady || loading ? (
        <p className="text-sm text-center py-12 opacity-50">{TRADE_COPY.states.loading}</p>
      ) : !user ? (
        <div className="text-center py-12 space-y-4">
          <Bell className="mx-auto opacity-30" size={40} />
          <p className="text-sm">{TRADE_COPY.notifications.signIn}</p>
          <button
            type="button"
            onClick={() => {
              saveReturnTo('/account/notifications');
              void navigate({
                to: '/auth',
                search: { returnTo: '/account/notifications' } as any,
              });
            }}
            className="rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-3"
          >
            Sign in
          </button>
        </div>
      ) : error ? (
        <div
          className={`rounded-2xl border p-6 text-center text-sm ${
            isLight ? 'border-red-200 bg-red-50 text-red-700' : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {error}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 space-y-3 opacity-50">
          <Bell className="mx-auto" size={40} />
          <p className="text-sm">{TRADE_COPY.notifications.empty}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((n) => {
            const Icon = iconFor(n.type);
            const href = linkFor(n);
            const lifecycle = isLifecycleTradeEvent(n);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!n.is_read) void markAsRead(n.id);
                    if (href) void navigate({ to: href as any });
                  }}
                  className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                    n.is_read
                      ? isLight
                        ? 'border-black/8 bg-white'
                        : 'border-white/8 bg-white/[0.02]'
                      : isLight
                        ? 'border-[#CDA032]/35 bg-[#CDA032]/5'
                        : 'border-[#CDA032]/30 bg-[#CDA032]/10'
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        lifecycle ? 'bg-[#CDA032]/20 text-[#CDA032]' : isLight ? 'bg-black/5' : 'bg-white/5'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black tracking-tight">{n.title}</p>
                        <span className="text-[9px] uppercase tracking-wider opacity-40 shrink-0">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-black/55' : 'text-white/50'}`}>
                        {n.body}
                      </p>
                      {n.type === 'trade' && href && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] mt-2">
                          {TRADE_COPY.notifications.viewTrade}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {user && (
        <p className="mt-8 text-center">
          <Link
            to="/account/trade-ins"
            className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] hover:underline"
          >
            {TRADE_COPY.confirmation.viewMyTrades}
          </Link>
        </p>
      )}
    </div>
  );
}
