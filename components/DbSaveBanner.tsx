/**
 * Inline banner for admin screens — green when DB save OK, red when not.
 */
import React from 'react';
import { AlertTriangle, CheckCircle2, Database } from 'lucide-react';

type Props = {
  ok?: string | null;
  error?: string | null;
  isLight?: boolean;
};

export const DbSaveBanner: React.FC<Props> = ({ ok, error, isLight = false }) => {
  if (!ok && !error) return null;

  if (error) {
    return (
      <div
        role="alert"
        className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
          isLight
            ? 'border-red-200 bg-red-50 text-red-800'
            : 'border-red-500/40 bg-red-500/10 text-red-200'
        }`}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-bold">Not saved to database</p>
          <p className="opacity-90">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
        isLight
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
      }`}
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex items-center gap-1.5 flex-wrap">
        <Database className="h-3.5 w-3.5 opacity-70" aria-hidden />
        <p className="font-bold">{ok}</p>
      </div>
    </div>
  );
};
