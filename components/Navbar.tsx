import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, CheckCircle2, Activity, Scale, RefreshCcw, RotateCcw, Home as HomeIcon,
  ShoppingBag, Wrench, ShoppingCart, User as UserIcon,
  ChevronRight, ChevronDown, Settings, AlertTriangle,
  Sparkles, Eye, Clock, Menu, Sun, Moon, Search, TrendingUp, Box, Laptop, Smartphone, Gamepad2, History, Calendar, Info, Heart, UserCog, Headphones, LayoutDashboard
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { User, CartItem, Product, Order, RepairRequest, TradeRequest } from '../types';
import { formatCurrency, TW_DARK_BTN_DEPTH, TW_DARK_GOLD_BTN_DEPTH } from '../lib/utils';
import { NotificationBell } from './NotificationBell';
import { canAccessAdminDashboard } from '../lib/roles';
import {
  initStoreNavBaselineIfNeeded,
  getStoreNavSeen,
  markStoreNavSectionSeen,
} from '../lib/navBadgeWatermarks';
import { scrollToDocumentTop } from '../lib/scrollToDocumentTop';
import { NavUnreadBadge } from './NavUnreadBadge';
import { MobileNavDrawer, type MobileNavItem } from './MobileNavDrawer';
import { useAppContext } from '../App';
import { saveReturnTo } from '../lib/returnTo';

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
    const [searchExpanded, setSearchExpanded] = useState(false);
    const searchFormRef = useRef<HTMLFormElement>(null);
    const searchBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      } else if (path === '/trades' || path.startsWith('/trade')) {
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
      type UserOwnedRow = { user_id?: string; userId?: string; created_at?: string; date?: string };
      const mine = (rows: UserOwnedRow[]) =>
        rows.filter((r) => (r.user_id || r.userId) === uid);
      const rowT = (o: UserOwnedRow) => {
        const s = o.created_at || o.date;
        const t = s ? new Date(s).getTime() : NaN;
        return Number.isFinite(t) ? t : 0;
      };
      const sinceMs = (iso: string) => {
        const t = new Date(iso).getTime();
        return Number.isFinite(t) ? t : 0;
      };
      const countAfter = (rows: UserOwnedRow[], iso: string) =>
        mine(rows).filter((r) => rowT(r) > sinceMs(iso)).length;
      return {
        orders: countAfter(orders, seen.orders),
        repairs: countAfter(repairs, seen.repairs),
        trades: countAfter(trades, seen.trades),
      };
    }, [user?.id, orders, repairs, trades, storeBadgeTick]);

    useEffect(() => {
      let ticking = false;
      const applyY = (y: number) => setIsScrolled(y > 4);
      const handleScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          applyY(window.scrollY);
          ticking = false;
        });
      };
      const onLenisScroll = (ev: Event) => {
        const y = (ev as CustomEvent<{ y: number }>).detail?.y;
        if (typeof y !== 'number') return;
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          applyY(y);
          ticking = false;
        });
      };
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('bb-scroll', onLenisScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('bb-scroll', onLenisScroll);
      };
    }, []);

    useEffect(() => {
      if (!isMobileMenuOpen) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }, [isMobileMenuOpen]);

    const mobileNavItems = useMemo(
      () =>
        [
          {
            path: '/',
            label: 'Home',
            icon: HomeIcon,
            subItems: [
              { path: '/about', label: 'About BlackBox', icon: Info },
              { path: '/policies', label: 'Policies & FAQ', icon: Scale },
            ],
          },
          {
            path: '/store',
            label: 'Shop',
            icon: ShoppingBag,
            badge: storeUnread.orders,
            subItems: [
              { path: '/store', label: 'Browse all', icon: Box },
              { path: '/store', label: 'iPhone', icon: Smartphone, search: { category: 'iPhone' } },
              { path: '/store', label: 'Laptops', icon: Laptop, search: { category: 'Laptop' } },
              { path: '/store', label: 'Accessories', icon: Box, search: { category: 'Accessories' } },
              { path: '/store', label: 'Gaming', icon: Gamepad2, search: { category: 'Gaming' } },
              { path: '/store', label: 'Audio', icon: Headphones, search: { category: 'Audio' } },
              {
                path: '/history',
                label: 'Track Orders',
                icon: History,
                search: { tab: 'orders' },
                badge: storeUnread.orders,
              },
            ],
          },
          {
            path: '/trade',
            label: 'Trades',
            icon: RefreshCcw,
            badge: storeUnread.trades,
            subItems: [
              { type: 'info', label: 'Your Trade-In Items', content: 'Track your device value in real-time.' },
              { path: '/trade', label: 'Trade-In Program', icon: RefreshCcw },
              {
                path: '/account/trade-ins',
                label: 'Trade-In History',
                icon: History,
                badge: storeUnread.trades,
              },
            ],
          },
          {
            path: '/repair',
            label: 'Repairs',
            icon: Wrench,
            badge: storeUnread.repairs,
            subItems: [
              { path: '/repair', label: 'Schedule Repair', icon: Calendar },
              {
                path: '/history',
                label: 'Repair History',
                icon: History,
                search: { tab: 'repairs' },
                badge: storeUnread.repairs,
              },
            ],
          },
          { path: '/returns', label: 'Returns', icon: RotateCcw },
          { path: '/cart', label: 'Cart', icon: ShoppingCart, badge: cartCount },
          ...(showAdminLink
            ? [{ path: '/admin' as const, label: 'Manage', icon: LayoutDashboard, ariaLabel: 'Staff dashboard' }]
            : []),
        ] as const,
      [storeUnread.orders, storeUnread.trades, storeUnread.repairs, cartCount, showAdminLink],
    );

    useEffect(() => {
      if (!searchExpanded) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        setSearchExpanded(false);
        const input = searchFormRef.current?.querySelector('input');
        if (input instanceof HTMLElement) input.blur();
      };
      const onPointerDown = (e: MouseEvent | TouchEvent) => {
        const root = searchFormRef.current;
        const target = e.target;
        if (!(target instanceof Node) || !root) return;
        if (root.contains(target)) return;
        // Also ignore the expand trigger button
        if (target instanceof Element && target.closest('[data-nav-search-trigger]')) return;
        setSearchExpanded(false);
      };
      window.addEventListener('keydown', onKey);
      document.addEventListener('mousedown', onPointerDown);
      document.addEventListener('touchstart', onPointerDown);
      return () => {
        window.removeEventListener('keydown', onKey);
        document.removeEventListener('mousedown', onPointerDown);
        document.removeEventListener('touchstart', onPointerDown);
      };
    }, [searchExpanded]);

    useEffect(() => {
      return () => {
        if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
      };
    }, []);

    useEffect(() => {
      if (!searchExpanded) return;
      const t = window.setTimeout(() => {
        const input = searchFormRef.current?.querySelector('input');
        if (input instanceof HTMLInputElement) input.focus();
      }, 30);
      return () => window.clearTimeout(t);
    }, [searchExpanded]);

    const openSearch = () => {
      if (searchBlurTimer.current) {
        clearTimeout(searchBlurTimer.current);
        searchBlurTimer.current = null;
      }
      setSearchExpanded(true);
    };

    const closeSearch = () => {
      if (searchBlurTimer.current) {
        clearTimeout(searchBlurTimer.current);
        searchBlurTimer.current = null;
      }
      setSearchExpanded(false);
    };

    const scheduleCloseSearch = () => {
      if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
      searchBlurTimer.current = setTimeout(() => {
        setSearchExpanded(false);
        searchBlurTimer.current = null;
      }, 160);
    };

    const navItemClass = (path: string) => {
      const active =
        location.pathname === path ||
        (path !== '/' && location.pathname.startsWith(path + '/'));
      // WHY: light inactive was text-black/60 on #FAFAFA — nearly invisible next to
      // the active pill. Match brand gold for active; keep ≥ readable inactive.
      if (isLight) {
        return `flex items-center gap-2 px-5 py-3 min-h-11 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ${
          active
            ? 'bg-[#B38B21] text-black shadow-md'
            : 'text-black/85 hover:text-black hover:bg-black/[0.06]'
        }`;
      }
      return `flex items-center gap-2 px-5 py-3 min-h-11 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ${
        active
          ? 'bg-[#B38B21] text-black shadow-[0_0_20px_rgba(179,139,33,0.35)]'
          : 'text-white/85 hover:text-white hover:bg-white/10'
      }`;
    };

    const handleCatalogSearch = (e: React.FormEvent, opts?: { closeMobile?: boolean }) => {
      e.preventDefault();
      const raw = String(searchQuery ?? '').trim();
      setSearchQuery(raw);
      const search: Record<string, string> = {};
      if (raw) search.q = raw.slice(0, 200);
      // Keep store category filters when searching from the header (home or any page).
      if (location.pathname === '/store') {
        const sp = new URLSearchParams(location.search);
        const cat = sp.get('category');
        const cats = sp.get('categories');
        if (cat) search.category = cat;
        if (cats) search.categories = cats;
      }
      navigate({ to: '/store', search: search as never });
      closeSearch();
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

              {/* Catalog search — collapsed icon → expands; collapses on blur / Esc / outside */}
              <div className="hidden md:flex min-w-0 flex-1 items-center justify-start">
                {!searchExpanded ? (
                  <button
                    type="button"
                    data-nav-search-trigger
                    onClick={openSearch}
                    title="Search the shop"
                    aria-label="Open shop search"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${
                      isLight
                        ? 'border-black/10 bg-white text-black/70 hover:border-[#B38B21]/40 hover:text-black'
                        : 'border-white/12 bg-white/[0.06] text-white/70 hover:border-[#CDA032]/40 hover:text-white'
                    }`}
                  >
                    <Search size={18} strokeWidth={2.25} aria-hidden />
                  </button>
                ) : (
                  <form
                    ref={searchFormRef}
                    onSubmit={(e) => handleCatalogSearch(e)}
                    onFocus={openSearch}
                    onBlur={(e) => {
                      const next = e.relatedTarget;
                      if (next instanceof Node && searchFormRef.current?.contains(next)) return;
                      scheduleCloseSearch();
                    }}
                    className={`flex min-w-0 w-full max-w-xl items-center gap-2 rounded-2xl border pl-3 pr-1.5 py-1 animate-in fade-in zoom-in-95 duration-200 ${
                      isLight
                        ? 'border-black/15 bg-white focus-within:border-[#B38B21]/50 focus-within:ring-2 focus-within:ring-[#B38B21]/30'
                        : 'border-white/12 bg-white/[0.06] focus-within:border-[#CDA032]/40 focus-within:ring-2 focus-within:ring-[#CDA032]/25'
                    }`}
                    role="search"
                  >
                    <label htmlFor="nav-catalog-search" className="sr-only">
                      Search the shop
                    </label>
                    <Search
                      className={`pointer-events-none h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${isLight ? 'text-black/40' : 'text-white/40'}`}
                      aria-hidden
                    />
                    <input
                      id="nav-catalog-search"
                      type="search"
                      autoComplete="off"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search store…"
                      className={`min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none placeholder:opacity-50 sm:text-[13px] ${
                        isLight ? 'text-black' : 'text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={closeSearch}
                      className={`shrink-0 rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 ${
                        isLight ? 'text-black' : 'text-white'
                      }`}
                      aria-label="Close search"
                    >
                      Esc
                    </button>
                    <button
                      type="submit"
                      className={`shrink-0 rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-widest transition sm:px-4 sm:text-[11px] ${TW_DARK_GOLD_BTN_DEPTH} bg-[#B38B21] text-black hover:bg-[#CDA032]`}
                    >
                      Go
                    </button>
                  </form>
                )}
              </div>
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
                <Link to="/trade" className={navItemClass('/trade')}>
                  <RefreshCcw size={16} /> Trades
                  <NavUnreadBadge count={storeUnread.trades} className="ml-0.5" title="New trade-in activity" />
                  <ChevronDown size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-300" />
                </Link>
                <div className={`absolute top-full left-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]`}>
                  <div className={`w-56 rounded-2xl border shadow-2xl p-2 backdrop-blur-3xl ${isLight ? 'bg-white/95 border-black/5' : 'bg-[#121212]/95 border-white/5'}`}>
                    <div className={`p-4 rounded-xl mb-2 ${isLight ? 'bg-black/[0.04]' : 'bg-white/[0.06]'}`}>
                      <p className={`text-sm font-medium ${isLight ? 'text-black/70' : 'text-white/80'}`}>Your Trade-In Items</p>
                    </div>
                    <Link to="/trade" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
                      <RefreshCcw size={14} className="opacity-40" /> Trade-In Program
                    </Link>
                    <Link to="/account/trade-ins" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'}`}>
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
                  flex shrink-0 items-center justify-center w-11 h-11 min-w-11 min-h-11 rounded-xl border-2 transition-all
                  ${isLight
                    ? 'border-[#B38B21] bg-[#B38B21]/25 text-black hover:bg-[#B38B21]/40'
                    : 'border-[#B38B21] bg-[#B38B21]/20 text-[#CDA032] hover:bg-[#B38B21]/35'}
                `}
                >
                  <LayoutDashboard size={18} strokeWidth={2.25} />
                </Link>
              )}

              {/* Account Button */}
              <Link
                to={user ? '/profile' : '/auth'}
                search={
                  !user && !location.pathname.startsWith('/auth')
                    ? { returnTo: location.pathname }
                    : undefined
                }
                onClick={() => {
                  if (!user && !location.pathname.startsWith('/auth')) {
                    saveReturnTo(location.pathname);
                  }
                }}
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

              {!user && (
                <Link
                  to="/auth"
                  search={{ returnTo: location.pathname }}
                  onClick={() => saveReturnTo(location.pathname)}
                  title="Sign in"
                  aria-label="Sign in"
                  className={[
                    'sm:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all',
                    isLight
                      ? 'border-black/10 bg-black/5 text-black hover:bg-[#CDA032] hover:text-black hover:border-[#CDA032]/50'
                      : 'border-white/10 bg-white/5 text-white hover:bg-[#CDA032] hover:text-black hover:border-[#CDA032]/50',
                    TW_DARK_BTN_DEPTH,
                  ].join(' ')}
                >
                  <UserIcon size={20} strokeWidth={2.25} />
                </Link>
              )}

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

        <MobileNavDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          isLight={isLight}
          user={user ?? null}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={(e) => handleCatalogSearch(e, { closeMobile: true })}
          applyTheme={applyTheme}
          cartCount={cartCount}
          items={mobileNavItems as unknown as MobileNavItem[]}
          activeSubmenu={activeMobileSubmenu}
          setActiveSubmenu={setActiveMobileSubmenu}
          pathname={location.pathname}
          onAfterNavigate={closeMobileNavAfterNav}
          setUser={setUser}
          navigateTo={navigateTo}
        />
      </>
    );
  };