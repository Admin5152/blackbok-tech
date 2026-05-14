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
  onAddToCart: (p: Product, options?: Record<string, string>, qty?: number) => void;
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
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup'>('pickup');
  const [digitalAddress, setDigitalAddress] = useState(user?.address || '');
  const [region, setRegion] = useState(user?.region || '');
  const [town, setTown] = useState(user?.city || '');

  const freeShippingThreshold = 5000;
  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.125;
  const shipping = 0;
  const total = subtotal + tax + shipping;

  const progressToFreeShipping = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const remainingForFreeShipping = Math.max(freeShippingThreshold - subtotal, 0);

  // CART-16: bulletproof recommendation pool — recommendations must
  // be (a) DISTINCT products (the catalog array can in rare cases
  // include the same product twice when joined across variant tables)
  // and (b) NEVER items already in the cart, even when the same
  // product is in the cart under multiple variants (which makes the
  // raw `cart.map(item => item.id)` list contain duplicates). A Set
  // guarantees O(1) membership checks and clean exclusion.
  const cartProductIds = new Set(cart.map((item) => item.id));
  const cartCategories = cart.map((item) => item.category);

  const recommendations = (() => {
    const seen = new Set<string>();
    const distinct: Product[] = [];
    for (const p of products) {
      if (!p?.id) continue;
      if (cartProductIds.has(p.id)) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      distinct.push(p);
    }
    return distinct
      .sort((a, b) => {
        const aScore = cartCategories.filter((cat) => cat === a.category).length;
        const bScore = cartCategories.filter((cat) => cat === b.category).length;
        if (aScore !== bScore) return bScore - aScore;
        return Math.random() - 0.5;
      })
      .slice(0, 4);
  })();

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
            <ArrowLeft size={14} /> Back to shop
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

                          {/* Selected variant options (color, storage, RAM…)
                              CART-01: rendered as high-contrast chips so the
                              user can clearly see what they're buying. Filters
                              out empty/falsy values so we never show
                              "Color: undefined". */}
                          {item.selectedOptions &&
                            Object.entries(item.selectedOptions).filter(([, val]) => Boolean(val)).length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-4">
                                {Object.entries(item.selectedOptions)
                                  .filter(([, val]) => Boolean(val))
                                  .map(([key, val]) => (
                                    <span
                                      key={key}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#CDA032]/40 bg-[#CDA032]/10 text-[10px] font-black uppercase tracking-[0.18em] text-[#CDA032]"
                                    >
                                      <span className="opacity-60">{key}:</span>
                                      <span>{val}</span>
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

              {/* Pickup Information */}
              <div className="space-y-4 relative z-10 pt-2">
                <div className="animate-in fade-in slide-in-from-top-4 flex items-center gap-5 p-5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm h-full">
                  <div className="w-12 h-12 rounded-full bg-[#CDA032]/10 flex items-center justify-center shrink-0 border border-[#CDA032]/20 shadow-inner">
                    <Building2 size={20} className="text-[#CDA032]" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight mb-1 text-[#CDA032]">BlackBox HQ</p>
                    <p className="text-[10px] opacity-60 uppercase tracking-widest leading-relaxed">KNUST Campus<br />Pickup within 24h</p>
                  </div>
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
  Free Pickup
                    </span>
                  ) : (
                    <span className="font-black tracking-tight">{formatCurrency(shipping)}</span>
                  )}
                </div>

                <div className="w-full h-px border-b border-dashed border-black/30 dark:border-white/30 my-6" />

                <div className="flex justify-between items-end gap-2">
                  <span className="text-xl sm:text-2xl font-black uppercase tracking-tighter italic shrink-0">Total</span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-[#CDA032] tracking-tighter drop-shadow-sm min-w-0 text-right break-all">
                    {formatCurrency(total)}
                  </span>
                </div>
                <p className="text-right text-[9px] opacity-40 uppercase tracking-[0.2em] mt-2">Includes all applicable tax</p>
              </div>

              {/* Action Button */}
              <div className="pt-4 relative z-10">
                <button
                  onClick={() => handleCheckout(total)}
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

        {/* Recommendations */}
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
    </div>
  );
};