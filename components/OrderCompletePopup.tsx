import React from 'react';
import { Check, Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Order } from '../types';
import { formatCurrency } from '../lib/utils';

interface OrderCompletePopupProps {
  order: Order;
  onClose: () => void;
}

export const OrderCompletePopup: React.FC<OrderCompletePopupProps> = ({ order, onClose }) => {
  const navigate = useNavigate();

  const handleViewInvoice = () => {
    onClose();
    navigate({ to: `/receipt/${order.id}` as any });
  };

  const handleContinueShopping = () => {
    onClose();
    navigate({ to: '/store' });
  };

  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = order.shipping_cost || 0;
  const total = subtotal + shippingCost;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-black border border-white/10 rounded-3xl p-8 max-w-lg w-full mx-auto shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#B38B21]/10 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#B38B21]/5 blur-2xl rounded-full" />

        {/* Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="w-16 h-16 bg-[#B38B21]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-[#B38B21]" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2">Order Successful!</h3>
          <p className="text-sm text-gray-400">Your order is being processed.</p>
          <p className="text-xs text-gray-500 mt-1">You will be notified when your order is ready.</p>
        </div>

        {/* Order Receipt */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Package size={18} className="text-[#B38B21]" />
            <span className="text-sm font-semibold text-white">Order #{order.id.slice(-8).toUpperCase()}</span>
          </div>
          
          {/* Customer Info */}
          <div className="mb-4 pb-4 border-b border-white/10">
            <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Customer Information</h4>
            <div className="space-y-1 text-sm">
              <p className="text-white">{order.userName}</p>
              <p className="text-gray-400">{order.shipping_address}</p>
              {order.paymentMethod && (
                <p className="text-gray-400">Payment: {order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}</p>
              )}
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase text-gray-400 mb-3">Items Ordered</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <span className="text-white">{item.name}</span>
                    <span className="text-gray-400 ml-2">x{item.quantity}</span>
                  </div>
                  <span className="text-white font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 text-sm pt-4 border-t border-white/10">
            <div className="flex justify-between">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white">{formatCurrency(subtotal)}</span>
            </div>
            {shippingCost > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Delivery Fee</span>
                <span className="text-white">{formatCurrency(shippingCost)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-white/10">
              <span className="text-[#B38B21]">Total</span>
              <span className="text-[#B38B21]">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Estimated Delivery */}
          {order.estimated_delivery && (
            <div className="mt-4 p-3 bg-[#B38B21]/10 rounded-lg">
              <p className="text-xs text-[#B38B21] font-medium">
                Estimated {order.shipping_method === 'pickup' ? 'Pickup' : 'Delivery'}: {new Date(order.estimated_delivery).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 relative z-10">
          <button
            onClick={handleViewInvoice}
            className="flex-1 py-3 bg-[#B38B21] text-black rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            View Invoice
            <ArrowRight size={16} />
          </button>
          <button
            onClick={handleContinueShopping}
            className="flex-1 py-3 bg-white/10 text-white rounded-xl text-sm font-semibold transition-all hover:bg-white/20"
          >
            Continue Shopping
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
        >
          ×
        </button>
      </div>
    </div>
  );
};
