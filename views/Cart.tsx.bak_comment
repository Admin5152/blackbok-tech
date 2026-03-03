import React from "react";
import {
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  ShoppingCart,
  Package,
  Truck,
  Gift,
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
}) => {
  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.125;
  const shipping = subtotal > 5000 ? 0 : 50;
  const total = subtotal + tax + shipping;

  const recommendations = products
    .filter((p) => !cart.find((c) => c.id === p.id))
    .slice(0, 4);

  return (
    <div className="bg-[#060605] min-h-screen text-white px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-16">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 sm:mb-12 md:mb-14 flex items-center gap-4">
          <ShoppingCart size={22} className="text-[#CDA032]" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your Cart
            </h1>
            <p className="text-sm text-white/40">
              {cart.length} {cart.length === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <div className="grid xl:grid-cols-12 gap-8 lg:gap-14">

          {/* LEFT — ITEMS */}
          <div className="xl:col-span-8 space-y-6">

            {cart.length === 0 ? (
              <div className="py-32 text-center border border-white/10 rounded-2xl bg-[#0b0b0a]">
                <ShoppingCart size={36} className="mx-auto mb-6 text-white/20" />
                <p className="text-white/40 mb-8">
                  Your cart is currently empty.
                </p>
                <button
                  onClick={() => navigateTo("store")}
                  className="px-8 py-3 bg-[#CDA032] text-black rounded-full text-sm font-medium hover:opacity-90 transition"
                >
                  Browse Products
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
                    className="flex flex-col md:flex-row gap-5 sm:gap-6 border border-white/10 rounded-2xl p-4 sm:p-6 bg-[#0b0b0a]"
                  >
                    {/* Image */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between">

                      {/* Top */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-medium">
                            {item.name}
                          </h3>
                          <p className="text-xs text-white/40">
                            {item.category}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(item.price)}
                          </p>
                          <p className="text-xs text-white/30">
                            per unit
                          </p>
                        </div>
                      </div>

                      {/* Bottom */}
                      <div className="flex justify-between items-center mt-6">

                        {/* Quantity */}
                        <div className="flex items-center border border-white/10 rounded-full overflow-hidden">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.selectedOptions,
                                -1
                              )
                            }
                            className="px-4 py-2 text-white/50 hover:text-white transition"
                          >
                            <Minus size={14} />
                          </button>

                          <span className="px-4 text-sm">
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
                            className="px-4 py-2 text-white/50 hover:text-white transition"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Subtotal + Remove */}
                        <div className="flex items-center gap-6">
                          <p className="text-sm font-semibold">
                            {formatCurrency(
                              item.price * item.quantity
                            )}
                          </p>

                          <button
                            onClick={() => removeFromCart(uniqueId)}
                            className="text-red-400 hover:text-red-500 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Recommendations */}
            {cart.length > 0 && recommendations.length > 0 && (
              <div className="pt-16">
                <h3 className="text-lg font-medium mb-6">
                  You may also like
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recommendations.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onQuickView={onQuickView}
                      isWishlisted={wishlist.includes(p.id)}
                      onToggleWishlist={toggleWishlist}
                      onAddToCart={onAddToCart}
                      isCompared={compareIds.includes(p.id)}
                      onToggleCompare={onToggleCompare}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — SUMMARY */}
          <aside className="xl:col-span-4">
            <div className="xl:sticky xl:top-24 border border-white/10 rounded-2xl p-5 sm:p-8 bg-[#0b0b0a] space-y-6 sm:space-y-8">

              <div className="flex items-center gap-3">
                <Package size={18} className="text-[#CDA032]" />
                <h2 className="text-lg font-medium">
                  Order Summary
                </h2>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between text-white/50">
                  <span>Subtotal</span>
                  <span className="text-white font-medium">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-white/50">
                  <span>Tax</span>
                  <span className="text-white font-medium">
                    {formatCurrency(tax)}
                  </span>
                </div>

                <div className="flex justify-between text-white/50">
                  <span>Shipping</span>
                  <span className="text-white font-medium">
                    {shipping === 0
                      ? "Free"
                      : formatCurrency(shipping)}
                  </span>
                </div>

                <div className="h-px bg-white/10"></div>

                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-[#CDA032]">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigateTo("checkout")}
                disabled={cart.length === 0}
                className="w-full py-3 bg-[#CDA032] text-black rounded-full text-sm font-medium hover:opacity-90 transition"
              >
                Checkout
              </button>

              <button
                onClick={() => navigateTo("store")}
                className="w-full py-3 border border-white/10 rounded-full text-white/50 text-sm hover:text-white transition"
              >
                Continue Shopping
              </button>

              <div className="pt-6 border-t border-white/10 text-xs text-white/40 space-y-2">
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
      </div>
    </div>
  );
};