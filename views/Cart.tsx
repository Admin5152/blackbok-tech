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
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--bb-border)]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#CDA032] shadow-[0_0_30px_rgba(205,160,50,0.3)]">
                <ShoppingCart size={24} className="text-black" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">Your Cart</h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm font-bold opacity-50 uppercase tracking-widest">{cart.length} {cart.length === 1 ? 'Item' : 'Items'} Selected</p>
                  {cart.length > 0 && (
                    <button
                      onClick={() => { if (window.confirm('Clear all items from your cart?')) cart.forEach(item => removeFromCart(`${item.id}-${JSON.stringify(item.selectedOptions)}`)) }}
                      className="text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors"
                    >
                      Empty Cart
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigateTo('store')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] text-sm font-bold uppercase tracking-wider hover:border-[#CDA032]/50 hover:bg-[#CDA032]/5 transition-all w-fit"
          >
            <ArrowLeft size={16} /> Continue Shopping
          </button>
        </div>

        <div className="grid xl:grid-cols-12 gap-8 lg:gap-14">

          {/* LEFT — ITEMS */}
          <div className="xl:col-span-8 space-y-6">

            {cart.length === 0 ? (
              <div className="py-32 text-center border p-8 border-[var(--bb-border)] rounded-[2.5rem] bg-[var(--bb-surface)] glow-surface relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#CDA032]/5 to-transparent pointer-events-none" />
                <ShoppingCart size={48} className="mx-auto mb-6 opacity-20" />
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2 opacity-80">Cart is Empty</h2>
                <p className="opacity-50 mb-8 max-w-sm mx-auto">Looks like you haven't added any premium devices to your cart yet.</p>
                <button
                  onClick={() => navigateTo("store")}
                  className="px-10 py-4 bg-[#CDA032] text-black rounded-xl text-sm font-black uppercase tracking-widest hover:bg-[#B38B21] transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(205,160,50,0.3)]"
                >
                  Explore Store
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const uniqueId = `${item.id}-${JSON.stringify(
                  item.selectedOptions
                )}`;

                return (
                  <div
                    key={uniqueId}
                    className="flex flex-col md:flex-row gap-5 sm:gap-6 border border-[var(--bb-border)] rounded-[2rem] p-4 sm:p-6 bg-[var(--bb-surface)] hover:border-[#CDA032]/30 transition-all group"
                  >
                    {/* Image */}
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[1.5rem] bg-[var(--bb-surface-2)] flex items-center justify-center p-4 relative overflow-hidden shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#CDA032]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between">

                      {/* Top */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#CDA032] mb-1">
                            {item.category}
                          </p>
                          <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-tight">
                            {item.name}
                          </h3>

                          {/* Options if they exist */}
                          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(item.selectedOptions).map(([key, val]) => (
                                <span key={key} className="px-2 py-1 bg-[var(--bb-surface-2)] rounded-md text-[10px] font-bold uppercase tracking-wider opacity-70 border border-[var(--bb-border)]">
                                  {key}: {val}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-3 mt-5">
                            {/* View Details Button */}
                            <button
                              onClick={() => navigateTo('product', item.id)}
                              className="px-4 py-2 bg-[#CDA032]/10 border border-[#CDA032]/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#CDA032] hover:bg-[#CDA032] hover:text-black transition-all flex items-center gap-2 group/link"
                            >
                              <FileText size={12} className="group-hover/link:scale-110 transition-transform" />
                              <span>Details</span>
                            </button>

                            {/* Quick View Button */}
                            <button
                              onClick={() => {
                                const product = products.find(p => p.id === item.id);
                                if (product) onQuickView(product);
                              }}
                              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 group/quick"
                            >
                              <Eye size={12} className="group-hover/quick:scale-110 transition-transform" />
                              <span>Quick View</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-lg sm:text-xl font-black text-[#CDA032]">
                          {formatCurrency(item.price)}
                        </p>
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">
                          Unit Price
                        </p>
                      </div>
                    </div>

                    {/* Bottom */}
                    <div className="flex justify-between items-end mt-6">

                      {/* Quantity */}
                      <div className="flex items-center border border-[var(--bb-border)] bg-[var(--bb-surface-2)] rounded-xl overflow-hidden shadow-sm">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.selectedOptions,
                              -1
                            )
                          }
                          className="w-10 h-10 flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-[#CDA032]"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>

                        <span className="w-8 text-center text-sm font-black">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.selectedOptions,
                              1
                            )
                          }
                          className="w-10 h-10 flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-[#CDA032]"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>

                      {/* Subtotal + Remove */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-black tracking-tight">
                            {formatCurrency(
                              item.price * item.quantity
                            )}
                          </p>
                          <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Total</p>
                        </div>

                        <button
                          onClick={() => removeFromCart(uniqueId)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT — SUMMARY */}
          <aside className="xl:col-span-4">
            <div className="xl:sticky xl:top-24 border border-[var(--bb-border)] rounded-[2.5rem] p-6 text-[var(--bb-text)] sm:p-8 bg-[var(--bb-surface)] glow-surface relative overflow-hidden shadow-2xl space-y-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#CDA032]/5 rounded-bl-[100%] pointer-events-none" />

              <h2 className="text-sm font-black uppercase tracking-widest opacity-80 flex items-center gap-2 border-b border-[var(--bb-border)] pb-4">
                <Package size={16} className="text-[#CDA032]" /> Order Summary
              </h2>

              {/* Free Shipping Progress */}
              {deliveryMethod === 'deliver' && subtotal < freeShippingThreshold && (
                <div className="space-y-3 p-4 rounded-2xl bg-[#CDA032]/5 border border-[#CDA032]/20 animate-in fade-in zoom-in duration-500">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="opacity-60">Free Shipping Progress</span>
                    <span className="text-[#CDA032]">{Math.round(progressToFreeShipping)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-[#CDA032]/40 to-[#CDA032] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(205,160,50,0.5)]"
                      style={{ width: `${progressToFreeShipping}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 leading-tight">
                    Add <span className="text-[#CDA032]">{formatCurrency(remainingForFreeShipping)}</span> more for Free Premium Delivery
                  </p>
                </div>
              )}

              {/* Delivery Options */}
              <div className="space-y-4 pb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-60">Delivery Method</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeliveryMethod('deliver')}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${deliveryMethod === 'deliver' ? 'border-[#CDA032] bg-[#CDA032]/10 shadow-[0_0_15px_rgba(205,160,50,0.1)]' : 'border-[var(--bb-border)] bg-[var(--bb-surface-2)] opacity-70 hover:opacity-100'}`}
                  >
                    <Truck size={20} className={deliveryMethod === 'deliver' ? 'text-[#CDA032]' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Deliver</span>
                  </button>
                  <button
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${deliveryMethod === 'pickup' ? 'border-[#CDA032] bg-[#CDA032]/10 shadow-[0_0_15px_rgba(205,160,50,0.1)]' : 'border-[var(--bb-border)] bg-[var(--bb-surface-2)] opacity-70 hover:opacity-100'}`}
                  >
                    <Building2 size={20} className={deliveryMethod === 'pickup' ? 'text-[#CDA032]' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pickup</span>
                  </button>
                </div>

                {deliveryMethod === 'deliver' && (
                  <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1.5 shadow-sm">
                      <MapPin size={11} className="text-[#CDA032]" /> National Digital Address *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GA-123-4567"
                      value={digitalAddress}
                      onChange={(e) => setDigitalAddress(e.target.value)}
                      className="w-full bg-[var(--bb-surface-2)] border border-[var(--bb-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#CDA032]/50 transition-colors uppercase"
                    />
                  </div>
                )}

                {deliveryMethod === 'pickup' && (
                  <div className="mt-4 p-4 rounded-xl border border-[#CDA032]/30 bg-[#CDA032]/5 flex gap-3 animate-in fade-in slide-in-from-top-2">
                    <Building2 size={16} className="text-[#CDA032] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold leading-tight uppercase tracking-wider mb-1">BlackBox HQ Store</p>
                      <p className="text-[10px] opacity-70 leading-relaxed uppercase tracking-wider">KNUST Campus<br />Kumasi, Ghana<br />Pickup within 24 hours</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Promo Code */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-60">Promo Code</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ENTER CODE"
                    className="flex-1 bg-[var(--bb-surface-2)] border border-[var(--bb-border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#CDA032]/50 transition-colors uppercase font-black tracking-widest placeholder:opacity-20"
                  />
                  <button className="px-4 py-3 bg-[var(--bb-surface-2)] border border-[var(--bb-border)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#CDA032]/50 hover:bg-[#CDA032]/5 transition-all active:scale-95">
                    Apply
                  </button>
                </div>
              </div>

              <div className="h-px bg-[var(--bb-border)] w-full block" />

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Subtotal</span>
                  <span className="text-sm font-black">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Tax (12.5%)</span>
                  <span className="text-sm font-black">
                    {formatCurrency(tax)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Shipping</span>
                  {shipping === 0 ? (
                    <span className="px-2 py-1 rounded-md text-[9px] uppercase font-black tracking-widest bg-emerald-500/10 text-emerald-500">
                      {deliveryMethod === 'pickup' ? 'Pickup' : 'Free Ship'}
                    </span>
                  ) : (
                    <span className="text-sm font-black">
                      {formatCurrency(shipping)}
                    </span>
                  )}
                </div>

                <div className="h-px bg-[var(--bb-border)] w-full block my-6" />

                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-sm font-black uppercase tracking-widest">Total</span>
                    <p className="text-[9px] opacity-40 uppercase tracking-widest mt-1">GHS Equivalent</p>
                  </div>
                  <span className="text-3xl font-black text-[#CDA032] tracking-tighter drop-shadow-md">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    if (deliveryMethod === 'deliver' && !digitalAddress?.trim()) {
                      alert('Please provide a National Digital Address for delivery.');
                      return;
                    }
                    // Pass the delivery method details to checkout or handle accordingly
                    handleCheckout(total);
                  }}
                  disabled={cart.length === 0}
                  className="w-full py-4 bg-[#CDA032] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#B38B21] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(205,160,50,0.2)] disabled:opacity-50 disabled:pointer-events-none"
                >
                  Proceed to Checkout
                </button>
              </div>

              <div className="pt-6 border-t border-[var(--bb-border)] text-[9px] font-bold uppercase tracking-widest opacity-60 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-green-400" />
                  Secure payment
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-blue-400" />
                  Free shipping over GHS 5,000
                </div>
                <div className="flex items-center gap-2">
                  <Gift size={14} className="text-[#CDA032]" />
                  Gift options available
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