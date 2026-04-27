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

  const handleTrackOrder = () => {
    onClose();
    navigate({ to: `/receipt/${order.id}` as any });
  };

  const handleContinueShopping = () => {
    onClose();
    navigate({ to: '/store' });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-black border border-white/10 rounded-3xl p-8 max-w-md w-full mx-auto shadow-2xl relative overflow-hidden">
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
        </div>

        {/* Order Details */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Package size={18} className="text-[#B38B21]" />
            <span className="text-sm font-semibold text-white">Order #{order.id.slice(-8).toUpperCase()}</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white font-semibold">{formatCurrency(order.total - (order.shipping_cost || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Shipping / Fees</span>
              <span className="text-white font-semibold">{formatCurrency(order.shipping_cost || 0)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 pb-1">
              <span className="text-white font-bold">Grand Total</span>
              <span className="text-[#B38B21] font-black">{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Estimated Delivery</span>
              <span className="text-white">
                {order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString() : '3-5 business days'}
              </span>
            </div>
          </div>
        </div>

        {/* Order Items Preview */}
        <div className="mb-6 relative z-10">
          <p className="text-xs text-gray-400 mb-2">Order Items ({order.items.length})</p>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 bg-white/10 rounded flex-shrink-0 flex items-center justify-center">
                    <ShoppingBag size={14} className="text-[#B38B21]" />
                    </div>
                    <span className="text-white truncate">{item.name}</span>
                    <span className="text-gray-400 text-xs">x{item.quantity}</span>
                </div>
                <span className="text-white font-bold flex-shrink-0">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-[#B38B21]/10 border border-[#B38B21]/20 rounded-lg text-center">
            <p className="text-xs text-[#B38B21] font-semibold">You will be notified when your order is ready.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 relative z-10">
          <button
            onClick={handleTrackOrder}
            className="flex-1 py-3 bg-[#B38B21] text-black rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            View My Order
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
