import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LogOut, Package, Wrench, Clock,
  ChevronRight, CreditCard as CardIcon,
  User as UserIcon, Settings, Heart, Sliders, HelpCircle,
  RefreshCw, RotateCcw, Trash2, FileText, Menu, X,
  Calendar, ShoppingBag,
} from 'lucide-react';
import { User, RepairRequest, Order, Product, TradeRequest } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import { ProductCard } from '../components/ProductCard';
import { useAppContext } from '../App';
import { buildProfileHistoryPreview, buildPurchaseHistoryLedger } from '../lib/profileHelpers';
import { ProfileSettingsPanel } from './profile/ProfileSettingsPanel';
import { handleSignOut } from '../lib/signOut';
import { DeleteAccountService } from '../lib/deleteAccount';
import type { DeletionPreview } from '../lib/accountDeletionGuards';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import AuthService from '../lib/auth';
import { updateUserProfile } from '../lib/api';
import { friendlyError } from '../lib/friendlyErrors';
import {
  customerStatusBadgeClasses,
  formatCustomerStatusShort,
} from '../lib/customerStatusLabels';
import { getSupabaseClient } from '../lib/supabase';
import { Link } from '@tanstack/react-router';
import { PageBackButton } from '../components/PageBackButton';
import { useReturns } from '../hooks/useReturns';
import { RequestReturnModal } from './ReturnsPage';
import { TradeOfferRespondButtons } from '../components/TradeOfferRespondButtons';
import { tradeNeedsOfferResponse } from '../lib/tradeOfferRespond';
import { TRADE_COPY } from '../lib/tradeCopy';
import { tradeOfferAmount } from '../lib/tradeOffer';
import { formatGhs } from '../lib/money';

interface ProfileProps {
  user: User | null;
  repairs: RepairRequest[];
  orders: Order[];
  trades: TradeRequest[];
  wishlist: string[];
  products: Product[];
  setUser: (u: User | null) => void;
  navigateTo: (v: string, id?: string) => void;
  toggleWishlist: (id: string) => void;
  onAddToCart: (p: Product, options?: Record<string, string>, qty?: number) => void;
  theme: 'light' | 'dark';
  notify?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const Profile: React.FC<ProfileProps> = ({
  user, repairs, orders, trades = [], wishlist, products, setUser, navigateTo, toggleWishlist, onAddToCart, theme, notify
}) => {
  const {
    setCart,
    setOrders,
    setRepairs,
    setTrades,
    setWishlist,
    setCompareIds,
    compareIds,
    onQuickView,
    onToggleCompare,
  } = useAppContext();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'wishlist' | 'purchases'>('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteRequiresPassword, setDeleteRequiresPassword] = useState(true);
  const [nameDraft, setNameDraft] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [verifySending, setVerifySending] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [settingsErr, setSettingsErr] = useState('');
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [userDataForDeletion, setUserDataForDeletion] = useState<DeletionPreview | null>(null);
  const [purchaseReturnOpen, setPurchaseReturnOpen] = useState(false);
  const [purchaseReturnPresetOrderId, setPurchaseReturnPresetOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'settings' || !user) return;
    setNameDraft(user.name || '');
    setSettingsErr('');
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await getSupabaseClient().auth.getUser();
        if (cancelled || error) return;
        setEmailVerified(!!data.user?.email_confirmed_at);
      } catch {
        if (!cancelled) setEmailVerified(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, user?.id, user?.name]);

  const totalSpent = useMemo(() => {
    const orderTotal = orders.reduce((sum, order) => sum + order.total, 0);
    const repairTotal = repairs.reduce((sum, repair) => {
      const cost = parseFloat(repair.estimatedCost?.replace(/[^0-9.]/g, '') || '0');
      return sum + (repair.status === 'Completed' ? cost : 0);
    }, 0);
    return orderTotal + repairTotal;
  }, [orders, repairs]);

  const profileHistoryPreview = useMemo(
    () => buildProfileHistoryPreview(orders, trades, repairs),
    [orders, trades, repairs],
  );

  const { returns: userReturns, submitReturn: submitUserReturn, refetch: refetchUserReturns } = useReturns();

  const eligibleRefundOrders = useMemo(() => {
    const referenced = new Set(userReturns.map((r) => r.order_id));
    return (orders ?? []).filter((o) => {
      const status = String(o.status ?? '').toLowerCase();
      if (status !== 'delivered') return false;
      if (referenced.has(o.id)) return false;
      return true;
    });
  }, [orders, userReturns]);

  const orderEligibleForRefund = useCallback(
    (orderId: string) => eligibleRefundOrders.some((o) => o.id === orderId),
    [eligibleRefundOrders],
  );

  const purchaseHistoryLedger = useMemo(
    () => buildPurchaseHistoryLedger(orders, repairs, trades),
    [orders, repairs, trades],
  );

  const openPurchaseReturnModal = useCallback((presetOrderId: string | null) => {
    setPurchaseReturnPresetOrderId(presetOrderId);
    setPurchaseReturnOpen(true);
  }, []);

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isLight ? 'bg-white' : 'bg-black'}`}>
        <div className="text-center space-y-6">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
            <UserIcon size={32} className={isLight ? 'text-gray-300' : 'text-white/20'} />
          </div>
          <div className="space-y-2">
            <h2 className={`text-xl font-black uppercase tracking-tight italic ${isLight ? 'text-black' : 'text-white'}`}>Sign in required</h2>
            <p className={`text-sm leading-relaxed max-w-xs mx-auto ${isLight ? 'text-gray-600' : 'text-white/50'}`}>
              Your orders, trade-ins, and repairs appear here after you sign in. New to BlackBox? Create an account first.
            </p>
          </div>
          <button
            onClick={() => navigateTo('auth')}
            className="px-10 py-4 bg-gradient-to-r from-[#B38B21] to-[#D4AF37] text-black font-black rounded-full text-[10px] uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-[0_10px_40px_rgba(179,139,33,0.3)]"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const activeRepairsCount = repairs.filter(r => r.status !== 'Completed').length;
  const wishlistedProducts = products.filter(p => wishlist.includes(p.id));
  const activityCount = orders.length + repairs.length + trades.length;

  const saveDisplayName = async () => {
    if (!user) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setSettingsErr('Enter a display name.');
      return;
    }
    setNameSaving(true);
    setSettingsErr('');
    try {
      const letter = trimmed.charAt(0).toUpperCase() || 'U';
      await updateUserProfile(user.id, { name: trimmed, avatar_letter: letter });
      setUser({
        ...user,
        name: trimmed,
        avatarLetter: letter,
      });
      notify?.('Display name saved.', 'success');
    } catch (e: unknown) {
      setSettingsErr(friendlyError(e, 'save your display name'));
    } finally {
      setNameSaving(false);
    }
  };

  const sendVerificationEmail = async () => {
    if (!user?.email) return;
    setVerifySending(true);
    setSettingsErr('');
    try {
      const r = await AuthService.resendEmailConfirmation(user.email);
      if (r.success) notify?.('Verification email sent. Check your inbox.', 'success');
      else setSettingsErr(r.error || 'Could not resend verification email.');
    } finally {
      setVerifySending(false);
    }
  };

  const sendPasswordResetEmail = async () => {
    if (!user?.email) return;
    setResetSending(true);
    setSettingsErr('');
    try {
      const r = await AuthService.requestPasswordReset(user.email);
      if (r.success) notify?.('Password reset link sent to your email.', 'success');
      else setSettingsErr(r.error || 'Could not send reset email.');
    } finally {
      setResetSending(false);
    }
  };

  // Delete account functions
  const handleDeleteAccount = async () => {
    if (deleteRequiresPassword && !deletePassword.trim()) {
      setDeleteError('Enter your password to confirm deletion.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');

    try {
      const result = await DeleteAccountService.deleteAccount(
        deleteRequiresPassword ? deletePassword : undefined
      );

      if (result.success) {
        setCart([]);
        setOrders([]);
        setRepairs([]);
        setTrades([]);
        setWishlist([]);
        setCompareIds([]);
        await AuthService.signOut();
        setUser(null);
        setShowDeleteModal(false);
        setDeletePassword('');
        const hadPending = (userDataForDeletion?.pendingItems?.length ?? 0) > 0;
        notify?.(
          hadPending
            ? 'Your account was removed. Open orders, repairs, and trade-ins were cancelled.'
            : 'Your account has been removed and you are signed out.',
          'info'
        );
        navigateTo('home');
      } else {
        setDeleteError(result.error || 'Failed to delete account');
      }
    } catch (error: unknown) {
      setDeleteError(friendlyError(error, 'delete your account'));
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = async () => {
    setDeleteError('');
    try {
      const userData = await DeleteAccountService.getUserDataForDeletion();
      if (!userData) {
        notify?.('Could not load account data. Try again.', 'error');
        return;
      }
      setUserDataForDeletion(userData);

      const passwordCheck = await DeleteAccountService.checkPasswordRequirement();
      if (!passwordCheck.success) {
        notify?.(passwordCheck.error || 'Cannot start account deletion.', 'error');
        return;
      }
      setDeleteRequiresPassword(!!passwordCheck.requiresPassword);
      setShowDeleteModal(true);
    } catch (error) {
      console.error('Error preparing delete account:', error);
      notify?.(friendlyError(error, 'start account deletion'), 'error');
    }
  };

  // Some menu items navigate to a separate route instead of switching the
  // internal `activeTab`. The `navigate` field, when present, is passed to
  // navigateTo() and bypasses setActiveTab.
  const menuItems: Array<{
    id: string;
    icon: any;
    label: string;
    badge?: number | null;
    navigate?: string;
  }> = [
    { id: 'overview', icon: Sliders, label: 'Overview' },
    { id: 'purchases', icon: CardIcon, label: 'Orders & activity', badge: activityCount > 0 ? activityCount : null },
    { id: 'returns', icon: RotateCcw, label: 'Returns', navigate: '/returns' },
    { id: 'wishlist', icon: Heart, label: 'Wishlist', badge: wishlist.length > 0 ? wishlist.length : null },
    { id: 'settings', icon: UserIcon, label: 'Settings' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* 1. Profile Identity Header (Portfolio Style) */}
            <div className={`relative rounded-[2.5rem] overflow-hidden border shadow-2xl ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/5'}`}>
              {/* Dynamic Banner */}
              <div className="h-32 md:h-48 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 opacity-30 blur-3xl scale-150"></div>
                <div className="absolute inset-0 bg-black/40"></div>
                {/* Decorative Elements */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#B38B21]/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-[80px]"></div>
              </div>

              {/* Identity Row */}
              <div className="px-6 md:px-10 pb-10 -mt-16 md:-mt-24 flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                  {/* Huge Avatar Frame */}
                  <div className={`w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 rounded-[1.5rem] sm:rounded-[2rem] border-2 sm:border-4 flex items-center justify-center shadow-2xl relative group overflow-hidden ${isLight ? 'bg-white border-white' : 'bg-gradient-to-br from-neutral-800 to-neutral-900 border-[#050505]'}`}>
                    <span className={`text-3xl sm:text-4xl md:text-7xl font-black italic drop-shadow-2xl translate-y-2 uppercase ${isLight ? 'text-black' : 'text-white/90'}`}>
                      {user.avatarLetter || user.name.charAt(0)}
                    </span>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Settings size={24} className="text-[#B38B21] animate-spin-slow" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#B38B21]">Change Icon</span>
                      </div>
                    </button>
                  </div>

                  {/* Name & Subtitle */}
                  <div className="space-y-3 pb-2 w-full max-w-full overflow-hidden">
                    <div className="flex items-center justify-center md:justify-start gap-4 w-full">
                      <h2 className={`text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black italic tracking-tighter uppercase leading-[1.1] break-all sm:break-words ${isLight ? 'text-black' : 'text-white'}`}>{user.name}</h2>
                    </div>
                    <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.4em] italic leading-relaxed ${isLight ? 'text-gray-400' : 'text-white/30'}`}>BlackBox Member • Account Verified</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-4 pt-4">
                      <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 sm:flex-initial px-4 sm:px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${isLight ? 'bg-black text-white border-black' : 'bg-white text-black border-white shadow-xl hover:scale-105'}`}
                      >
                        Edit Profile
                      </button>
                      <Link
                        to="/faq"
                        className={`flex-1 sm:flex-initial px-4 sm:px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border text-center ${isLight ? 'bg-white text-black border-gray-200 hover:bg-gray-50' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                      >
                        Support Terminal
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Identity Stats */}
                <div className={`flex flex-wrap items-center gap-6 md:gap-10 lg:gap-14 pb-2 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-10 ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
                  <div
                    onClick={() => setActiveTab('purchases')}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer transition-transform hover:scale-105"
                  >
                    <span className={`text-2xl md:text-3xl lg:text-4xl font-black italic tracking-tighter group-hover:text-[#B38B21] transition-colors ${isLight ? 'text-black' : 'text-white'}`}>{formatCurrency(totalSpent)}</span>
                    <span className={`text-[9px] font-black uppercase tracking-[0.25em] group-hover:opacity-60 group-hover:text-[#B38B21] ${isLight ? 'text-gray-400' : 'opacity-30'}`}>Total Spent</span>
                  </div>
                  <div
                    onClick={() => navigateTo('/history?tab=orders')}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer transition-transform hover:scale-105"
                  >
                    <span className={`text-2xl md:text-3xl lg:text-4xl font-black italic tracking-tighter group-hover:text-[#B38B21] transition-colors ${isLight ? 'text-black' : 'text-white'}`}>{orders.length}</span>
                    <span className={`text-[9px] font-black uppercase tracking-[0.25em] group-hover:opacity-60 group-hover:text-[#B38B21] ${isLight ? 'text-gray-400' : 'opacity-30'}`}>Orders</span>
                  </div>
                  <div
                    onClick={() => setActiveTab('wishlist')}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer transition-transform hover:scale-105"
                  >
                    <span className={`text-2xl md:text-3xl lg:text-4xl font-black italic tracking-tighter group-hover:text-[#B38B21] transition-colors ${isLight ? 'text-black' : 'text-white'}`}>{wishlist.length}</span>
                    <span className={`text-[9px] font-black uppercase tracking-[0.25em] group-hover:opacity-60 group-hover:text-[#B38B21] ${isLight ? 'text-gray-400' : 'opacity-30'}`}>Wishlist</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: 'Recent Orders', count: orders.length, icon: Package, onClick: () => navigateTo('/history?tab=orders') },
                { label: 'Pending Repairs', count: activeRepairsCount, icon: Wrench, onClick: () => navigateTo('/history?tab=repairs') },
                { label: 'Wishlist Items', count: wishlist.length, icon: Heart, onClick: () => setActiveTab('wishlist') },
                { label: 'Trade-in status', count: trades.length, icon: RefreshCw, onClick: () => navigateTo('/account/trade-ins') },
              ].map((card, i) => (
                <button
                  key={i}
                  onClick={card.onClick}
                  className={`p-6 rounded-3xl transition-all text-left relative group overflow-hidden border ${isLight ? 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isLight ? 'bg-black/5 text-black/40 group-hover:bg-black group-hover:text-white' : 'bg-white/5 text-white/40 group-hover:text-white'}`}>
                      <card.icon size={18} />
                    </div>
                    {card.count !== null && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#B38B21]">{card.count} Items</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">{card.label}</p>
                    <p className="text-xs font-black uppercase tracking-widest italic group-hover:translate-x-1 transition-transform">View Details ›</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'wishlist':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className={`p-8 border rounded-3xl flex items-center justify-between shadow-xl ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gradient-to-br from-[#0a0a0a] to-[#050505] border-white/5'}`}>
              <div>
                <h3 className={`text-xl font-black italic uppercase tracking-tight flex items-center gap-3 ${isLight ? 'text-black' : 'text-white'}`}>
                  <Heart size={20} className="text-[#B38B21]" />
                  Wishlist
                </h3>
                <p className={`text-[9px] font-bold uppercase tracking-wider pt-1 italic ${isLight ? 'text-gray-400' : 'text-white/30'}`}>{wishlist.length} saved items</p>
              </div>
              {wishlist.length > 0 && (
                <button
                  type="button"
                  onClick={() => setWishlist([])}
                  className="text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-red-400 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  Clear All
                </button>
              )}
            </div>
            {wishlistedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistedProducts.map((p, i) => (
                  <div
                    key={p.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <ProductCard
                      product={p}
                      onQuickView={onQuickView}
                      isWishlisted={true}
                      onToggleWishlist={toggleWishlist}
                      onAddToCart={onAddToCart}
                      isCompared={compareIds.includes(p.id)}
                      onToggleCompare={onToggleCompare}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-20 text-center border rounded-3xl shadow-xl ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gradient-to-br from-[#0a0a0a] to-[#050505] border-white/5'}`}>
                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                  <Heart size={24} className={isLight ? 'text-black/20' : 'text-white/20'} />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${isLight ? 'text-black/40' : 'text-white/20'}`}>Your wishlist is empty</p>
                <p className={`text-[9px] mb-4 ${isLight ? 'text-black/20' : 'text-white/10'}`}>Start adding items you love</p>
                <button
                  onClick={() => navigateTo('store')}
                  className={`px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${isLight ? 'bg-black text-white hover:bg-black/90' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                >
                  Browse shop
                </button>
              </div>
            )}
          </div>
        );

      case 'purchases':
        return (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2">
                <div className="space-y-2">
                  <h3 className={`text-4xl font-black italic tracking-tighter uppercase ${isLight ? 'text-black' : 'text-white'}`}>Purchases & <span className="text-[#B38B21]">History</span></h3>
                  <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                    All orders, trade-ins, and repairs — receipts, tracking, and refund requests for eligible delivered orders
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {eligibleRefundOrders.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => openPurchaseReturnModal(null)}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${isLight ? 'bg-black text-white border-black hover:bg-black/90' : 'bg-[#B38B21]/15 text-[#B38B21] border-[#B38B21]/30 hover:bg-[#B38B21]/25'}`}
                    >
                      <RotateCcw size={14} />
                      Request refund
                    </button>
                  ) : null}
                  <Link
                    to="/returns"
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${isLight ? 'bg-white text-black border-gray-200 hover:bg-gray-50' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                  >
                    Returns & status
                  </Link>
                </div>
              </div>

              <div className="grid gap-6">
                {purchaseHistoryLedger.map((row) => {
                  const receiptTo =
                    row.kind === 'purchase'
                      ? `/receipt/${row.id}?print=1`
                      : row.kind === 'repair'
                        ? `/receipt/repair/${row.id}?print=1`
                        : `/receipt/trade/${row.id}?print=1`;
                  const typeLabel =
                    row.kind === 'purchase'
                      ? 'Purchase'
                      : row.kind === 'repair'
                        ? 'Repair'
                        : row.kind === 'trade_credit'
                          ? 'Credit'
                          : 'Trade-in';
                  const iconWrap =
                    row.kind === 'purchase'
                      ? 'bg-indigo-500/10 text-indigo-400'
                      : row.kind === 'trade_credit'
                        ? 'bg-green-500/10 text-green-400'
                        : row.kind === 'trade_active'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-[#B38B21]/10 text-[#B38B21]';
                  const title =
                    row.kind === 'purchase'
                      ? row.order?.items[0]?.name || 'Order'
                      : row.kind === 'repair'
                        ? row.repair?.device || 'Repair'
                        : row.trade?.device || 'Trade-in';
                  const subStatus =
                    row.kind === 'purchase' && row.order
                      ? formatCustomerStatusShort('order', row.order.status)
                      : row.kind === 'repair' && row.repair
                        ? formatCustomerStatusShort('repair', row.repair.status)
                        : row.trade
                          ? formatCustomerStatusShort('trade', row.trade.status)
                          : '';
                  const subStatusKind: 'order' | 'repair' | 'trade' =
                    row.kind === 'purchase' ? 'order' : row.kind === 'repair' ? 'repair' : 'trade';
                  const subStatusRaw =
                    row.kind === 'purchase' && row.order
                      ? row.order.status
                      : row.kind === 'repair' && row.repair
                        ? row.repair.status
                        : row.trade?.status;
                  let amountNode: React.ReactNode;
                  let amountClass = isLight ? 'text-black' : 'text-white';
                  if (row.kind === 'purchase' && row.order) {
                    amountNode = formatCurrency(row.order.total);
                  } else if (row.kind === 'repair' && row.repair) {
                    const costNum = parseFloat(row.repair.estimatedCost?.replace(/[^0-9.]/g, '') || '0');
                    if (row.repair.status === 'Completed') {
                      amountNode = formatCurrency(costNum);
                    } else {
                      amountNode = row.repair.estimatedCost?.trim() || 'Pending';
                      amountClass = isLight ? 'text-black/60' : 'text-white/50';
                    }
                  } else if (row.trade) {
                    const val = Number(row.trade.finalValue ?? row.trade.estimatedValue ?? 0) || 0;
                    if (row.kind === 'trade_credit') {
                      amountNode = <>+{formatCurrency(val)}</>;
                      amountClass = 'text-green-500';
                    } else {
                      amountNode = <>Est. {formatCurrency(val)}</>;
                      amountClass = isLight ? 'text-black/70' : 'text-white/60';
                    }
                  } else {
                    amountNode = '—';
                  }
                  const trackTo =
                    row.kind === 'purchase'
                      ? `/tracking/order/${row.id}`
                      : row.kind === 'repair'
                        ? `/tracking/repair/${row.id}`
                        : `/tracking/trade/${row.id}`;
                  const showRefund =
                    row.kind === 'purchase' && row.order && orderEligibleForRefund(row.order.id);
                  return (
                    <div
                      key={row.key}
                      className={`p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border flex flex-col sm:flex-row items-center justify-between gap-6 group transition-all shadow-xl ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-[#0a0a0a] border-white/5 hover:border-[#B38B21]/20'}`}
                    >
                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-center sm:text-left">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center ${iconWrap}`}>
                          {row.kind === 'purchase' ? (
                            <ShoppingBag size={24} />
                          ) : row.kind === 'repair' ? (
                            <Wrench size={24} />
                          ) : (
                            <RefreshCw size={24} />
                          )}
                        </div>
                        <div>
                          <h4
                            className={`text-base sm:text-lg font-black uppercase tracking-widest italic flex flex-wrap items-center justify-center sm:justify-start gap-3 text-center sm:text-left ${isLight ? 'text-black' : 'text-white'}`}
                          >
                            {title}
                            <span
                              className={`text-[10px] px-3 py-1 rounded-lg border font-black uppercase tracking-widest ${isLight ? 'bg-black/5 border-black/5 text-black/40' : 'bg-white/5 border-white/5 text-white/30'}`}
                            >
                              {typeLabel}
                            </span>
                            {subStatus ? (
                              <span
                                className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0 max-w-[11rem] truncate ${customerStatusBadgeClasses(subStatusRaw, subStatusKind, isLight)}`}
                                title={subStatus}
                              >
                                {subStatus}
                              </span>
                            ) : null}
                          </h4>
                          <p className={`text-xs font-bold mt-1 uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/40'}`}>{formatDate(row.date)}</p>
                        </div>
                      </div>
                      <div className="text-center sm:text-right space-y-3 w-full sm:w-auto">
                        <p className={`text-xl sm:text-2xl font-black italic tracking-tighter ${amountClass}`}>{amountNode}</p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-2">
                          <Link
                            to={receiptTo as any}
                            className="text-[9px] font-black uppercase tracking-widest text-[#B38B21] border-b border-[#B38B21]/20 hover:border-[#B38B21] transition-all"
                          >
                            Download receipt
                          </Link>
                          <Link
                            to={trackTo as any}
                            className="text-[9px] font-black uppercase tracking-widest text-[#B38B21]/80 border-b border-[#B38B21]/10 hover:border-[#B38B21]/40 transition-all"
                          >
                            Track
                          </Link>
                          {showRefund ? (
                            <button
                              type="button"
                              onClick={() => openPurchaseReturnModal(row.order!.id)}
                              className={`text-[9px] font-black uppercase tracking-widest border-b transition-all ${isLight ? 'text-emerald-800 border-emerald-200 hover:border-emerald-600' : 'text-emerald-400 border-emerald-500/30 hover:border-emerald-400'}`}
                            >
                              Request refund
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {purchaseHistoryLedger.length === 0 && (
                  <div className={`p-20 text-center rounded-[3rem] border border-dashed ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.02] border-white/10'}`}>
                    <div className="w-20 h-20 mx-auto bg-[#B38B21]/10 rounded-3xl flex items-center justify-center mb-6 text-[#B38B21]">
                      <FileText size={40} />
                    </div>
                    <h4 className={`text-xl font-black italic uppercase tracking-widest ${isLight ? 'text-black/40' : 'text-white/20'}`}>No activity yet</h4>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${isLight ? 'text-black/20' : 'text-white/10'}`}>Orders, trade-ins, and repairs will show here.</p>
                  </div>
                )}
              </div>
            </div>

            <div className={`space-y-6 pt-8 border-t animate-in fade-in duration-700 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                  <h3 className={`text-2xl sm:text-3xl font-black italic tracking-tighter uppercase ${isLight ? 'text-black' : 'text-white'}`}>
                    Activity <span className="text-[#B38B21]">History</span>
                  </h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                    Same lists as history — delivered orders without a return can request a refund from the ledger above or here
                  </p>
                </div>
                <Link
                  to="/history"
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${isLight ? 'bg-black text-white border-black hover:bg-black/90' : 'bg-[#B38B21]/15 text-[#B38B21] border-[#B38B21]/30 hover:bg-[#B38B21]/25'}`}
                >
                  <Clock size={14} />
                  Full history & search
                </Link>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className={`rounded-[2rem] border p-5 sm:p-6 space-y-4 ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-[#0a0a0a] border-white/5'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-black/50' : 'text-white/40'}`}>
                      <Package size={14} className="text-[#B38B21]" />
                      Orders
                    </p>
                    <Link to="/history" search={{ tab: 'orders' } as any} className="text-[9px] font-black uppercase tracking-widest text-[#B38B21] hover:underline">
                      All
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {profileHistoryPreview.orders.length === 0 ? (
                      <p className={`text-[10px] font-bold uppercase tracking-widest py-4 text-center ${isLight ? 'text-black/30' : 'text-white/25'}`}>No orders yet</p>
                    ) : (
                      profileHistoryPreview.orders.map((order) => (
                        <div
                          key={order.id}
                          className={`flex flex-col gap-2 rounded-2xl border p-4 ${isLight ? 'bg-white border-gray-100' : 'bg-white/[0.03] border-white/10'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-black/40' : 'text-white/35'}`}>
                              {(order as any).display_id ? String((order as any).display_id) : `Order #${order.id.slice(-8).toUpperCase()}`}
                            </p>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest max-w-[10rem] truncate ${customerStatusBadgeClasses(order.status, 'order', isLight)}`} title={formatCustomerStatusShort('order', order.status)}>
                              {formatCustomerStatusShort('order', order.status)}
                            </span>
                          </div>
                          <p className={`text-xs font-black uppercase tracking-tight truncate ${isLight ? 'text-black' : 'text-white'}`}>
                            {order.items.length} {order.items.length === 1 ? 'item' : 'items'} · {formatCurrency(order.total)}
                          </p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/35'}`}>{formatDate(order.date)}</p>
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              to={`/receipt/${order.id}` as any}
                              className="text-[9px] font-black uppercase tracking-widest text-[#B38B21] hover:underline inline-flex items-center gap-1"
                            >
                              Receipt <ChevronRight size={12} />
                            </Link>
                            <Link
                              to={`/tracking/order/${order.id}` as any}
                              className="text-[9px] font-black uppercase tracking-widest text-[#B38B21]/80 hover:underline inline-flex items-center gap-1"
                            >
                              Track <ChevronRight size={12} />
                            </Link>
                            {orderEligibleForRefund(order.id) ? (
                              <button
                                type="button"
                                onClick={() => openPurchaseReturnModal(order.id)}
                                className={`text-[9px] font-black uppercase tracking-widest underline-offset-2 hover:underline ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}
                              >
                                Refund
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={`rounded-[2rem] border p-5 sm:p-6 space-y-4 ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-[#0a0a0a] border-white/5'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-black/50' : 'text-white/40'}`}>
                      <RefreshCw size={14} className="text-[#B38B21]" />
                      Trade-ins
                    </p>
                    <Link to="/account/trade-ins" className="text-[9px] font-black uppercase tracking-widest text-[#B38B21] hover:underline">
                      All
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {profileHistoryPreview.trades.length === 0 ? (
                      <p className={`text-[10px] font-bold uppercase tracking-widest py-4 text-center ${isLight ? 'text-black/30' : 'text-white/25'}`}>No trade-ins yet</p>
                    ) : (
                      profileHistoryPreview.trades.map((trade) => (
                        <div
                          key={trade.id}
                          className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors ${isLight ? 'bg-white border-gray-100' : 'bg-white/[0.03] border-white/10'}`}
                        >
                          <Link
                          to={`/tracking/trade/${trade.id}` as any}
                          className="flex flex-col gap-2 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-black/40' : 'text-white/35'}`}>
                              {(trade as any).display_id ? String((trade as any).display_id) : `Trade #${trade.id.slice(-8).toUpperCase()}`}
                            </p>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest max-w-[10rem] truncate ${customerStatusBadgeClasses(trade.status, 'trade', isLight)}`} title={formatCustomerStatusShort('trade', trade.status)}>
                              {formatCustomerStatusShort('trade', trade.status)}
                            </span>
                          </div>
                          <p className={`text-xs font-black uppercase tracking-tight truncate ${isLight ? 'text-black' : 'text-white'}`}>{trade.device}</p>
                          {tradeOfferAmount(trade) != null && (
                            <p className="text-[10px] font-black text-[#B38B21] tabular-nums">
                              {TRADE_COPY.myTrades.finalOffer}: {formatGhs(tradeOfferAmount(trade)!)}
                            </p>
                          )}
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/35'}`}>{formatDate(trade.date)}</p>
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#B38B21] inline-flex items-center gap-1">
                            Track <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </Link>
                        {tradeNeedsOfferResponse(trade) && (
                          <TradeOfferRespondButtons
                            trade={trade}
                            trades={trades}
                            setTrades={setTrades}
                            notify={notify || (() => {})}
                            isLight={isLight}
                          />
                        )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={`rounded-[2rem] border p-5 sm:p-6 space-y-4 ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-[#0a0a0a] border-white/5'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-black/50' : 'text-white/40'}`}>
                      <Wrench size={14} className="text-[#B38B21]" />
                      Repairs
                    </p>
                    <Link to="/history" search={{ tab: 'repairs' } as any} className="text-[9px] font-black uppercase tracking-widest text-[#B38B21] hover:underline">
                      All
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {profileHistoryPreview.repairs.length === 0 ? (
                      <p className={`text-[10px] font-bold uppercase tracking-widest py-4 text-center ${isLight ? 'text-black/30' : 'text-white/25'}`}>No repairs yet</p>
                    ) : (
                      profileHistoryPreview.repairs.map((repair) => (
                        <Link
                          key={repair.id}
                          to={`/tracking/repair/${repair.id}`}
                          className={`flex flex-col gap-2 rounded-2xl border p-4 transition-colors group ${isLight ? 'bg-white border-gray-100 hover:border-[#B38B21]/40' : 'bg-white/[0.03] border-white/10 hover:border-[#B38B21]/30'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-black/40' : 'text-white/35'}`}>
                              {(repair as any).display_id ? String((repair as any).display_id) : `Repair #${repair.id.slice(-8).toUpperCase()}`}
                            </p>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest max-w-[10rem] truncate ${customerStatusBadgeClasses(repair.status, 'repair', isLight)}`} title={formatCustomerStatusShort('repair', repair.status)}>
                              {formatCustomerStatusShort('repair', repair.status)}
                            </span>
                          </div>
                          <p className={`text-xs font-black uppercase tracking-tight truncate ${isLight ? 'text-black' : 'text-white'}`}>{repair.device}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/35'}`}>{formatDate(repair.date)}</p>
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#B38B21] inline-flex items-center gap-1">
                            Track <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <ProfileSettingsPanel
            user={user}
            isLight={isLight}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            nameSaving={nameSaving}
            saveDisplayName={saveDisplayName}
            settingsErr={settingsErr}
            emailVerified={emailVerified}
            verifySending={verifySending}
            sendVerificationEmail={sendVerificationEmail}
            resetSending={resetSending}
            sendPasswordResetEmail={sendPasswordResetEmail}
            openDeleteModal={openDeleteModal}
          />
        );
    }
  };

  return (
    <div className={`view-transition max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-8 flex flex-col lg:flex-row gap-6 sm:gap-8 min-h-[85vh] relative overflow-x-hidden ${isLight ? 'bg-white' : 'bg-black'}`}>
      <div className="w-full mb-2 z-20 lg:hidden">
        <PageBackButton isLight={isLight} fallbackTo="/" />
      </div>
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-0 w-[500px] h-[500px] blur-[120px] rounded-full -ml-[250px] -mt-[250px] ${isLight ? 'bg-[#CDA032]/10' : 'bg-[#B38B21]/[0.02]'}`}></div>
      </div>

      {/* Mobile Toggle Button */}
      <div className="lg:hidden flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 mb-2 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#CDA032] rounded-xl flex items-center justify-center text-black font-bold italic text-sm">
            {user.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-tight truncate">{user.name}</h4>
            <p className="text-[9px] text-[#CDA032] font-black uppercase tracking-widest">{activeTab}</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 flex items-center gap-2 transition-all border border-white/5"
        >
          <Menu size={18} />
          <span className="text-[9px] font-black uppercase tracking-widest">Repository Menu</span>
        </button>
      </div>

      {/* Sidebar Navigation - Responsive Wrapper */}
      <aside className={`
        fixed inset-0 z-[100] transition-all duration-500 lg:static lg:z-auto lg:w-[280px] shrink-0
        ${isMobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'}
      `}>
        {/* Backdrop for mobile */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />

        <div className={`
          absolute right-0 top-0 h-full w-[80%] max-w-[320px] border-l p-5 flex flex-col shadow-2xl transition-transform duration-500
          lg:static lg:h-auto lg:w-full lg:max-w-none lg:border lg:rounded-3xl lg:shadow-xl lg:sticky lg:top-24 lg:translate-x-0
          ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gradient-to-br from-[#0a0a0a] to-[#050505] border-white/5'}
          ${isMobileNavOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="hidden lg:block mb-4">
            <PageBackButton isLight={isLight} fallbackTo="/" />
          </div>

          {/* Mobile Close Button */}
          <div className="lg:hidden flex justify-end mb-4">
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="p-2 bg-white/5 rounded-lg text-white/30"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile Summary */}
          <div className={`p-5 pb-6 border-b space-y-4 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black italic text-2xl shadow-lg ${isLight ? 'bg-black text-white' : 'bg-gradient-to-br from-[#B38B21] to-[#D4AF37] text-black'}`}>
              {user.avatarLetter || user.name.charAt(0)}
            </div>
            <div>
              <h4 className={`text-base font-black italic tracking-tight uppercase leading-tight ${isLight ? 'text-black' : 'text-white'}`}>{user.name}</h4>
              <p className={`text-[9px] font-bold uppercase tracking-wider italic mt-1 truncate ${isLight ? 'text-gray-400' : 'text-white/30'}`}>{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-3 overflow-y-auto bb-scrollbar pb-10">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.navigate) {
                    navigateTo(item.navigate);
                  } else {
                    setActiveTab(item.id as any);
                  }
                  setIsMobileNavOpen(false);
                  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all group ${activeTab === item.id
                  ? (isLight ? 'bg-black text-white shadow-xl scale-[1.02]' : 'bg-gradient-to-r from-[#B38B21] to-[#D4AF37] text-black font-black shadow-[0_15px_40px_rgba(179,139,33,0.3)] scale-[1.02]')
                  : (isLight ? 'text-gray-500 hover:bg-black/5 hover:text-black' : 'text-white/50 hover:bg-white/5 hover:text-white')
                  }`}
              >
                <div className="flex items-center gap-4">
                  <item.icon size={20} className={activeTab === item.id ? (isLight ? 'text-white' : 'text-black') : (isLight ? 'text-gray-300' : 'text-white/30 group-hover:text-white/60')} />
                  <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black ${activeTab === item.id
                    ? (isLight ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
                    : (isLight ? 'bg-gray-100 text-gray-500' : 'bg-white/10 text-white/50')
                    }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="h-px bg-white/10 my-4"></div>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                navigateTo('/faq');
                setIsMobileNavOpen(false);
              }}
              className="flex items-center gap-3 px-5 py-3 text-white/40 hover:text-white hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
            >
              <HelpCircle size={16} className="text-white/30" />
              Help Center
            </button>
            <button
              onClick={() => handleSignOut(setUser, navigateTo)}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-transparent ${isLight ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-500/10 hover:border-red-500/20'}`}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-[600px] relative z-10 p-2 md:p-0">
        {renderContent()}
      </main>

      {purchaseReturnOpen && eligibleRefundOrders.length > 0 && (
        <RequestReturnModal
          isLight={isLight}
          eligibleOrders={eligibleRefundOrders}
          initialOrderId={purchaseReturnPresetOrderId}
          onClose={() => {
            setPurchaseReturnOpen(false);
            setPurchaseReturnPresetOrderId(null);
          }}
          onSubmit={async (payload) => {
            const result = await submitUserReturn(payload);
            if (result) {
              notify?.('Return request submitted', 'success');
              setPurchaseReturnOpen(false);
              setPurchaseReturnPresetOrderId(null);
              void refetchUserReturns();
            } else {
              notify?.('Failed to submit return', 'error');
            }
          }}
        />
      )}

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletePassword('');
          setDeleteError('');
          setUserDataForDeletion(null);
        }}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
        error={deleteError}
        password={deletePassword}
        setPassword={setDeletePassword}
        userData={userDataForDeletion}
        requiresPassword={deleteRequiresPassword}
        theme={theme}
      />

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};