import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Truck, Shield, Check, MapPin, User, Phone, Mail, ShoppingBag } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import { CartItem, Order } from '../types';
import { formatCurrency, generateId } from '../lib/utils';
import { signIn, signUp, getUserProfile, getOrCreateCustomer, placeOrder, clearCartItems } from '../lib/api';
import { OrderCompletePopup } from '../components/OrderCompletePopup';
import { addTrackingUpdate } from '../lib/setupTracking';

export const Checkout: React.FC = () => {
  const { user, setUser, cart, setCart, orders, setOrders, notify } = useAppContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showOrderComplete, setShowOrderComplete] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    shippingAddress: user?.address || '',
    region: '',
    city: '',
    postalCode: '',
    phone: user?.phone || '',
    paymentMethod: 'card',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false
  });

  const [shippingMethod, setShippingMethod] = useState('deliver');
  const shippingCosts = {
    deliver: 50,
    pickup: 0
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = shippingCosts[shippingMethod as keyof typeof shippingCosts];
  const total = subtotal + shippingCost;

  // Auth State for Inline Login
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      if (authMode === 'login') {
        const { user: authUser } = await signIn(authForm.email, authForm.password);
        if (authUser) {
          const profile = await getUserProfile(authUser.id);
          setUser({
            id: authUser.id,
            name: profile?.name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            password: authForm.password,
            role: profile?.role || 'user'
          });
          notify('Successfully signed in. You may now complete your purchase.');
        }
      } else {
        const { user: authUser } = await signUp(authForm.email, authForm.password);
        if (authUser) {
          const profile = await getUserProfile(authUser.id);
          setUser({
            id: authUser.id,
            name: authForm.name,
            email: authUser.email || '',
            password: authForm.password,
            role: profile?.role || 'user'
          });
          notify('Account created successfully. You may now complete your purchase.');
        }
      }
    } catch (error: any) {
      notify(error.message || 'Authentication failed', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.shippingAddress && formData.region && formData.city && formData.postalCode && formData.phone;
      case 2: return formData.paymentMethod && (
        formData.paymentMethod !== 'card' ||
        (formData.cardNumber && formData.cardName && formData.expiryDate && formData.cvv)
      );
      default: return true;
    }
  };

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

    // Validate customer data
    if (!formData.shippingAddress || !formData.city || !formData.region || !formData.postalCode) {
      notify('Please complete your shipping information', 'error');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Get or create customer
      const customer = await getOrCreateCustomer(
        user.name || 'Unknown',
        user.email || '',
        formData.phone || user.phone || '',
        `${formData.shippingAddress}, ${formData.city}, ${formData.region}, ${formData.postalCode}`
      );

      // Step 2: Place order using RPC
      const order = await placeOrder(
        user.id,
        customer.id,
        shippingMethod === 'pickup' ? 'Pick up from store' : `${formData.shippingAddress}, ${formData.city}, ${formData.region}, ${formData.postalCode}`,
        formData.paymentMethod,
        cart
      );

      // Step 3: Clear cart
      await clearCartItems(user.id);

      // Step 4: Update local orders state
      const newOrder: Order = {
        id: order.id,
        userId: user.id,
        userName: user.name || 'Unknown',
        userEmail: user.email || '',
        userPhone: formData.phone || user.phone || '',
        items: cart,
        total: total,
        date: order.created_at,
        status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        paymentMethod: formData.paymentMethod,
        shipping_address: shippingMethod === 'pickup' ? 'Pick up from store' : `${formData.shippingAddress}, ${formData.city}, ${formData.region}, ${formData.postalCode}`,
        tracking_number: order.tracking_number,
        payment_status: formData.paymentMethod === 'delivery' ? 'pending' : 'paid',
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        display_id: order.display_id || `ORD-${order.id}`
      };

      setOrders([newOrder, ...orders]);
      setCompletedOrder(newOrder);
      setShowOrderComplete(true);

      notify('Order placed successfully!');

    } catch (error: any) {
      console.error('Error placing order:', error);
      notify(error.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setLoading(false);
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
            {/* Step 1: Shipping */}
            {step === 1 && (
              <form id="shippingForm" onSubmit={(e) => { e.preventDefault(); setStep(step + 1); }} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#B38B21]" />
                  Shipping Information
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Shipping Method</label>
                    <div className="space-y-2">
                      {Object.entries(shippingCosts).map(([method, cost]) => (
                        <label key={method} className="flex items-center justify-between p-3 border border-white/10 rounded-lg cursor-pointer hover:bg-white/5">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shipping"
                              value={method}
                              checked={shippingMethod === method}
                              onChange={(e) => setShippingMethod(e.target.value)}
                              className="text-[#B38B21]"
                            />
                            <span className="capitalize">{method === 'pickup' ? 'Pick up from store' : method}</span>
                          </div>
                          <span>{cost === 0 ? 'Free' : formatCurrency(cost)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {shippingMethod === 'deliver' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Street Address <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.shippingAddress}
                          onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                          className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-white placeholder:text-white/40"
                          placeholder="123 Main St"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Region <span className="text-red-500">*</span></label>
                          <select
                            required
                            value={formData.region}
                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                          >
                            <option value="" disabled>Select Region</option>
                            <option value="Ashanti">Ashanti</option>
                            <option value="Ahafo">Ahafo</option>
                            <option value="Bono">Bono</option>
                            <option value="Bono East">Bono East</option>
                            <option value="Central">Central</option>
                            <option value="Eastern">Eastern</option>
                            <option value="Greater Accra">Greater Accra</option>
                            <option value="Northern">Northern</option>
                            <option value="North East">North East</option>
                            <option value="Oti">Oti</option>
                            <option value="Savannah">Savannah</option>
                            <option value="Upper East">Upper East</option>
                            <option value="Upper West">Upper West</option>
                            <option value="Volta">Volta</option>
                            <option value="Western">Western</option>
                            <option value="Western North">Western North</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">City/Town <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-white placeholder:text-white/40"
                            placeholder="Accra"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">National Digital Address <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none text-white placeholder:text-white/40"
                          placeholder="GA-123-4567"
                        />
                      </div>
                    </div>
                  )}

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
            )}

            {/* Step 2: Authentication OR Payment */}
            {step === 2 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                {!user ? (
                  // Inline Auth Form
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <User className="w-5 h-5 text-[#B38B21]" />
                      Account Required
                    </h2>
                    <p className="text-white/60 text-sm">Please sign in or create an account to complete your order.</p>

                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      {authMode === 'signup' && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Name</label>
                          <input
                            type="text"
                            required
                            value={authForm.name}
                            onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                            placeholder="John Doe"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                          type="email"
                          required
                          value={authForm.email}
                          onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                          className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                          placeholder="your@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <input
                          type="password"
                          required
                          value={authForm.password}
                          onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                          className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                          placeholder="••••••••"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isAuthenticating}
                        className="w-full py-3 bg-[#B38B21] hover:bg-[#D4AF37] text-black font-bold flex items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isAuthenticating ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                      </button>
                    </form>

                    <div className="text-center pt-2">
                      <button
                        onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                        className="text-sm text-white/50 hover:text-[#B38B21] transition-colors"
                      >
                        {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Payment Form
                  <form id="paymentForm" onSubmit={(e) => { e.preventDefault(); submitOrder(); }} className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#B38B21]" />
                      Payment Information
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-3">Payment Method</label>
                        <div className="grid grid-cols-1 gap-4">
                          {['card', 'mobile', 'delivery'].map((method) => (
                            <label key={method} className="flex items-center gap-3 p-3 border border-white/10 rounded-lg cursor-pointer hover:bg-white/5">
                              <input
                                type="radio"
                                name="payment"
                                value={method}
                                checked={formData.paymentMethod === method}
                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                className="text-[#B38B21]"
                              />
                              <span className="capitalize">
                                {method === 'card' ? 'Credit Card' : 
                                 method === 'mobile' ? 'Mobile Money' : 
                                 'Pay on Delivery'}
                              </span>
                              {method === 'delivery' && (
                                <span className="text-xs text-white/50 ml-2">(Pay when you receive)</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>

                      {formData.paymentMethod === 'card' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2">Card Number</label>
                            <input
                              type="text"
                              required
                              value={formData.cardNumber}
                              onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                              placeholder="1234 5678 9012 3456"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                            <input
                              type="text"
                              required
                              value={formData.cardName}
                              onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                              placeholder="John Doe"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Expiry Date</label>
                              <input
                                type="text"
                                required
                                value={formData.expiryDate}
                                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                                placeholder="MM/YY"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">CVV</label>
                              <input
                                type="text"
                                required
                                value={formData.cvv}
                                onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                                placeholder="123"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${step === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'
                  }`}
                disabled={step === 1}
              >
                Back
              </button>

              {step < 2 ? (
                <button
                  type="submit"
                  form="shippingForm"
                  className="px-6 py-3 bg-[#B38B21] text-black rounded-lg font-medium hover:bg-[#D4AF37] transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  form="paymentForm"
                  disabled={loading || !user}
                  className="px-6 py-3 bg-[#B38B21] text-black rounded-lg font-medium hover:bg-[#D4AF37] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
              )}
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

              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
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
