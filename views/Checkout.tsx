import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Truck,
  Shield,
  MapPin,
  ShoppingBag,
  CreditCard,
  Smartphone,
  Store,
  Check,
  Lock,
  LogIn,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAppContext } from '../App';
import { CartItem, Order } from '../types';
import { formatCurrency } from '../lib/utils';
import { clearCartItems, updateProfilePhone } from '../lib/api';
import { friendlyError } from '../lib/friendlyErrors';
import { OrderCompletePopup } from '../components/OrderCompletePopup';
import {
  PromoCodeInput,
  type AppliedPromoQuote,
} from '../components/checkout/PromoCodeInput';
import { useCheckout, type CheckoutCartItem } from '../hooks/useCheckout';
import { buildProductOptionsForRpc } from '../lib/orderItemOptions';
import { requestLifecycleEmail } from '../lib/clientNotifyEmail';
import { DELIVERY_ENABLED, DEFAULT_SHIPPING_METHOD } from '../lib/fulfillmentConfig';
import { saveReturnTo } from '../lib/returnTo';
import { saveCheckoutDraft, takeCheckoutDraft } from '../lib/checkoutDraft';
import {
  clearPersistedPromoCode,
  loadPersistedPromoCode,
} from '../lib/promoCart';
import {
  fetchCampuses,
  fetchOrderChargeTotalGhs,
  formatGHS,
  pesewasToGhs,
  promoReserve,
  promoSetOrderCampus,
} from '../lib/promotions';
import { supabase, getSupabaseAnonKey } from '../lib/supabase';
// ============================================================
// Constants — kept at the top so they're easy to audit / extend.
// ============================================================

/** All 16 administrative regions of Ghana (CHK-03). */
const GHANA_REGIONS = [
  'Ahafo',
  'Ashanti',
  'Bono',
  'Bono East',
  'Central',
  'Eastern',
  'Greater Accra',
  'North East',
  'Northern',
  'Oti',
  'Savannah',
  'Upper East',
  'Upper West',
  'Volta',
  'Western',
  'Western North',
] as const;

type ShippingMethod = 'pickup' | 'delivery';
type PaymentMethod = 'pickup_cash' | 'card' | 'mobile_money';

const SHIPPING_COST_DELIVERY_FLAT = 50; // GHS — applied below the free threshold
const FREE_SHIPPING_THRESHOLD = 5000;   // GHS

// ============================================================
// Helpers
// ============================================================

/** Reduce a UI CartItem down to the snake_case payload the RPC expects. */
function toCheckoutCartItem(item: CartItem): CheckoutCartItem {
  return {
    product_id: (item.product_id || item.id) as string,
    variant_id: item.variant_id ?? null,
    quantity: Number(item.quantity || 1),
    unit_price: Number(item.price || 0),
    product_name: item.name ?? null,
    product_image: item.image ?? item.image_url ?? null,
    product_options: buildProductOptionsForRpc(item.selectedOptions) ?? {},
  };
}

/**
 * Ghana digital address: "GA-xxx-xxxx" style. We accept any
 * letters/digits/dashes string — Ghana Post tweaks the format
 * occasionally so we don't want to be over-strict here.
 */
function isValidDigitalAddress(value: string): boolean {
  const compact = value.trim().replace(/\s+/g, '');
  if (compact.length < 8) return false;
  // Ghana Post GPS style (e.g. GA-123-4567) — allow flexible segment lengths.
  return /^[A-Za-z]{2}-[A-Za-z0-9]{2,}-[A-Za-z0-9]{2,}$/.test(compact);
}

// ============================================================
// Main Checkout view
// ============================================================
export const Checkout: React.FC = () => {
  const { user, cart, setCart, orders, setOrders, notify, theme, refreshProducts } = useAppContext();
  const navigate = useNavigate();
  const { placeOrder: rpcPlaceOrder, loading: checkoutLoading } = useCheckout();

  // --- Step state ---
  const [step, setStep] = useState<1 | 2>(1);
  const draftRestoredRef = useRef(false);

  // --- Shipping fields ---
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(DEFAULT_SHIPPING_METHOD);

  useEffect(() => {
    if (!DELIVERY_ENABLED && shippingMethod !== 'pickup') {
      setShippingMethod('pickup');
    }
  }, [shippingMethod]);
  const [form, setForm] = useState({
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    region: user?.region || '',
    digitalAddress: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      phone: prev.phone.trim() ? prev.phone : (user.phone || ''),
      address: prev.address.trim() ? prev.address : (user.address || ''),
      city: prev.city.trim() ? prev.city : (user.city || ''),
      region: prev.region ? prev.region : (user.region || ''),
    }));
  }, [user?.id, user?.phone, user?.address, user?.city, user?.region]);

  // --- Payment fields ---
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pickup_cash');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [momo, setMomo] = useState({ provider: 'MTN', number: '' });

  // --- Submission state ---
  const [submitting, setSubmitting] = useState(false);
  const loading = submitting || checkoutLoading;
  const [showOrderComplete, setShowOrderComplete] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // --- Pricing (discount from promo_quote only — never computed locally) ---
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoQuote | null>(null);
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const shippingCost = useMemo(() => {
    if (shippingMethod === 'pickup') return 0;
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST_DELIVERY_FLAT;
  }, [shippingMethod, subtotal]);
  const discountGhs = appliedPromo ? pesewasToGhs(appliedPromo.discount_pesewas) : 0;
  const total = Math.max(0, subtotal + shippingCost - discountGhs);

  // Drop the promo if the cart empties out mid-flow.
  useEffect(() => {
    if (cart.length === 0 && appliedPromo) setAppliedPromo(null);
  }, [cart.length, appliedPromo]);

  // Pickup forces cash-on-pickup — keep paymentMethod in sync.
  useEffect(() => {
    if (shippingMethod === 'pickup' && paymentMethod !== 'pickup_cash') {
      setPaymentMethod('pickup_cash');
    }
  }, [shippingMethod, paymentMethod]);

  // ----- Validation per step -----
  const step1Errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.phone.trim()) errs.phone = 'Phone is required.';
    if (shippingMethod === 'delivery') {
      if (!form.address.trim()) errs.address = 'Address is required.';
      if (!form.city.trim()) errs.city = 'City is required.';
      if (!form.region.trim()) errs.region = 'Region is required.';
      if (!form.digitalAddress.trim()) {
        errs.digitalAddress = 'Digital address is required.';
      } else if (!isValidDigitalAddress(form.digitalAddress)) {
        errs.digitalAddress = 'Expected format: GA-xxx-xxxx';
      }
    }
    return errs;
  }, [form, shippingMethod]);

  const canContinueFromStep1 = Object.keys(step1Errors).length === 0;

  const persistAndGoToLogin = () => {
    saveCheckoutDraft({
      step: 2,
      shippingMethod,
      form,
      paymentMethod,
    });
    saveReturnTo('/checkout');
    notify('Sign in to place your order — we’ll bring you right back.', 'info');
    navigate({
      to: '/auth',
      search: { returnTo: '/checkout' } as any,
    });
  };

  // Restore address / payment step after returning from /auth.
  useEffect(() => {
    if (draftRestoredRef.current) return;
    const draft = takeCheckoutDraft();
    if (!draft) {
      draftRestoredRef.current = true;
      return;
    }
    draftRestoredRef.current = true;
    setShippingMethod(
      draft.shippingMethod === 'delivery' && DELIVERY_ENABLED ? 'delivery' : 'pickup',
    );
    setForm({
      phone: draft.form?.phone || '',
      address: draft.form?.address || '',
      city: draft.form?.city || '',
      region: draft.form?.region || '',
      digitalAddress: draft.form?.digitalAddress || '',
    });
    if (
      draft.paymentMethod === 'pickup_cash' ||
      draft.paymentMethod === 'card' ||
      draft.paymentMethod === 'mobile_money'
    ) {
      setPaymentMethod(draft.paymentMethod);
    }
    setStep(draft.step === 2 ? 2 : 1);
  }, []);

  const goToStep2 = () => {
    if (!canContinueFromStep1) {
      const firstErr = Object.values(step1Errors)[0];
      notify(firstErr || 'Please complete your shipping information.', 'error');
      return;
    }
    if (!user) {
      persistAndGoToLogin();
      return;
    }
    setStep(2);
  };

  // ----- Submit order (only Pickup + Cash is wired today) -----
  const submitOrder = async () => {
    if (cart.length === 0) {
      notify('Your cart is empty. Add items before checkout.', 'error');
      navigate({ to: '/store' });
      return;
    }
    if (!user) {
      persistAndGoToLogin();
      return;
    }
    if (!canContinueFromStep1) {
      setStep(1);
      const firstErr = Object.values(step1Errors)[0];
      notify(firstErr || 'Please complete your shipping information.', 'error');
      return;
    }

    // ----------------------------------------------------------
    // Online payment integration (Paystack / Stripe) is out of
    // scope for this milestone. We keep the UI in place for the
    // next deliverable but block actual submission so we never
    // record a paid order without taking real money.
    // ----------------------------------------------------------
    if (paymentMethod === 'card' || paymentMethod === 'mobile_money') {
      notify(
        'Online payments are not yet enabled. Please choose "Pay on Pickup" — pay in store on collection.',
        'info',
      );
      return;
    }

    try {
      setSubmitting(true);

      // Save the latest phone to profile so admin sees it on the order.
      const phone = (form.phone || user.phone || '').trim();
      if (phone) {
        try {
          await updateProfilePhone(user.id, phone);
        } catch (err) {
          // Non-fatal — admin can still see the address/notes on the order.
          console.warn('Failed to update profile phone:', err);
        }
      }

      const items = cart.map(toCheckoutCartItem);

      // Build human-readable shipping_address. Pickup gets a fixed
      // string; delivery concatenates the address fields.
      const shippingAddress =
        shippingMethod === 'pickup'
          ? 'Pick up from store — BlackBox HQ, KNUST Campus'
          : [
              form.address.trim(),
              form.city.trim(),
              form.region.trim(),
              `Digital: ${form.digitalAddress.trim()}`,
            ]
              .filter(Boolean)
              .join(', ');

      const result = await rpcPlaceOrder(items, null, {
        shipping_address: shippingAddress,
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        payment_method: 'in_person',
        customer_name: user.name?.trim() || null,
        customer_email: user.email?.trim() || null,
        customer_phone: phone || null,
        notes: null,
      });

      // Checkout init: attach campus (scope) then promo_reserve once.
      // Charge total always comes from the server after reserve.
      const promoCode = loadPersistedPromoCode() || appliedPromo?.code || null;
      let chargeTotalGhs =
        typeof result.total === 'number' ? result.total : total;

      try {
        const campuses = await fetchCampuses(true);
        const campusId = campuses[0]?.id;
        if (campusId) {
          await promoSetOrderCampus(result.order_id, campusId);
        }

        // promo_reserve exactly once per checkout — never from the cart page.
        const reserved = await promoReserve({
          order_id: result.order_id,
          code: promoCode,
        });
        if (promoCode && !reserved.ok) {
          // Server message verbatim — do not paraphrase.
          notify(reserved.message, 'error');
        }
        chargeTotalGhs = await fetchOrderChargeTotalGhs(result.order_id);
      } catch (promoErr: unknown) {
        console.warn('promo_reserve failed:', promoErr);
        const msg =
          promoErr instanceof Error && promoErr.message
            ? promoErr.message
            : null;
        if (msg && promoCode) notify(msg, 'error');
      }

      // In-person path: apply reserved stock (Paystack webhook does this for card/MoMo).
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) {
          const origin =
            typeof window !== 'undefined' ? window.location.origin : '';
          await fetch(`${origin}/api/promo/apply-in-person`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              apikey: getSupabaseAnonKey(),
            },
            body: JSON.stringify({ order_id: result.order_id }),
          });
        }
      } catch (applyErr) {
        console.warn('promo_apply (in-person) failed:', applyErr);
      }

      clearPersistedPromoCode();

      // Clear cart (server + client).
      try {
        await clearCartItems(user.id);
      } catch (err) {
        // Non-fatal: the order is already in the DB. Keep going.
        console.warn('clearCartItems failed:', err);
      }
      setCart([]);

      void refreshProducts();

      const serverTotal = chargeTotalGhs;
      const nowIso = new Date().toISOString();
      const newOrder: Order = {
        id: result.order_id,
        userId: user.id,
        userName: user.name || 'Unknown',
        userEmail: user.email || '',
        userPhone: phone,
        items: cart,
        total: serverTotal,
        date: nowIso,
        status: 'Pending',
        payment_method: 'in_person',
        paymentMethod: 'in_person',
        shipping_address: shippingAddress,
        payment_status: 'pending',
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        display_id: result.display_id || `ORD-${result.order_id.slice(0, 8).toUpperCase()}`,
      };

      setOrders([newOrder, ...orders]);
      setCompletedOrder(newOrder);
      setShowOrderComplete(true);

      void requestLifecycleEmail('order_placed', {
        displayId: newOrder.display_id,
        referenceId: newOrder.id,
        extraBody:
          shippingMethod === 'pickup'
            ? 'You chose store pickup — we will email you when it is ready.'
            : undefined,
      });
      notify('Order placed successfully!', 'success');
    } catch (error: unknown) {
      console.error('Error placing order:', error);
      notify(friendlyError(error, 'place your order'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------
  // CHK-01: Empty cart → "Checkout Aborted" panel.
  // ----------------------------------------------------------
  if (cart.length === 0 && !showOrderComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#EDEDED] text-[#121212] dark:bg-gradient-to-b dark:from-[#050508] dark:via-[#080810] dark:to-[#050508] dark:text-white">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-[#B38B21]/10 blur-3xl rounded-full scale-150"></div>
            <div className="relative w-24 h-24 rounded-3xl border border-black/10 bg-white shadow-lg flex items-center justify-center mx-auto dark:border-white/10 dark:bg-white/5 dark:shadow-2xl">
              <ShoppingBag size={48} className="text-[#B38B21] opacity-30" />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic">
              Your cart is <span className="text-[#B38B21]">empty</span>
            </h2>
            <p className="text-sm font-medium text-black/55 dark:text-white/50 leading-relaxed normal-case tracking-normal max-w-sm mx-auto">
              Add items from the store before checking out. We&apos;ll bring you right back here when you&apos;re ready.
            </p>
          </div>

          <div className="pt-6">
            <button
              onClick={() => navigate({ to: '/store' })}
              className="w-full py-5 bg-[#B38B21] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[#D4AF37] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#B38B21]/10"
            >
              Browse the store
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Main checkout layout
  // ----------------------------------------------------------
  return (
    <div className="min-h-screen py-10 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#EDEDED] text-[#121212] dark:bg-gradient-to-b dark:from-[#050508] dark:via-[#080810] dark:to-[#050508] dark:text-white transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate({ to: '/cart' }))}
            className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Checkout</h1>
          </div>

          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-[#B38B21]' : 'text-black/40 dark:text-white/40'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 1 ? 'border-[#B38B21] bg-[#B38B21]/10' : 'border-black/20 dark:border-white/20'}`}>
                {step > 1 ? <Check className="w-3 h-3" /> : '1'}
              </span>
              <span className="font-bold uppercase tracking-widest">Pickup</span>
            </div>
            <span className="w-8 h-px bg-black/15 dark:bg-white/20" />
            <div className={`flex items-center gap-2 ${step === 2 ? 'text-[#B38B21]' : 'text-black/40 dark:text-white/40'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 2 ? 'border-[#B38B21] bg-[#B38B21]/10' : 'border-black/20 dark:border-white/20'}`}>
                2
              </span>
              <span className="font-bold uppercase tracking-widest">Payment</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ----- Main Content ----- */}
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <ShippingStep
                shippingMethod={shippingMethod}
                onShippingMethodChange={(m) => {
                  if (!DELIVERY_ENABLED && m === 'delivery') return;
                  setShippingMethod(m);
                }}
                form={form}
                onFormChange={setForm}
                errors={step1Errors}
                onContinue={goToStep2}
              />
            )}

            {step === 2 && !user && (
              <div className="bg-neutral-100/90 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#B38B21]" />
                  <h2 className="text-xl font-bold">Sign in to continue</h2>
                </div>
                <p className="text-sm text-black/60 dark:text-white/60">
                  You need a BlackBox account to place an order. Sign in on the login page — your checkout progress is saved and we&apos;ll bring you back here.
                </p>
                <button
                  type="button"
                  onClick={persistAndGoToLogin}
                  className="w-full py-3 bg-[#B38B21] text-black rounded-lg font-bold hover:bg-[#D4AF37] transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Go to sign in
                </button>
              </div>
            )}

            {step === 2 && user && (
              <PaymentStep
                shippingMethod={shippingMethod}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                card={card}
                onCardChange={setCard}
                momo={momo}
                onMomoChange={setMomo}
                onSubmit={submitOrder}
                onBack={() => setStep(1)}
                loading={loading}
              />
            )}
          </div>

          {/* ----- Order Summary (always visible) ----- */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sticky top-6 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>

              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm gap-2">
                    <span className="truncate">{item.name} x{item.quantity}</span>
                    <span className="shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-black/10 dark:border-white/10 pt-4 mb-4">
                <PromoCodeInput
                  cart={cart}
                  onAppliedChange={setAppliedPromo}
                  theme={theme}
                />
              </div>

              <div className="border-t border-black/10 dark:border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {appliedPromo && appliedPromo.discount_pesewas > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span className="truncate pr-2">{appliedPromo.name}</span>
                    <span className="shrink-0">−{formatGHS(appliedPromo.discount_pesewas)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Pickup</span>
                  <span>{shippingCost === 0 ? 'Free · Store' : formatCurrency(shippingCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-black/10 dark:border-white/10">
                  <span>Total</span>
                  <span className="text-[#B38B21]">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Complete Popup */}
      {showOrderComplete && completedOrder && (
        <OrderCompletePopup
          order={completedOrder}
          onClose={() => setShowOrderComplete(false)}
        />
      )}
    </div>
  );
};

// ============================================================
// Step 1 — Shipping (Pickup vs Delivery + address fields)
// ============================================================
interface ShippingStepProps {
  shippingMethod: ShippingMethod;
  onShippingMethodChange: (m: ShippingMethod) => void;
  form: {
    phone: string;
    address: string;
    city: string;
    region: string;
    digitalAddress: string;
  };
  onFormChange: (f: ShippingStepProps['form']) => void;
  errors: Record<string, string>;
  onContinue: () => void;
}

const ShippingStep: React.FC<ShippingStepProps> = ({
  shippingMethod,
  onShippingMethodChange,
  form,
  onFormChange,
  errors,
  onContinue,
}) => {
  const isDelivery = DELIVERY_ENABLED && shippingMethod === 'delivery';

  return (
    <div className="space-y-6">
      {/* Shipping method selector */}
      <div className="bg-neutral-100/90 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-[#B38B21]" />
          How would you like to receive your order?
        </h2>

        <div className={`grid grid-cols-1 gap-3 ${DELIVERY_ENABLED ? 'sm:grid-cols-2' : ''}`}>
          <button
            type="button"
            onClick={() => onShippingMethodChange('pickup')}
            className={`text-left p-4 rounded-xl border transition-all ${
              !isDelivery
                ? 'border-[#B38B21] bg-[#B38B21]/10'
                : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-[#B38B21]" />
              <div>
                <p className="font-bold">Pick up from store</p>
                <p className="text-xs text-black/60 dark:text-white/60">Free · Ready in 24h · KNUST Campus</p>
              </div>
            </div>
          </button>

          {/* Delivery kept for future launch — hidden while DELIVERY_ENABLED is false */}
          {DELIVERY_ENABLED && (
            <button
              type="button"
              onClick={() => onShippingMethodChange('delivery')}
              className={`text-left p-4 rounded-xl border transition-all ${
                isDelivery
                  ? 'border-[#B38B21] bg-[#B38B21]/10'
                  : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#B38B21]" />
                <div>
                  <p className="font-bold">Deliver</p>
                  <p className="text-xs text-black/60 dark:text-white/60">From GH₵50 · Free over GH₵5,000</p>
                </div>
              </div>
            </button>
          )}
        </div>

        {!DELIVERY_ENABLED && (
          <p className="mt-3 text-xs text-black/55 dark:text-white/50">
            Store pickup only for now — we do not offer delivery yet.
          </p>
        )}
      </div>

      {/* Pickup card */}
      {!isDelivery && (
        <div className="bg-neutral-100/90 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-6 space-y-4">
          <div className="p-4 bg-[#B38B21]/10 border border-[#B38B21]/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#B38B21]/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#B38B21]" />
              </div>
              <div>
                <p className="font-bold text-[#B38B21]">BlackBox HQ</p>
                <p className="text-sm text-black/75 dark:text-white/80">KNUST Campus, Kumasi</p>
                <p className="text-xs text-black/50 dark:text-white/50">Pickup within 24h of order confirmation</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
              className={`w-full bg-neutral-100 dark:bg-black/50 border rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/30 ${
                errors.phone ? 'border-red-500/60' : 'border-black/15 dark:border-white/20'
              }`}
              placeholder="+233 XX XXX XXXX"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-xs text-red-400 mt-1">{errors.phone}</p>
            )}
          </div>
        </div>
      )}

      {/* Delivery fields */}
      {isDelivery && (
        <div className="bg-neutral-100/90 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#B38B21]" />
            Delivery Address
          </h3>

          <div>
            <label className="block text-sm font-medium mb-2">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => onFormChange({ ...form, address: e.target.value })}
              className={`w-full bg-neutral-100 dark:bg-black/50 border rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/30 ${
                errors.address ? 'border-red-500/60' : 'border-black/15 dark:border-white/20'
              }`}
              placeholder="123 Main St"
            />
            {errors.address && <p className="text-xs text-red-400 mt-1">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                City / Town <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => onFormChange({ ...form, city: e.target.value })}
                className={`w-full bg-neutral-100 dark:bg-black/50 border rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/30 ${
                  errors.city ? 'border-red-500/60' : 'border-black/15 dark:border-white/20'
                }`}
                placeholder="Kumasi"
              />
              {errors.city && <p className="text-xs text-red-400 mt-1">{errors.city}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Region <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.region}
                onChange={(e) => onFormChange({ ...form, region: e.target.value })}
                className={`w-full bg-neutral-100 dark:bg-black/50 border rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/30 appearance-none ${
                  errors.region ? 'border-red-500/60' : 'border-black/15 dark:border-white/20'
                }`}
              >
                <option value="" className="bg-white text-black dark:bg-neutral-900 dark:text-white">Select a region</option>
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r} className="bg-white text-black dark:bg-neutral-900 dark:text-white">
                    {r}
                  </option>
                ))}
              </select>
              {errors.region && <p className="text-xs text-red-400 mt-1">{errors.region}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              National Digital Address (Ghana Post) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.digitalAddress}
              onChange={(e) => onFormChange({ ...form, digitalAddress: e.target.value })}
              className={`w-full bg-neutral-100 dark:bg-black/50 border rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/30 uppercase tracking-wider ${
                errors.digitalAddress ? 'border-red-500/60' : 'border-black/15 dark:border-white/20'
              }`}
              placeholder="GA-xxx-xxxx"
            />
            {errors.digitalAddress && (
              <p className="text-xs text-red-400 mt-1">{errors.digitalAddress}</p>
            )}
            <p className="text-xs text-black/45 dark:text-white/40 mt-1">
              Don't have one? Look it up at{' '}
              <a
                href="https://www.ghanapostgps.com"
                target="_blank"
                rel="noreferrer"
                className="text-[#B38B21] underline-offset-2 hover:underline"
              >
                ghanapostgps.com
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
              className={`w-full bg-neutral-100 dark:bg-black/50 border rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/30 ${
                errors.phone ? 'border-red-500/60' : 'border-black/15 dark:border-white/20'
              }`}
              placeholder="+233 XX XXX XXXX"
            />
            {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="px-8 py-4 bg-[#B38B21] text-black rounded-lg font-bold hover:bg-[#D4AF37] transition-colors text-lg"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Step 2 — Payment (Cash on Pickup is the only wired path today;
// Card and Mobile Money are UI-only placeholders for the future
// payment integration.)
// ============================================================
interface PaymentStepProps {
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  card: { number: string; name: string; expiry: string; cvv: string };
  onCardChange: (c: PaymentStepProps['card']) => void;
  momo: { provider: string; number: string };
  onMomoChange: (m: PaymentStepProps['momo']) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

const PaymentStep: React.FC<PaymentStepProps> = ({
  shippingMethod,
  paymentMethod,
  onPaymentMethodChange,
  card,
  onCardChange,
  momo,
  onMomoChange,
  onSubmit,
  onBack,
  loading,
}) => {
  const isPickup = shippingMethod === 'pickup';

  return (
    <div className="bg-neutral-100/90 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-6 space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-[#B38B21]" />
        Payment Method
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onPaymentMethodChange('pickup_cash')}
          className={`p-4 rounded-xl border text-left transition-all ${
            paymentMethod === 'pickup_cash'
              ? 'border-[#B38B21] bg-[#B38B21]/10'
              : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/30'
          }`}
        >
          <Store className="w-5 h-5 text-[#B38B21] mb-2" />
          <p className="font-bold">Pay on Pickup</p>
          <p className="text-xs text-black/60 dark:text-white/60 mt-1">Pay in store on collection</p>
        </button>

        <button
          type="button"
          onClick={() => onPaymentMethodChange('card')}
          disabled={isPickup}
          className={`p-4 rounded-xl border text-left transition-all relative ${
            paymentMethod === 'card'
              ? 'border-[#B38B21] bg-[#B38B21]/10'
              : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/30'
          } ${isPickup ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <CreditCard className="w-5 h-5 text-[#B38B21] mb-2" />
          <p className="font-bold">Credit Card</p>
          <p className="text-xs text-black/60 dark:text-white/60 mt-1">Visa / Mastercard</p>
          <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            Soon
          </span>
        </button>

        <button
          type="button"
          onClick={() => onPaymentMethodChange('mobile_money')}
          disabled={isPickup}
          className={`p-4 rounded-xl border text-left transition-all relative ${
            paymentMethod === 'mobile_money'
              ? 'border-[#B38B21] bg-[#B38B21]/10'
              : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/30'
          } ${isPickup ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <Smartphone className="w-5 h-5 text-[#B38B21] mb-2" />
          <p className="font-bold">Mobile Money</p>
          <p className="text-xs text-black/60 dark:text-white/60 mt-1">MTN / Vodafone / AirtelTigo</p>
          <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            Soon
          </span>
        </button>
      </div>

      {/* Pay-on-Pickup confirmation card */}
      {paymentMethod === 'pickup_cash' && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-bold text-emerald-300">Pay on collection</p>
              <p className="text-black/65 dark:text-white/70 mt-1">
                We'll reserve your items and notify you when they're ready. Pay in
                cash, by card, or via Mobile Money at the counter when you pick
                them up.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Credit card form — UI only */}
      {paymentMethod === 'card' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
            Online card payments aren't enabled yet. Please pick "Pay on Pickup"
            and pay in store. (The form below is for future Paystack integration.)
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Card Number</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              maxLength={19}
              value={card.number}
              onChange={(e) => onCardChange({ ...card, number: e.target.value })}
              className="w-full bg-neutral-100 dark:bg-black/50 border border-black/15 dark:border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/40 dark:text-white dark:placeholder:text-white/35 tracking-wider"
              placeholder="4111 1111 1111 1111"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cardholder Name</label>
            <input
              type="text"
              autoComplete="cc-name"
              value={card.name}
              onChange={(e) => onCardChange({ ...card, name: e.target.value })}
              className="w-full bg-neutral-100 dark:bg-black/50 border border-black/15 dark:border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/35"
              placeholder="JANE DOE"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Expiry</label>
              <input
                type="text"
                autoComplete="cc-exp"
                maxLength={5}
                value={card.expiry}
                onChange={(e) => onCardChange({ ...card, expiry: e.target.value })}
                className="w-full bg-neutral-100 dark:bg-black/50 border border-black/15 dark:border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/35"
                placeholder="MM/YY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CVV</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                value={card.cvv}
                onChange={(e) => onCardChange({ ...card, cvv: e.target.value })}
                className="w-full bg-neutral-100 dark:bg-black/50 border border-black/15 dark:border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/35"
                placeholder="123"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Money form — UI only */}
      {paymentMethod === 'mobile_money' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
            Mobile Money checkout isn't enabled yet. Please pick "Pay on Pickup" and
            pay in store. (The form below is for future Paystack integration.)
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Network</label>
            <select
              value={momo.provider}
              onChange={(e) => onMomoChange({ ...momo, provider: e.target.value })}
              className="w-full bg-neutral-100 dark:bg-black/50 border border-black/15 dark:border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/35"
            >
              <option value="MTN" className="bg-white text-black dark:bg-neutral-900 dark:text-white">MTN Mobile Money</option>
              <option value="Vodafone" className="bg-white text-black dark:bg-neutral-900 dark:text-white">Vodafone Cash</option>
              <option value="AirtelTigo" className="bg-white text-black dark:bg-neutral-900 dark:text-white">AirtelTigo Money</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mobile Money Number</label>
            <input
              type="tel"
              value={momo.number}
              onChange={(e) => onMomoChange({ ...momo, number: e.target.value })}
              className="w-full bg-neutral-100 dark:bg-black/50 border border-black/15 dark:border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-black placeholder:text-black/45 dark:text-white dark:placeholder:text-white/35"
              placeholder="+233 XX XXX XXXX"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-black/10 dark:border-white/10 rounded-lg font-bold hover:bg-neutral-200/90 dark:hover:bg-white/10 transition-colors"
        >
          Back to Pickup
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="px-8 py-4 bg-[#B38B21] text-black rounded-lg font-bold hover:bg-[#D4AF37] transition-colors disabled:opacity-50 text-lg"
        >
          {loading ? 'Placing order…' : 'Confirm Order'}
        </button>
      </div>
    </div>
  );
};
