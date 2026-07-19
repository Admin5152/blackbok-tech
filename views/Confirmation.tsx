import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mail, CheckCircle, ArrowLeft, RefreshCw, Clock } from 'lucide-react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { EmailConfirmationService, type EmailConfirmationStatus } from '../lib/emailConfirmation';
import type { User } from '../types';
import AuthService from '../lib/auth';
import { normalizeCanonicalRole } from '../lib/roles';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { peekReturnTo, resolveReturnTo } from '../lib/returnTo';

interface ConfirmationProps {
  theme: 'light' | 'dark';
  navigateTo: (view: string, second?: string | { search?: Record<string, unknown> }) => void;
  notify?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  email?: string;
  setUser?: (u: User | null) => void;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const AUTH_FLASH_KEY = 'auth.flash';

export const Confirmation: React.FC<ConfirmationProps> = ({ theme, navigateTo, notify, email, setUser }) => {
  // Auth route search is validated in App.tsx, but `useNavigate()` here is not
  // inferred with that shape — use `navigateTo` for `/auth?` flows (typed as loose search).
  const location = useLocation();
  const navigate = useNavigate();
  const isEmailConfirmPage = location.pathname === '/emailconfirm';
  const [confirmationStatus, setConfirmationStatus] = useState<EmailConfirmationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [pollExpired, setPollExpired] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectedRef = useRef(false);

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-black' : 'bg-[#F0F0F0]';
  const cardClass = isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-black/10';
  const textClass = isDark ? 'text-white' : 'text-black';
  const mutedClass = isDark ? 'text-white/60' : 'text-black/60';
  const buttonClass = 'bg-[#CDA032] text-black hover:bg-[#B38B21]';

  const flashAuthMessage = (message: string) => {
    try {
      sessionStorage.setItem(AUTH_FLASH_KEY, JSON.stringify({ type: 'success', message }));
    } catch {
      // sessionStorage unavailable
    }
  };

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const trySessionVerifiedLogin = useCallback(async (): Promise<boolean> => {
    if (!setUser || !isSupabaseConfigured()) return false;
    try {
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      const su = session?.user;
      if (!su?.email_confirmed_at) return false;
      const sessionEmail = (su.email || '').trim().toLowerCase();
      const target = (email || '').trim().toLowerCase();
      if (target && sessionEmail !== target) return false;

      const authUser = await AuthService.getCurrentUser();
      if (!authUser) return false;

      const resolvedRole = normalizeCanonicalRole(authUser.role ?? 'user') as User['role'];
      setUser({
        id: authUser.id,
        name: authUser.name || 'User',
        email: authUser.email,
        role: resolvedRole,
      });
      return true;
    } catch (e) {
      console.warn('[Confirmation] trySessionVerifiedLogin:', e);
      return false;
    }
  }, [email, setUser]);

  const afterEmailMarkedConfirmed = useCallback(async () => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    clearTimers();
    setMonitoringActive(false);

    const loggedIn = await trySessionVerifiedLogin();
    if (loggedIn) {
      if (!isEmailConfirmPage) {
        setConfirmationStatus({
          isEmailConfirmed: true,
          email: email || '',
          needsConfirmation: false,
        });
      }
      notify?.('Email verified. Welcome!', 'success');
      navigate({ to: '/' });
      return;
    }

    flashAuthMessage('Email confirmed! Please sign in to continue.');
    notify?.('Email confirmed! Please sign in to continue.', 'success');
    const back = peekReturnTo();
    navigateTo('/auth', {
      search: {
        message: 'Email confirmed! Please sign in to continue.',
        ...(back ? { returnTo: back } : {}),
      },
    });
  }, [email, isEmailConfirmPage, navigate, navigateTo, notify, trySessionVerifiedLogin]);

  const goToAuthPage = async () => {
    const loggedIn = await trySessionVerifiedLogin();
    if (loggedIn) {
      notify?.('Signed in. Welcome!', 'success');
      navigate({ to: (resolveReturnTo() ?? '/') as any });
      return;
    }
    flashAuthMessage('Account verified. Please sign in to continue.');
    const back = peekReturnTo();
    navigateTo('/auth', {
      search: {
        message: 'Account verified. Please sign in to continue.',
        ...(back ? { returnTo: back } : {}),
      },
    });
  };

  // After Supabase processes the redirect URL, try to sign the user in if the
  // session is already verified (same browser as the email click).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise<void>((r) => {
        requestAnimationFrame(() => r());
      });
      if (cancelled) return;
      const loggedIn = await trySessionVerifiedLogin();
      if (cancelled || !loggedIn) return;
      notify?.('Email verified. Welcome!', 'success');
      navigate({ to: (resolveReturnTo() ?? '/') as any });
    })();
    return () => {
      cancelled = true;
    };
  }, [email, isEmailConfirmPage, navigate, notify, trySessionVerifiedLogin]);

  useEffect(() => {
    if (isEmailConfirmPage) return;
    if (!email) return;
    if (confirmationStatus?.isEmailConfirmed) return;
    if (pollExpired) return;

    clearTimers();
    setMonitoringActive(true);

    const tick = async () => {
      const status = await EmailConfirmationService.checkEmailConfirmationByEmail(email);
      if (status?.isEmailConfirmed) {
        setConfirmationStatus(status);
        await afterEmailMarkedConfirmed();
      }
    };

    intervalRef.current = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setMonitoringActive(false);
      setPollExpired(true);
      console.log('[Confirmation] Polling stopped after timeout');
    }, POLL_TIMEOUT_MS);

    return () => {
      clearTimers();
      setMonitoringActive(false);
    };
  }, [email, confirmationStatus?.isEmailConfirmed, pollExpired, isEmailConfirmPage, afterEmailMarkedConfirmed]);

  const handleCheckStatus = async () => {
    if (!email || isChecking) return;
    setIsChecking(true);
    try {
      const status = await EmailConfirmationService.checkEmailConfirmationByEmail(email);
      if (status?.isEmailConfirmed) {
        setConfirmationStatus(status);
        redirectedRef.current = false;
        await afterEmailMarkedConfirmed();
        return;
      }
      setConfirmationStatus({
        isEmailConfirmed: false,
        email,
        needsConfirmation: true,
      });
      notify?.(
        'Still awaiting verification. Open the confirmation link in this browser, then try again — or sign in if you already verified.',
        'info'
      );
    } catch (error: unknown) {
      console.error('Error checking confirmation status:', error);
      const msg = error instanceof Error ? error.message : 'Could not check status. Please try again.';
      notify?.(msg, 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    try {
      const result = await EmailConfirmationService.resendConfirmationEmail(email);
      if (result.success) {
        notify?.(`Confirmation email re-sent to ${email}.`, 'success');
        setPollExpired(false);
      } else {
        notify?.(result.error || 'Failed to resend confirmation email.', 'error');
      }
    } catch (error: unknown) {
      console.error('Error resending confirmation email:', error);
      const msg = error instanceof Error ? error.message : 'Failed to resend confirmation email.';
      notify?.(msg, 'error');
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <div className={`view-transition min-h-screen w-full flex items-center justify-center p-4 lg:p-6 overflow-auto ${bgClass}`}>
      <div className={`w-full max-w-md mx-auto rounded-2xl border shadow-2xl p-8 ${cardClass}`}>
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full ${isDark ? 'bg-[#CDA032]/20' : 'bg-[#CDA032]/10'} flex items-center justify-center`}>
            <Mail className={`w-10 h-10 ${isDark ? 'text-[#CDA032]' : 'text-[#CDA032]'}`} />
          </div>
        </div>

        <div className="text-center space-y-4">
          <h1 className={`text-2xl font-black ${textClass}`}>
            {isEmailConfirmPage ? 'Account Verified' : 'Check Your Email'}
          </h1>

          <p className={`${mutedClass} leading-relaxed`}>
            {isEmailConfirmPage
              ? 'Your account has been verified. Use Go to Login to sign in, or stay on this page — we sign you in automatically when this is the same browser you used to open the confirmation link.'
              : "We've sent a confirmation email to:"}
          </p>

          {!isEmailConfirmPage && email && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`}>
              <p className={`font-medium ${textClass}`}>{email}</p>
            </div>
          )}

          {!isEmailConfirmPage && (
            <p className={`${mutedClass} text-sm leading-relaxed`}>
              Click the confirmation link in the email to activate your account and complete your registration.
            </p>
          )}
        </div>

        {!isEmailConfirmPage && confirmationStatus && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              confirmationStatus.isEmailConfirmed
                ? isDark
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-green-50 border border-green-200'
                : isDark
                  ? 'bg-white/5'
                  : 'bg-black/5'
            } space-y-3`}
          >
            <div className="flex items-center gap-3">
              {confirmationStatus.isEmailConfirmed ? (
                <>
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <p className={`font-medium ${textClass} text-sm`}>Email verified</p>
                    <p className={`${mutedClass} text-xs mt-1`}>Signing you in or redirecting to login…</p>
                  </div>
                </>
              ) : (
                <>
                  <Clock className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  <div>
                    <p className={`font-medium ${textClass} text-sm`}>Awaiting Verification</p>
                    <p className={`${mutedClass} text-xs mt-1`}>Click the link in your email to verify</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {!isEmailConfirmPage && monitoringActive && !confirmationStatus?.isEmailConfirmed && (
          <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                Checking if verification link has been clicked...
              </p>
            </div>
          </div>
        )}

        {!isEmailConfirmPage && pollExpired && !confirmationStatus?.isEmailConfirmed && (
          <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`}>
            <p className={`text-xs ${mutedClass}`}>
              Auto-check paused after 5 minutes. Resend the email or click &quot;Check Status&quot; to look again.
            </p>
          </div>
        )}

        {!isEmailConfirmPage && (
          <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'} space-y-3`}>
            <div className="flex items-start gap-3">
              <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-[#CDA032]' : 'text-[#CDA032]'}`} />
              <div>
                <p className={`font-medium ${textClass} text-sm`}>Check your inbox</p>
                <p className={`${mutedClass} text-xs mt-1`}>Look for an email from BlackBox</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-[#CDA032]' : 'text-[#CDA032]'}`} />
              <div>
                <p className={`font-medium ${textClass} text-sm`}>Click the link</p>
                <p className={`${mutedClass} text-xs mt-1`}>Click the confirmation link in the email</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-[#CDA032]' : 'text-[#CDA032]'}`} />
              <div>
                <p className={`font-medium ${textClass} text-sm`}>Login to your account</p>
                <p className={`${mutedClass} text-xs mt-1`}>After confirmation, you can login to BlackBox</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => void goToAuthPage()}
            className={`w-full py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${buttonClass}`}
          >
            Go to Login
          </button>

          {!isEmailConfirmPage && (
            <>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isResending || !email}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  isResending || !email ? `${mutedClass} cursor-not-allowed` : `${mutedClass} hover:${textClass}`
                }`}
              >
                <RefreshCw size={16} className={isResending ? 'animate-spin' : ''} />
                {isResending ? 'Sending...' : 'Resend Confirmation Email'}
              </button>

              <button
                type="button"
                onClick={() => void handleCheckStatus()}
                disabled={isChecking || !email}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  isChecking || !email ? `${mutedClass} cursor-not-allowed` : `${mutedClass} hover:${textClass}`
                }`}
              >
                {isChecking ? 'Checking...' : 'Check Status'}
              </button>
            </>
          )}
        </div>

        {!isEmailConfirmPage && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className={`inline-flex items-center gap-2 ${mutedClass} hover:${textClass} transition-colors text-sm`}
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
