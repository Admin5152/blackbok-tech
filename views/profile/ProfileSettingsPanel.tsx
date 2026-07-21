import React from 'react';
import {
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import type { User } from '../../types';
import { WebPushSettingsCard } from '../../components/WebPushSettingsCard';
import { Link } from '@tanstack/react-router';

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
}) => (
  <div className="max-w-3xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    <div className={`p-8 md:p-12 rounded-[2.5rem] border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/5 shadow-2xl'}`}>
      <div className="flex items-center justify-between mb-10">
        <h3 className={`text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${isLight ? 'text-black' : 'text-white'}`}>
          <UserIcon size={28} className="text-[#B38B21]" />
          Repository Access
        </h3>
      </div>

      {settingsErr && (
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 ${isLight ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{settingsErr}</p>
        </div>
      )}

      <div className="space-y-8">
        <div className="flex flex-col gap-4 py-4 border-b border-white/5">
          <div className="space-y-1">
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-gray-500' : 'opacity-30'}`}>Display name</p>
            <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-white/50'}`}>Shown on orders, receipts, and your profile.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={120}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-colors ${isLight ? 'bg-white border-gray-200 text-black focus:border-black' : 'bg-white/5 border-white/10 text-white focus:border-[#B38B21]'}`}
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
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-gray-500' : 'opacity-30'}`}>Email</p>
            <p className={`text-lg font-bold truncate ${isLight ? 'text-black' : 'text-white'}`}>{user.email}</p>
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
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${isLight ? 'border-black/15 bg-white hover:bg-gray-50 text-black' : 'border-white/15 bg-white/5 hover:bg-white/10 text-white'}`}
            >
              {verifySending ? 'Sending…' : 'Resend verification'}
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 border-b border-white/5">
          <div className="space-y-1">
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-gray-500' : 'opacity-30'}`}>Password</p>
            <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-white/50'}`}>We will email you a secure link to set a new password.</p>
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
          <Link to="/account/notifications" className="text-[#B38B21] font-bold hover:underline">
            Account → Notifications
          </Link>
          .
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center p-8 bg-red-600/5 border border-dashed border-red-600/20 rounded-3xl">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h4 className="text-sm font-black uppercase tracking-widest text-red-500">DANGER ZONE</h4>
          </div>
          <p className={`text-xs font-medium max-w-md mx-auto ${isLight ? 'text-red-700/80' : 'text-red-400/60'}`}>
            You can delete your account anytime. Open orders, repairs, or trade-ins (not yet Delivered /
            Completed) must be finished or cancelled first — we list them and what &quot;completed&quot; means
            before you confirm.
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
