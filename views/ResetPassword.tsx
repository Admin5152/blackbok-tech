import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, Lock, X } from 'lucide-react';
import { useAppContext } from '../App';
import AuthService from '../lib/auth';
import { consumeAuthRedirect, urlLooksLikePasswordRecovery } from '../lib/consumeAuthRedirect';
import {
  evaluatePasswordRequirements,
  firstMissingPasswordRequirement,
  passwordRequirementsMet,
} from '../lib/passwordRequirements';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export const ResetPassword: React.FC = () => {
  const { theme, notify, navigateTo } = useAppContext();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const isDark = theme === 'dark';
  const cardText = isDark ? 'text-white' : 'text-black';
  const cardMuted = isDark ? 'text-white/50' : 'text-black/50';
  const inputBg = isDark ? 'bg-white/5 focus:bg-white/10' : 'bg-[#F5F5F5] focus:bg-white';
  const inputPh = isDark ? 'placeholder:text-white/25' : 'placeholder:text-black/25';

  const requirements = useMemo(
    () => evaluatePasswordRequirements(password, confirmPassword),
    [password, confirmPassword],
  );
  const allMet = passwordRequirementsMet(password, confirmPassword);

  useEffect(() => {
    let cancelled = false;

    const ensureRecoverySession = async () => {
      setSessionChecking(true);
      setSessionError(null);

      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setSessionError('Sign-in is temporarily unavailable. Try again later.');
          setSessionChecking(false);
        }
        return;
      }

      try {
        await consumeAuthRedirect();

        const client = getSupabaseClient();
        let { data } = await client.auth.getSession();

        if (!data.session && urlLooksLikePasswordRecovery()) {
          await new Promise((r) => setTimeout(r, 250));
          ({ data } = await client.auth.getSession());
        }

        if (cancelled) return;

        if (!data.session) {
          setSessionReady(false);
          setSessionError(
            'This reset link expired or was already used. Request a new link from Forgot password.',
          );
        } else {
          setSessionReady(true);
        }
      } catch (e) {
        console.warn(e);
        if (!cancelled) {
          setSessionReady(false);
          setSessionError(
            'Could not validate this reset link. Request a new one from Forgot password.',
          );
        }
      } finally {
        if (!cancelled) setSessionChecking(false);
      }
    };

    void ensureRecoverySession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setFormError(null);

    if (!sessionReady) {
      const msg =
        sessionError ||
        'This reset link expired or was already used. Request a new link from Forgot password.';
      setFormError(msg);
      notify(msg, 'error');
      return;
    }

    const missing = firstMissingPasswordRequirement(password, confirmPassword);
    if (missing) {
      const msg = `Still needed: ${missing}.`;
      setFormError(msg);
      notify(msg, 'error');
      return;
    }

    setIsLoading(true);
    const result = await AuthService.resetPassword(password);
    setIsLoading(false);

    if (!result.success) {
      const msg =
        AuthService.formatPasswordError(result.error) || 'Failed to reset password.';
      setFormError(msg);
      notify(msg, 'error');
      return;
    }

    notify('Password reset successful. Please login again.', 'success');
    navigateTo('/auth');
  };

  return (
    <div className={`view-transition min-h-screen w-full flex items-center justify-center p-4 lg:p-6 ${isDark ? 'bg-black' : 'bg-[#F0F0F0]'}`}>
      <div className={`w-full max-w-[560px] rounded-2xl border p-6 sm:p-8 ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-black/10'}`}>
        <button
          type="button"
          onClick={() => navigateTo('/auth')}
          className={`mb-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-colors hover:text-[#CDA032] ${cardMuted}`}
        >
          <ArrowLeft size={14} />
          Back to login
        </button>

        <h1 className={`text-2xl sm:text-3xl font-black italic uppercase tracking-tight ${cardText}`}>
          Reset Password
        </h1>
        <p className={`mt-2 text-sm ${cardMuted}`}>
          Enter a new password for your account. Meet every requirement below.
        </p>

        {sessionChecking ? (
          <p className={`mt-6 text-sm ${cardMuted}`}>Validating your reset link…</p>
        ) : sessionError ? (
          <div className="mt-6 space-y-4">
            <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>{sessionError}</p>
            <button
              type="button"
              onClick={() => navigateTo('/forgot-password')}
              className="w-full py-3.5 bg-[#CDA032] text-black font-black rounded-xl text-xs uppercase tracking-[0.15em] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Request a new link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="new-password" className={`text-xs font-bold uppercase tracking-wider ${cardMuted} block`}>
                New Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${cardMuted}`} size={18} aria-hidden />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTouched(true);
                    setFormError(null);
                  }}
                  autoComplete="new-password"
                  disabled={isLoading}
                  className={`w-full ${inputBg} rounded-xl pl-11 pr-12 py-3 text-sm font-medium outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText} disabled:opacity-50`}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded ${cardMuted} hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] transition-colors disabled:opacity-50`}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className={`text-xs font-bold uppercase tracking-wider ${cardMuted} block`}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${cardMuted}`} size={18} aria-hidden />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setTouched(true);
                    setFormError(null);
                  }}
                  autoComplete="new-password"
                  disabled={isLoading}
                  className={`w-full ${inputBg} rounded-xl pl-11 pr-12 py-3 text-sm font-medium outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText} disabled:opacity-50`}
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  disabled={isLoading}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded ${cardMuted} hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] transition-colors disabled:opacity-50`}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <ul
              className={`rounded-xl border p-3 space-y-2 ${
                isDark ? 'border-white/10 bg-white/[0.03]' : 'border-black/10 bg-black/[0.02]'
              }`}
              aria-label="Password requirements"
            >
              {requirements.map((req) => {
                const showState = touched || password.length > 0 || confirmPassword.length > 0;
                const ok = req.met;
                return (
                  <li
                    key={req.id}
                    className={`flex items-center gap-2 text-xs font-medium ${
                      !showState
                        ? cardMuted
                        : ok
                          ? isDark
                            ? 'text-emerald-400'
                            : 'text-emerald-700'
                          : isDark
                            ? 'text-red-300'
                            : 'text-red-700'
                    }`}
                  >
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${
                        !showState
                          ? isDark
                            ? 'bg-white/10'
                            : 'bg-black/10'
                          : ok
                            ? 'bg-emerald-500/20'
                            : 'bg-red-500/15'
                      }`}
                      aria-hidden
                    >
                      {showState ? (
                        ok ? (
                          <Check size={10} strokeWidth={3} />
                        ) : (
                          <X size={10} strokeWidth={3} />
                        )
                      ) : null}
                    </span>
                    <span>
                      {req.label}
                      {showState && !ok ? ' — still needed' : ''}
                    </span>
                  </li>
                );
              })}
            </ul>

            {formError && (
              <p
                role="alert"
                className={`text-sm rounded-xl px-3 py-2 ${
                  isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-800'
                }`}
              >
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || (touched && !allMet)}
              className="w-full py-3.5 bg-[#CDA032] text-black font-black rounded-xl text-xs uppercase tracking-[0.15em] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
