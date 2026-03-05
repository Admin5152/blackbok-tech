import React, { useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  ShoppingCart,
  Package,
  Truck,
  Gift,
  MapPin,
  Building2,
  ArrowLeft,
  FileText,
  Eye
} from "lucide-react";
import { CartItem, Product, User } from "../types";
import { formatCurrency } from "../lib/utils";
import { ProductCard } from "../components/ProductCard";

interface CartProps {
  cart: CartItem[];
  products: Product[];
  updateQuantity: (
    id: string,
    options: Record<string, string> | undefined,
    delta: number
  ) => void;
  removeFromCart: (uniqueId: string) => void;
  handleCheckout: (total: number) => void;
  navigateTo: (view: string, id?: string) => void;
  onQuickView: (p: Product) => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  onToggleCompare: (id: string) => void;
  compareIds: string[];
  onAddToCart: (p: Product) => void;
  user: User | null;
}

export const Cart: React.FC<CartProps> = ({
  cart,
  products,
  updateQuantity,
  removeFromCart,
  navigateTo,
  onQuickView,
  wishlist,
  toggleWishlist,
  onToggleCompare,
  compareIds,
  onAddToCart,
  handleCheckout,
  user,
}) => {
  const [deliveryMethod, setDeliveryMethod] = useState<'deliver' | 'pickup'>('deliver');
  const [digitalAddress, setDigitalAddress] = useState(user?.address || '');
  const [region, setRegion] = useState(user?.region || '');
  const [town, setTown] = useState(user?.city || '');

  const freeShippingThreshold = 5000;
  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.125;
  const shipping = deliveryMethod === 'pickup' ? 0 : (subtotal >= freeShippingThreshold ? 0 : 50);
  const total = subtotal + tax + shipping;

  const progressToFreeShipping = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const remainingForFreeShipping = Math.max(freeShippingThreshold - subtotal, 0);

  const recommendations = products
    .filter((p) => !cart.find((c) => c.id === p.id))
    .slice(0, 4);

  return (
    <div className="bg-[var(--bb-bg)] min-h-screen text-[var(--bb-text)] px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-16 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#CDA032]/5 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#CDA032]/5 rounded-full blur-[120px] pointer-events-none transform -translate-x-1/3 translate-y-1/3" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--bb-border)]/40">
          <div>
            <h1 className="text-4xl sm:text-7xl font-black uppercase tracking-tighter italic mb-4">Your Cart.</h1>
            <div className="flex items-center gap-6">
              <p className="text-sm font-bold opacity-50 uppercase tracking-widest">{cart.length} {cart.length === 1 ? 'Item' : 'Items'} Selected</p>
              {cart.length > 0 && (
                <button
                  onClick={() => { if (window.confirm('Clear all items from your cart?')) cart.forEach(item => removeFromCart(`${item.id}-${JSON.stringify(item.selectedOptions)}`)) }}
                  className="text-[10px] font-black uppercase tracking-widest text-[#CDA032] hover:text-[#B38B21] transition-colors flex items-center gap-2"
                >
                  <Trash2 size={12} /> Empty Cart
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => navigateTo('store')}
            className={`flex items-center gap-3 px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all w-fit ${cart.length === 0 ? 'bg-[var(--bb-surface-2)] text-[var(--bb-text)] hover:bg-[#CDA032] hover:text-black' : 'bg-black text-white dark:bg-white dark:text-black shadow-xl hover:scale-105 hover:shadow-2xl'}`}
          >
            <ArrowLeft size={14} /> Continue Shopping
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14">

          {/* LEFT — ITEMS */}
          <div className="lg:col-span-8 space-y-6">

            {cart.length === 0 ? (
              <div className="py-12 md:py-16 text-center border p-8 border-[var(--bb-border)] rounded-[2.5rem] bg-[var(--bb-surface)] relative overflow-hidden group">
                {/* Background Decorative Elements */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#CDA032]/10 to-transparent opacity-50 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#CDA032]/5 rounded-full blur-[60px] pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-[#CDA032]/20 blur-xl rounded-full scale-150 animate-pulse"></div>
                    <div className="relative w-16 h-16 rounded-2xl border-2 border-[#CDA032]/30 flex items-center justify-center bg-black shadow-2xl mx-auto">
                      <ShoppingCart size={24} className="text-[#CDA032] opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">
                      Inventory <span className="text-[#CDA032]">Void</span>
                    </h2>
                    <p className="opacity-40 text-[10px] font-black uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                      Protocol: Cart_is_Null • No premium hardware detected.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => navigateTo("store")}
                      className="px-10 py-4 bg-[#CDA032] text-black rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#B38B21] transition-all hover:scale-105 active:scale-95 shadow-[0_15px_30px_rgba(205,160,50,0.2)] flex items-center gap-3 mx-auto"
                    >
                      Initialize Catalog
                      <ArrowLeft className="rotate-180" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              cart.map((item) => {
                const uniqueId = `${item.id}-${JSON.stringify(
                  item.selectedOptions
                )}`;

                return (
                  <div
                    key={uniqueId}
                    className="flex flex-col md:flex-row gap-6 sm:gap-10 pb-10 border-b border-[var(--bb-border)]/30 last:border-0 pt-6 first:pt-0"
                  >
                    {/* Image */}
                    <div className="w-full sm:w-48 h-48 rounded-[2rem] bg-black/5 dark:bg-white/5 flex items-center justify-center p-6 relative overflow-hidden shrink-0 group hover:shadow-2xl transition-all duration-700 cursor-pointer" onClick={() => navigateTo('product', item.id)}>
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/10 dark:from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-700 ease-out"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between py-2">

                      {/* Top */}
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-4">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#CDA032] opacity-80">
                            {item.category}
                          </p>
                          <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-none hover:text-[#CDA032] transition-colors cursor-pointer" onClick={() => navigateTo('product', item.id)}>
                            {item.name}
                          </h3>

                          {/* Options if they exist */}
                          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {Object.entries(item.selectedOptions).map(([key, val]) => (
                                <span key={key} className="px-3 py-1.5 bg-[var(--bb-surface-2)] rounded-full text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 backdrop-blur-md">
                                  {key}: {val}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="sm:text-right mt-4 sm:mt-0">
                          <p className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-sm">
                            {formatCurrency(item.price)}
                          </p>
                          <p className="text-[9px] uppercase font-black tracking-[0.2em] opacity-30 mt-1">
                            Unit Price
                          </p>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-6 mt-8">

                        <div className="flex items-center gap-8">
                          {/* Quantity Selector Minimal */}
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => updateQuantity(item.id, item.selectedOptions, -1)}
                              className="w-8 h-8 rounded-full border border-[var(--bb-border)] flex items-center justify-center opacity-50 hover:opacity-100 hover:border-[#CDA032] hover:text-[#CDA032] transition-all"
                            >
                              <Minus size={12} strokeWidth={3} />
                            </button>

                            <span className="w-4 text-center text-lg font-black">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() => updateQuantity(item.id, item.selectedOptions, 1)}
                              className="w-8 h-8 rounded-full border border-[var(--bb-border)] flex items-center justify-center opacity-50 hover:opacity-100 hover:border-[#CDA032] hover:text-[#CDA032] transition-all"
                            >
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => removeFromCart(uniqueId)}
                              className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 hover:text-red-500 transition-colors flex items-center gap-1.5"
                            >
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40 mb-1">Item Total</p>
                          <p className="text-lg font-black tracking-tighter text-[#CDA032]">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT — SUMMARY */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24 rounded-[2.5rem] p-8 sm:p-10 bg-[var(--bb-surface)] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] dark:shadow-none border border-black/[0.03] dark:border-white/[0.03] relative space-y-8 overflow-hidden group">
              {/* Premium Glow Accents */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-[#CDA032]/20 rounded-full filter blur-[50px] pointer-events-none" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#CDA032]/10 rounded-full filter blur-[40px] pointer-events-none" />


              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic relative z-10 text-center md:text-left">
                Summary
              </h2>

              {/* Free Shipping Progress */}
              {deliveryMethod === 'deliver' && subtotal < freeShippingThreshold && (
                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between items-center text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] opacity-50">
                    <span>Free Delivery</span>
                    <span>{Math.round(progressToFreeShipping)}%</span>
                  </div>
                  <div className="h-3 sm:h-4 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden border border-black/5 dark:border-white/5 shadow-inner p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-[#B38B21] to-[#D9AB36] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(205,160,50,0.5)]"
                      style={{ width: `${progressToFreeShipping}%` }}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] leading-relaxed text-center sm:text-left opacity-70">
                    Add <span className="text-[#CDA032] font-black">{formatCurrency(remainingForFreeShipping)}</span> for free shipping
                  </p>
                </div>
              )}

              {/* Delivery Options - Segmented Control */}
              <div className="space-y-4 relative z-10 pt-2">
                <div className="flex bg-black-[0.02] dark:bg-white/5 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 mx-auto md:mx-0 shadow-inner max-w-sm w-full">
                  <button
                    onClick={() => setDeliveryMethod('deliver')}
                    className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 ${deliveryMethod === 'deliver' ? 'bg-[#CDA032] text-black shadow-lg scale-[1.02]' : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    Delivery
                  </button>
                  <button
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 ${deliveryMethod === 'pickup' ? 'bg-[#CDA032] text-black shadow-lg scale-[1.02]' : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    Pickup
                  </button>
                </div>

                {/* Form Inputs Container */}
                <div className="min-h-[140px] pt-4 flex flex-col justify-end">
                  {deliveryMethod === 'deliver' ? (
                    <div className="animate-in fade-in slide-in-from-top-4 space-y-3">
                      <div className="relative group">
                        <input
                          type="text"
                          placeholder="National Digital Address *"
                          value={digitalAddress}
                          onChange={(e) => setDigitalAddress(e.target.value)}
                          className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-5 py-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#CDA032]/50 focus:border-[#CDA032] transition-all uppercase font-bold placeholder:tracking-widest placeholder:text-[10px] shadow-sm text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative w-full sm:w-1/2 group">
                          <select
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-5 py-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#CDA032]/50 focus:border-[#CDA032] transition-all uppercase font-bold placeholder:tracking-widest appearance-none shadow-sm cursor-pointer text-black dark:text-white"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'calc(100% - 1rem) center' }}
                          >
                            <option value="" disabled className="bg-white dark:bg-[#111] text-black dark:text-white">Select Region *</option>
                            <option value="Ashanti" className="bg-white dark:bg-[#111] text-black dark:text-white">Ashanti</option>
                            <option value="Ahafo" className="bg-white dark:bg-[#111] text-black dark:text-white">Ahafo</option>
                            <option value="Bono" className="bg-white dark:bg-[#111] text-black dark:text-white">Bono</option>
                            <option value="Bono East" className="bg-white dark:bg-[#111] text-black dark:text-white">Bono East</option>
                            <option value="Central" className="bg-white dark:bg-[#111] text-black dark:text-white">Central</option>
                            <option value="Eastern" className="bg-white dark:bg-[#111] text-black dark:text-white">Eastern</option>
                            <option value="Greater Accra" className="bg-white dark:bg-[#111] text-black dark:text-white">Greater Accra</option>
                            <option value="Northern" className="bg-white dark:bg-[#111] text-black dark:text-white">Northern</option>
                            <option value="North East" className="bg-white dark:bg-[#111] text-black dark:text-white">North East</option>
                            <option value="Oti" className="bg-white dark:bg-[#111] text-black dark:text-white">Oti</option>
                            <option value="Savannah" className="bg-white dark:bg-[#111] text-black dark:text-white">Savannah</option>
                            <option value="Upper East" className="bg-white dark:bg-[#111] text-black dark:text-white">Upper East</option>
                            <option value="Upper West" className="bg-white dark:bg-[#111] text-black dark:text-white">Upper West</option>
                            <option value="Volta" className="bg-white dark:bg-[#111] text-black dark:text-white">Volta</option>
                            <option value="Western" className="bg-white dark:bg-[#111] text-black dark:text-white">Western</option>
                            <option value="Western North" className="bg-white dark:bg-[#111] text-black dark:text-white">Western North</option>
                          </select>
                        </div>

                        <div className="relative w-full sm:w-1/2 group">
                          <input
                            type="text"
                            placeholder="City/Town *"
                            value={town}
                            onChange={(e) => setTown(e.target.value)}
                            className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-5 py-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#CDA032]/50 focus:border-[#CDA032] transition-all uppercase font-bold placeholder:tracking-widest placeholder:text-[10px] shadow-sm text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-4 flex items-center gap-5 p-5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm h-full">
                      <div className="w-12 h-12 rounded-full bg-[#CDA032]/10 flex items-center justify-center shrink-0 border border-[#CDA032]/20 shadow-inner">
                        <Building2 size={20} className="text-[#CDA032]" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight mb-1 text-[#CDA032]">BlackBox HQ</p>
                        <p className="text-[10px] opacity-60 uppercase tracking-widest leading-relaxed">KNUST Campus<br />Pickup within 24h</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full h-px border-b border-dashed border-black/20 dark:border-white/20 relative z-10" />

              {/* Promo Code */}
              <div className="relative z-10">
                <div className="flex bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full p-1.5 focus-within:ring-2 focus-within:ring-[#CDA032]/50 focus-within:border-[#CDA032] transition-all shadow-sm">
                  <input
                    type="text"
                    placeholder="PROMO CODE"
                    className="flex-1 bg-transparent px-4 py-2 text-xs sm:text-sm focus:outline-none uppercase font-black tracking-widest text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
                  />
                  <button className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#CDA032] hover:text-black dark:hover:bg-[#CDA032] transition-all hover:scale-105 active:scale-95 shadow-md">
                    Apply
                  </button>
                </div>
              </div>

              {/* Ledger */}
              <div className="space-y-5 relative z-10">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="font-bold opacity-50 uppercase tracking-widest">Subtotal</span>
                  <span className="font-black tracking-tight">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="font-bold opacity-50 uppercase tracking-widest">Taxes <span className="opacity-50 lowercase tracking-normal font-medium">(12.5%)</span></span>
                  <span className="font-black tracking-tight">{formatCurrency(tax)}</span>
                </div>

                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="font-bold opacity-50 uppercase tracking-widest">Shipping</span>
                  {shipping === 0 ? (
                    <span className="text-[10px] sm:text-xs uppercase font-black tracking-[0.2em] text-[#CDA032] bg-[#CDA032]/10 px-3 py-1 rounded-full">
                      {deliveryMethod === 'pickup' ? 'Free Pickup' : 'Complimentary'}
                    </span>
                  ) : (
                    <span className="font-black tracking-tight">{formatCurrency(shipping)}</span>
                  )}
                </div>

                <div className="w-full h-px border-b border-dashed border-black/30 dark:border-white/30 my-6" />

                <div className="flex justify-between items-end">
                  <span className="text-xl sm:text-2xl font-black uppercase tracking-tighter italic">Total</span>
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#CDA032] tracking-tighter drop-shadow-sm">
                    {formatCurrency(total)}
                  </span>
                </div>
                <p className="text-right text-[9px] opacity-40 uppercase tracking-[0.2em] mt-2">Includes all applicable tax</p>
              </div>

              {/* Action Button */}
              <div className="pt-4 relative z-10">
                <button
                  onClick={() => {
                    if (deliveryMethod === 'deliver') {
                      if (!digitalAddress?.trim() || !region || !town?.trim()) {
                        alert('Please provide your Region, City/Town, and National Digital Address for delivery.');
                        return;
                      }
                    }
                    handleCheckout(total);
                  }}
                  disabled={cart.length === 0}
                  className="w-full py-5 sm:py-6 bg-gradient-to-r from-black to-zinc-800 text-white dark:from-white dark:to-zinc-200 dark:text-black rounded-full text-xs sm:text-sm font-black uppercase tracking-[0.2em] hover:from-[#CDA032] hover:to-[#B38B21] hover:text-black dark:hover:from-[#CDA032] dark:hover:to-[#B38B21] transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-[0_15px_30px_rgba(205,160,50,0.3)] disabled:opacity-50 disabled:pointer-events-none group flex items-center justify-center gap-3"
                >
                  <FileText size={16} /> Confirm Order
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex justify-center flex-wrap gap-4 sm:gap-6 pt-6 opacity-60 relative z-10">
                <div className="flex flex-col items-center gap-2 max-w-[60px]">
                  <ShieldCheck size={20} className="text-[#CDA032]" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center">Secure Checkout</span>
                </div>
                <div className="flex flex-col items-center gap-2 max-w-[60px]">
                  <Truck size={20} className="text-[#CDA032]" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-2 max-w-[60px]">
                  <Gift size={20} className="text-[#CDA032]" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center">Premium Wrapping</span>
                </div>
                <div className="flex flex-col items-center gap-2 max-w-[60px]">
                  <Package size={20} className="text-[#CDA032]" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center">Quality Assured</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Recommendations - Moved below Summary */}
        {cart.length > 0 && recommendations.length > 0 && (
          <div className="pt-24 border-t border-[var(--bb-border)] mt-12">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Complete Your Setup</h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-1 italic">Handpicked premium additions to your order</p>
              </div>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-[#CDA032]/30 to-transparent ml-12 hidden md:block" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onQuickView={onQuickView}
                  onAddToCart={onAddToCart}
                  isWishlisted={wishlist?.includes(p.id) || false}
                  isCompared={compareIds?.includes(p.id) || false}
                  onToggleWishlist={toggleWishlist}
                  onToggleCompare={onToggleCompare}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div >
  );
};