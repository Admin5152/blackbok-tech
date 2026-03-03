import React, { useState } from 'react';
import type { User } from "../interface/interface"
import { users } from "../data/userInfo";
import { signIn, signUp, getUserProfile } from '../lib/api';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useAppContext } from '../App';

interface AuthProps {
  setUser: (user: User) => void;
  navigateTo: (view: string) => void;
}

/** Gridline spacing: all divisions align to 24px padding; sections end at same boundaries. */
export const Auth: React.FC<AuthProps> = ({ setUser, navigateTo }) => {
  const { theme, setTheme } = useAppContext();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for admin credentials (no account creation)
    if (formData.email === 'BlackBox@gmail.com' && formData.password === 'BlackBox') {
      // Create admin user object for session only
      const adminUser: User = {
        id: 'admin-001',
        name: 'Admin User',
        email: 'BlackBox@gmail.com',
        password: 'BlackBox',
        role: 'admin'
      };
      setUser(adminUser);
      navigateTo('/admin');
      return;
    }
    
    try {
      if (mode === "login") {
        if (!formData.email || !formData.password){
          alert("All Fields are Required!!");
          return;
        }

        // Check against local static users list first
        const localUser = users.find(
          (u) => u.email === formData.email && u.password === formData.password
        );

        if (localUser) {
          setUser(localUser);
          navigateTo("home");
          return;
        }

        const { user } = await signIn(formData.email, formData.password);
        
        if (user) {
          const profile = await getUserProfile(user.id);
          const userObj: User = {
            id: user.id,
            name: profile?.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            password: formData.password,
            role: profile?.role || 'user'
          };
          setUser(userObj);
          navigateTo('home');
        }
      }
      else if (mode === "signup") {
        if (!formData.name || !formData.email || !formData.password){
          alert("All Fields are Required!!");
          return;
        }

        const { user } = await signUp(formData.email, formData.password);
        
        if (user) {
          const profile = await getUserProfile(user.id);
          const userObj: User = {
            id: user.id,
            name: formData.name,
            email: user.email || '',
            password: formData.password,
            role: profile?.role || 'user'
          };
          alert("Account created successfully");
          setUser(userObj);
          navigateTo("home");
        }
      }
    } catch (error: any) {
      alert(error.message || "Authentication failed");
    }
  };

  

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
                  <>Login <br /><span className="text-[#CDA032]">Page</span></>
                ) : (
                  <>Sign <br /><span className="text-[#CDA032]">Up</span></>
                )}
              </h1>
              <p className={`text-sm font-light italic leading-snug max-w-xs ${leftMuted}`}>
                {mode === 'login'
                  ? 'Start your journey now with us and access the elite hardware repository.'
                  : 'Create your account and join the elite hardware repository.'}
              </p>
            </div>
            <p className={`text-[9px] font-black uppercase tracking-[0.35em] italic mt-4 ${leftMutedFoot}`}>
              AUTHORIZED TERMINAL // EST. KUMASI
            </p>
          </div>

          {/* Vertical divider — gridline */}
          <div className={`hidden lg:block w-px flex-shrink-0 ${dividerColor} self-stretch`} style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

          {/* RIGHT: Form — same padding so headers/footers align with left */}
          <div className={`lg:w-[55%] ${rightBg} flex flex-col p-6 ${cardText}`}>
            <div className="mb-4">
              <h2 className="text-lg font-black italic tracking-tighter uppercase">
                {mode === 'login' ? 'Login to your account' : 'Create an account'}
              </h2>
              <p className={`text-[10px] font-black uppercase tracking-widest ${cardMuted} mt-0.5 italic`}>
                {mode === 'login' ? 'Welcome back to Blackbox' : 'Establish your new tech identity'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5 flex-1 min-h-0 flex flex-col">
              {mode === 'signup' && (
                <div className="space-y-1">
                  <label htmlFor="auth-name" className={`text-[10px] font-black uppercase tracking-widest ${cardMuted} ml-1 block`}>Name</label>
                  <div className="relative">
                    <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${cardMuted}`} size={16} aria-hidden />
                    <input
                      id="auth-name"
                      type="text"
                      name="name"
                      required={mode === 'signup'}
                      value={formData.name}
                      onChange={handleInputChange}
                      autoComplete="name"
                    className={`w-full glow-border ${inputBg} rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText}`}
                      placeholder="Your name"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label htmlFor="auth-email" className={`text-[10px] font-black uppercase tracking-widest ${cardMuted} ml-1 block`}>Email</label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${cardMuted}`} size={16} aria-hidden />
                  <input
                    id="auth-email"
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    autoComplete="email"
                  className={`w-full glow-border ${inputBg} rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText}`}
                    placeholder="identity@blackbox.gh"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="auth-password" className={`text-[10px] font-black uppercase tracking-widest ${cardMuted} ml-1 block`}>Password</label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${cardMuted}`} size={16} aria-hidden />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`w-full glow-border ${inputBg} rounded-xl pl-9 pr-9 py-2.5 text-sm font-bold outline-none focus:border-[#CDA032] focus:ring-2 focus:ring-[#CDA032]/20 transition-all ${inputPh} ${cardText}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded ${cardMuted} hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] transition-colors`}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
              className="w-full  py-3 bg-[#CDA032] text-black font-black rounded-xl text-xs uppercase tracking-[0.15em] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] focus-visible:ring-offset-2"
              >
                {mode === 'login' ? 'Login now' : 'Create account'}
              </button>
            </form>

            <div className="pt-4 mt-auto border-t flex-shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
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
