import React, { useState, useEffect, createContext, useContext } from 'react';
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
import { X, CheckCircle2, Activity, Scale, RefreshCcw, Home as HomeIcon, ShoppingBag, Wrench, ShoppingCart, User as UserIcon, LogOut, ChevronRight, ChevronDown, Settings, AlertTriangle, Sparkles, Eye, Clock } from 'lucide-react';
import { supabase } from './lib/supabase';
import { WhatsAppIcon } from './components/Icons';
import { Product, User, CartItem, Category, RepairRequest, Order, TradeRequest } from './types';
import { getProducts } from './lib/api';
import { handleSignOut } from './lib/signOut';
import AuthService from './lib/auth';
import { setupMobileBackButton, preventAppClose } from './lib/mobileNavigation';
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
  addToCart: (p: Product, o?: any, q?: number) => void;
  toggleWishlist: (id: string) => void;
  toggleCompare: (id: string) => void;
  onToggleCompare: (id: string) => void;
  updateQuantity: (id: string, o: any, d: number) => void;
  removeFromCart: (uid: string) => void;
  handleCheckout: (t: number) => void;
  notify: (m: string, t?: any) => void;
  navigateTo: (v: string, id?: string) => void;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product, options?: Record<string, string>, qty?: number) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within an AppContextProvider");
  return context;
};

// --- SCROLL TO TOP ---
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
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
  validateSearch: (search: Record<string, unknown>): { categories?: string[] } => {
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
    
    return { categories };
  },
  component: () => {
    const context = useAppContext();
    const { categories } = storeRoute.useSearch();
    return <Store {...context} categoriesFromUrl={categories} />;
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
        theme={context.theme}
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
      {...context}
      trades={context.trades}
      setTrades={context.setTrades}
      user={context.user}
      navigateTo={context.navigateTo}
    />;
  },
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => {
    const { trades, ...context } = useAppContext();
    return <Profile {...context} trades={trades} />;
  },
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: () => {
    const context = useAppContext();
    return <Auth setUser={context.setUser} navigateTo={context.navigateTo} notify={context.notify} />;
  },
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => {
    const context = useAppContext();
    return <Admin setUser={context.setUser} navigateTo={context.navigateTo} theme={context.theme} />;
  },
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
    return <Confirmation theme={context.theme} navigateTo={context.navigateTo} email={email} />;
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: (search.email as string) || ''
    };
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
  adminRoute,
  aboutRoute,
  faqRoute,
  contactRoute,
  historyRoute,
  trackingRoute,
  receiptRoute,
  promotionsRoute,
  compareRoute,
  policiesRoute,
  confirmationRoute,
  splatRoute,
]);

const hashHistory = createHashHistory();

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  history: hashHistory,
} as any);

function RootComponent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [trades, setTrades] = useState<TradeRequest[]>([]);

  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => {
    return !sessionStorage.getItem('bb_v4_welcomed');
  });
  const [theme, setTheme] = useState<Theme>('dark');

  const navigate = useNavigate();
  const location = useLocation();

  // Setup mobile navigation
  useEffect(() => {
    const cleanup = setupMobileBackButton();
    preventAppClose();

    // Register service worker for better mobile experience
    if ('serviceWorker' in navigator) {
      const swPath = import.meta.env.BASE_URL + 'sw.js';
      navigator.serviceWorker.register(swPath)
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }

    return cleanup;
  }, []);

  useEffect(() => {
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
        const parsedUser = JSON.parse(localUser);
        console.log('Found local user:', parsedUser);

        // Validate if user session is still valid
        const validateUserSession = async () => {
          try {
            const currentUser = await AuthService.getCurrentUser();
            console.log('Current Supabase user:', currentUser);

            if (currentUser && currentUser.id === parsedUser.id) {
              // Session is valid, restore user
              console.log('User session is valid, restoring user');
              setUser(parsedUser);
            } else {
              // Session is invalid, clear user
              console.log('User session is invalid, clearing user');
              localStorage.removeItem(STORAGE_KEYS.USER);
              setUser(null);
            }
          } catch (error) {
            console.error('Error validating user session:', error);
            // On error, clear user to be safe
            localStorage.removeItem(STORAGE_KEYS.USER);
            setUser(null);
          }
        };

        validateUserSession();
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
    }

    // Fetch products from Supabase
    const fetchProducts = async () => {
      try {
        const productsData = await getProducts();
        // Use Supabase data if available, otherwise fallback to local data
        setProducts(productsData.length > 0 ? productsData : INITIAL_PRODUCTS);
      } catch (error) {
        console.error('Failed to fetch products from Supabase, using local data:', error);
        // Fallback to local products if Supabase fails
        setProducts(INITIAL_PRODUCTS);
      }
    };

    fetchProducts();
  }, []);

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

  // Supabase Realtime subscription for Order "Ready" notifications
  useEffect(() => {
    if (!user || !supabase) return;

    const channel = supabase.channel('customer-order-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.status === 'shipped' && payload.old.status !== 'shipped') {
             notify('✅ Your order is ready for pickup/delivery!', 'success');
             
             // Update local order state mapping "shipped" to visually trigger "Ready" tracking
             setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: 'Shipped' } : o));
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [user]);

  // Apply theme globally (CSS reads html[data-theme]).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
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

  const navigateTo = (to: string, id?: string) => {
    console.log('NavigateTo called with:', { to, id });

    if (id) {
      console.log('Navigating to product:', id);
      navigate({ to: `/product/${id}` as any });
    } else if (to.startsWith('http')) {
      console.log('Opening external URL:', to);
      window.open(to, '_blank', 'noopener,noreferrer');
    } else {
      const path = to === 'home' ? '/' : (to.startsWith('/') ? to : `/${to}`);
      console.log('Navigating to path:', path);
      navigate({ to: path as any });
    }
    setIsMobileMenuOpen(false);
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

  const handleCheckout = (total: number) => {
    if (!user) {
      notify('Please sign in to place an order.', 'error');
      navigate({ to: '/auth' as any });
      return;
    }
    // Navigate to the full checkout form — order is created there
    navigate({ to: '/checkout' as any });
  };

  const contextValues: AppContextType = {
    products, cart, wishlist, compareIds, user, orders, repairs, trades,
    searchQuery, setSearchQuery,
    selectedCategories, setSelectedCategories,
    setUser, setCart, setOrders,
    setRepairs, setTrades, addToCart, toggleWishlist, toggleCompare,
    onToggleCompare: toggleCompare,
    updateQuantity, removeFromCart, handleCheckout, notify, navigateTo,
    onQuickView: (p: Product) => { setQuickViewProduct(p); setIsQuickViewOpen(true); },
    onAddToCart: (p: Product, options?: Record<string, string>, qty?: number) => addToCart(p, options, qty),
    theme,
    setTheme,
  };

  const isLight = theme === 'light';

  return (
    <AppContext.Provider value={contextValues}>
      <ScrollToTop />
      {/* Welcome Screen */}
      {showWelcomeScreen && (
        <WelcomeScreen onComplete={() => {
          sessionStorage.setItem('bb_v4_welcomed', 'true');
          setShowWelcomeScreen(false);
        }} />
      )}

      <div className={`flex flex-col min-h-screen selection:bg-[#B38B21] selection:text-black ${showWelcomeScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isLight ? 'bg-[#F0F0F0] text-black' : 'bg-black text-white'}`}>
        <Navbar
          cart={cart}
          navigateTo={navigateTo}
          user={user}
          products={products}
          theme={theme}
          setTheme={setTheme}
          setSearchQuery={setSearchQuery}
          setUser={setUser}
        />

        <FloatingWhatsApp phoneNumber="233000000000" theme={theme} hasNotification={notifications.length > 0 || !!notification} />

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

        {notification && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] w-auto min-w-[320px] max-w-md pointer-events-none">
            <div className={`
                pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl 
                backdrop-blur-xl border transition-all duration-500 animate-in slide-in-from-top-6 zoom-in-95
                ${isLight
                ? 'bg-white/95 border-black/5 text-black'
                : 'bg-[#1a1a1a]/95 border-white/5 text-white'}
              `}>

              <div className={`
                  flex items-center justify-center shrink-0
                  ${notification.type === 'success' ? 'text-green-500' : 'text-red-500'}
                `}>
                {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <p className={`text-sm font-semibold truncate tracking-tight ${isLight ? 'text-black/90' : 'text-white/90'}`}>
                  {notification.msg}
                </p>
              </div>

              <button
                onClick={() => setNotification(null)}
                className={`p-1.5 rounded-full transition-colors ${isLight ? 'hover:bg-black/5 text-black/40 hover:text-black' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

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

      {/* Notification Container */}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    </AppContext.Provider>
  );
}

export default function App() {
  return <RouterProvider router={router} />;
}
