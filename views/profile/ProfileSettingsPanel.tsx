import React from 'react';
import {
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  FileText,
} from 'lucide-react';
import type { Order, RepairRequest, TradeRequest, User } from '../../types';
import { WebPushSettingsCard } from '../../components/WebPushSettingsCard';
import { Link } from '@tanstack/react-router';
import { InvoiceActions } from '../../components/invoice/InvoiceActions';
import { INVOICE_COPY } from '../../lib/invoiceFormat';

interface ProfileSettingsPanelProps {
  user: User;
  isLight: boolean;
  nameDraft: string;
  setNameDraft: (value: string) => void;
  nameSaving: boolean;
  saveDisplayName: () => void;
  settingsErr: string;
  emailVerified: boolean | null;
  verifySending: boolean;
  sendVerificationEmail: () => void;
  resetSending: boolean;
  sendPasswordResetEmail: () => void;
  openDeleteModal: () => void;
  orders?: Order[];
  repairs?: RepairRequest[];
  trades?: TradeRequest[];
  notify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type InvoiceRow = {
  key: string;
  kind: 'order' | 'repair' | 'trade';
  id: string;
  displayId?: string | null;
  label: string;
  date: string;
};

function buildRecentInvoices(
  orders: Order[],
  repairs: RepairRequest[],
  trades: TradeRequest[],
  limit = 8,
): InvoiceRow[] {
  const rows: InvoiceRow[] = [
    ...orders.map((o) => ({
      key: `o-${o.id}`,
      kind: 'order' as const,
      id: o.id,
      displayId: (o as { display_id?: string }).display_id,
      label: o.items[0]?.name || 'Order',
      date: o.date,
    })),
    ...repairs.map((r) => ({
      key: `r-${r.id}`,
      kind: 'repair' as const,
      id: r.id,
      displayId: r.display_id,
      label: r.device || 'Repair',
      date: r.date,
    })),
    ...trades.map((t) => ({
      key: `t-${t.id}`,
      kind: 'trade' as const,
      id: t.id,
      displayId: t.display_id,
      label: t.device || 'Trade-in',
      date: t.date,
    })),
  ];
  return rows
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export const ProfileSettingsPanel: React.FC<ProfileSettingsPanelProps> = ({
  user,
  isLight,
  nameDraft,
  setNameDraft,
  nameSaving,
  saveDisplayName,
  settingsErr,
  emailVerified,
  verifySending,
  sendVerificationEmail,
  resetSending,
  sendPasswordResetEmail,
  openDeleteModal,
  orders = [],
  repairs = [],
  trades = [],
  notify,
}) => {
  const recentInvoices = buildRecentInvoices(orders, repairs, trades);

  return (
    <div className="max-w-3xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div
        className={`p-8 md:p-12 rounded-[2.5rem] border ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/5 shadow-2xl'
        }`}
      >
        <div className="flex items-center justify-between mb-10">
          <h3
            className={`text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${
              isLight ? 'text-black' : 'text-white'
            }`}
          >
            <UserIcon size={28} className="text-[#B38B21]" />
            Repository Access
          </h3>
        </div>

        {settingsErr && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 ${
              isLight
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{settingsErr}</p>
          </div>
        )}

        <div className="space-y-8">
          <div className="flex flex-col gap-4 py-4 border-b border-white/5">
            <div className="space-y-1">
              <p
                className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                  isLight ? 'text-gray-500' : 'opacity-30'
                }`}
              >
                Display name
              </p>
              <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-white/50'}`}>
                Shown on orders, invoices, and your profile.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={120}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-colors ${
                  isLight
                    ? 'bg-white border-gray-200 text-black focus:border-black'
                    : 'bg-white/5 border-white/10 text-white focus:border-[#B38B21]'
                }`}
                autoComplete="name"
              />
              <button
                type="button"
                onClick={saveDisplayName}
                disabled={nameSaving || !nameDraft.trim()}
                className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#B38B21] text-black hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
              >
                {nameSaving ? 'Saving…' : 'Save name'}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 border-b border-white/5">
            <div className="space-y-1 min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                  isLight ? 'text-gray-500' : 'opacity-30'
                }`}
              >
                Email
              </p>
              <p className={`text-lg font-bold truncate ${isLight ? 'text-black' : 'text-white'}`}>
                {user.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {emailVerified === true && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 size={12} /> Verified
                  </span>
                )}
                {emailVerified === false && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    <AlertTriangle size={12} /> Not verified
                  </span>
                )}
              </div>
            </div>
            {emailVerified === false && (
              <button
                type="button"
                onClick={sendVerificationEmail}
                disabled={verifySending}
                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                  isLight
                    ? 'border-black/15 bg-white hover:bg-gray-50 text-black'
                    : 'border-white/15 bg-white/5 hover:bg-white/10 text-white'
                }`}
              >
                {verifySending ? 'Sending…' : 'Resend verification'}
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 border-b border-white/5">
            <div className="space-y-1">
              <p
                className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                  isLight ? 'text-gray-500' : 'opacity-30'
                }`}
              >
                Password
              </p>
              <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-white/50'}`}>
                We will email you a secure link to set a new password.
              </p>
            </div>
            <button
              type="button"
              onClick={sendPasswordResetEmail}
              disabled={resetSending}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#B38B21] hover:text-black hover:border-[#B38B21] transition-all shrink-0 disabled:opacity-40"
            >
              {resetSending ? 'Sending…' : 'Email reset link'}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <WebPushSettingsCard isLight={isLight} signedIn={Boolean(user?.id)} />
          <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
            You can also manage this under{' '}
            <Link
              to="/account/notifications"
              className="text-[#B38B21] font-bold hover:underline"
            >
              Account → Notifications
            </Link>
            .
          </p>
        </div>

        <div
          className={`mt-10 rounded-3xl border p-6 sm:p-8 space-y-5 ${
            isLight ? 'bg-white border-gray-200' : 'bg-white/[0.03] border-white/10'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h4
                className={`text-lg font-black italic uppercase tracking-tight flex items-center gap-2 ${
                  isLight ? 'text-black' : 'text-white'
                }`}
              >
                <FileText size={20} className="text-[#B38B21]" />
                {INVOICE_COPY.settingsHeading}
              </h4>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-600' : 'text-white/45'}`}>
                {INVOICE_COPY.settingsHint}
              </p>
            </div>
            <Link
              to="/history"
              className="text-[9px] font-black uppercase tracking-widest text-[#B38B21] hover:underline shrink-0"
            >
              {INVOICE_COPY.settingsViewAll}
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
              {INVOICE_COPY.settingsEmpty}
            </p>
          ) : (
            <ul className="space-y-4">
              {recentInvoices.map((row) => (
                <li
                  key={row.key}
                  className={`rounded-2xl border p-4 space-y-3 ${
                    isLight ? 'border-gray-100 bg-gray-50' : 'border-white/10 bg-black/20'
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-[9px] font-black uppercase tracking-widest ${
                        isLight ? 'text-black/40' : 'text-white/35'
                      }`}
                    >
                      {row.kind === 'order'
                        ? 'Purchase'
                        : row.kind === 'repair'
                          ? 'Repair'
                          : 'Trade-in'}
                      {row.displayId ? ` · ${row.displayId}` : ''}
                    </p>
                    <p
                      className={`text-sm font-bold truncate ${isLight ? 'text-black' : 'text-white'}`}
                    >
                      {row.label}
                    </p>
                  </div>
                  <InvoiceActions
                    kind={row.kind}
                    id={row.id}
                    displayId={row.displayId}
                    shareText={row.label}
                    isLight={isLight}
                    notify={notify}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center p-8 bg-red-600/5 border border-dashed border-red-600/20 rounded-3xl">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h4 className="text-sm font-black uppercase tracking-widest text-red-500">
                DANGER ZONE
              </h4>
            </div>
            <p
              className={`text-xs font-medium max-w-md mx-auto ${
                isLight ? 'text-red-700/80' : 'text-red-400/60'
              }`}
            >
              You can delete your account anytime. Open orders, repairs, or trade-ins (not yet
              Delivered / Completed) must be finished or cancelled first — we list them and what
              &quot;completed&quot; means before you confirm.
            </p>
            <button
              onClick={openDeleteModal}
              className="px-8 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/20"
            >
              DELETE ACCOUNT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
