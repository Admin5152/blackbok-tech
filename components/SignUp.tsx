import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, AlertCircle } from 'lucide-react';
import AuthService, { type LoginCredentials, type AuthResponse } from '../lib/auth';
import type { User } from '../interface/interface';

interface SignUpProps {
  setUser: (user: User | null) => void;
  navigateTo: (view: string) => void;
  theme: 'light' | 'dark';
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  /** When switching from Login after a failed attempt, pre-fill the email field. */
  prefillEmail?: string;
}

export const SignUp: React.FC<SignUpProps> = ({ setUser, navigateTo, theme, notify, prefillEmail }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    const e = prefillEmail?.trim();
    if (!e) return;
    setFormData((prev) => ({ ...prev, email: e }));
  }, [prefillEmail]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('=== SIGN UP ATTEMPT ===');
      console.log('Form data:', { name: formData.name, email: formData.email, password: '***' });

      // Validate input
      const validation = AuthService.validateCredentials({
        email: formData.email,
        password: formData.password
      });
      console.log('Validation result:', validation);

      if (!formData.name.trim()) {
        notify('Name is required', 'error');
        setIsLoading(false);
        return;
      }

      if (!validation.isValid) {
        notify(validation.error || 'Please check your input', 'error');
        setIsLoading(false);
        return;
      }

      // Attempt sign up
      console.log('Attempting registration with:', formData.email);
      const response: AuthResponse = await AuthService.signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name.trim()
      });
      console.log('Registration response:', response);

      if (response.user) {
        console.log('Registration successful, user:', response.user);

        // Show success message and redirect to confirmation page
        notify(`Registration successful! Please check your email to confirm your account.`, 'success');

        // Navigate to confirmation page with email
        console.log('Navigating to confirmation page');
        setTimeout(() => {
          try {
            // Navigate to confirmation page with email as query parameter
            navigateTo('/confirmation?email=' + encodeURIComponent(formData.email));
          } catch (error) {
            console.error('Navigation failed, trying window.location:', error);
            // Fallback navigation
            window.location.href = '/confirmation?email=' + encodeURIComponent(formData.email);
          }
        }, 100);
      } else {
        console.error('Registration failed:', response.error);
        notify(AuthService.formatSignUpError(response.error) || 'Registration failed', 'error');
      }
    } catch (error: any) {
      console.error('Sign up component error:', error);
      notify(AuthService.formatAuthError(error?.message, 'signup'), 'error');
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
      {/* Name Field */}
      <div className="space-y-2">
        <label htmlFor="auth-name" className={`text-xs font-bold uppercase tracking-wider ${cardMuted} block`}>
          Full Name
        </label>
        <div className="relative">
          <UserIcon 
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${cardMuted}`} 
            size={18} 
            aria-hidden 
          />
          <input
            id="auth-name"
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            autoComplete="name"
            disabled={isLoading}
            className={`w-full ${inputBg} rounded-xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText} disabled:opacity-50`}
            placeholder="Enter your full name"
          />
        </div>
      </div>

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
            autoComplete="new-password"
            disabled={isLoading}
            className={`w-full ${inputBg} rounded-xl pl-11 pr-12 py-3 text-sm font-medium outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText} disabled:opacity-50`}
            placeholder="Create a strong password"
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
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 bg-[#CDA032] text-black font-black rounded-xl text-xs uppercase tracking-[0.15em] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            <span>Creating Account...</span>
          </>
        ) : (
          <>
            <span>Create Account</span>
          </>
        )}
      </button>

      {/* Registration Info */}
      <div className={`text-xs ${cardMuted} text-center space-y-1`}>
        <div className="flex items-center justify-center gap-2">
          <AlertCircle size={12} />
          <span>By signing up, you agree to our terms of service</span>
        </div>
      </div>
    </form>
  );
};
