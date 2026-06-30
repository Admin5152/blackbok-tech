import React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  X, Moon, Sun, Search, ShoppingCart, ChevronRight, ChevronDown,
  User as UserIcon, LogOut, ShoppingBag, Wrench, RefreshCcw,
} from 'lucide-react';
import { NavUnreadBadge } from './NavUnreadBadge';
import { handleSignOut } from '../lib/signOut';
import { TW_DARK_GOLD_BTN_DEPTH } from '../lib/utils';

const ViewfinderLogo = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
    <path d="M25 40V28C25 26.3431 26.3431 25 28 25H40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M60 25H72C73.6569 25 75 26.3431 75 28V40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M75 60V72C75 73.6569 73.6569 75 72 75H60" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M40 75H28C26.3431 75 25 73.6569 25 72V60" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <rect x="38" y="44" width="24" height="12" rx="6" fill="currentColor" />
  </svg>
);

export type MobileNavSubItem =
  | { type: 'info'; label: string; content: string }
  | {
      path: string;
      label: string;
      icon: React.ComponentType<{ size?: number; className?: string }>;
      search?: Record<string, string>;
      badge?: number;
    };

export type MobileNavItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  ariaLabel?: string;
  subItems?: MobileNavSubItem[];
};

function sectionLabelFor(itemLabel: string): string | null {
  if (itemLabel === 'Home') return 'Browse';
  if (itemLabel === 'Trades') return 'Services';
  if (itemLabel === 'Cart') return 'Your bag';
  return null;
}

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  user: { name: string; email: string; avatarLetter?: string } | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => void;
  applyTheme: (t: 'light' | 'dark') => void;
  cartCount: number;
  items: MobileNavItem[];
  activeSubmenu: string | null;
  setActiveSubmenu: (label: string | null) => void;
  pathname: string;
  onAfterNavigate: () => void;
  setUser?: (user: null) => void;
  navigateTo?: (view: string) => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  isLight,
  user,
  searchQuery,
  setSearchQuery,
  onSearch,
  applyTheme,
  cartCount,
  items,
  activeSubmenu,
  setActiveSubmenu,
  pathname,
  onAfterNavigate,
  setUser,
  navigateTo,
}) => {
  const navigate = useNavigate();

  const goTo = (path: string, search?: Record<string, string>) => {
    navigate({ to: path, search: search as never });
    onAfterNavigate();
  };

  return (
    <div
      className={`bb-mobile-nav lg:hidden ${isLight ? 'bb-mobile-nav--light' : 'bb-mobile-nav--dark'} ${isOpen ? 'bb-mobile-nav--open' : ''}`}
      aria-hidden={!isOpen}
    >
      <button type="button" className="bb-mobile-nav__backdrop" aria-label="Close menu" onClick={onClose} />

      <aside className="bb-mobile-nav__panel" role="dialog" aria-modal={isOpen} aria-label="Main menu">
        <header className="bb-mobile-nav__header">
          <div className="bb-mobile-nav__brand">
            <div className="bb-mobile-nav__logo-mark">
              <ViewfinderLogo />
            </div>
            <div>
              <p className="bb-mobile-nav__brand-title">BlackBox</p>
              <p className="bb-mobile-nav__brand-sub">Menu</p>
            </div>
          </div>
          <div className="bb-mobile-nav__header-actions">
            <button
              type="button"
              className="bb-mobile-nav__icon-btn"
              onClick={() => applyTheme(isLight ? 'dark' : 'light')}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {isLight ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link
              to="/cart"
              onClick={onAfterNavigate}
              className="bb-mobile-nav__icon-btn bb-mobile-nav__icon-btn--cart"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="bb-mobile-nav__cart-badge" aria-hidden>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <button type="button" className="bb-mobile-nav__icon-btn" onClick={onClose} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>
        </header>

        <Link to={user ? '/profile' : '/auth'} onClick={onClose} className="bb-mobile-nav__profile">
          <span className="bb-mobile-nav__avatar" aria-hidden>
            {user ? (user.avatarLetter || user.name.charAt(0)) : 'U'}
          </span>
          <span className="bb-mobile-nav__profile-text">
            <span className="bb-mobile-nav__profile-name">{user ? user.name : 'Guest'}</span>
            <span className="bb-mobile-nav__profile-hint">
              {user ? user.email : 'Sign in for orders & offers'}
            </span>
          </span>
          <ChevronRight size={18} className="bb-mobile-nav__profile-chevron" aria-hidden />
        </Link>

        <form onSubmit={onSearch} className="bb-mobile-nav__search" role="search">
          <label htmlFor="nav-mobile-catalog-search" className="sr-only">
            Search shop
          </label>
          <Search className="bb-mobile-nav__search-icon" size={18} aria-hidden />
          <input
            id="nav-mobile-catalog-search"
            type="search"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products…"
            className="bb-mobile-nav__search-input"
          />
          <button type="submit" className={`bb-mobile-nav__search-submit ${TW_DARK_GOLD_BTN_DEPTH}`}>
            Search
          </button>
        </form>

        <div className="bb-mobile-nav__quick">
          {[
            { to: '/store' as const, label: 'Shop', icon: ShoppingBag },
            { to: '/repair' as const, label: 'Repair', icon: Wrench },
            { to: '/trades' as const, label: 'Trade-in', icon: RefreshCcw },
          ].map((link) => (
            <Link key={link.to} to={link.to} onClick={onAfterNavigate} className="bb-mobile-nav__quick-link">
              <link.icon size={16} aria-hidden />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        <nav className="bb-mobile-nav__scroll" aria-label="Site sections">
          {items.map((item) => {
            const active = pathname === item.path;
            const hasSubItems = Boolean(item.subItems?.length);
            const isSubmenuOpen = activeSubmenu === item.label;
            const section = sectionLabelFor(item.label);

            return (
              <React.Fragment key={item.label}>
                {section && <p className="bb-mobile-nav__section-label">{section}</p>}
                <div className={`bb-mobile-nav__item ${active && !hasSubItems ? 'bb-mobile-nav__item--active' : ''}`}>
                  <button
                    type="button"
                    className="bb-mobile-nav__item-main"
                    onClick={() => {
                      if (hasSubItems) {
                        setActiveSubmenu(isSubmenuOpen ? null : item.label);
                        return;
                      }
                      goTo(item.path);
                    }}
                    aria-label={item.ariaLabel ?? item.label}
                    aria-expanded={hasSubItems ? isSubmenuOpen : undefined}
                  >
                    <span className="bb-mobile-nav__item-icon" aria-hidden>
                      <item.icon size={18} />
                    </span>
                    <span className="bb-mobile-nav__item-label">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      item.label === 'Cart' ? (
                        <span className="bb-mobile-nav__item-count">{item.badge > 99 ? '99+' : item.badge}</span>
                      ) : (
                        <NavUnreadBadge count={item.badge} title="New activity" />
                      )
                    )}
                    {hasSubItems && (
                      <ChevronDown
                        size={16}
                        className={`bb-mobile-nav__item-chevron ${isSubmenuOpen ? 'bb-mobile-nav__item-chevron--open' : ''}`}
                        aria-hidden
                      />
                    )}
                  </button>

                  {hasSubItems && (
                    <div className={`bb-mobile-nav__sub ${isSubmenuOpen ? 'bb-mobile-nav__sub--open' : ''}`}>
                      <div className="bb-mobile-nav__sub-inner">
                        {item.subItems?.map((sub, idx) => {
                          if ('type' in sub && sub.type === 'info') {
                            return (
                              <div key={idx} className="bb-mobile-nav__info-card">
                                <p className="bb-mobile-nav__info-title">{sub.label}</p>
                                <p className="bb-mobile-nav__info-text">{sub.content}</p>
                              </div>
                            );
                          }
                          if (!('path' in sub)) return null;
                          const SubIcon = sub.icon;
                          return (
                            <button
                              key={sub.label}
                              type="button"
                              className="bb-mobile-nav__sub-link"
                              onClick={() => goTo(sub.path, sub.search)}
                            >
                              <span className="bb-mobile-nav__sub-icon" aria-hidden>
                                <SubIcon size={14} />
                              </span>
                              <span>{sub.label}</span>
                              {typeof sub.badge === 'number' && sub.badge > 0 && (
                                <NavUnreadBadge count={sub.badge} title="New since last visit" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </nav>

        <footer className="bb-mobile-nav__footer">
          {!user ? (
            <Link to="/auth" onClick={onClose} className={`bb-mobile-nav__cta ${TW_DARK_GOLD_BTN_DEPTH}`}>
              <UserIcon size={18} aria-hidden />
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              className="bb-mobile-nav__signout"
              onClick={async () => {
                if (setUser && navigateTo) await handleSignOut(setUser, navigateTo);
                onClose();
              }}
            >
              <LogOut size={18} aria-hidden />
              Sign out
            </button>
          )}
          <p className="bb-mobile-nav__version">BlackBox · Ghana</p>
        </footer>
      </aside>
    </div>
  );
};
