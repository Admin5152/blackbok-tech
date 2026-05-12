import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import AuthService, { type LoginCredentials, type AuthResponse } from '../lib/auth';
import type { User } from '../interface/interface';
import { useLocation } from '@tanstack/react-router';
import { canAccessAdminDashboard, normalizeCanonicalRole } from '../lib/roles';
import { activateResumeAfterLogin, clearResumeAfterAuth } from '../lib/resumeAfterAuth';

interface LoginProps {
  setUser: (user: User | null) => void;
  navigateTo: (view: string) => void;
  theme: 'light' | 'dark';
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  /** Switches parent Auth to Sign up and can pre-fill email after a failed login. */
  onSwitchToSignUp?: (email: string) => void;
}

export const Login: React.FC<LoginProps> = ({ setUser, navigateTo, theme, notify, onSwitchToSignUp }) => {
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  // Check for a flash message after redirects (eg. email-confirmation
  // success). We look in sessionStorage FIRST because hash routing
  // strips `?message=` off `window.location.search` — that's the bug
  // QA hit in CONF-03. The URL parser is kept as a fallback for any
  // future caller that still uses the query-string approach.
  useEffect(() => {
    const FLASH_KEY = 'auth.flash';
    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (raw) {
        sessionStorage.removeItem(FLASH_KEY);
        const parsed = JSON.parse(raw) as { type?: 'success' | 'error' | 'info' | 'warning'; message?: string };
        if (parsed?.message) {
          notify(parsed.message, parsed.type || 'success');
          return;
        }
      }
    } catch {
      // ignore corrupt JSON / unavailable storage
    }

    // Fallback: check both `?message=` AND the part of the hash after
    // `?` (TanStack hash router puts search params there).
    const readMessage = (qs: string) => {
      try {
        return new URLSearchParams(qs).get('message');
      } catch {
        return null;
      }
    };
    let message = readMessage(window.location.search);
    if (!message && window.location.hash.includes('?')) {
      message = readMessage(window.location.hash.split('?')[1] || '');
    }
    if (message) {
      notify(message, 'success');
      // Strip the query bit from the hash so a refresh doesn't re-trigger.
      if (window.location.hash.includes('?')) {
        const cleanedHash = window.location.hash.split('?')[0];
        window.history.replaceState({}, '', `${window.location.pathname}${cleanedHash}`);
      } else {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [notify]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleForgotPasswordClick = async () => {
    const email = formData.email.trim();

    // If no email is provided yet, take user to the dedicated reset page.
    if (!email) {
      navigateTo('/forgot-password');
      return;
    }

    if (!email.includes('@')) {
      notify('Enter a valid email to reset your password.', 'error');
      return;
    }

    setIsResettingPassword(true);
    const result = await AuthService.requestPasswordReset(email);
    setIsResettingPassword(false);

    if (!result.success) {
      notify(result.error || 'Failed to send reset email.', 'error');
      return;
    }

    notify('Password reset email sent. Check your inbox.', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      const validation = AuthService.validateCredentials(formData);
      console.log('Validation result:', validation);

      if (!validation.isValid) {
        notify(validation.error || 'Please check your input', 'error');
        setIsLoading(false);
        return;
      }

      // Attempt sign in
      console.log('Attempting authentication with credentials:', formData.email);
      const response: AuthResponse = await AuthService.signIn(formData);
      console.log('Authentication response:', response);

      if (response.user) {
        console.log('Authentication successful, user:', response.user);
        // Role already resolved in AuthService (DB role + optional admin-email elevation).
        const resolvedRole = normalizeCanonicalRole(response.user.role ?? 'user') as User['role'];

        // Convert AuthUser to User format for compatibility
        const user: User = {
          id: response.user.id,
          name: response.user.name || 'User',
          email: response.user.email,
          password: formData.password, // Keep password for compatibility
          role: resolvedRole
        };

        console.log('Final user object:', user);
        setUser(user);
        notify(`Login successful! Welcome back, ${user.name}!`, 'success');

        if (canAccessAdminDashboard(resolvedRole)) {
          clearResumeAfterAuth();
          console.log('Navigating to admin panel');
          navigateTo('/admin');
        } else {
          const resumed = activateResumeAfterLogin();
          if (resumed) {
            notify('Continuing where you left off.', 'success');
            if (resumed === 'trades') navigateTo('trades');
            else if (resumed === 'repair') navigateTo('repair');
            else navigateTo('home');
          } else {
            console.log('Navigating to home');
            navigateTo('home');
          }
        }
      } else {
        console.error('Authentication failed:', response.error);
        notify(AuthService.formatLoginError(response.error) || 'Login failed. Please try again.', 'error');
      }
    } catch (error: any) {
      console.error('Login component error:', error);
      notify('Login failed. An unexpected error occurred.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === 'dark';
  const cardText = isDark ? 'text-white' : 'text-black';
  const cardMuted = isDark ? 'text-white/50' : 'text-black/50';
  const inputBg = isDark ? 'bg-white/5 focus:bg-white/10' : 'bg-[#F5F5F5] focus:bg-white';
  const inputPh = isDark ? 'placeholder:text-white/25' : 'placeholder:text-black/25';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 flex-1 min-h-0 flex flex-col">
      {/* Email Field */}
      <div className="space-y-2">
        <label htmlFor="auth-email" className={`text-xs font-bold uppercase tracking-wider ${cardMuted} block`}>
          Email Address
        </label>
        <div className="relative">
          <Mail
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${cardMuted}`}
            size={18}
            aria-hidden
          />
          <input
            id="auth-email"
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            autoComplete="email"
            disabled={isLoading}
            className={`w-full ${inputBg} rounded-xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText} disabled:opacity-50`}
            placeholder="Enter your email"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="auth-password" className={`text-xs font-bold uppercase tracking-wider ${cardMuted} block`}>
          Password
        </label>
        <div className="relative">
          <Lock
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${cardMuted}`}
            size={18}
            aria-hidden
          />
          <input
            id="auth-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            required
            value={formData.password}
            onChange={handleInputChange}
            autoComplete="current-password"
            disabled={isLoading}
            className={`w-full ${inputBg} rounded-xl pl-11 pr-12 py-3 text-sm font-medium outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText} disabled:opacity-50`}
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded ${cardMuted} hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] transition-colors disabled:opacity-50`}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleForgotPasswordClick}
            disabled={isLoading || isResettingPassword}
            className={`text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-[#CDA032] disabled:opacity-50 disabled:cursor-not-allowed ${cardMuted}`}
          >
            {isResettingPassword ? 'Sending...' : 'Forgot Password?'}
          </button>
        </div>
      </div>

      <p className={`text-[11px] leading-relaxed ${cardMuted}`}>
        You need an active BlackBox account to sign in. If you are new or your account was deleted, use{' '}
        {onSwitchToSignUp ? (
          <button
            type="button"
            onClick={() => onSwitchToSignUp(formData.email.trim())}
            className="text-[#CDA032] font-bold underline-offset-2 hover:underline"
          >
            Sign up
          </button>
        ) : (
          <span className="text-[#CDA032] font-bold">Sign up</span>
        )}{' '}
        to create one first.
      </p>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 bg-[#CDA032] text-black font-black rounded-xl text-xs uppercase tracking-[0.15em] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
          </>
        )}
      </button>
    </form>
  );
};
