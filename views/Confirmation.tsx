import React, { useEffect, useRef, useState } from 'react';
import { Mail, CheckCircle, ArrowLeft, RefreshCw, Clock } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';
import { EmailConfirmationService, type EmailConfirmationStatus } from '../lib/emailConfirmation';

interface ConfirmationProps {
  theme: 'light' | 'dark';
  navigateTo: (view: string) => void;
  notify?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  email?: string;
}

// Total time we'll keep auto-polling on the confirmation screen before
// giving up. Keeps the QA expectation (CONF-08) and avoids leaking timers
// when the user walks away from the tab.
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

// sessionStorage key the Login screen reads to surface a toast after the
// hash-router redirect from /confirmation -> /auth (CONF-03). We avoid
// passing the message through the URL because hash routing strips
// query-strings off `window.location.search`.
const AUTH_FLASH_KEY = 'auth.flash';

export const Confirmation: React.FC<ConfirmationProps> = ({ theme, navigateTo, notify, email }) => {
  const location = useLocation();
  const isEmailConfirmPage = location.pathname === '/emailconfirm';
  const [confirmationStatus, setConfirmationStatus] = useState<EmailConfirmationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [pollExpired, setPollExpired] = useState(false);

  // Refs let us guarantee single-instance cleanup of interval/timeout
  // regardless of how many times the effect re-renders.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectedRef = useRef(false);

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-black' : 'bg-[#F0F0F0]';
  const cardClass = isDark
    ? 'bg-[#0a0a0a] border-white/10'
    : 'bg-white border-black/10';
  const textClass = isDark ? 'text-white' : 'text-black';
  const mutedClass = isDark ? 'text-white/60' : 'text-black/60';
  const buttonClass = 'bg-[#CDA032] text-black hover:bg-[#B38B21]';

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

  // Hand off the success message via sessionStorage so it survives the
  // hash-routed navigation to /auth (CONF-03).
  const redirectToLoginConfirmed = () => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    clearTimers();
    setMonitoringActive(false);
    try {
      sessionStorage.setItem(
        AUTH_FLASH_KEY,
        JSON.stringify({ type: 'success', message: 'Email confirmed! Please login to continue.' })
      );
    } catch {
      // sessionStorage may be unavailable (private mode, SSR) - fall back to URL param.
    }
    notify?.('Email confirmed! Please login to continue.', 'success');
    navigateTo('/auth?message=' + encodeURIComponent('Email confirmed! Please login to continue.'));
  };

  // One-shot URL detection on mount (handles the case where the user lands
  // back here via the Supabase confirmation link).
  useEffect(() => {
    const urlCheck = EmailConfirmationService.checkConfirmationClickFromUrl();
    if (urlCheck.confirmed) {
      redirectToLoginConfirmed();
    }
    // intentionally only runs once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single source of truth for polling. Replaces the two duplicate
  // pollers + startMonitoring() that previously leaked intervals (CONF-08).
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
        redirectToLoginConfirmed();
      }
    };

    intervalRef.current = setInterval(tick, POLL_INTERVAL_MS);
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
  }, [email, confirmationStatus?.isEmailConfirmed, pollExpired, isEmailConfirmPage]);

  // Manual "Check Status" handler. Always surfaces feedback to the user
  // even if Supabase can't read the user (the expected state pre-confirm),
  // fixing the "button does nothing" perception (CONF-05).
  const handleCheckStatus = async () => {
    if (!email || isChecking) return;
    setIsChecking(true);
    try {
      const status = await EmailConfirmationService.checkEmailConfirmationByEmail(email);
      if (status?.isEmailConfirmed) {
        setConfirmationStatus(status);
        redirectToLoginConfirmed();
        return;
      }
      // Fallback: render an "awaiting verification" card so the user sees
      // something change after clicking. The real Supabase user object
      // isn't reachable from the public anon client until they sign in.
      setConfirmationStatus({
        isEmailConfirmed: false,
        email,
        needsConfirmation: true,
      });
      notify?.('Still awaiting verification. Please click the link in your inbox.', 'info');
    } catch (error: any) {
      console.error('Error checking confirmation status:', error);
      notify?.(error?.message || 'Could not check status. Please try again.', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  // Resend handler now surfaces both success and failure (CONF-04).
  const handleResendEmail = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    try {
      const result = await EmailConfirmationService.resendConfirmationEmail(email);
      if (result.success) {
        notify?.(`Confirmation email re-sent to ${email}.`, 'success');
        // Restart monitoring if it had timed out.
        setPollExpired(false);
      } else {
        notify?.(result.error || 'Failed to resend confirmation email.', 'error');
      }
    } catch (error: any) {
      console.error('Error resending confirmation email:', error);
      notify?.(error?.message || 'Failed to resend confirmation email.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  // Final cleanup on unmount (defensive — the polling effect already
  // handles this, but covers the auto-redirect path too).
  useEffect(() => () => clearTimers(), []);

  return (
    <div className={`view-transition min-h-screen w-full flex items-center justify-center p-4 lg:p-6 overflow-auto ${bgClass}`}>
      <div className={`w-full max-w-md mx-auto rounded-2xl border shadow-2xl p-8 ${cardClass}`}>
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full ${isDark ? 'bg-[#CDA032]/20' : 'bg-[#CDA032]/10'} flex items-center justify-center`}>
            <Mail className={`w-10 h-10 ${isDark ? 'text-[#CDA032]' : 'text-[#CDA032]'}`} />
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="text-center space-y-4">
          <h1 className={`text-2xl font-black ${textClass}`}>
            {isEmailConfirmPage ? 'Account Verified' : 'Check Your Email'}
          </h1>

          <p className={`${mutedClass} leading-relaxed`}>
            {isEmailConfirmPage
              ? 'Your account has been verified. Please click on the Go to Login button to login again.'
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

        {/* Status Display */}
        {!isEmailConfirmPage && confirmationStatus && (
          <div className={`mt-6 p-4 rounded-lg ${
            confirmationStatus.isEmailConfirmed
              ? isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'
              : isDark ? 'bg-white/5' : 'bg-black/5'
          } space-y-3`}>
            <div className="flex items-center gap-3">
              {confirmationStatus.isEmailConfirmed ? (
                <>
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <p className={`font-medium ${textClass} text-sm`}>Verification Link Clicked</p>
                    <p className={`${mutedClass} text-xs mt-1`}>Redirecting you to login page...</p>
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

        {/* Monitoring Status */}
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

        {/* Poll timeout notice */}
        {!isEmailConfirmPage && pollExpired && !confirmationStatus?.isEmailConfirmed && (
          <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`}>
            <p className={`text-xs ${mutedClass}`}>
              Auto-check paused after 5 minutes. Resend the email or click "Check Status" to look again.
            </p>
          </div>
        )}

        {/* Instructions */}
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

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigateTo('/auth')}
            className={`w-full py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${buttonClass}`}
          >
            Go to Login
          </button>

          {!isEmailConfirmPage && (
            <>
              <button
                onClick={handleResendEmail}
                disabled={isResending || !email}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  isResending || !email
                    ? `${mutedClass} cursor-not-allowed`
                    : `${mutedClass} hover:${textClass}`
                }`}
              >
                <RefreshCw size={16} className={isResending ? 'animate-spin' : ''} />
                {isResending ? 'Sending...' : 'Resend Confirmation Email'}
              </button>

              <button
                onClick={handleCheckStatus}
                disabled={isChecking || !email}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  isChecking || !email
                    ? `${mutedClass} cursor-not-allowed`
                    : `${mutedClass} hover:${textClass}`
                }`}
              >
                {isChecking ? 'Checking...' : 'Check Status'}
              </button>
            </>
          )}
        </div>

        {/* Back to Home */}
        {!isEmailConfirmPage && (
          <div className="mt-6 text-center">
            <button
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
