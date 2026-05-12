import React, { useEffect, useState } from 'react';
import { ArrowLeft, Truck, Shield, MapPin, ShoppingBag } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAppContext } from '../App';
import { CartItem, Order } from '../types';
import { formatCurrency } from '../lib/utils';
import { clearCartItems, updateProfilePhone } from '../lib/api';
import { OrderCompletePopup } from '../components/OrderCompletePopup';
import { CouponInput } from '../components/checkout/CouponInput';
import type { AppliedCoupon } from '../hooks/useCoupons';
import { useCheckout, type CheckoutCartItem } from '../hooks/useCheckout';

/** Reduce a UI CartItem down to the snake_case payload the RPC expects. */
function toCheckoutCartItem(item: CartItem): CheckoutCartItem {
  return {
    product_id: (item.product_id || item.id) as string,
    variant_id: item.variant_id ?? null,
    quantity: Number(item.quantity || 1),
    unit_price: Number(item.price || 0),
    product_name: item.name ?? null,
    product_image: item.image ?? item.image_url ?? null,
    product_options: item.selectedOptions ?? null,
  };
}

export const Checkout: React.FC = () => {
  const { user, cart, setCart, orders, setOrders, notify } = useAppContext();
  const navigate = useNavigate();
  const { placeOrder: rpcPlaceOrder, loading: checkoutLoading } = useCheckout();
  const [submitting, setSubmitting] = useState(false);
  const loading = submitting || checkoutLoading;
  const [showOrderComplete, setShowOrderComplete] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    phone: user?.phone || ''
  });
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = 0;
  // Cap the displayed discount at the current subtotal in case the cart shrank
  // after the coupon was validated.
  const discount = Math.min(appliedCoupon?.discountAmount ?? 0, subtotal);
  const total = Math.max(0, subtotal + shippingCost - discount);

  // If the cart empties out, drop any applied coupon so the next visit starts
  // clean.
  useEffect(() => {
    if (cart.length === 0 && appliedCoupon) {
      setAppliedCoupon(null);
    }
  }, [cart.length, appliedCoupon]);

  const submitOrder = async () => {
    if (!user) {
      notify('Please login to place an order', 'error');
      navigate({ to: '/auth' });
      return;
    }

    // Validate cart is not empty
    if (cart.length === 0) {
      notify('Your cart is empty. Add items before checkout', 'error');
      navigate({ to: '/store' });
      return;
    }


    try {
      setSubmitting(true);

      // Save latest phone number to profile for admin/order visibility.
      const checkoutPhone = (formData.phone || user.phone || '').trim();
      if (checkoutPhone) {
        await updateProfilePhone(user.id, checkoutPhone);
      }

      // Step 1: Place order via the place_order RPC. The hook handles
      //   - server-side coupon revalidation
      //   - coupon_uses reservation + linking
      //   - rollback on failure
      const items = cart.map(toCheckoutCartItem);
      const result = await rpcPlaceOrder(items, appliedCoupon);

      // Step 2: Clear cart
      await clearCartItems(user.id);
      setCart([]);

      // Step 3: Update local orders state. Total comes from the RPC so it
      //   reflects the server-side discount/shipping calculation.
      const serverTotal =
        typeof result.total === 'number' ? result.total : total;
      const nowIso = new Date().toISOString();
      const newOrder: Order = {
        id: result.order_id,
        userId: user.id,
        userName: user.name || 'Unknown',
        userEmail: user.email || '',
        userPhone: checkoutPhone,
        items: cart,
        total: serverTotal,
        date: nowIso,
        status: 'Pending',
        payment_method: 'in_person',
        paymentMethod: 'in_person',
        shipping_address: 'Pick up from store',
        payment_status: 'pending',
        shipping_method: 'pickup',
        shipping_cost: 0,
        display_id: result.display_id || `ORD-${result.order_id}`
      };

      setOrders([newOrder, ...orders]);
      setCompletedOrder(newOrder);
      setShowOrderComplete(true);

      notify('Order placed successfully!');

    } catch (error: unknown) {
      console.error('Error placing order:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to place order. Please try again.';
      notify(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-[#B38B21]/10 blur-3xl rounded-full scale-150"></div>
            <div className="relative w-24 h-24 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center mx-auto shadow-2xl">
              <ShoppingBag size={48} className="text-[#B38B21] opacity-30" />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic">All <span className="text-[#B38B21]">Done</span></h2>
            <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40 leading-relaxed">
              Your Orders have been placed and are being processed. Thank You For Shopping at Black-Box
            </p>
          </div>

          <div className="pt-6">
            <button
              onClick={() => navigate({ to: '/store' })}
              className="w-full py-5 bg-[#B38B21] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[#D4AF37] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#B38B21]/10"
            >
              Continue Shopping?
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate({ to: '/store' })}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Checkout</h1>
            <p className="text-white/60">Complete your order</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Form */}
            <form id="orderForm" onSubmit={(e) => { e.preventDefault(); submitOrder(); }} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#B38B21]" />
                Order Information
              </h2>

              <div className="space-y-6">
                <div className="p-4 bg-[#B38B21]/10 border border-[#B38B21]/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#B38B21]/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#B38B21]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#B38B21]">Pick up from store</p>
                      <p className="text-sm text-white/60">BlackBox HQ, KNUST Campus</p>
                      <p className="text-xs text-white/40">Pickup within 24h</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
              </div>
            </form>

            {/* Place Order Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                form="orderForm"
                disabled={loading || !user}
                className="px-8 py-4 bg-[#B38B21] text-black rounded-lg font-bold hover:bg-[#D4AF37] transition-colors disabled:opacity-50 text-lg"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-6">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>

              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 mb-4">
                <CouponInput
                  orderTotal={subtotal}
                  onCouponApplied={setAppliedCoupon}
                  theme="dark"
                />
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && appliedCoupon && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>−{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? 'Free' : formatCurrency(shippingCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-white/10">
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
