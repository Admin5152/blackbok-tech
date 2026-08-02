/**
 * Public UI preview for the new-promotion builder.
 * No admin login, no database — mock data only.
 * Open: #/preview/promo-builder
 */
import React from 'react';
import { Link } from '@tanstack/react-router';
import { useAppContext } from '../../../lib/appContext';
import { AdminPromotionBuilder } from './AdminPromotionBuilder';

export const PromoBuilderUiPreview: React.FC = () => {
  const { theme } = useAppContext();
  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen ${
        isLight ? 'bg-[#f7f7f5] text-black' : 'bg-[#050505] text-white'
      }`}
    >
      <div
        className={`sticky top-0 z-20 border-b px-4 py-3 ${
          isLight
            ? 'border-amber-200/80 bg-amber-50 text-amber-950'
            : 'border-[#B38B21]/35 bg-[#B38B21]/15 text-[#E8C96A]'
        }`}
      >
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-medium">
            Design preview — interact freely. Saves and publish do nothing here.
          </p>
          <Link
            to="/"
            className={`text-[12px] font-medium underline-offset-2 hover:underline ${
              isLight ? 'text-amber-900/70' : 'text-[#E8C96A]/80'
            }`}
          >
            Back to site
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
        <AdminPromotionBuilder previewMode />
      </div>
    </div>
  );
};
