import React, { useState, useEffect, useMemo } from 'react';
import {
  X, CheckCircle2, Activity, Scale, RefreshCcw, Home as HomeIcon,
  ShoppingBag, Wrench, ShoppingCart, User as UserIcon, LogOut,
  ChevronRight, ChevronDown, Settings, AlertTriangle,
  Sparkles, Eye, Clock, Menu, Sun, Moon, Search, TrendingUp, Box, Laptop, Smartphone, Gamepad2, History, Calendar, Info
} from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { User, CartItem, Product } from '../types';
import { formatCurrency } from '../lib/utils';

const ViewfinderLogo = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <path d="M25 40V28C25 26.3431 26.3431 25 28 25H40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M60 25H72C73.6569 25 75 26.3431 75 28V40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M75 60V72C75 73.6569 73.6569 75 72 75H60" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M40 75H28C26.3431 75 25 73.6569 25 72V60" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <rect x="38" y="44" width="24" height="12" rx="6" fill="currentColor" />
  </svg>
);

export const Navbar: React.FC<{
  cart: CartItem[];
  navigateTo: (view: string, id?: string) => void;
  user: any;
  products: Product[];
  theme: 'light' | 'dark';
  setTheme?: (t: 'light' | 'dark') => void;
  setSearchQuery?: (q: string) => void;
}> = ({
  cart,
  navigateTo,
  user,
  products = [],
  theme,
  setTheme,
  setSearchQuery: setGlobalSearchQuery
}) => {
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const cartCount = cart.reduce((a, c) => a + c.quantity, 0);
    const isLight = theme === 'light';

    useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 0);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const searchSuggestions = useMemo(() => {
      if (!searchQuery.trim()) return [];
      return products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
    }, [searchQuery, products]);

    const navItemClass = (path: string) => {
      const active = location.pathname === path;
      if (isLight) {
        return `flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ${active ? 'bg-black text-white shadow-md' : 'text-black/60 hover:text-black hover:bg-black/5'}`;
      }
      return `flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ${active ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]' : 'text-white/40 hover:text-white hover:bg-white/5 hover:shadow-[0_0_16px_rgba(205,160,50,0.5)]'}`;
    };

    return (
      <>
        <nav
          className={`sticky top-0 z-[60] h-16 sm:h-20 lg:h-24 flex items-center border-b backdrop-blur-3xl no-print transition-all duration-500 ${isLight ? 'border-black/10 bg-[#FAFAFA]/95' : 'border-white/5 bg-black/80'}`}
        >
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between gap-3">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group transition-opacity">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                <ViewfinderLogo />
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-lg font-black tracking-tighter leading-none ${isLight ? 'text-black' : 'text-white'}`}>BLACKBOX</h1>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden lg:flex items-center gap-1">
              <div className="relative group">
                <Link to="/" className={navItemClass('/')}>
                  <HomeIcon size={16} /> Home <ChevronDown size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-300" />
                </Link>

                {/* Home Dropdown */}
                <div className={`absolute top-full left-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]`}>
                  <div className={`w-56 rounded-2xl border shadow-2xl p-2 backdrop-blur-3xl ${isLight ? 'bg-white/95 border-black/5' : 'bg-[#121212]/95 border-white/5'}`}>
                    <Link
                      to="/about"
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}
                    >
                      <Info size={14} className="opacity-40" /> About BlackBox
                    </Link>
                    <Link
                      to="/policies"
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}
                    >
                      <Scale size={14} className="opacity-40" /> Policies & FAQ
                    </Link>
                  </div>
                </div>
              </div>

              {/* Products Dropdown */}
              <div className="relative group">
                <Link to="/store" className={navItemClass('/store')}>
                  <ShoppingBag size={16} /> Products <ChevronDown size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-300" />
                </Link>
                <div className={`absolute top-full left-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]`}>
                  <div className={`w-56 rounded-2xl border shadow-2xl p-2 backdrop-blur-3xl ${isLight ? 'bg-white/95 border-black/5' : 'bg-[#121212]/95 border-white/5'}`}>
                    <Link to="/store" search={{ category: 'iPhone' } as any} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <Smartphone size={14} className="opacity-40" /> iPhone
                    </Link>
                    <Link to="/store" search={{ category: 'Laptop' } as any} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <Laptop size={14} className="opacity-40" /> Laptops
                    </Link>
                    <Link to="/store" search={{ category: 'Gaming' } as any} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <Gamepad2 size={14} className="opacity-40" /> Gaming
                    </Link>
                    <Link to="/store" search={{ category: 'Accessories' } as any} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <Box size={14} className="opacity-40" /> Accessories
                    </Link>
                  </div>
                </div>
              </div>

              {/* Trades Dropdown */}
              <div className="relative group">
                <Link to="/trades" className={navItemClass('/trades')}>
                  <RefreshCcw size={16} /> Trades <ChevronDown size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-300" />
                </Link>
                <div className={`absolute top-full left-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]`}>
                  <div className={`w-56 rounded-2xl border shadow-2xl p-2 backdrop-blur-3xl ${isLight ? 'bg-white/95 border-black/5' : 'bg-[#121212]/95 border-white/5'}`}>
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl mb-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Your Trade-In Items</p>
                      {/* Placeholder for trade-in details */}
                    </div>
                    <Link to="/trades" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <RefreshCcw size={14} className="opacity-40" /> Trade-In Program
                    </Link>
                    <Link to="/history" search={{ tab: 'trades' } as any} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <History size={14} className="opacity-40" /> Trade-In History
                    </Link>
                  </div>
                </div>
              </div>

              {/* Repairs Dropdown */}
              <div className="relative group">
                <Link to="/repair" className={navItemClass('/repair')}>
                  <Wrench size={16} /> Repairs <ChevronDown size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-300" />
                </Link>
                <div className={`absolute top-full left-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]`}>
                  <div className={`w-56 rounded-2xl border shadow-2xl p-2 backdrop-blur-3xl ${isLight ? 'bg-white/95 border-black/5' : 'bg-[#121212]/95 border-white/5'}`}>
                    {/* Lab Diagnostics removed */}
                    <Link to="/repair" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <Calendar size={14} className="opacity-40" /> Schedule Repair
                    </Link>
                    <Link to="/history" search={{ tab: 'repairs' } as any} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <History size={14} className="opacity-40" /> Repair History
                    </Link>
                  </div>
                </div>
              </div>

              <Link to="/cart" className={navItemClass('/cart')}>
                <ShoppingCart size={16} /> Cart
                {cartCount > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-[9px] rounded-full ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Right Section: Account, Search, Theme, Mobile Menu */}
            <div className="flex items-center gap-2 sm:gap-4">

              {/* Account Button */}
              <Link
                to={user ? '/profile' : '/auth'}
                className={`
                hidden sm:flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest
                ${user
                    ? isLight ? 'bg-black/5 text-black border border-black/10 hover:border-black/20' : 'bg-white/5 text-white border border-white/10 hover:border-white/30'
                    : isLight ? 'bg-black text-white shadow-lg hover:bg-black/90' : 'bg-white text-black shadow-lg hover:brightness-90'}
              `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center font-black italic text-[9px] ${isLight ? 'bg-black text-white' : 'bg-[#CDA032] text-black'}`}>
                  {user ? (user.avatarLetter || user.name.charAt(0)) : <UserIcon size={12} />}
                </div>
                {user ? 'Account' : 'Sign In'}
              </Link>

              {/* Search Bar - Integrated between Account and Theme toggle */}
              <div className="relative group hidden md:block">
                <Search size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isLight ? 'text-black/30 group-focus-within:text-black' : 'text-white/20 group-focus-within:text-[#CDA032]'}`} />
                <input
                  type="text"
                  placeholder="SEARCH..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 pr-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest outline-none transition-all w-32 focus:w-56 border ${isLight
                    ? 'bg-black/5 border-black/10 text-black focus:border-black/30'
                    : 'bg-white/5 border-white/10 text-white focus:border-[#CDA032]/50'
                    }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      if (setGlobalSearchQuery) setGlobalSearchQuery(searchQuery);
                      navigateTo('store');
                      setSearchQuery("");
                    }
                  }}
                />
                {/* Search Suggestions Dropdown */}
                {searchSuggestions.length > 0 && searchQuery && (
                  <div className={`absolute top-full mt-2 right-0 w-80 border rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-3xl z-[70] ${isLight ? 'bg-white border-black/10' : 'bg-[#0a0a0a] border-white/5'}`}>
                    <div className="flex items-center justify-between mb-4 opacity-40">
                      <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><TrendingUp size={10} /> Suggestions</span>
                    </div>
                    <div className="space-y-1">
                      {searchSuggestions.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            navigateTo('product', p.id);
                            setSearchQuery("");
                            if (setGlobalSearchQuery) setGlobalSearchQuery("");
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5 group'}`}
                        >
                          <div className="w-10 h-10 bg-black/95 rounded-lg p-1.5 flex items-center justify-center">
                            <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="text-left flex-1 overflow-hidden">
                            <h4 className="text-[10px] font-black uppercase tracking-tight truncate">{p.name}</h4>
                            <p className={`text-[8px] font-bold uppercase tracking-widest opacity-40 truncate ${isLight ? '' : 'italic'}`}>{p.category}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              {setTheme && (
                <button
                  onClick={() => setTheme(isLight ? 'dark' : 'light')}
                  className={`p-2.5 rounded-full border transition-all ${isLight ? 'border-black/10 bg-black/5 text-black hover:bg-black/10' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}
                >
                  {isLight ? <Moon size={18} /> : <Sun size={18} />}
                </button>
              )}

              {/* Mobile Menu Trigger */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`lg:hidden p-2.5 rounded-full transition-all ${isLight ? 'text-black/60 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        <div
          className={`fixed inset-0 z-[100] lg:hidden transition-all duration-500 overflow-y-auto no-scrollbar ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${isLight ? 'bg-white/95 backdrop-blur-3xl' : 'bg-black/95 backdrop-blur-3xl'}`}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative min-h-screen p-6 flex flex-col pt-24 pb-12">
            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className={`absolute top-6 right-6 p-4 rounded-full border transition-all ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}
            >
              <X size={24} />
            </button>

            {/* Mobile Links */}
            <div className="flex flex-col gap-2 mt-8">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={navItemClass('/')}> <HomeIcon size={18} /> Home</Link>

              <div className="mt-4 mb-2 px-6">
                <span className={`text-[9px] font-black uppercase tracking-[0.5em] opacity-30 ${isLight ? 'text-black' : 'text-white'}`}>Hardware Repository</span>
              </div>
              <Link to="/store" onClick={() => setIsMobileMenuOpen(false)} className={navItemClass('/store')}><ShoppingBag size={18} /> Products</Link>
              <Link to="/trades" onClick={() => setIsMobileMenuOpen(false)} className={navItemClass('/trades')}><RefreshCcw size={18} /> Trade-In</Link>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl mt-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Your Trade-In Items</p>
                {/* Placeholder for trade-in details */}
              </div>
              <Link to="/repair" onClick={() => setIsMobileMenuOpen(false)} className={navItemClass('/repair')}><Wrench size={18} /> Repairs</Link>

              <div className="mt-6 mb-2 px-6">
                <span className={`text-[9px] font-black uppercase tracking-[0.5em] opacity-30 ${isLight ? 'text-black' : 'text-white'}`}>Structural Support</span>
              </div>
              <Link to="/policies" onClick={() => setIsMobileMenuOpen(false)} className={navItemClass('/policies')}><Scale size={18} /> Policies</Link>
              <Link to="/faq" onClick={() => setIsMobileMenuOpen(false)} className={navItemClass('/faq')}><Info size={18} /> Help Center</Link>

              <div className="mt-12 flex flex-col gap-4">
                <Link
                  to={user ? '/profile' : '/auth'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-center gap-3 px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest ${user ? (isLight ? 'bg-black/5 text-black' : 'bg-white/5 text-white') : (isLight ? 'bg-black text-white' : 'bg-white text-black')}`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center font-black italic text-[10px] ${isLight ? 'bg-black text-white' : 'bg-[#CDA032] text-black'}`}>
                    {user ? (user.avatarLetter || user.name.charAt(0)) : <UserIcon size={14} />}
                  </div>
                  {user ? 'Access Account' : 'Sign In Protocol'}
                </Link>

                <Link
                  to="/cart"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-center gap-3 px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest border ${isLight ? 'border-black/10' : 'border-white/10'}`}
                >
                  <ShoppingCart size={18} /> Checkout Repository ({cartCount})
                </Link>
              </div>
            </div>

            <div className="mt-auto pt-12 text-center">
              <p className={`text-[10px] font-black uppercase tracking-[0.6em] italic opacity-20`}>BlackBox Systems • v4.0.1</p>
            </div>
          </div>
        </div>
      </>
    );
  };