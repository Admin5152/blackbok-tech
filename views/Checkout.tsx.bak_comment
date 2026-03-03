import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Truck, Shield, Check, MapPin, User, Phone, Mail, ShoppingBag } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import { CartItem, Order } from '../types';
import { formatCurrency, generateId } from '../lib/utils';

export const Checkout: React.FC = () => {
  const { user, cart, setCart, orders, setOrders, notify } = useAppContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shippingAddress: user?.address || '',
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

  const [shippingMethod, setShippingMethod] = useState('standard');
  const shippingCosts = {
    standard: 0,
    express: 15,
    overnight: 35
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = shippingCosts[shippingMethod as keyof typeof shippingCosts];
  const total = subtotal + shippingCost;

  const canProceed = () => {
    switch(step) {
      case 1: return formData.shippingAddress && formData.city && formData.postalCode && formData.phone;
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

    try {
      setLoading(true);
      
      // Create order in database
      const orderData = {
        user_id: user.id,
        user_name: user.name,
        items: cart,
        total: total,
        status: 'Pending',
        payment_method: formData.paymentMethod,
        shipping_address: `${formData.shippingAddress}, ${formData.city}, ${formData.postalCode}`,
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        payment_status: 'pending'
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      // Add initial tracking update
      await supabase.rpc('add_tracking_update', {
        p_order_id: order.id,
        p_status: 'Order Placed',
        p_description: 'Your order has been received and is being processed.'
      });

      // Clear cart
      setCart([]);
      
      // Update local orders
      const newOrder: Order = {
        id: order.id,
        userId: user.id,
        userName: user.name,
        items: cart,
        total: total,
        status: 'Pending',
        date: order.created_at,
        paymentMethod: formData.paymentMethod,
        tracking_number: order.tracking_number,
        shipping_address: order.shipping_address,
        payment_status: order.payment_status,
        shipping_method: order.shipping_method,
        shipping_cost: order.shipping_cost
      };
      
      setOrders([newOrder, ...orders]);
      
      notify('Order placed successfully!');
      navigate({ to: '/profile' });
      
    } catch (error) {
      console.error('Error placing order:', error);
      notify('Failed to place order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <button 
            onClick={() => navigate({ to: '/store' })}
            className="mt-4 px-6 py-3 bg-[#B38B21] text-black rounded-lg font-semibold hover:bg-[#D4AF37] transition-colors"
          >
            Continue Shopping
          </button>
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
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#B38B21]" />
                  Shipping Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Street Address</label>
                    <input
                      type="text"
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData({...formData, shippingAddress: e.target.value})}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                      placeholder="123 Main St"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                        placeholder="Accra"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Postal Code</label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                        placeholder="00233"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                      placeholder="+233 XX XXX XXXX"
                    />
                  </div>
                </div>

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
                          <span className="capitalize">{method}</span>
                        </div>
                        <span>{cost === 0 ? 'Free' : formatCurrency(cost)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#B38B21]" />
                  Payment Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-3">Payment Method</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['card', 'mobile'].map((method) => (
                        <label key={method} className="flex items-center gap-3 p-3 border border-white/10 rounded-lg cursor-pointer hover:bg-white/5">
                          <input
                            type="radio"
                            name="payment"
                            value={method}
                            checked={formData.paymentMethod === method}
                            onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                            className="text-[#B38B21]"
                          />
                          <span className="capitalize">{method === 'card' ? 'Credit Card' : 'Mobile Money'}</span>
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
                          value={formData.cardNumber}
                          onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                          className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                          placeholder="1234 5678 9012 3456"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                        <input
                          type="text"
                          value={formData.cardName}
                          onChange={(e) => setFormData({...formData, cardName: e.target.value})}
                          className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                          placeholder="John Doe"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Expiry Date</label>
                          <input
                            type="text"
                            value={formData.expiryDate}
                            onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                            placeholder="MM/YY"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">CVV</label>
                          <input
                            type="text"
                            value={formData.cvv}
                            onChange={(e) => setFormData({...formData, cvv: e.target.value})}
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 focus:border-[#B38B21] outline-none"
                            placeholder="123"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  step === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'
                }`}
                disabled={step === 1}
              >
                Back
              </button>
              
              {step < 2 ? (
                <button
                  onClick={() => canProceed() && setStep(step + 1)}
                  disabled={!canProceed()}
                  className="px-6 py-3 bg-[#B38B21] text-black rounded-lg font-medium hover:bg-[#D4AF37] transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={submitOrder}
                  disabled={!canProceed() || loading}
                  className="px-6 py-3 bg-[#B38B21] text-black rounded-lg font-medium hover:bg-[#D4AF37] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
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
    </div>
  );
};
