import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { goBack } from '../lib/goBack';

export interface PageBackButtonProps {
  isLight?: boolean;
  /** Route when there is no browser history (e.g. direct link). */
  fallbackTo?: string;
  label?: string;
  className?: string;
  /** Icon-only on small screens; shows label from `md` up (store toolbar). */
  iconOnly?: boolean;
}

export const PageBackButton: React.FC<PageBackButtonProps> = ({
  isLight = false,
  fallbackTo = '/',
  label = 'Back',
  className = '',
  iconOnly = false,
}) => {
  const navigate = useNavigate();
  const panelBg = isLight ? '#FFFFFF' : '#0d0d0b';
  const borderSubtle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  return (
    <button
      type="button"
      onClick={() => goBack(navigate, fallbackTo)}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 transition-colors hover:border-[#CDA032]/40 sm:gap-2 sm:px-3 ${className}`}
      style={{
        backgroundColor: panelBg,
        borderColor: borderSubtle,
        color: isLight ? '#000' : '#fff',
      }}
      aria-label={label}
    >
      <ArrowLeft size={16} aria-hidden />
      <span
        className={`text-sm font-medium ${iconOnly ? 'hidden md:inline' : 'hidden sm:inline'}`}
      >
        {label}
      </span>
    </button>
  );
};
