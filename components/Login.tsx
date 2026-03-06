import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import AuthService, { type LoginCredentials, type AuthResponse } from '../lib/auth';
import type { User } from '../interface/interface';

interface LoginProps {
  setUser: (user: User | null) => void;
  navigateTo: (view: string) => void;
  theme: 'light' | 'dark';
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const Login: React.FC<LoginProps> = ({ setUser, navigateTo, theme, notify }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

        // Convert AuthUser to User format for compatibility
        const user: User = {
          id: response.user.id,
          name: response.user.name || 'User',
          email: response.user.email,
          password: formData.password, // Keep password for compatibility
          role: response.user.role || 'user'
        };

        console.log('Final user object:', user);
        setUser(user);
        notify(`Login successful! Welcome back, ${user.name}!`, 'success');

        // Navigate based on role
        if (user.role === 'admin') {
          console.log('Navigating to admin panel');
          navigateTo('admin');
        } else {
          console.log('Navigating to home');
          navigateTo('home');
        }
      } else {
        console.error('Authentication failed:', response.error);
        notify(response.error || 'Login failed. Please try again.', 'error');
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
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
          </>
        )}
      </button>

      {/* Admin Access Info */}
      <div className={`text-xs ${cardMuted} text-center space-y-1`}>
        <div className="flex items-center justify-center gap-2">
          <AlertCircle size={12} />
          <span>Admin Access: BlackBox@gmail.com</span>
        </div>
      </div>
    </form>
  );
};
