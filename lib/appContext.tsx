/**
 * App-wide React context — extracted from App.tsx so route screens can import
 * useAppContext without creating a circular dependency (App → routes → App).
 * That cycle broke HMR and caused "useAppContext must be used within an
 * AppContextProvider" / Error Code 500 on /trade/*.
 */
import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type {
  Category,
  CartItem,
  Order,
  Product,
  RepairRequest,
  TradeRequest,
  User,
} from '../types';

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
  setUser: Dispatch<SetStateAction<User | null>>;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setRepairs: (r: RepairRequest[]) => void;
  setTrades: (t: TradeRequest[]) => void;
  setWishlist: Dispatch<SetStateAction<string[]>>;
  setCompareIds: Dispatch<SetStateAction<string[]>>;
  addToCart: (p: Product, o?: Record<string, string>, q?: number) => void;
  toggleWishlist: (id: string) => void;
  toggleCompare: (id: string) => void;
  onToggleCompare: (id: string) => void;
  updateQuantity: (id: string, o: Record<string, string> | undefined, d: number) => void;
  removeFromCart: (uid: string) => void;
  handleCheckout: (t: number) => void;
  notify: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
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

/**
 * Access the app shell context.
 * @throws if rendered outside AppContext.Provider
 */
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}
