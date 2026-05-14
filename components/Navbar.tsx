import React, { useState, useEffect, useMemo } from 'react';
import {
  X, CheckCircle2, Activity, Scale, RefreshCcw, RotateCcw, Home as HomeIcon,
  ShoppingBag, Wrench, ShoppingCart, User as UserIcon, LogOut,
  ChevronRight, ChevronDown, Settings, AlertTriangle,
  Sparkles, Eye, Clock, Menu, Sun, Moon, Search, TrendingUp, Box, Laptop, Smartphone, Gamepad2, History, Calendar, Info, Heart, UserCog, Headphones, LayoutDashboard
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { User, CartItem, Product, Order, RepairRequest, TradeRequest } from '../types';
import { formatCurrency, TW_DARK_BTN_DEPTH, TW_DARK_GOLD_BTN_DEPTH } from '../lib/utils';
import { handleSignOut } from '../lib/signOut';
import { NotificationBell } from './NotificationBell';
import { canAccessAdminDashboard } from '../lib/roles';
import {
  initStoreNavBaselineIfNeeded,
  getStoreNavSeen,
  markStoreNavSectionSeen,
} from '../lib/navBadgeWatermarks';
import { scrollToDocumentTop } from '../lib/scrollToDocumentTop';
import { NavUnreadBadge } from './NavUnreadBadge';
import { useAppContext } from '../App';

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
  navigateTo: (view: string, second?: string | { search?: Record<string, unknown> }) => void;
  user: any;
  products: Product[];
  orders?: Order[];
  repairs?: RepairRequest[];
  trades?: TradeRequest[];
  theme: 'light' | 'dark';
  setTheme?: (t: 'light' | 'dark') => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  setUser?: (user: any) => void;
}> = ({
  cart,
  navigateTo,
  user,
  products = [],
  orders = [],
  repairs = [],
  trades = [],
  theme,
  setTheme,
  searchQuery: searchQueryProp,
  setSearchQuery: setSearchQueryProp,
  setUser
}) => {
    const appCtx = useAppContext();
    const applyTheme = setTheme ?? appCtx.setTheme;
    const searchQuery = searchQueryProp ?? appCtx.searchQuery;
    const setSearchQuery = setSearchQueryProp ?? appCtx.setSearchQuery;
    const location = useLocation();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeMobileSubmenu, setActiveMobileSubmenu] = useState<string | null>(null);
    const [storeBadgeTick, setStoreBadgeTick] = useState(0);

    const cartCount = cart.reduce((a, c) => a + c.quantity, 0);
    const isLight = theme === 'light';
    const showAdminLink = Boolean(user && canAccessAdminDashboard(user.role));

    const closeMobileNavAfterNav = () => {
      scrollToDocumentTop();
      setIsMobileMenuOpen(false);
      requestAnimationFrame(() => {
        scrollToDocumentTop();
      });
    };

    useEffect(() => {
      if (!user?.id) return;
      initStoreNavBaselineIfNeeded(user.id);
    }, [user?.id]);

    useEffect(() => {
      if (!user?.id) return;
      let marked = false;
      const path = location.pathname;
      const tab = new URLSearchParams(location.search).get('tab');
      if (path === '/history') {
        marked = true;
        if (tab === 'repairs') markStoreNavSectionSeen(user.id, 'repairs');
        else if (tab === 'trades') markStoreNavSectionSeen(user.id, 'trades');
        else markStoreNavSectionSeen(user.id, 'orders');
      } else if (path === '/trades') {
        marked = true;
        markStoreNavSectionSeen(user.id, 'trades');
      } else if (path === '/repair') {
        marked = true;
        markStoreNavSectionSeen(user.id, 'repairs');
      }
      if (marked) setStoreBadgeTick((t) => t + 1);
    }, [location.pathname, location.search, user?.id]);

    const storeUnread = useMemo(() => {
      if (!user?.id) return { orders: 0, repairs: 0, trades: 0 };
      void storeBadgeTick;
      const seen = getStoreNavSeen(user.id);
      const uid = user.id;
      const mine = <T extends { user_id?: string; userId?: string }>(rows: T[]) =>
        rows.filter((r) => (r.user_id || r.userId) === uid);
      const rowT = (o: { created_at?: string; date?: string }) => {
        const s = o.created_at || o.date;
        const t = s ? new Date(s).getTime() : NaN;
        return Number.isFinite(t) ? t : 0;
      };
      const sinceMs = (iso: string) => {
        const t = new Date(iso).getTime();
        return Number.isFinite(t) ? t : 0;
      };
      const countAfter = (rows: { created_at?: string; date?: string }[], iso: string) =>
        mine(rows).filter((r) => rowT(r) > sinceMs(iso)).length;
      return {
        orders: countAfter(orders, seen.orders),
        repairs: countAfter(repairs, seen.repairs),
        trades: countAfter(trades, seen.trades),
      };
    }, [user?.id, orders, repairs, trades, storeBadgeTick]);

    useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 0);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItemClass = (path: string) => {
      const active = location.pathname === path;
      if (isLight) {
        return `flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ${active ? 'bg-black text-white shadow-md' : 'text-black/60 hover:text-black hover:bg-black/5'}`;
      }
      return `flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ${active ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]' : 'text-white/40 hover:text-white hover:bg-white/5 hover:shadow-[0_0_16px_rgba(205,160,50,0.5)]'}`;
    };

    const handleCatalogSearch = (e: React.FormEvent, opts?: { closeMobile?: boolean }) => {
      e.preventDefault();
      const raw = String(searchQuery ?? '').trim();
      setSearchQuery(raw);
      navigate({ to: '/store', search: (raw ? { q: raw } : {}) as { q?: string } });
      if (opts?.closeMobile) closeMobileNavAfterNav();
    };

    return (
      <>
        <nav
          className={`sticky top-0 z-[60] h-16 sm:h-20 lg:h-24 flex items-center border-b backdrop-blur-3xl no-print transition-all duration-500 ${isLight ? 'border-black/10 bg-[#FAFAFA]/95' : 'border-white/5 bg-black/80'}`}
        >
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between gap-3">

            {/* Logo + catalog search (md+) */}
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <Link to="/" className="flex shrink-0 items-center gap-3 group transition-opacity">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                  <ViewfinderLogo />
                </div>
                <div className="hidden sm:block">
                  <h1 className={`text-lg font-black tracking-tighter leading-none ${isLight ? 'text-black' : 'text-white'}`}>BLACKBOX</h1>
                </div>
              </Link>

              <form
                onSubmit={(e) => handleCatalogSearch(e)}
                className="relative hidden min-w-0 flex-1 md:block max-w-md lg:max-w-lg xl:max-w-xl"
                role="search"
              >
                <label htmlFor="nav-catalog-search" className="sr-only">
                  Search the shop
                </label>
                <Search
                  className={`pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 sm:left-3.5 sm:h-[18px] sm:w-[18px] ${isLight ? 'text-black/35' : 'text-white/35'}`}
                  aria-hidden
                />
                <input
                  id="nav-catalog-search"
                  type="search"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search store…"
                  className={`w-full rounded-xl border py-2 pl-10 pr-24 text-sm outline-none transition placeholder:opacity-50 focus-visible:ring-2 sm:rounded-2xl sm:py-2.5 sm:pl-11 sm:text-[13px] ${
                    isLight
                      ? 'border-black/15 bg-white text-black ring-[#B38B21]/45 ring-offset-2 ring-offset-[#FAFAFA] focus-visible:border-[#B38B21]/40'
                      : 'border-white/12 bg-white/[0.06] text-white ring-[#CDA032]/50 ring-offset-2 ring-offset-black/80 focus-visible:border-white/25'
                  }`}
                />
                <button
                  type="submit"
                  className={`absolute right-1.5 top-1/2 z-[1] -translate-y-1/2 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition sm:px-4 sm:py-2 sm:text-[11px] ${TW_DARK_GOLD_BTN_DEPTH} bg-[#B38B21] text-black hover:bg-[#CDA032]`}
                >
                  Go
                </button>
              </form>
            </div>

            {/* Navigation Links */}
            <div className="hidden lg:flex items-center gap-1 shrink-0">
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

              {/* Shop dropdown */}
              <div className="relative group">
                <Link to="/store" className={navItemClass('/store')}>
                  <ShoppingBag size={16} /> Shop
                  <NavUnreadBadge count={storeUnread.orders} className="ml-0.5" title="New orders since you last checked history" />
                  <ChevronDown size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-300" />
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
                    <Link to="/store" search={{ category: 'Audio' } as any} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <Headphones size={14} className="opacity-40" /> Audio
                    </Link>
                    <div className={`my-1 h-px ${isLight ? 'bg-black/5' : 'bg-white/5'}`} />
                    <Link to="/history" search={{ tab: 'orders' } as any} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <History size={14} className="opacity-40 shrink-0" /> Track Orders
                      <NavUnreadBadge count={storeUnread.orders} className="ml-auto" title="New orders" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Trades Dropdown */}
              <div className="relative group">
                <Link to="/trades" className={navItemClass('/trades')}>
                  <RefreshCcw size={16} /> Trades
                  <NavUnreadBadge count={storeUnread.trades} className="ml-0.5" title="New trade-in activity" />
                  <ChevronDown size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-300" />
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
                      <History size={14} className="opacity-40 shrink-0" /> Trade-In History
                      <NavUnreadBadge count={storeUnread.trades} className="ml-auto" title="New trade-ins" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Repairs Dropdown */}
              <div className="relative group">
                <Link to="/repair" className={navItemClass('/repair')}>
                  <Wrench size={16} /> Repairs
                  <NavUnreadBadge count={storeUnread.repairs} className="ml-0.5" title="New repair requests" />
                  <ChevronDown size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-300" />
                </Link>
                <div className={`absolute top-full left-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]`}>
                  <div className={`w-56 rounded-2xl border shadow-2xl p-2 backdrop-blur-3xl ${isLight ? 'bg-white/95 border-black/5' : 'bg-[#121212]/95 border-white/5'}`}>
                    {/* Lab Diagnostics removed */}
                    <Link to="/repair" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <Calendar size={14} className="opacity-40" /> Schedule Repair
                    </Link>
                    <Link to="/history" search={{ tab: 'repairs' } as any} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <History size={14} className="opacity-40 shrink-0" /> Repair History
                      <NavUnreadBadge count={storeUnread.repairs} className="ml-auto" title="New repairs" />
                    </Link>
                  </div>
                </div>
              </div>

              <Link
                to="/cart"
                title={cartCount > 0 ? `Cart: ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Cart'}
                aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} item${cartCount === 1 ? '' : 's'}` : ', empty'}`}
                className={[
                  'relative hidden lg:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all',
                  location.pathname === '/cart'
                    ? isLight
                      ? 'bg-black text-white border-black shadow-md'
                      : 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                    : cartCount > 0
                      ? isLight
                        ? 'border-[#CDA032]/60 bg-[#CDA032]/15 text-black shadow-[0_0_0_1px_rgba(205,160,50,0.25)]'
                        : 'border-[#CDA032]/60 bg-[#CDA032]/15 text-[#CDA032] shadow-[0_0_0_1px_rgba(205,160,50,0.25)]'
                      : isLight
                        ? 'border-black/10 bg-black/5 text-black hover:bg-black/10'
                        : 'border-white/10 bg-white/5 text-white hover:bg-white/10',
                  TW_DARK_BTN_DEPTH,
                ].join(' ')}
              >
                <ShoppingCart size={20} strokeWidth={2.25} />
                {cartCount > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 min-h-[20px] min-w-[20px] px-1 rounded-full bg-[#CDA032] text-black text-[10px] font-black flex items-center justify-center shadow-md ring-2 ${
                      isLight ? 'ring-white' : 'ring-black/80'
                    }`}
                    aria-hidden="true"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Right Section: Account, Search, Theme, Mobile Menu */}
            <div className="flex items-center gap-2 sm:gap-4">

              {/* Notification System */}
              {user && <NotificationBell theme={theme} />}

              {showAdminLink && (
                <Link
                  to="/admin"
                  title="Open staff dashboard"
                  aria-label="Open staff dashboard"
                  className={`
                  flex shrink-0 items-center justify-center w-11 h-11 rounded-xl border transition-all
                  ${isLight ? 'border-[#B38B21]/40 bg-[#B38B21]/10 text-black hover:bg-[#B38B21]/20' : 'border-[#B38B21]/30 bg-[#B38B21]/10 text-[#CDA032] hover:bg-[#B38B21]/20'}
                `}
                >
                  <LayoutDashboard size={18} strokeWidth={2.25} />
                </Link>
              )}

              {/* Account Button */}
              <Link
                to={user ? '/profile' : '/auth'}
                className={`
                hidden sm:flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest
                ${user
                    ? isLight ? 'bg-black/5 text-black border border-black/10 hover:border-black/20' : `bg-white/5 text-white border border-white/10 hover:border-white/30 ${TW_DARK_BTN_DEPTH}`
                    : isLight ? 'bg-black text-white shadow-lg hover:bg-black/90' : `bg-white text-black shadow-lg hover:brightness-90 ${TW_DARK_GOLD_BTN_DEPTH}`}
              `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center font-black italic text-[9px] ${isLight ? 'bg-black text-white' : 'bg-[#CDA032] text-black'}`}>
                  {user ? (user.avatarLetter || user.name.charAt(0)) : <UserIcon size={12} />}
                </div>
                {user ? 'Account' : 'Sign In'}
              </Link>

              {/* Theme toggle — props or context; always visible when setter exists */}
              <button
                type="button"
                onClick={() => applyTheme(isLight ? 'dark' : 'light')}
                className={`shrink-0 p-2.5 rounded-full border transition-all ${isLight ? 'border-black/10 bg-black/5 text-black hover:bg-black/10' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'} ${TW_DARK_BTN_DEPTH}`}
                aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {isLight ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              <Link
                to="/store"
                title="Shop"
                aria-label="Open shop"
                className={[
                  'lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all',
                  isLight
                    ? 'border-black/10 bg-black/5 text-black hover:bg-[#CDA032] hover:text-black hover:border-[#CDA032]/50'
                    : 'border-white/10 bg-white/5 text-white hover:bg-[#CDA032] hover:text-black hover:border-[#CDA032]/50',
                  TW_DARK_BTN_DEPTH,
                ].join(' ')}
              >
                <ShoppingBag size={20} strokeWidth={2.25} />
              </Link>

              {/* Mobile / tablet cart — always visible below lg (desktop cart lives in the main nav row) */}
              <Link
                to="/cart"
                title={cartCount > 0 ? `Cart: ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Cart'}
                aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} item${cartCount === 1 ? '' : 's'}` : ', empty'}`}
                className={[
                  'lg:hidden relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all',
                  cartCount > 0
                    ? 'border-[#CDA032]/60 bg-[#CDA032]/15 text-black shadow-[0_0_0_1px_rgba(205,160,50,0.25)] dark:text-white'
                    : isLight
                      ? 'border-black/10 bg-black/5 text-black hover:bg-black/10'
                      : 'border-white/10 bg-white/5 text-white hover:bg-white/10',
                  TW_DARK_BTN_DEPTH,
                ].join(' ')}
              >
                <ShoppingCart size={20} strokeWidth={2.25} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-h-[20px] min-w-[20px] px-1 rounded-full bg-[#CDA032] text-black text-[10px] font-black flex items-center justify-center shadow-md ring-2 ring-white/90 dark:ring-black/80"
                    aria-hidden="true"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Trigger */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`lg:hidden p-2.5 rounded-full transition-all ${isLight ? 'text-black/60 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5'} ${TW_DARK_BTN_DEPTH}`}
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        <div
          className={`fixed inset-0 z-[100] lg:hidden transition-all duration-500 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile Navigation Drawer */}
          <div
            className={`absolute right-0 top-0 flex h-full max-h-[100dvh] min-h-0 w-80 flex-col bg-black border-l border-white/10 shadow-2xl transform transition-transform duration-500 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >

            {/* Header — cart shortcut so users always see cart without scrolling the drawer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-6">
              <span className="text-white text-sm font-black uppercase tracking-widest shrink-0">Menu</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyTheme(isLight ? 'dark' : 'light')}
                  className="flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 p-2.5 text-white transition-all hover:border-[#CDA032]/50 hover:bg-[#CDA032]/10"
                  aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {isLight ? <Moon size={18} /> : <Sun size={18} className="text-[#CDA032]" />}
                </button>
                <Link
                  to="/cart"
                  onClick={() => closeMobileNavAfterNav()}
                  className={`relative flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white hover:border-[#CDA032]/50 hover:bg-[#CDA032]/10 transition-all ${TW_DARK_BTN_DEPTH}`}
                  aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
                >
                  <ShoppingCart size={18} className="text-[#CDA032]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Cart</span>
                  {cartCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#CDA032] text-black text-[10px] font-black flex items-center justify-center">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                  aria-label="Close menu"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>

            {/* User summary — fixed; links scroll below */}
            <div className="shrink-0 border-b border-white/10 p-6">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#CDA032] to-[#B38B21] flex items-center justify-center">
                  <span className="text-black text-xl font-black italic">
                    {user ? (user.avatarLetter || user.name.charAt(0)) : 'U'}
                  </span>
                </div>

                {/* User Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold text-white">
                    {user ? user.name : 'Guest User'}
                  </h3>
                  <p className="truncate text-sm text-white/60">
                    {user ? user.email : 'Not logged in'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile: catalog search */}
            <div className="shrink-0 border-b border-white/10 px-4 py-3">
              <form onSubmit={(e) => handleCatalogSearch(e, { closeMobile: true })} className="relative" role="search">
                <label htmlFor="nav-mobile-catalog-search" className="sr-only">
                  Search shop
                </label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden />
                <input
                  id="nav-mobile-catalog-search"
                  type="search"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search store…"
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-16 text-sm text-white outline-none placeholder:text-white/35 focus-visible:border-[#CDA032]/50 focus-visible:ring-1 focus-visible:ring-[#CDA032]/40"
                />
                <button
                  type="submit"
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#B38B21] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-black ${TW_DARK_GOLD_BTN_DEPTH}`}
                >
                  Go
                </button>
              </form>
            </div>

            {/* Navigation — scrollable so Sign out stays reachable on short viewports */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2 [-webkit-overflow-scrolling:touch]">
              {[
                    {
                      path: '/', label: 'Home', icon: HomeIcon, subItems: [
                        { path: '/about', label: 'About BlackBox', icon: Info },
                        { path: '/policies', label: 'Policies & FAQ', icon: Scale }
                      ]
                    },
                    {
                      path: '/store', label: 'Shop', icon: ShoppingBag, badge: storeUnread.orders, subItems: [
                        { path: '/store', label: 'Browse all', icon: Box },
                        { path: '/store', label: 'iPhone', icon: Smartphone, search: { category: 'iPhone' } },
                        { path: '/store', label: 'Laptops', icon: Laptop, search: { category: 'Laptop' } },
                        { path: '/store', label: 'Accessories', icon: Box, search: { category: 'Accessories' } },
                        { path: '/store', label: 'Gaming', icon: Gamepad2, search: { category: 'Gaming' } },
                        { path: '/store', label: 'Audio', icon: Headphones, search: { category: 'Audio' } },
                        { path: '/history', label: 'Track Orders', icon: History, search: { tab: 'orders' }, badge: storeUnread.orders }
                      ]
                    },
                    {
                      path: '/trades', label: 'Trades', icon: RefreshCcw, badge: storeUnread.trades, subItems: [
                        { type: 'info', label: 'Your Trade-In Items', content: 'Track your device value in real-time.' },
                        { path: '/trades', label: 'Trade-In Program', icon: RefreshCcw },
                        { path: '/history', label: 'Trade-In History', icon: History, search: { tab: 'trades' }, badge: storeUnread.trades }
                      ]
                    },
                    {
                      path: '/repair', label: 'Repairs', icon: Wrench, badge: storeUnread.repairs, subItems: [
                        { path: '/repair', label: 'Schedule Repair', icon: Calendar },
                        { path: '/history', label: 'Repair History', icon: History, search: { tab: 'repairs' }, badge: storeUnread.repairs }
                      ]
                    },
                    { path: '/returns', label: 'Returns', icon: RotateCcw },
                    { path: '/cart', label: 'Cart', icon: ShoppingCart, badge: cartCount },
                    ...(showAdminLink
                      ? [{ path: '/admin' as const, label: 'Manage', icon: LayoutDashboard, ariaLabel: 'Staff dashboard' }]
                      : []),
                    { path: user ? '/profile' : '/auth', label: user ? 'Account' : 'Sign In', icon: UserIcon }
              ].map((item) => {
                    const active = location.pathname === item.path;
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isSubmenuOpen = activeMobileSubmenu === item.label;

                return (
                  <div key={item.label} className="mb-1">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          // Top-level button always navigates.
                          // Submenu expansion is handled by the chevron button.
                          navigate({ to: item.path });
                          closeMobileNavAfterNav();
                        }}
                        aria-label={(item as { ariaLabel?: string }).ariaLabel ?? item.label}
                        className={`mx-2 flex flex-1 items-center gap-4 rounded-xl px-4 py-3 transition-all ${active && !hasSubItems
                          ? 'bg-[#CDA032]/20 text-[#CDA032]'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${active && !hasSubItems ? 'bg-[#CDA032] text-black' : 'bg-white/10 text-white/70'
                          }`}>
                          <item.icon size={18} />
                        </div>
                        <span className="flex-1 text-left text-sm font-black uppercase tracking-widest">
                          {item.label}
                        </span>
                        {item.badge != null && item.badge > 0 && (
                          item.label === 'Cart' ? (
                          <span className="rounded-full bg-[#CDA032] px-2 py-1 text-xs font-black text-black">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                          ) : (
                            <NavUnreadBadge count={item.badge} title="New activity" />
                          )
                        )}
                      </button>
                      {hasSubItems && (
                        <button
                          type="button"
                          onClick={() => setActiveMobileSubmenu(isSubmenuOpen ? null : item.label)}
                          className="mr-2 rounded-xl p-3 text-white/40 hover:bg-white/5"
                        >
                          <ChevronDown size={16} className={`transition-transform duration-300 ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {hasSubItems && (
                      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isSubmenuOpen ? 'mb-6 mt-2 max-h-[min(90vh,880px)] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="ml-12 mr-6 space-y-2">
                          {item.subItems?.map((sub: any, idx: number) => {
                            if (sub.type === 'info') {
                              return (
                                <div key={idx} className="mb-2 rounded-xl border border-white/5 bg-white/5 p-4">
                                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#CDA032]">{sub.label}</p>
                                  <p className="text-[11px] leading-relaxed text-white/40">{sub.content}</p>
                                </div>
                              );
                            }
                            return (
                              <Link
                                key={sub.label}
                                to={sub.path}
                                search={sub.search as any}
                                onClick={() => closeMobileNavAfterNav()}
                                className="flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 transition-all hover:border-white/5 hover:bg-white/5 hover:text-[#CDA032]"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                                  <sub.icon size={14} className="opacity-40" />
                                </div>
                                <span className="flex-1">{sub.label}</span>
                                {typeof sub.badge === 'number' && sub.badge > 0 && (
                                  <NavUnreadBadge count={sub.badge} title="New since last visit" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer + Sign out — pinned to bottom of drawer */}
            <div className="shrink-0 space-y-4 border-t border-white/10 bg-black p-6 pt-4">
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-widest text-white/30">
                  BLACKBOX TERMINAL V4.0
                </p>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    if (setUser) {
                      await handleSignOut(setUser, navigateTo);
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-3 text-red-500 transition-all hover:bg-red-500/20 ${TW_DARK_BTN_DEPTH}`}
                >
                  <LogOut size={18} />
                  <span className="text-sm font-black uppercase tracking-wider">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };