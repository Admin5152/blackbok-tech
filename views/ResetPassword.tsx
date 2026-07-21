import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { useAppContext } from '../App';
import AuthService from '../lib/auth';
import { consumeAuthRedirect, urlLooksLikePasswordRecovery } from '../lib/consumeAuthRedirect';
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

  const isDark = theme === 'dark';
  const cardText = isDark ? 'text-white' : 'text-black';
  const cardMuted = isDark ? 'text-white/50' : 'text-black/50';
  const inputBg = isDark ? 'bg-white/5 focus:bg-white/10' : 'bg-[#F5F5F5] focus:bg-white';
  const inputPh = isDark ? 'placeholder:text-white/25' : 'placeholder:text-black/25';

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
        // Re-consume in case boot raced or the user landed directly on this route.
        await consumeAuthRedirect();

        const client = getSupabaseClient();
        let { data } = await client.auth.getSession();

        // Brief retry — detectSessionInUrl / exchange can finish a tick late.
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

    if (!sessionReady) {
      notify(
        sessionError ||
          'This reset link expired or was already used. Request a new link from Forgot password.',
        'error',
      );
      return;
    }

    if (password.length < 6) {
      notify('Password must be at least 6 characters.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      notify('Passwords do not match.', 'error');
      return;
    }

    setIsLoading(true);
    const result = await AuthService.resetPassword(password);
    setIsLoading(false);

    if (!result.success) {
      notify(AuthService.formatPasswordError(result.error) || 'Failed to reset password.', 'error');
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
          Enter a new password for your account.
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
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                  onChange={(e) => setPassword(e.target.value)}
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={isLoading}
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
