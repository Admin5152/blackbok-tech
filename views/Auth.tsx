import React, { useState } from 'react';
import type { User } from "../interface/interface"
import { Login } from '../components/Login';
import { SignUp } from '../components/SignUp';
import { Sun, Moon } from 'lucide-react';
import { useAppContext } from '../App';
import { PageBackButton } from '../components/PageBackButton';
import { SESSION_EXPIRED_MESSAGE, SESSION_EXPIRED_REASON } from '../lib/sessionIdleConfig';

interface AuthProps {
  setUser: (user: User | null) => void;
  navigateTo: (view: string) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  sessionReason?: string;
  returnTo?: string;
}

/** Gridline spacing: all divisions align to 24px padding; sections end at same boundaries. */
export const Auth: React.FC<AuthProps> = ({
  setUser,
  navigateTo,
  notify,
  sessionReason,
  returnTo,
}) => {
  const { theme, setTheme } = useAppContext();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signUpPrefillEmail, setSignUpPrefillEmail] = useState<string | undefined>(undefined);
  const showSessionExpired = sessionReason === SESSION_EXPIRED_REASON;

  const isDark = theme === 'dark';
  const leftBg = isDark ? 'bg-black' : 'bg-[#E8E8E8]';
  const rightBg = isDark ? 'bg-[#0f0f0f]' : 'bg-white';
  const cardBorder = isDark ? 'border-white/10' : 'border-black/10';
  const cardText = isDark ? 'text-white' : 'text-black';
  const cardMuted = isDark ? 'text-white/50' : 'text-black/50';
  const frameBorder = isDark ? 'border-white' : 'border-black';
  const inputBg = isDark ? 'bg-white/5 focus:bg-white/10' : 'bg-[#F5F5F5] focus:bg-white';
  const inputPh = isDark ? 'placeholder:text-white/25' : 'placeholder:text-black/25';
  const leftText = isDark ? 'text-white' : 'text-black';
  const leftMuted = isDark ? 'text-white/50' : 'text-black/50';
  const leftMutedFoot = isDark ? 'text-white/30' : 'text-black/30';
  const dividerColor = isDark ? 'border-white/10' : 'border-black/10';

  return (
    <div className={`view-transition flex-1 min-h-0 flex items-center justify-center p-4 lg:p-6 overflow-auto ${isDark ? 'bg-black' : 'bg-[#F0F0F0]'}`}>
      {/* Single card: gridline-based layout — all divisions end at same top/bottom/center */}
      <div className={`relative w-full max-w-[900px] overflow-hidden px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 ${isDark ? 'bg-[#0a0a0a]' : 'bg-transparent'}`}>
        <div className="absolute top-6 left-6 z-20 sm:top-8 sm:left-8">
          <PageBackButton isLight={!isDark} fallbackTo="/" />
        </div>
        {/* Corner frame border */}
        <div className="pointer-events-none absolute inset-0">
          <div className={`absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 rounded-tl-2xl ${frameBorder}`} />
          <div className={`absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 rounded-tr-2xl ${frameBorder}`} />
          <div className={`absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 rounded-bl-2xl ${frameBorder}`} />
          <div className={`absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 rounded-br-2xl ${frameBorder}`} />
        </div>
        <div className="flex flex-col lg:flex-row min-h-0">
          {/* LEFT: Brand — grid-aligned padding; content ends at same vertical as form */}
          <div className={`lg:w-[45%] ${leftBg} flex flex-col justify-between`} style={{ padding: '24px' }}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-full h-full object-contain ${leftText}`}>
                    <path d="M25 40V28C25 26.3431 26.3431 25 28 25H40" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                    <path d="M60 25H72C73.6569 25 75 26.3431 75 28V40" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                    <path d="M75 60V72C75 73.6569 73.6569 75 72 75H60" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                    <path d="M40 75H28C26.3431 75 25 73.6569 25 72V60" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                    <rect x="38" y="44" width="24" height="12" rx="6" fill="currentColor"/>
                  </svg>
                </div>
                <span className={`text-sm font-black tracking-widest uppercase italic ${leftText}`}>BLACK BOX.</span>
              </div>
              <h1 className={`text-4xl lg:text-5xl font-black italic tracking-tighter leading-[0.9] uppercase ${leftText}`}>
                {mode === 'login' ? (
                  <>Log in to <br /><span className="text-[#CDA032]">your account</span></>
                ) : (
                  <>Sign <br /><span className="text-[#CDA032]">Up</span></>
                )}
              </h1>
              <p className={`text-sm font-light italic leading-snug max-w-xs ${leftMuted}`}>
                {mode === 'login'
                  ? 'Welcome back to Blackbox. Login to your account to continue.'
                  : 'Create your account and start shopping with us.'}
              </p>
            </div>
            <p className={`text-[9px] font-black uppercase tracking-[0.35em] italic mt-4 ${leftMutedFoot}`}>
              BLACKBOX
            </p>
          </div>

          {/* Vertical divider — gridline */}
          <div className={`hidden lg:block w-px flex-shrink-0 ${dividerColor} self-stretch`} style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

          {/* RIGHT: Form — same padding so headers/footers align with left */}
          <div className={`lg:w-[55%] ${rightBg} flex flex-col p-6 ${cardText}`}>
            <div className="mb-4">
              <h2 className="text-lg font-black italic tracking-tighter uppercase">
                {mode === 'login' ? 'Login to your account' : 'Create your account'}
              </h2>
              <p className={`text-[10px] font-black uppercase tracking-widest ${cardMuted} mt-0.5 italic`}>
                {mode === 'login' ? 'Welcome back to Blackbox' : 'Create your account and start shopping with us.'}
              </p>
            </div>

            {showSessionExpired && mode === 'login' && (
              <div
                role="status"
                aria-live="polite"
                tabIndex={0}
                className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
                  isDark
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : 'border-amber-600/25 bg-amber-50 text-amber-950'
                }`}
              >
                {SESSION_EXPIRED_MESSAGE}
              </div>
            )}

            <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
              {mode === 'login' ? (
                <Login
                  setUser={setUser}
                  navigateTo={navigateTo}
                  theme={theme}
                  notify={notify}
                  returnTo={returnTo}
                  onSwitchToSignUp={(email) => {
                    setSignUpPrefillEmail(email || undefined);
                    setMode('signup');
                  }}
                />
              ) : (
                <SignUp
                  setUser={setUser}
                  navigateTo={navigateTo}
                  theme={theme}
                  notify={notify}
                  prefillEmail={signUpPrefillEmail}
                />
              )}
            </div>

            <div className="pt-4 mt-auto border-t flex-shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <button
                type="button"
                onClick={() => {
                  setSignUpPrefillEmail(undefined);
                  setMode(mode === 'login' ? 'signup' : 'login');
                }}
                className={`text-[10px] font-black uppercase tracking-widest ${cardMuted} hover:opacity-100 hover:text-[#CDA032] transition-all italic focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] rounded px-1 py-0.5`}
              >
                {mode === 'login' ? (
                  <>Don't have an account? <span className="text-[#CDA032] ml-1">Sign up</span></>
                ) : (
                  <>Already have an account? <span className="text-[#CDA032] ml-1">Log in</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
