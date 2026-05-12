import React, { useState } from 'react';
import { handleSignOut } from '../lib/signOut';
import { AdminOverview } from './admin/AdminOverview';
import { AdminOrders } from './admin/AdminOrders';
import { AdminCustomers } from './admin/AdminCustomers';
import { AdminProducts } from './admin/AdminProducts';
import { AdminTrades } from './admin/AdminTrades';
import { AdminRepairs } from './admin/AdminRepairs';
import { AdminReturns } from './admin/AdminReturns';
import { AdminUsers } from './admin/AdminUsers';
// import { AdminInbox } from './admin/AdminInbox';
import {
  Home, Users, Package, ShoppingCart, RefreshCcw,
  Wrench, LogOut, Menu, X, Shield, MessageSquare, RotateCcw
} from 'lucide-react';

interface AdminProps {
  user?: any;
  setUser?: (user: any) => void;
  navigateTo?: (view: string) => void;
  theme?: 'light' | 'dark';
}

export type AdminSection = 'overview' | 'inbox' | 'orders' | 'customers' | 'products' | 'trades' | 'returns' | 'repairs' | 'users';

const NAV_ITEMS: { id: AdminSection; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  // { id: 'inbox', label: 'Inbox', icon: MessageSquare },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'trades', label: 'Trade-Ins', icon: RefreshCcw },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'users', label: 'User Roles', icon: Shield },
];

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: 'Dashboard Overview',
  inbox: 'Message Inbox',
  orders: 'Order Management',
  customers: 'Customer Directory',
  products: 'Product Catalogue',
  trades: 'Trade-In Requests',
  returns: 'Return Requests',
  repairs: 'Repair Requests',
  users: 'Users',
};

export const Admin: React.FC<AdminProps> = ({ user, setUser, navigateTo, theme = 'dark' }) => {
  const role: string = user?.role || 'user';
  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebar, setSidebar] = useState(true);

  // DEV MODE: all permissions open during development
  const isAdmin = true;
  const isSales = true;
  const isRepair = true;

  const navigate = (s: AdminSection) => { setSection(s); };

  const handleLogout = async () => {
    if (setUser && navigateTo) await handleSignOut(setUser, navigateTo);
  };

  const isLight = theme === 'light';

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
        className={`fixed lg:static inset-y-0 left-0 z-[80] flex flex-col transition-all duration-300
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
            onClick={() => setSidebar(v => !v)}
            className={`transition-colors ml-auto shrink-0 ${isLight ? 'text-black/40 hover:text-black' : 'text-white/20 hover:text-white'}`}
          >
            {sidebar ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav items — ALL sections always visible */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSection(item.id);
                if (window.innerWidth < 1024) setSidebar(false);
              }}
              title={!sidebar ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                ${section === item.id
                  ? 'bg-[#B38B21] text-black shadow-sm'
                  : isLight
                    ? 'text-black/60 hover:text-black hover:bg-black/5'
                    : 'text-white/30 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon size={17} className="shrink-0" />
              {sidebar && (
                <span className="text-xs font-black uppercase tracking-wider text-left flex-1">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User info + sign out */}
        <div className={`p-2 space-y-1 border-t ${isLight ? 'border-black/5' : 'border-white/5'}`}>
          {sidebar && user && (
            <div className={`px-3 py-2 rounded-xl mb-1 ${isLight ? 'bg-black/5' : 'bg-white/[0.03]'}`}>
              <p className={`text-[9px] uppercase tracking-widest ${isLight ? 'text-black/40' : 'text-white/20'}`}>Signed in as</p>
              <p className={`text-xs font-black truncate ${isLight ? 'text-black' : 'text-white'}`}>{user.name || user.email}</p>
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className={`px-4 sm:px-6 py-3.5 flex items-center gap-3 sticky top-0 z-10 border-b ${isLight ? 'bg-white border-black/10' : 'bg-[#0a0a0a] border-white/5'}`}>
          <button
            onClick={() => setSidebar(true)}
            className={`lg:hidden ${isLight ? 'text-black/40 hover:text-black' : 'text-white/30 hover:text-white'}`}
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className={`text-base font-black italic uppercase tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>
              {SECTION_TITLES[section]}
            </h1>
            <p className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-black/40' : 'text-white/20'}`}>
              BlackBox Admin ·{' '}
              {new Date().toLocaleDateString('en', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          {section === 'overview' && <AdminOverview onNavigate={navigate} />}
          {/* {section === 'inbox' && <AdminInbox />} */}
          {section === 'orders' && <AdminOrders />}
          {section === 'customers' && <AdminCustomers />}
          {section === 'products' && <AdminProducts canEdit={isSales} />}
          {section === 'trades' && <AdminTrades canEdit={isSales} />}
          {section === 'returns' && <AdminReturns canEdit={isAdmin} />}
          {section === 'repairs' && <AdminRepairs canEdit={isRepair} />}
          {section === 'users' && <AdminUsers />}
        </main>
      </div>
    </div>
  );
};
