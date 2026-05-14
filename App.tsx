import React, { useState, useEffect, useLayoutEffect, createContext, useContext } from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
  createHashHistory
} from '@tanstack/react-router';
import { X, Activity, Scale, RefreshCcw, Home as HomeIcon, ShoppingBag, Wrench, ShoppingCart, User as UserIcon, LogOut, ChevronRight, ChevronDown, Settings, Sparkles, Eye, Clock } from 'lucide-react';
import { supabase, getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import { WhatsAppIcon } from './components/Icons';
import { Product, User, CartItem, Category, RepairRequest, Order, TradeRequest } from './types';
import { getProducts, getOrders, getTradeRequests, getRepairRequests } from './lib/api';
import { handleSignOut } from './lib/signOut';
import AuthService from './lib/auth';
import { canAccessAdminDashboard, normalizeCanonicalRole } from './lib/roles';
import { setupMobileBackButton, preventAppClose } from './lib/mobileNavigation';
import { scrollToDocumentTop } from './lib/scrollToDocumentTop';
import { INITIAL_PRODUCTS } from './constants';
import { Navbar } from './components/Navbar';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Footer } from './components/Footer';
import { NotificationContainer, type Notification } from './components/Notification';
import { Home } from './views/Home';
import { ProductDetail } from './views/ProductDetail';
import { Repair } from './views/Repair';
import { Store } from './views/Store';
import { Auth } from './views/Auth';
import { Profile } from './views/Profile';
import { Confirmation } from './views/Confirmation';
import { Cart } from './views/Cart';
import { Checkout } from './views/Checkout';
import { Trades } from './views/Trades';
import { Promotions } from './views/Promotions';
import { Admin } from './views/Admin';
import { ForgotPassword } from './views/ForgotPassword';
import { ResetPassword } from './views/ResetPassword';
import { AboutUs } from './views/AboutUs';
import { Contact } from './views/Contact';
import { FAQ } from './views/FAQ';
import { Compare } from './views/Compare';
import { Policies } from './views/Policies';
import { NotFound } from './views/NotFound';
import { ErrorPage } from './views/ErrorPage';
import { History } from './views/History';
import { Tracking } from './views/Tracking';
import { OrderReceipt } from './views/OrderReceipt';
import { Receipt } from './views/Receipt';
import { ReturnsPage } from './views/ReturnsPage';
// import { orders } from './data/orders'; 
import { QuickViewModal } from './components/QuickViewModal';
import { CompareModal } from './components/CompareModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { NotificationSystem } from './components/NotificationSystem';
import { generateId } from './lib/utils';
import { getProduct } from './lib/api';

const STORAGE_KEYS = {
  PRODUCTS: 'bb_v4_products',
  USER: 'bb_v4_user',
  CART: 'bb_v4_cart',
  ORDERS: 'bb_v4_orders',
  REPAIRS: 'bb_v4_repairs',
  WISHLIST: 'bb_v4_wishlist',
  COMPARE: 'bb_v4_compare',
  THEME: 'bb_v4_theme',
};

// --- APP CONTEXT ---
export type Theme = 'light' | 'dark';

export interface AppContextType {
  products: Product[];
  cart: CartItem[];
  wishlist: string[];
  compareIds: string[];
  user: User | null;
  orders: Order[];
  repairs: RepairRequest[];
  trades: TradeRequest[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategories: Category[];
  setSelectedCategories: (c: Category[]) => void;
  setUser: (u: User | null) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setRepairs: (r: RepairRequest[]) => void;
  setTrades: (t: TradeRequest[]) => void;
  setWishlist: React.Dispatch<React.SetStateAction<string[]>>;
  setCompareIds: React.Dispatch<React.SetStateAction<string[]>>;
  addToCart: (p: Product, o?: any, q?: number) => void;
  toggleWishlist: (id: string) => void;
  toggleCompare: (id: string) => void;
  onToggleCompare: (id: string) => void;
  updateQuantity: (id: string, o: any, d: number) => void;
  removeFromCart: (uid: string) => void;
  handleCheckout: (t: number) => void;
  notify: (m: string, t?: any) => void;
  navigateTo: (v: string, second?: string | { search?: Record<string, unknown> }) => void;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product, options?: Record<string, string>, qty?: number) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  refreshProducts: () => Promise<void>;
  /** False until first auth/session restore from storage + Supabase finishes. */
  authReady: boolean;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within an AppContextProvider");
  return context;
};

// HOME-01 / NAV-01: disable browser scroll restoration and force top-of-page
// after route changes and after late layout (images). Hash-router pathname
// alone can miss updates; include search + hash in the dependency key.
const ScrollToTop = () => {
  // TanStack Router: `location.search` is the validated search *object*, not `?query=`.
  // Stringifying it in a template can throw (e.g. "Cannot convert object to primitive value").
  const scrollKey = useLocation({ select: (l) => l.href });

  useEffect(() => {
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch {
      // ignore — some embedded browsers throw here
    }
  }, []);

  // useLayoutEffect runs before paint so mobile Safari does not keep the prior
  // route’s scroll position (user stuck viewing the footer after navigation).
  useLayoutEffect(() => {
    scrollToDocumentTop();
    let rafInner = 0;
    const rafOuter = window.requestAnimationFrame(() => {
      scrollToDocumentTop();
      rafInner = window.requestAnimationFrame(scrollToDocumentTop);
    });
    const t0 = window.setTimeout(scrollToDocumentTop, 0);
    const t1 = window.setTimeout(scrollToDocumentTop, 120);
    const t2 = window.setTimeout(scrollToDocumentTop, 400);

    return () => {
      window.cancelAnimationFrame(rafOuter);
      if (rafInner) window.cancelAnimationFrame(rafInner);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [scrollKey]);

  return null;
};

// --- ERROR & NOT FOUND WRAPPERS ---
const NotFoundPage = () => {
  const context = useContext(AppContext);
  const theme = context?.theme || 'dark';
  return <NotFound theme={theme as any} />;
};

const ErrorBoundary = ({ error, reset }: { error: any; reset: () => void }) => {
  const context = useContext(AppContext);
  const theme = context?.theme || 'dark';
  return <ErrorPage error={error} reset={reset} theme={theme as any} />;
};

// --- ROUTES SETUP ---
const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorBoundary,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    const context = useAppContext();
    return <Home {...context} />;
  },
});

const storeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/store',
  validateSearch: (search: Record<string, unknown>): { categories?: string[]; q?: string } => {
    let categories: string[] | undefined;
    
    if (search.categories) {
      // Handle ?categories=phones,laptops format
      if (typeof search.categories === 'string') {
        categories = (search.categories as string).split(',').map(c => c.trim());
      } else {
        categories = search.categories as string[];
      }
    } else if (search.category) {
      // Handle ?category=phones format
      categories = [search.category as string];
    }

    let q: string | undefined;
    if (typeof search.q === 'string') {
      const trimmed = search.q.trim();
      if (trimmed) q = trimmed.slice(0, 200);
    }
    
    return { categories, q };
  },
  component: () => {
    const context = useAppContext();
    const { categories, q } = storeRoute.useSearch();
    return <Store {...context} categoriesFromUrl={categories} searchFromUrl={q} />;
  },
});

const productDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/product/$productId',
  component: () => {
    const { productId } = useParams({ from: productDetailRoute.id } as any);
    const { products, theme, ...context } = useAppContext();
    
    // Start with local state for instant render, then refresh from database
    const localProduct = products.find((p: Product) => p.id === productId);
    const [product, setProduct] = useState<Product | null>(localProduct || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!productId) return;
      setLoading(true);
      setError(null);
      getProduct(productId)
        .then((remoteProduct) => {
          if (remoteProduct) {
            setProduct(remoteProduct);
          } else if (!localProduct) {
            setError('Product not found');
          }
        })
        .catch((err) => {
          console.error('Failed to fetch product:', err);
          if (!localProduct) {
            setError('Product not found');
          }
        })
        .finally(() => setLoading(false));
    }, [productId, localProduct]);

    if (loading) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-2 border-t-[#B38B21] border-white/10 animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/60">Loading product...</p>
          </div>
        </div>
      );
    }

    if (error || !product) {
      return <NotFound theme={theme} />;
    }

    return (
      <ProductDetail
        product={product}
        relatedProducts={products
          .filter((p: Product) => p.category === product.category && p.id !== product.id)
          .filter((p, index, self) => index === self.findIndex((t) => t.id === p.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, 4)}
        addToCart={context.addToCart}
        isWishlisted={context.wishlist.includes(product.id)}
        onToggleWishlist={context.toggleWishlist}
        navigateTo={context.navigateTo}
        theme={theme}
      />
    );
  },
});

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: () => {
    const context = useAppContext();
    return <Cart {...context} />;
  },
});

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: () => {
    const { authReady, theme } = useAppContext();
    if (!authReady) {
      return <RouteSessionSpinner theme={theme} label="Loading session…" />;
    }
    return <Checkout />;
  },
});

const repairRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/repair',
  component: () => {
    const context = useAppContext();
    return <Repair />;
  },
});

const tradesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trades',
  component: () => {
    const context = useAppContext();
    return <Trades
      products={context.products}
      onAddToCart={context.onAddToCart}
      notify={context.notify}
      onQuickView={context.onQuickView}
    />;
  },
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => {
    const { authReady, trades, ...context } = useAppContext();
    if (!authReady) {
      return <RouteSessionSpinner theme={context.theme} label="Loading session…" />;
    }
    return <Profile {...context} trades={trades} />;
  },
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  validateSearch: (search: Record<string, unknown>) => ({
    message: typeof search.message === 'string' ? search.message : undefined,
  }),
  component: () => {
    const context = useAppContext();
    return <Auth setUser={context.setUser} navigateTo={context.navigateTo} notify={context.notify} />;
  },
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: () => <ForgotPassword />,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: () => <ResetPassword />,
});

/**
 * Full-page spinner while session is restored or privileged routes re-check Supabase.
 */
const RouteSessionSpinner: React.FC<{
  theme: 'light' | 'dark';
  label?: string;
}> = ({ theme, label = 'Verifying access…' }) => {
  const isLight = theme === 'light';
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-4 p-8 ${isLight ? 'bg-[#F0F0F0] text-black' : 'bg-black text-white'}`}>
      <Activity className={`h-10 w-10 animate-pulse ${isLight ? 'text-black/30' : 'text-[#CDA032]'}`} />
      <p className={`text-xs font-black uppercase tracking-[0.25em] ${isLight ? 'text-black/50' : 'text-white/40'}`}>
        {label}
      </p>
    </div>
  );
};

/** Signed-out wall for routes that require an authenticated customer session. */
const SignInRequiredWall: React.FC<{
  theme: 'light' | 'dark';
  navigateTo: (path: string) => void;
}> = ({ theme, navigateTo }) => {
  const isLight = theme === 'light';
  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isLight ? 'bg-white' : 'bg-black'}`}>
      <div className="text-center space-y-6 max-w-sm">
        <h2 className={`text-xl font-black uppercase tracking-tight italic ${isLight ? 'text-black' : 'text-white'}`}>
          Sign in required
        </h2>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
          Sign in to view this page.
        </p>
        <button
          type="button"
          onClick={() => navigateTo('/auth')}
          className="px-10 py-4 bg-gradient-to-r from-[#B38B21] to-[#D4AF37] text-black font-black rounded-full text-[10px] uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-[0_10px_40px_rgba(179,139,33,0.3)]"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

/**
 * Admin dashboard: require Supabase-validated session + live admin/staff role.
 * Blocks forged localStorage roles and expired sessions.
 */
const AdminRouteShell: React.FC = () => {
  const { user, authReady, theme, navigateTo, setUser } = useAppContext();
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authReady) {
      setVerified(null);
      return;
    }
    if (!user || !canAccessAdminDashboard(user.role)) {
      setVerified(false);
      return;
    }

    let cancelled = false;
    setVerified(null);

    (async () => {
      const live = await AuthService.verifyLiveAdminOrStaffSession();
      if (cancelled) return;

      if (!live) {
        try {
          if (isSupabaseConfigured()) {
            const { data: { session } } = await getSupabaseClient().auth.getSession();
            if (!session) {
              localStorage.removeItem(STORAGE_KEYS.USER);
              setUser(null);
            }
          } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
            setUser(null);
          }
        } catch {
          /* ignore */
        }
        setVerified(false);
        return;
      }

      if (live.id !== user.id) {
        setVerified(false);
        return;
      }

      setUser((prev) =>
        prev && prev.id === live.id
          ? {
              ...prev,
              email: live.email,
              name: live.name ?? prev.name,
              role: normalizeCanonicalRole(live.role) as User['role'],
            }
          : prev
      );
      setVerified(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id, user?.role, user?.email, setUser]);

  if (!authReady) {
    return <RouteSessionSpinner theme={theme} label="Loading session…" />;
  }
  if (!user) {
    return <AdminAccessDenied reason="not-logged-in" navigateTo={navigateTo} theme={theme} />;
  }
  if (!canAccessAdminDashboard(user.role)) {
    return <AdminAccessDenied reason="not-admin" navigateTo={navigateTo} theme={theme} />;
  }
  if (verified === null) {
    return <RouteSessionSpinner theme={theme} label="Verifying admin access…" />;
  }
  if (!verified) {
    return <AdminAccessDenied reason="not-admin" navigateTo={navigateTo} theme={theme} />;
  }

  return <Admin user={user} setUser={setUser} navigateTo={navigateTo} theme={theme} />;
};

/**
 * Inline access gate for the /admin route. Renders a friendly denial
 * screen instead of the dashboard whenever the visitor isn't a logged-in
 * admin. Defense in depth — the Admin component itself also gates its
 * own privileged actions by role.
 */
const AdminAccessDenied: React.FC<{
  reason: 'not-logged-in' | 'not-admin';
  navigateTo: (path: string) => void;
  theme: 'light' | 'dark';
}> = ({ reason, navigateTo, theme }) => {
  const isLight = theme === 'light';
  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isLight ? 'bg-[#F0F0F0] text-black' : 'bg-black text-white'}`}>
      <div className={`w-full max-w-md rounded-2xl border p-8 text-center ${isLight ? 'bg-white border-black/10' : 'bg-[#0a0a0a] border-white/10'}`}>
        <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-xl font-black italic uppercase tracking-tight mb-2">Access Restricted</h1>
        <p className={`text-sm mb-6 ${isLight ? 'text-black/60' : 'text-white/60'}`}>
          {reason === 'not-logged-in'
            ? 'You need to sign in with an admin or staff account to view this page.'
            : 'Your account does not have admin or staff permissions. Contact a system administrator if you believe this is a mistake.'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigateTo(reason === 'not-logged-in' ? '/auth' : '/')}
            className="w-full py-3 bg-[#CDA032] text-black font-black rounded-xl text-xs uppercase tracking-[0.15em] hover:brightness-110 transition-all"
          >
            {reason === 'not-logged-in' ? 'Sign In' : 'Go Home'}
          </button>
          {reason === 'not-admin' && (
            <button
              onClick={() => navigateTo('/auth')}
              className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-[0.15em] border transition-all ${isLight ? 'border-black/10 hover:bg-black/5' : 'border-white/10 hover:bg-white/5'}`}
            >
              Switch account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminRouteShell,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: () => {
    const context = useAppContext();
    return <AboutUs theme={context.theme} />;
  },
});

const faqRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/faq',
  component: () => {
    const context = useAppContext();
    return <FAQ theme={context.theme} />;
  },
});

const contactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contact',
  component: () => {
    return <Contact />;
  },
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || 'orders'
    }
  },
  component: () => {
    const ctx = useAppContext();
    if (!ctx.authReady) {
      return <RouteSessionSpinner theme={ctx.theme} label="Loading session…" />;
    }
    if (!ctx.user) {
      return <SignInRequiredWall theme={ctx.theme} navigateTo={ctx.navigateTo} />;
    }
    return <History />;
  },
});

const trackingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tracking/$type/$id',
  component: () => {
    return <Tracking />;
  },
});

const receiptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/receipt/$orderId',
  component: () => {
    return <Receipt />;
  },
});

const returnsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/returns',
  component: () => <ReturnsPage />,
});

const promotionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/promotions",
  component: () => <Promotions />,
});

const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/compare",
  component: () => <Compare />,
});

const policiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/policies',
  component: () => <Policies />,
});

const confirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirmation',
  component: () => {
    const context = useAppContext();
    const { email } = confirmationRoute.useSearch();
    return (
      <Confirmation
        theme={context.theme}
        navigateTo={context.navigateTo}
        notify={context.notify}
        email={email}
        setUser={context.setUser}
      />
    );
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: (search.email as string) || ''
    };
  },
});

const emailConfirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/emailconfirm',
  component: () => {
    const context = useAppContext();
    const { email } = emailConfirmRoute.useSearch();
    return (
      <Confirmation
        theme={context.theme}
        navigateTo={context.navigateTo}
        notify={context.notify}
        email={email}
        setUser={context.setUser}
      />
    );
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: (search.email as string) || ''
    };
  },
});

// QA-only debug route: renders the ErrorPage so STC-15 can be tested
// without having to crash a real component.
const errorDebugRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/error',
  component: () => {
    const context = useAppContext();
    return (
      <ErrorPage
        theme={context.theme as any}
        error={{ message: 'Diagnostic preview — triggered manually via /error route.' }}
        reset={() => window.location.reload()}
      />
    );
  },
});

const splatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: NotFoundPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  storeRoute,
  productDetailRoute,
  cartRoute,
  checkoutRoute,
  repairRoute,
  tradesRoute,
  profileRoute,
  authRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  adminRoute,
  aboutRoute,
  faqRoute,
  contactRoute,
  historyRoute,
  trackingRoute,
  receiptRoute,
  returnsRoute,
  promotionsRoute,
  compareRoute,
  policiesRoute,
  confirmationRoute,
  emailConfirmRoute,
  errorDebugRoute,
  splatRoute,
]);

const hashHistory = createHashHistory();

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  history: hashHistory,
} as any);

function RootComponent() {
  // Seed with INITIAL_PRODUCTS so Home (and navbar search) render on first paint
  // before getProducts() resolves — avoids an empty <main> and a “footer-only” layout.
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [trades, setTrades] = useState<TradeRequest[]>([]);

  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => {
    try {
      return !sessionStorage.getItem('bb_v4_welcomed');
    } catch {
      return true;
    }
  });

  // Stable handler so WelcomeScreen's auto-dismiss timer is not reset on every
  // parent re-render (APP-01 / APP-02).
  const completeWelcome = React.useCallback(() => {
    try {
      sessionStorage.setItem('bb_v4_welcomed', 'true');
    } catch {
      /* sessionStorage unavailable (private mode) — still hide welcome */
    }
    setShowWelcomeScreen(false);
    scrollToDocumentTop();
  }, []);
  const [theme, setTheme] = useState<Theme>('light');

  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin';
  const isForgotPasswordRoute = location.pathname === '/forgot-password';
  const isResetPasswordRoute = location.pathname === '/reset-password';
  const isConfirmationRoute = location.pathname === '/confirmation';
  const isEmailConfirmRoute = location.pathname === '/emailconfirm';
  const isStandaloneRoute = isAdminRoute || isForgotPasswordRoute || isResetPasswordRoute || isConfirmationRoute || isEmailConfirmRoute;

  // Memoized so the context value identity is stable and admin views
  // can call it directly (or fire the `products:refresh` window event
  // — see the listener below) to update the global product list after
  // a mutation (e.g. starring a product as featured for HOME-03).
  //
  // APP-05: if Supabase is unreachable or misconfigured we fall back to
  // INITIAL_PRODUCTS so the app still renders something instead of an
  // empty store.
  const refreshProducts = React.useCallback(async () => {
    try {
      const productsData = await getProducts();
      if (Array.isArray(productsData) && productsData.length > 0) {
        setProducts(productsData);
      } else {
        // Remote returned an empty list — keep the UX populated with the
        // built-in catalogue so the home/store pages stay useful (APP-05).
        setProducts(INITIAL_PRODUCTS);
      }
    } catch (error) {
      console.error('Failed to fetch products from Supabase, using INITIAL_PRODUCTS fallback:', error);
      setProducts(INITIAL_PRODUCTS);
    }
  }, []);

  useEffect(() => {
    const handler = () => { refreshProducts(); };
    window.addEventListener('products:refresh', handler);
    return () => window.removeEventListener('products:refresh', handler);
  }, [refreshProducts]);

  // Setup mobile navigation
  useEffect(() => {
    const cleanup = setupMobileBackButton();
    preventAppClose();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch((error) => {
          console.log('Service Worker cleanup failed:', error);
        });
    }

    return cleanup;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const markAuthReady = () => {
      if (!cancelled) setAuthReady(true);
    };

    try {
      const localUser = localStorage.getItem(STORAGE_KEYS.USER);
      const localCart = localStorage.getItem(STORAGE_KEYS.CART);
      const localOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const localRepairs = localStorage.getItem(STORAGE_KEYS.REPAIRS);
      const localTrades = localStorage.getItem('bb_v4_trades');
      const localWishlist = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      const localCompare = localStorage.getItem(STORAGE_KEYS.COMPARE);
      const localTheme = localStorage.getItem(STORAGE_KEYS.THEME);

      if (localUser) {
        let parsedUser: User | null = null;
        let parseOk = false;
        try {
          parsedUser = JSON.parse(localUser);
          parseOk = true;
        } catch {
          localStorage.removeItem(STORAGE_KEYS.USER);
        }

        if (parseOk && parsedUser) {
          console.log('Found local user:', parsedUser);

          const validateUserSession = async () => {
            try {
              const currentUser = await AuthService.getCurrentUser();
              console.log('Current Supabase user:', currentUser);

              if (cancelled) return;

              if (currentUser && currentUser.id === parsedUser!.id) {
                console.log('User session is valid, restoring user');
                setUser({
                  ...parsedUser!,
                  id: currentUser.id,
                  email: currentUser.email,
                  name: currentUser.name ?? parsedUser!.name,
                  role: normalizeCanonicalRole(currentUser.role ?? parsedUser!.role),
                });
              } else {
                console.log('User session is invalid, clearing user');
                localStorage.removeItem(STORAGE_KEYS.USER);
                setUser(null);
              }
            } catch (error) {
              console.error('Error validating user session:', error);
              localStorage.removeItem(STORAGE_KEYS.USER);
              setUser(null);
            } finally {
              markAuthReady();
            }
          };

          void validateUserSession();
        } else {
          markAuthReady();
        }
      } else {
        markAuthReady();
      }

      if (localCart) setCart(JSON.parse(localCart));
      if (localOrders) setOrders(JSON.parse(localOrders));
      if (localRepairs) setRepairs(JSON.parse(localRepairs));
      if (localTrades) setTrades(JSON.parse(localTrades));
      if (localWishlist) setWishlist(JSON.parse(localWishlist));
      if (localCompare) setCompareIds(JSON.parse(localCompare));
      if (localTheme === 'light' || localTheme === 'dark') setTheme(localTheme);
    } catch (e) {
      console.error('Error loading from localStorage:', e);
      markAuthReady();
    }

    refreshProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Email-flow routing. Supabase's redirect after a "forgot password" or
  // "confirm email" click is unreliable when the redirectTo URL uses a
  // hash fragment (fragments can be stripped, recovery tokens can land in
  // either the search string or the hash). To make this robust:
  //   1. Listen for the PASSWORD_RECOVERY auth event and bounce to
  //      /reset-password whenever it fires.
  //   2. Inspect the entry URL on mount and bounce immediately if we see
  //      a `type=recovery` or `type=email_confirm` marker in either the
  //      search string or the hash.
  useEffect(() => {
    if (!supabase) return;

    const goTo = (path: string) => {
      if (location.pathname !== path) {
        navigate({ to: path as any });
      }
    };

    // Initial URL inspection (covers links that land on the homepage with
    // auth-flow params in either the search or the hash).
    try {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const looksLike = (marker: string): boolean =>
        new RegExp(`(^|[?&#])type=${marker}(?:&|$)`).test(search) ||
        new RegExp(`(^|[?&#])type=${marker}(?:&|$)`).test(hash);

      if (looksLike('recovery') || /access_token=.*type=recovery/.test(hash)) {
        goTo('/reset-password');
      } else if (looksLike('email_confirm') || looksLike('signup')) {
        goTo('/emailconfirm');
      }
    } catch {
      /* ignore — window may be unavailable */
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') goTo('/reset-password');
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    localStorage.setItem(STORAGE_KEYS.REPAIRS, JSON.stringify(repairs));
    localStorage.setItem('bb_v4_trades', JSON.stringify(trades));
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
    localStorage.setItem(STORAGE_KEYS.COMPARE, JSON.stringify(compareIds));
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [user, cart, orders, repairs, trades, wishlist, compareIds, theme]);

  // Supabase Realtime: customer subscribes to status changes pushed by admin
  // for their orders, trade-ins and repairs. Refetches on every change so
  // the user sees admin updates instantly without a refresh.
  useEffect(() => {
    if (!user?.id || !supabase) return;

    const refetchOrders  = () => getOrders(user.id).then((d) => setOrders(d as any)).catch(() => {});
    const refetchTrades  = () => getTradeRequests(user.id).then((d) => setTrades(d as any)).catch(() => {});
    const refetchRepairs = () => getRepairRequests(user.id).then((d) => setRepairs(d as any)).catch(() => {});

    const channel = supabase
      .channel(`customer-live-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const newStatus = payload?.new?.status;
          const oldStatus = payload?.old?.status;
          if (newStatus && newStatus !== oldStatus) {
            notify(`Order status updated: ${newStatus}`, 'success');
          }
          refetchOrders();
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'trade_in_requests', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload?.new?.status && payload.new.status !== payload?.old?.status) {
            notify(`Trade-in update: ${payload.new.status}`, 'info');
          }
          refetchTrades();
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'repair_requests', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload?.new?.status && payload.new.status !== payload?.old?.status) {
            notify(`Repair update: ${payload.new.status}`, 'info');
          }
          refetchRepairs();
        })
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Hydrate per-user orders / trades / repairs from Supabase so admin
  // dashboard changes are reflected on the customer side and vice versa.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [ord, tr, rp] = await Promise.all([
          getOrders(user.id).catch(() => []),
          getTradeRequests(user.id).catch(() => []),
          getRepairRequests(user.id).catch(() => []),
        ]);
        if (cancelled) return;
        if (Array.isArray(ord) && ord.length) setOrders(ord as any);
        if (Array.isArray(tr) && tr.length) setTrades(tr as any);
        if (Array.isArray(rp) && rp.length) setRepairs(rp as any);
      } catch (e) {
        console.warn('User data hydration failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Apply theme globally (CSS reads html[data-theme]; Tailwind `dark:` reads .dark on <html>).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const notify = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const newNotification: Notification = {
      id: generateId(),
      message: msg,
      type,
      duration: 4000
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const navigateTo = (to: string, second?: string | { search?: Record<string, unknown> }) => {
    console.log('NavigateTo called with:', { to, second });

    if (second && typeof second === 'object' && second !== null && 'search' in second) {
      const path = to === 'home' ? '/' : (to.startsWith('/') ? to : `/${to}`);
      navigate({ to: path as any, search: second.search as any });
    } else if (typeof second === 'string' && second.trim()) {
      console.log('Navigating to product:', second);
      navigate({ to: `/product/${second}` as any });
    } else if (to.startsWith('http')) {
      console.log('Opening external URL:', to);
      window.open(to, '_blank', 'noopener,noreferrer');
    } else {
      let path = to === 'home' ? '/' : (to.startsWith('/') ? to : `/${to}`);
      let searchFromPath: Record<string, string> | undefined;
      const qIdx = path.indexOf('?');
      if (qIdx !== -1) {
        const qs = path.slice(qIdx + 1);
        path = path.slice(0, qIdx) || '/';
        searchFromPath = Object.fromEntries(new URLSearchParams(qs).entries());
      }
      if (searchFromPath && Object.keys(searchFromPath).length > 0) {
        navigate({ to: path as any, search: searchFromPath as any });
      } else {
        navigate({ to: path as any });
      }
    }
    setIsMobileMenuOpen(false);
    scrollToDocumentTop();
  };

  const addToCart = (product: Product, options: Record<string, string> = {}, qty: number = 1) => {
    setCart(prev => {
      const existingId = `${product.id}-${JSON.stringify(options)}`;
      const existingIndex = prev.findIndex(p => `${p.id}-${JSON.stringify(p.selectedOptions)}` === existingId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += qty;
        return updated;
      }
      return [...prev, { ...product, quantity: qty, selectedOptions: options }];
    });
    notify(`${product.name} logged to repository.`);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const exists = prev.includes(productId);
      notify(exists ? 'Unit removed from wishlist' : 'Unit logged to wishlist');
      return exists ? prev.filter(id => id !== productId) : [...prev, productId];
    });
  };

  const toggleCompare = (productId: string) => {
    setCompareIds(prev => {
      if (prev.includes(productId)) return prev.filter(id => id !== productId);
      if (prev.length >= 4) { notify('Comparison limit reached (4)', 'error'); return prev; }
      return [...prev, productId];
    });
  };

  const updateQuantity = (id: string, options: Record<string, string> | undefined, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && JSON.stringify(item.selectedOptions) === JSON.stringify(options)) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(prev => prev.filter(p => `${p.id}-${JSON.stringify(p.selectedOptions)}` !== uniqueId));
  };

  const handleCheckout = (_total: number) => {
    navigate({ to: '/checkout' as any });
  };

  const contextValues: AppContextType = {
    products, cart, wishlist, compareIds, user, orders, repairs, trades,
    searchQuery, setSearchQuery,
    selectedCategories, setSelectedCategories,
    setUser, setCart, setOrders,
    setRepairs, setTrades, setWishlist, setCompareIds, addToCart, toggleWishlist, toggleCompare,
    onToggleCompare: toggleCompare,
    updateQuantity, removeFromCart, handleCheckout, notify, navigateTo,
    onQuickView: (p: Product) => { setQuickViewProduct(p); setIsQuickViewOpen(true); },
    onAddToCart: (p: Product, options?: Record<string, string>, qty?: number) => addToCart(p, options, qty),
    theme,
    setTheme,
    refreshProducts,
    authReady,
  };

  const isLight = theme === 'light';

  return (
    <AppContext.Provider value={contextValues}>
      <ScrollToTop />
      {/* Welcome Screen */}
      {showWelcomeScreen && (
        <WelcomeScreen onComplete={completeWelcome} />
      )}

      {isStandaloneRoute ? (
        // Standalone admin layout (no site navbar/footer/whatsapp/etc.)
        <div className={`min-h-screen ${isLight ? 'bg-[#FAFAFA] text-black' : 'bg-[#060606] text-white'}`}>
          <Outlet />
        </div>
      ) : (
        <div className={`flex flex-col min-h-screen selection:bg-[#B38B21] selection:text-black ${showWelcomeScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isLight ? 'bg-[#F0F0F0] text-black' : 'bg-black text-white'}`}>
          <Navbar
            cart={cart}
            navigateTo={navigateTo}
            user={user}
            products={products}
            orders={orders}
            repairs={repairs}
            trades={trades}
            theme={theme}
            setTheme={setTheme}
            setSearchQuery={setSearchQuery}
            setUser={setUser}
          />

          <FloatingWhatsApp phoneNumber="233000000000" theme={theme} hasNotification={notifications.length > 0} />

          <main className="flex-1">
            <Outlet />
          </main>

          {compareIds.length > 0 && (
          <div className="fixed top-24 right-5 z-[100] flex items-center bg-[#B38B21] rounded-full shadow-[0_10px_40px_rgba(179,139,33,0.4)] transition-transform hover:scale-[1.02] overflow-hidden">
            <button
              onClick={() => setIsCompareOpen(true)}
              className="pl-6 pr-4 py-4 text-black font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-3 border-r border-black/10 hover:bg-black/5 transition-colors"
            >
              <Scale size={16} /> Compare ({compareIds.length})
            </button>
            <button
              onClick={() => setCompareIds([])}
              className="px-4 py-4 text-black hover:bg-black/10 transition-colors"
              aria-label="Clear Compare"
            >
              <X size={16} />
            </button>
          </div>
          )}

        <QuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          product={quickViewProduct}
          onAddToCart={addToCart}
        />

        <CompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          products={products.filter(p => compareIds.includes(p.id))}
          allProducts={products}
          onRemove={toggleCompare}
          onAdd={toggleCompare}
          onAddToCart={(p) => addToCart(p)}
        />

        {/* Legacy single-toast removed — all notifications now flow through
            the stacked NotificationContainer mounted at the App root so
            multiple toasts can appear simultaneously (APP-11) with proper
            per-type colours (APP-09 / APP-10). */}

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[150] lg:hidden no-print">
            {/* Backdrop */}
            <div
              className={`absolute inset-0 backdrop-blur-sm transition-opacity duration-500 ${isLight ? 'bg-black/20' : 'bg-black/60'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Side Panel */}
            <div
              className={`absolute right-0 top-0 h-full w-[60%] max-w-[400px] shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col ${isLight ? 'bg-[#FAFAFA]' : 'bg-[#0A0A0A] border-l border-white/5'}`}
            >
              {/* Header */}
              <div className="p-6 flex items-center justify-between border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    <Activity size={16} />
                  </div>
                  <span className="text-sm font-black tracking-tighter uppercase italic">Menu</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-2 rounded-full transition-all ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* User Section */}
              <div className="p-6 border-b border-black/5 dark:border-white/5">
                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#CDA032] flex items-center justify-center text-black font-black text-xl italic shadow-lg">
                      {user.avatarLetter || user.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-xs uppercase tracking-widest truncate">{user.name}</p>
                      <p className="text-[10px] text-white/40 truncate">{user.email}</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => navigateTo('auth')}
                    className="w-full py-4 bg-[#CDA032] text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-3"
                  >
                    <UserIcon size={16} /> Sign In
                  </button>
                )}
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-auto py-4 px-3 space-y-1">
                {[
                  { id: 'home', label: 'Home', icon: HomeIcon, path: '/' },
                  { id: 'store', label: 'Products', icon: ShoppingBag, path: '/store', subItems: ['iPhone', 'Laptop', 'Accessories', 'Gaming', 'Audio', 'Track Orders'] },
                  { id: 'trades', label: 'Trades', icon: RefreshCcw, path: '/trades', subItems: ['Initiate Trade', 'Track Trade-In'] },
                  { id: 'repair', label: 'Repairs', icon: Wrench, path: '/repair', subItems: ['Schedule Repair', 'Repair Status'] },
                  { id: 'cart', label: 'Cart', icon: ShoppingCart, path: '/cart', count: cart.length },
                  { id: 'profile', label: 'Account', icon: UserIcon, path: '/profile' },
                  { id: 'about', label: 'About Us', icon: Sparkles, path: '/about' },
                  { id: 'contact', label: 'Contact', icon: WhatsAppIcon, path: 'https://wa.me/233000000000' }
                ].map((item: any) => {
                  const isActive = location.pathname === item.path;

                  if (item.subItems) {
                    return (
                      <details key={item.id} className="group/nav w-full">
                        <summary className={`list-none flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer select-none ${isActive
                          ? isLight ? 'bg-black text-white shadow-lg' : 'bg-white/10 text-white shadow-[0_0_20px_rgba(205,160,50,0.15)]'
                          : isLight ? 'text-black/60 hover:bg-black/5' : 'text-white/40 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div
                            className="flex items-center gap-4 flex-1"
                            onClick={(e) => {
                              e.preventDefault();
                              navigateTo(item.path === '/' ? 'home' : item.id);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <item.icon size={18} className={isActive ? 'text-[#CDA032]' : ''} />
                            <span className="text-[11px] font-black uppercase tracking-[0.15em]">{item.label}</span>
                          </div>

                          <div className="flex items-center gap-2 pl-4">
                            <ChevronDown size={14} className={`transition-transform duration-300 group-open/nav:rotate-180 ${isActive ? 'text-[#CDA032]' : ''}`} />
                          </div>
                        </summary>

                        <div className="flex flex-col gap-1 pl-12 pr-4 pt-2 pb-4 animate-in fade-in slide-in-from-top-2">
                          {item.subItems.map((sub: string) => (
                            <button
                              key={sub}
                              onClick={() => {
                                if (sub === 'Track Orders') {
                                  navigateTo('/history', { search: { tab: 'orders' } } as any);
                                } else if (sub === 'Track Trade-In') {
                                  navigateTo('/history', { search: { tab: 'trades' } } as any);
                                } else if (sub === 'Repair Status') {
                                  navigateTo('/history', { search: { tab: 'repairs' } } as any);
                                } else if (sub === 'Initiate Trade') {
                                  navigateTo('trades');
                                } else if (sub === 'Schedule Repair') {
                                  navigateTo('repair');
                                } else {
                                  setSelectedCategories([sub as any]);
                                  navigateTo('store');
                                }
                                setIsMobileMenuOpen(false);
                              }}
                              className={`text-left py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors rounded-lg px-3 ${isLight ? 'text-black/50 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </details>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigateTo(item.path === '/' ? 'home' : item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all group ${isActive
                        ? isLight ? 'bg-black text-white shadow-lg' : 'bg-white/10 text-white shadow-[0_0_20px_rgba(205,160,50,0.15)]'
                        : isLight ? 'text-black/60 hover:bg-black/5' : 'text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <item.icon size={18} className={isActive ? 'text-[#CDA032]' : ''} />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em]">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.count !== undefined && item.count > 0 && (
                          <span className={`px-2 py-0.5 text-[9px] rounded-full ${isActive ? 'bg-[#CDA032] text-black' : isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                            {item.count}
                          </span>
                        )}
                        <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-[#CDA032]' : ''}`} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-black/5 dark:border-white/5 mt-auto">
                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] italic mb-4">
                  Blackbox Terminal v4.0
                </p>
                {user && (
                  <button
                    onClick={() => handleSignOut(setUser, navigateTo)}
                    className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

          <Footer theme={theme} />
      </div>
      )}

      {/* Notification Container */}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    </AppContext.Provider>
  );
}

export default function App() {
  // Some components (notably error/edge states) can render before `RootComponent`
  // mounts, which would make `useAppContext()` throw. Provide a lightweight
  // fallback context at the app root; `RootComponent` still provides the real
  // context during normal operation (nested provider overrides this one).
  const [theme, setTheme] = useState<Theme>(() => {
    const t = localStorage.getItem(STORAGE_KEYS.THEME);
    return t === 'light' || t === 'dark' ? t : 'light';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  const noop = () => {};
  const noopNotify = () => {};

  const fallbackContext: AppContextType = {
    products: [],
    cart: [],
    wishlist: [],
    compareIds: [],
    user: null,
    orders: [],
    repairs: [],
    trades: [],
    searchQuery,
    setSearchQuery,
    selectedCategories,
    setSelectedCategories,
    setUser: noop as any,
    setCart: noop as any,
    setOrders: noop as any,
    setRepairs: noop as any,
    setTrades: noop as any,
    setWishlist: noop as any,
    setCompareIds: noop as any,
    addToCart: noop as any,
    toggleWishlist: noop as any,
    toggleCompare: noop as any,
    onToggleCompare: noop as any,
    updateQuantity: noop as any,
    removeFromCart: noop as any,
    handleCheckout: noop as any,
    notify: noopNotify as any,
    navigateTo: noop as any,
    onQuickView: noop as any,
    onAddToCart: noop as any,
    theme,
    setTheme,
    refreshProducts: (async () => {}) as any,
    authReady: true,
  };

  return (
    <AppContext.Provider value={fallbackContext}>
      <RouterProvider router={router} />
    </AppContext.Provider>
  );
}
