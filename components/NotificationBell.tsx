import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, Package, Wrench, RefreshCcw, Megaphone, Info as InfoIcon, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useNotifications, type Notification, type NotificationType } from '../hooks/useNotifications';

interface NotificationBellProps {
  theme: 'light' | 'dark';
}

const MAX_DISPLAYED = 20;
const BODY_CLAMP_CHARS = 140;

/** Maps a notification.type → in-app route. Returns null for types
 *  (`info`, `promo`) that don't have an obvious target page. */
function getNotificationLink(notification: Notification): string | null {
  if (!notification.reference_id) return null;
  switch (notification.type) {
    case 'order':
      return `/tracking/order/${notification.reference_id}`;
    case 'repair':
      return `/tracking/repair/${notification.reference_id}`;
    case 'trade':
      return `/tracking/trade/${notification.reference_id}`;
    case 'info':
    case 'promo':
    default:
      return null;
  }
}

/** Lightweight "x time ago" formatter so we don't pull in dayjs. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(iso).toLocaleDateString();
}

function clampBody(body: string): string {
  if (!body) return '';
  if (body.length <= BODY_CLAMP_CHARS) return body;
  return body.slice(0, BODY_CLAMP_CHARS - 1).trimEnd() + '…';
}

function typeIcon(type: NotificationType) {
  switch (type) {
    case 'order':
      return Package;
    case 'repair':
      return Wrench;
    case 'trade':
      return RefreshCcw;
    case 'promo':
      return Megaphone;
    case 'info':
    default:
      return InfoIcon;
  }
}

function typeAccent(type: NotificationType): string {
  switch (type) {
    case 'order':
      return 'text-green-400';
    case 'repair':
      return 'text-blue-400';
    case 'trade':
      return 'text-purple-400';
    case 'promo':
      return 'text-pink-400';
    case 'info':
    default:
      return 'text-[#CDA032]';
  }
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ theme }) => {
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click and on Escape. Both are scoped to when the panel
  // is open so we don't add listeners when they aren't needed.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = (event: MouseEvent) => {
      const root = containerRef.current;
      if (!root) return;
      if (!root.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const visible = notifications.slice(0, MAX_DISPLAYED);
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  const handleRowClick = async (notification: Notification): Promise<void> => {
    if (!notification.is_read) {
      // Fire-and-forget; the hook does an optimistic update.
      void markAsRead(notification.id);
    }
    const link = getNotificationLink(notification);
    if (link) {
      setIsOpen(false);
      navigate({ to: link as any });
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : 'Notifications'
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`relative p-2.5 rounded-full border transition-all ${
          isLight
            ? 'border-black/10 bg-black/5 text-black hover:bg-black/10'
            : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
        }`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-[0_0_0_2px_rgba(0,0,0,0.6)]"
            aria-hidden="true"
          >
            {badgeText}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={`absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden z-[120] backdrop-blur-3xl ${
            isLight
              ? 'bg-white/95 border-black/10 text-black'
              : 'bg-[#121212]/95 border-white/10 text-white'
          }`}
        >
          {/* Header */}
          <div
            className={`px-4 py-3 flex flex-col gap-2 border-b ${
              isLight ? 'border-black/5' : 'border-white/5'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em]">
                  Notifications
                </p>
                <p
                  className={`text-[10px] ${
                    isLight ? 'text-black/40' : 'text-white/40'
                  }`}
                >
                  {unreadCount === 0
                    ? 'All caught up'
                    : `${unreadCount} unread`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                disabled={unreadCount === 0}
                className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                  unreadCount === 0
                    ? isLight
                      ? 'text-black/20 cursor-not-allowed'
                      : 'text-white/20 cursor-not-allowed'
                    : 'text-[#CDA032] hover:text-[#D4AF37]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Check size={12} /> Mark all read
                </span>
              </button>
              <button
                type="button"
                onClick={() => void clearAllNotifications()}
                disabled={notifications.length === 0}
                className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                  notifications.length === 0
                    ? isLight
                      ? 'text-black/20 cursor-not-allowed'
                      : 'text-white/20 cursor-not-allowed'
                    : isLight
                      ? 'text-black/50 hover:text-red-600'
                      : 'text-white/50 hover:text-red-400'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <X size={12} /> Clear all
                </span>
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div
                  className={`w-6 h-6 mx-auto mb-3 rounded-full border-2 border-t-[#CDA032] animate-spin ${
                    isLight ? 'border-black/10' : 'border-white/10'
                  }`}
                />
                <p
                  className={`text-[11px] ${
                    isLight ? 'text-black/40' : 'text-white/40'
                  }`}
                >
                  Loading…
                </p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-[11px] text-red-400">{error}</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="p-10 text-center">
                <Bell
                  size={28}
                  className={isLight ? 'mx-auto mb-3 text-black/20' : 'mx-auto mb-3 text-white/20'}
                />
                <p
                  className={`text-[11px] font-black uppercase tracking-widest ${
                    isLight ? 'text-black/40' : 'text-white/40'
                  }`}
                >
                  No notifications
                </p>
              </div>
            ) : (
              visible.map((notification) => {
                const Icon = typeIcon(notification.type);
                const accent = typeAccent(notification.type);
                const hasLink = getNotificationLink(notification) !== null;
                const interactive = hasLink || !notification.is_read;
                return (
                  <div
                    key={notification.id}
                    className={`flex items-stretch border-b ${
                      isLight ? 'border-black/5' : 'border-white/5'
                    } ${
                      !notification.is_read
                        ? isLight
                          ? 'bg-[#CDA032]/5'
                          : 'bg-white/[0.03]'
                        : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void handleRowClick(notification)}
                      disabled={!interactive}
                      className={`min-w-0 flex-1 text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                        interactive
                          ? isLight
                            ? 'hover:bg-black/[0.03] cursor-pointer'
                            : 'hover:bg-white/5 cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      <span
                        className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${
                          isLight ? 'bg-black/5' : 'bg-white/5'
                        }`}
                      >
                        <Icon size={14} className={accent} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-start gap-2">
                          <span className="flex-1 min-w-0 text-[12px] font-bold leading-tight truncate">
                            {notification.title}
                          </span>
                          {!notification.is_read && (
                            <span
                              aria-label="Unread"
                              className="shrink-0 mt-1 w-2 h-2 rounded-full bg-blue-500"
                            />
                          )}
                        </span>
                        <span
                          className={`block mt-1 text-[11px] leading-snug line-clamp-2 ${
                            isLight ? 'text-black/60' : 'text-white/60'
                          }`}
                        >
                          {clampBody(notification.body)}
                        </span>
                        <span
                          className={`block mt-1.5 text-[10px] uppercase tracking-widest font-black ${
                            isLight ? 'text-black/30' : 'text-white/30'
                          }`}
                        >
                          {timeAgo(notification.created_at)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="Remove notification"
                      title="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeNotification(notification.id);
                      }}
                      className={`shrink-0 px-3 flex items-center justify-center border-l transition-colors ${
                        isLight
                          ? 'border-black/5 text-black/30 hover:text-red-600 hover:bg-black/[0.04]'
                          : 'border-white/5 text-white/35 hover:text-red-400 hover:bg-white/5'
                      }`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {visible.length > 0 && (
            <div
              className={`px-4 py-2.5 text-center border-t ${
                isLight ? 'border-black/5' : 'border-white/5'
              }`}
            >
              <span
                className={`text-[10px] uppercase tracking-widest font-black ${
                  isLight ? 'text-black/30' : 'text-white/30'
                }`}
              >
                Showing latest {visible.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
