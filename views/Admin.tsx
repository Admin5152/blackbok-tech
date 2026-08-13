import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { handleSignOut } from '../lib/signOut';
import { getAdminNavBadgeCounts } from '../lib/api';
import {
  initAdminNavBaselineIfNeeded,
  getAdminNavSeen,
  markAdminNavSectionSeen,
  type AdminNavBadgeKey,
} from '../lib/navBadgeWatermarks';
import { NavUnreadBadge, NavUnreadDot } from '../components/NavUnreadBadge';
import {
  canEditRepairs,
  canEditStoreOps,
  canManageUserRoles,
  normalizeCanonicalRole,
} from '../lib/roles';
import { AdminOverview } from './admin/AdminOverview';
import { AdminOrders } from './admin/AdminOrders';
import { AdminCustomers } from './admin/AdminCustomers';
import { AdminProducts } from './admin/AdminProducts';
import { AdminIpads } from './admin/AdminIpads';
import { AdminConsoles } from './admin/AdminConsoles';
import { AdminDealOfTheDay } from './admin/AdminDealOfTheDay';
import { AdminRepairs } from './admin/AdminRepairs';
import { AdminReturns } from './admin/AdminReturns';
import { AdminUsers } from './admin/AdminUsers';
import { TradeAdminShell } from './admin/trade/TradeAdminShell';
// import { AdminInbox } from './admin/AdminInbox';
// AdminTrades retired — Trade Admin lives at /admin/trade (embedded via TradeAdminShell).
import {
  Home, Users, Package, ShoppingCart, RefreshCcw,
  Wrench, LogOut, Menu, X, Shield, Store, RotateCcw, Tag, Tablet, Gamepad2, Flame,
} from 'lucide-react';
import { AdminPromotionsShell } from './admin/promotions/AdminPromotionsShell';

export type AdminSection = 'overview' | 'inbox' | 'orders' | 'customers' | 'products' | 'ipads' | 'consoles' | 'deals' | 'trades' | 'returns' | 'repairs' | 'users' | 'promotions';

interface AdminProps {
  user?: any;
  setUser?: (user: any) => void;
  navigateTo?: (view: string) => void;
  theme?: 'light' | 'dark';
  /** Deep-link e.g. /admin/products → open Shop section */
  initialSection?: AdminSection;
}

const NAV_ITEMS: { id: AdminSection; label: string; icon: any; adminOnly?: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'products', label: 'Shop', icon: Package },
  { id: 'promotions', label: 'Promotions', icon: Tag },
  { id: 'trades', label: 'Trade-Ins', icon: RefreshCcw },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'users', label: 'User Roles', icon: Shield, adminOnly: true },
];

const SHOP_SUBNAV: { id: 'products' | 'ipads' | 'consoles' | 'deals'; label: string; to: string; icon: any }[] = [
  { id: 'products', label: 'Products', to: '/admin/products', icon: Package },
  { id: 'ipads', label: 'iPads', to: '/admin/ipads', icon: Tablet },
  { id: 'consoles', label: 'Consoles', to: '/admin/consoles', icon: Gamepad2 },
  { id: 'deals', label: 'Deal of the Day', to: '/admin/deals', icon: Flame },
];

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: 'Overview',
  inbox: 'Messages',
  orders: 'Orders',
  customers: 'Customers',
  products: 'Shop',
  ipads: 'Shop',
  consoles: 'Shop',
  deals: 'Shop',
  promotions: 'Promotions',
  trades: 'Trade-ins',
  returns: 'Returns',
  repairs: 'Repairs',
  users: 'Users',
};

const NAV_BADGE_KEYS = new Set<AdminNavBadgeKey>([
  'orders',
  'customers',
  'products',
  'trades',
  'repairs',
  'users',
]);

function isNavBadgeKey(id: AdminSection): id is AdminNavBadgeKey {
  return NAV_BADGE_KEYS.has(id as AdminNavBadgeKey);
}

const ZERO_BADGES: Record<AdminNavBadgeKey, number> = {
  orders: 0,
  customers: 0,
  products: 0,
  trades: 0,
  repairs: 0,
  users: 0,
};

export const Admin: React.FC<AdminProps> = ({ user, setUser, navigateTo, theme = 'dark', initialSection }) => {
  const routerNavigate = useNavigate();
  const role = normalizeCanonicalRole(user?.role);
  const [section, setSection] = useState<AdminSection>(initialSection || 'overview');
  const [sidebar, setSidebar] = useState(true);
  const [badgeCounts, setBadgeCounts] = useState<Record<AdminNavBadgeKey, number>>(ZERO_BADGES);
  const badgePollRef = useRef<number | null>(null);

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || canManageUserRoles(role));

  // Deep-link /admin/products must open Shop even if Admin was already mounted.
  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  // Staff must not stay on admin-only User Roles if deep-linked somehow.
  useEffect(() => {
    if (section === 'users' && !canManageUserRoles(role)) {
      setSection('overview');
    }
  }, [section, role]);

  const refreshBadgeCounts = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    initAdminNavBaselineIfNeeded(uid);
    try {
      const seen = getAdminNavSeen(uid);
      const next = await getAdminNavBadgeCounts(seen);
      setBadgeCounts(next);
    } catch (e) {
      console.warn('Admin badge counts:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    initAdminNavBaselineIfNeeded(uid);
    void refreshBadgeCounts();
    badgePollRef.current = window.setInterval(() => void refreshBadgeCounts(), 45_000);
    return () => {
      if (badgePollRef.current) window.clearInterval(badgePollRef.current);
    };
  }, [user?.id, refreshBadgeCounts]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid || section === 'overview') return;
    const badgeKey =
      section === 'ipads' || section === 'consoles' || section === 'deals' ? 'products' : section;
    if (!isNavBadgeKey(badgeKey)) return;
    markAdminNavSectionSeen(uid, badgeKey);
    void refreshBadgeCounts();
  }, [section, user?.id, refreshBadgeCounts]);

  // Route shell already requires admin|staff. These flags gate mutations inside sub-views.
  const canEditOps = canEditStoreOps(role);
  const canEditRepairQueue = canEditRepairs(role);
  const canEditRoles = canManageUserRoles(role);

  const navigate = (s: AdminSection) => {
    setSection(s);
    // Overview CTAs + in-app navigate must hit the same deep links as the sidebar.
    if (s === 'products') {
      void routerNavigate({ to: '/admin/products' as any });
    } else if (s === 'ipads') {
      void routerNavigate({ to: '/admin/ipads' as any });
    } else if (s === 'consoles') {
      void routerNavigate({ to: '/admin/consoles' as any });
    } else if (s === 'deals') {
      void routerNavigate({ to: '/admin/deals' as any });
    } else if (s === 'trades') {
      void routerNavigate({ to: '/admin/trade' as any });
    } else if (s === 'promotions') {
      void routerNavigate({ to: '/admin/promotions' as any });
    } else {
      void routerNavigate({ to: '/admin' as any });
    }
  };

  const handleLogout = async () => {
    if (setUser && navigateTo) await handleSignOut(setUser, navigateTo);
  };

  const isLight = theme === 'light';
  const isShopSection =
    section === 'products' || section === 'ipads' || section === 'consoles' || section === 'deals';

  return (
    <div className={`min-h-screen flex ${isLight ? 'bg-[#FAFAFA]' : 'bg-[#060606]'}`}>
      {/* Mobile backdrop */}
      {sidebar && (
        <div
          className={`lg:hidden fixed inset-0 z-[70] ${isLight ? 'bg-black/20' : 'bg-black/80'}`}
          onClick={() => setSidebar(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:h-screen lg:inset-auto z-[80] flex flex-col transition-all duration-300 shrink-0
          ${sidebar ? 'translate-x-0 w-60' : '-translate-x-full lg:translate-x-0 lg:w-[68px]'}
          ${isLight ? 'bg-white border-r border-black/10' : 'bg-[#0a0a0a] border-r border-white/5'}`}
      >
        {/* Logo row */}
        <div className={`p-4 flex items-center gap-3 border-b ${isLight ? 'border-black/5' : 'border-white/5'}`}>
          {sidebar && (
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black tracking-widest uppercase italic ${isLight ? 'text-black' : 'text-white'}`}>BLACKBOX</p>
              <p className={`text-[9px] uppercase tracking-widest font-bold capitalize ${isLight ? 'text-black/40' : 'text-white/20'}`}>{role} Panel</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebar(v => !v)}
            aria-label={sidebar ? 'Collapse side menu' : 'Expand side menu'}
            title={sidebar ? 'Collapse menu — keep content, hide labels' : 'Expand menu'}
            className={`transition-colors ml-auto shrink-0 p-2 rounded-lg ${isLight ? 'text-black/40 hover:text-black hover:bg-black/5' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
          >
            {sidebar ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav items — ALL sections always visible */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {visibleNav.map(item => {
            const n = isNavBadgeKey(item.id) ? badgeCounts[item.id] : 0;
            const isActive = item.id === 'products' ? isShopSection : section === item.id;
            return (
            <button
              key={item.id}
              onClick={() => {
                setSection(item.id);
                // Keep URL in sync so /admin/products and /admin/trade are bookmarkable.
                if (item.id === 'products') {
                  void routerNavigate({ to: '/admin/products' as any });
                } else if (item.id === 'trades') {
                  void routerNavigate({ to: '/admin/trade' as any });
                } else if (item.id === 'promotions') {
                  void routerNavigate({ to: '/admin/promotions' as any });
                } else {
                  void routerNavigate({ to: '/admin' as any });
                }
                if (window.innerWidth < 1024) setSidebar(false);
              }}
              title={!sidebar ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                ${isActive
                  ? 'bg-[#B38B21] text-black shadow-sm'
                  : isLight
                    ? 'text-black/70 hover:text-black hover:bg-black/5'
                    : 'text-white/75 hover:text-white hover:bg-white/5'}`}
            >
              <span className="relative shrink-0">
                <item.icon size={17} className="shrink-0" />
                {!sidebar && isNavBadgeKey(item.id) && (
                  <NavUnreadDot show={n > 0} className={isActive ? 'ring-[#B38B21]' : ''} />
                )}
              </span>
              {sidebar && (
                <>
                  <span className="text-xs font-black uppercase tracking-wider text-left flex-1 min-w-0 truncate">
                    {item.label}
                  </span>
                  {isNavBadgeKey(item.id) && (
                    <NavUnreadBadge
                      count={n}
                      className={isActive ? 'ring-2 ring-black/25' : ''}
                      title={`${n} new since last viewed`}
                    />
                  )}
                </>
              )}
            </button>
            );
          })}
        </nav>

        {/* User info + sign out */}
        <div className={`p-2 space-y-1 border-t ${isLight ? 'border-black/5' : 'border-white/5'}`}>
          {sidebar && user && (
            <div className={`px-3 py-2 rounded-xl mb-1 ${isLight ? 'bg-black/5' : 'bg-white/[0.03]'}`}>
              <p className={`text-[9px] uppercase tracking-widest ${isLight ? 'text-black/40' : 'text-white/20'}`}>Signed in as</p>
              <p className={`text-xs font-black truncate ${isLight ? 'text-black' : 'text-white'}`}>{user?.name?.trim() || user?.email || 'User'}</p>
              <p className="text-[8px] text-[#B38B21] font-black uppercase">{role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isLight ? 'text-black/40 hover:text-red-600 hover:bg-red-500/10' : 'text-white/20 hover:text-red-400 hover:bg-red-500/10'}`}
          >
            <LogOut size={17} />
            {sidebar && <span className="text-xs font-black uppercase tracking-wider">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header */}
        <header className={`px-4 sm:px-6 py-3.5 flex items-center gap-3 sticky top-0 z-10 border-b ${isLight ? 'bg-white border-black/10' : 'bg-[#0a0a0a] border-white/5'}`}>
          <button
            onClick={() => setSidebar(true)}
            className={`lg:hidden ${isLight ? 'text-black/40 hover:text-black' : 'text-white/30 hover:text-white'}`}
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className={`text-base font-black italic uppercase tracking-tight truncate ${isLight ? 'text-black' : 'text-white'}`}>
              {section === 'trades' ? 'Trade Admin' : section === 'promotions' ? 'Promotions' : SECTION_TITLES[section]}
            </h1>
            <p className={`text-[9px] font-black uppercase tracking-widest truncate ${isLight ? 'text-black/50' : 'text-white/55'}`}>
              {section === 'trades'
                ? 'Devices · pricing · queue'
                : isShopSection
                  ? (section === 'ipads'
                      ? 'iPad catalogue · pricing · stock'
                      : section === 'consoles'
                        ? 'Consoles · controllers · pricing · stock'
                        : 'Products · catalogue · stock')
                  : (
                  <>
                    BlackBox Admin ·{' '}
                    {new Date().toLocaleDateString('en', {
                      weekday: 'long', month: 'long', day: 'numeric',
                    })}
                  </>
                )}
            </p>
          </div>

          {/*
            Always-visible sign-out button in the header. The sidebar already
            has a sign-out button, but it's hidden whenever the sidebar is
            collapsed (the default state on mobile), so admins were getting
            stuck. This one stays visible on every viewport.
          */}
          <button
            type="button"
            onClick={() => routerNavigate({ to: '/' })}
            className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all
              ${isLight
                ? 'border-black/10 text-black/70 hover:text-black hover:bg-black/5'
                : 'border-white/10 text-white/70 hover:text-white hover:bg-white/5'
              }`}
            title="Open shop"
          >
            <Store size={15} />
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Store</span>
          </button>
          <button
            onClick={handleLogout}
            className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all
              ${isLight
                ? 'border-black/10 text-black/60 hover:text-red-600 hover:border-red-300 hover:bg-red-500/5'
                : 'border-white/10 text-white/60 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10'
              }`}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Sign Out</span>
          </button>
        </header>

        {/* Content — page scrolls normally (Lenis disabled on /admin) */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          {isShopSection && (
            <nav
              className="flex gap-1.5 overflow-x-auto scrollbar-none pb-3 mb-1 -mx-1 px-1"
              aria-label="Shop admin sections"
            >
              {SHOP_SUBNAV.map((item) => {
                const active = section === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      active
                        ? 'bg-[#B38B21] text-black border-[#B38B21]'
                        : isLight
                          ? 'bg-black/[0.04] text-black/75 border-black/15 hover:bg-black/[0.08] hover:text-black hover:border-black/25'
                          : 'bg-white/[0.08] text-[#E8E8E8] border-white/20 hover:bg-white/15 hover:text-[#F5F5F5] hover:border-white/35'
                    }`}
                  >
                    <Icon size={13} strokeWidth={2.25} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}
          {section === 'overview' && <AdminOverview onNavigate={navigate} />}
          {/* {section === 'inbox' && <AdminInbox />} */}
          {section === 'orders' && <AdminOrders />}
          {section === 'customers' && <AdminCustomers />}
          {section === 'products' && <AdminProducts canEdit={canEditOps} theme={theme} />}
          {section === 'ipads' && <AdminIpads canEdit={canEditOps} theme={theme} />}
          {section === 'consoles' && <AdminConsoles canEdit={canEditOps} theme={theme} />}
          {section === 'deals' && <AdminDealOfTheDay canEdit={canEditOps} theme={theme} />}
          {section === 'trades' && <TradeAdminShell />}
          {section === 'promotions' && <AdminPromotionsShell />}
          {section === 'returns' && <AdminReturns canEdit={canEditOps} />}
          {section === 'repairs' && <AdminRepairs canEdit={canEditRepairQueue} />}
          {section === 'users' && canEditRoles && (
            <AdminUsers canEdit={canEditRoles} currentUserId={user?.id} />
          )}
        </main>
      </div>
    </div>
  );
};
