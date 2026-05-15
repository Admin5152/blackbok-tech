import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import AuthService from '../lib/auth';
import { useAppContext } from '../App';

export const ForgotPassword: React.FC = () => {
  const { theme, notify, navigateTo } = useAppContext();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isDark = theme === 'dark';
  const cardText = isDark ? 'text-white' : 'text-black';
  const cardMuted = isDark ? 'text-white/50' : 'text-black/50';
  const inputBg = isDark ? 'bg-white/5 focus:bg-white/10' : 'bg-[#F5F5F5] focus:bg-white';
  const inputPh = isDark ? 'placeholder:text-white/25' : 'placeholder:text-black/25';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.includes('@')) {
      notify('Please enter a valid email address.', 'error');
      return;
    }

    setIsLoading(true);
    const result = await AuthService.requestPasswordReset(email.trim());
    setIsLoading(false);

    if (!result.success) {
      notify(
        AuthService.formatPasswordResetRequestError(result.error) || 'Unable to send reset email.',
        'error'
      );
      return;
    }

    setIsSubmitted(true);
    notify('Password reset email sent. Check your inbox.', 'success');
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
          Forgot Password
        </h1>
        <p className={`mt-2 text-sm ${cardMuted}`}>
          Enter your account email and we will send you a password reset link.
        </p>

        {isSubmitted ? (
          <div className={`mt-6 rounded-xl p-4 text-sm ${isDark ? 'bg-white/5 text-white/80' : 'bg-black/[0.04] text-black/70'}`}>
            If an account exists for <span className="font-semibold">{email}</span>, a reset email has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="reset-email" className={`text-xs font-bold uppercase tracking-wider ${cardMuted} block`}>
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${cardMuted}`}
                  size={18}
                  aria-hidden
                />
                <input
                  id="reset-email"
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                  className={`w-full ${inputBg} rounded-xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText} disabled:opacity-50`}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#CDA032] text-black font-black rounded-xl text-xs uppercase tracking-[0.15em] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
