import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { goBack } from '../lib/goBack';

export interface PageBackButtonProps {
  isLight?: boolean;
  /** Route when there is no browser history (e.g. direct link). */
  fallbackTo?: string;
  /** If set, navigates here instead of browser back. */
  to?: string;
  /** Custom handler — wins over `to` / history. */
  onClick?: () => void;
  label?: string;
  className?: string;
  /**
   * Icon-only on small screens (store toolbar).
   * Default false — trade/repair show ← Back like the site chrome.
   */
  iconOnly?: boolean;
}

/**
 * Site chrome Back control — white (light) / dark rounded pill with arrow + label.
 * Matches Repair / Store header Back.
 */
export const PageBackButton: React.FC<PageBackButtonProps> = ({
  isLight = false,
  fallbackTo = '/',
  to,
  onClick,
  label = 'Back',
  className = '',
  iconOnly = false,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (to) {
      void navigate({ to: to as any });
      return;
    }
    goBack(navigate, fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors hover:border-[#CDA032]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
        isLight
          ? 'bg-white border-black/10 text-black shadow-sm hover:bg-black/[0.02]'
          : 'bg-[var(--bb-surface)] border-[var(--bb-border)] text-[color:var(--bb-text)] hover:bg-[var(--bb-surface-2)]'
      } ${className}`}
      aria-label={label}
    >
      <ArrowLeft size={16} strokeWidth={2} aria-hidden />
      <span className={iconOnly ? 'hidden md:inline' : 'inline'}>{label}</span>
    </button>
  );
};
