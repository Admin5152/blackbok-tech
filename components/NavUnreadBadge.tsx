import React from 'react';
import { formatUnreadCountLabel } from '../lib/navBadgeWatermarks';

/** WhatsApp-style unread pill (count or 99+). */
export function NavUnreadBadge({
  count,
  className = '',
  title,
}: {
  count: number;
  className?: string;
  title?: string;
}) {
  const label = formatUnreadCountLabel(count);
  if (!label) return null;
  return (
    <span
      title={title}
      className={`inline-flex min-h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white shadow-md ring-2 ring-white/90 dark:ring-black/80 ${className}`}
    >
      {label}
    </span>
  );
}

/** Dot-only indicator when space is tight (e.g. collapsed admin rail). */
export function NavUnreadDot({ show, className = '' }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span
      className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white/90 dark:ring-[#0a0a0a] ${className}`}
      aria-hidden
    />
  );
}
