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
import { CartItem, Product } from "../types";
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
}) => {
  const [deliveryMethod, setDeliveryMethod] = useState<'deliver' | 'pickup'>('deliver');
  const [digitalAddress, setDigitalAddress] = useState('');
  const [region, setRegion] = useState('');
  const [town, setTown] = useState('');

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
            <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter italic mb-4">Your Cart.</h1>
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

        <div className="grid xl:grid-cols-12 gap-8 lg:gap-14">

          {/* LEFT — ITEMS */}
          <div className="xl:col-span-8 space-y-6">

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
                    <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-[2rem] bg-black/5 dark:bg-white/5 flex items-center justify-center p-6 relative overflow-hidden shrink-0 group hover:shadow-2xl transition-all duration-700 cursor-pointer" onClick={() => navigateTo('product', item.id)}>
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
          <aside className="xl:col-span-4">
            <div className="xl:sticky xl:top-24 rounded-[3rem] p-8 sm:p-10 bg-[var(--bb-surface-2)] shadow-2xl relative space-y-10 border border-[var(--bb-border)]/20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#CDA032]/10 rounded-bl-full pointer-events-none filter blur-xl" />

              <h2 className="text-2xl font-black uppercase tracking-tighter italic">
                Summary.
              </h2>

              {/* Free Shipping Progress */}
              {deliveryMethod === 'deliver' && subtotal < freeShippingThreshold && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
                    <span>Free Delivery Progress</span>
                    <span>{Math.round(progressToFreeShipping)}%</span>
                  </div>
                  <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#CDA032] transition-all duration-1000 ease-out"
                      style={{ width: `${progressToFreeShipping}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                    Add <span className="text-[#CDA032] font-black">{formatCurrency(remainingForFreeShipping)}</span> for free shipping
                  </p>
                </div>
              )}

              {/* Delivery Options */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Fulfillment</h3>
                <div className="flex gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-2xl">
                  <button
                    onClick={() => setDeliveryMethod('deliver')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${deliveryMethod === 'deliver' ? 'bg-white text-black dark:bg-black dark:text-white shadow-md' : 'opacity-50 hover:opacity-100'}`}
                  >
                    Delivery
                  </button>
                  <button
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${deliveryMethod === 'pickup' ? 'bg-white text-black dark:bg-black dark:text-white shadow-md' : 'opacity-50 hover:opacity-100'}`}
                  >
                    Pickup
                  </button>
                </div>

                {deliveryMethod === 'deliver' && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2 space-y-4">
                    <input
                      type="text"
                      placeholder="National Digital Address *"
                      value={digitalAddress}
                      onChange={(e) => setDigitalAddress(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-black/10 dark:border-white/10 px-0 py-3 text-sm focus:outline-none focus:border-[#CDA032] transition-colors uppercase font-bold placeholder:tracking-widest placeholder:text-[9px]"
                    />

                    <div className="flex gap-4">
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="w-1/2 bg-transparent border-b-2 border-black/10 dark:border-white/10 px-0 py-3 text-sm focus:outline-none focus:border-[#CDA032] transition-colors uppercase font-bold placeholder:tracking-widest appearance-none text-[10px] sm:text-sm"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.25rem center' }}
                      >
                        <option value="" disabled className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Select Region *</option>
                        <option value="Ashanti" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Ashanti</option>
                        <option value="Ahafo" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Ahafo</option>
                        <option value="Bono" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Bono</option>
                        <option value="Bono East" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Bono East</option>
                        <option value="Central" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Central</option>
                        <option value="Eastern" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Eastern</option>
                        <option value="Greater Accra" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Greater Accra</option>
                        <option value="Northern" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Northern</option>
                        <option value="North East" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">North East</option>
                        <option value="Oti" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Oti</option>
                        <option value="Savannah" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Savannah</option>
                        <option value="Upper East" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Upper East</option>
                        <option value="Upper West" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Upper West</option>
                        <option value="Volta" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Volta</option>
                        <option value="Western" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Western</option>
                        <option value="Western North" className="bg-[var(--bb-surface)] text-[var(--bb-text)]">Western North</option>
                      </select>

                      <input
                        type="text"
                        placeholder="City/Town *"
                        value={town}
                        onChange={(e) => setTown(e.target.value)}
                        className="w-1/2 bg-transparent border-b-2 border-black/10 dark:border-white/10 px-0 py-3 text-sm focus:outline-none focus:border-[#CDA032] transition-colors uppercase font-bold placeholder:tracking-widest placeholder:text-[9px]"
                      />
                    </div>
                  </div>
                )}

                {deliveryMethod === 'pickup' && (
                  <div className="mt-4 pt-2 animate-in fade-in slide-in-from-top-2 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#CDA032]/10 flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-[#CDA032]" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight mb-1">BlackBox HQ</p>
                      <p className="text-[10px] opacity-60 uppercase tracking-widest leading-loose">KNUST Campus<br />Pickup within 24h</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Promo Code */}
              <div>
                <div className="flex items-end gap-4 border-b-2 border-black/10 dark:border-white/10 focus-within:border-[#CDA032] transition-colors pb-2">
                  <input
                    type="text"
                    placeholder="PROMO CODE"
                    className="flex-1 bg-transparent px-0 py-2 text-sm focus:outline-none uppercase font-black tracking-widest placeholder:opacity-30"
                  />
                  <button className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CDA032] hover:text-black dark:hover:text-white transition-colors pb-2">
                    Apply
                  </button>
                </div>
              </div>

              {/* Ledger */}
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold opacity-60 tracking-wide">Subtotal</span>
                  <span className="font-black">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold opacity-60 tracking-wide">Taxes <span className="text-[10px] opacity-50">(12.5%)</span></span>
                  <span className="font-black">{formatCurrency(tax)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold opacity-60 tracking-wide">Shipping</span>
                  {shipping === 0 ? (
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#CDA032]">
                      {deliveryMethod === 'pickup' ? 'Free Pickup' : 'Complimentary'}
                    </span>
                  ) : (
                    <span className="font-black">{formatCurrency(shipping)}</span>
                  )}
                </div>

                <div className="h-px bg-black/10 dark:bg-white/10 w-full block my-8" />

                <div className="flex justify-between items-end">
                  <span className="text-xl font-black uppercase tracking-tighter italic">Total</span>
                  <span className="text-4xl font-black text-[#CDA032] tracking-tighter">
                    {formatCurrency(total)}
                  </span>
                </div>
                <p className="text-right text-[9px] opacity-40 uppercase tracking-[0.2em] mt-1">Includes all applicable tax</p>
              </div>

              <div className="pt-6">
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
                  className="w-full py-5 bg-black text-white dark:bg-white dark:text-black rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-[#CDA032] hover:text-black transition-all hover:scale-105 active:scale-95 shadow-xl disabled:opacity-50 disabled:pointer-events-none group"
                >
                  Confirm & Checkout
                </button>
              </div>

              <div className="flex justify-between items-center pt-8 opacity-40">
                <ShieldCheck size={20} />
                <Truck size={20} />
                <Gift size={20} />
                <Package size={20} />
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