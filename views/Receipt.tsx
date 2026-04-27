import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Package, Calendar, MapPin, CreditCard, User, Phone, Mail, Download, Share2, Check } from 'lucide-react';
import { Order } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { supabase } from '../lib/supabase';

export const Receipt: React.FC = () => {
  const { orderId } = useParams({ from: '/receipt/$orderId' });
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      try {
        // Try to fetch from database first
        const { data: orderData, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              product_id,
              quantity,
              price,
              products (
                name,
                image_url
              )
            )
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;

        if (orderData) {
          // Transform database data to Order type
          const transformedOrder: Order = {
            id: orderData.id,
            userId: orderData.user_id,
            userName: orderData.customer_name || 'Customer',
            items: orderData.order_items?.map((item: any) => ({
              id: item.product_id,
              name: item.products?.name || 'Product',
              price: item.price,
              quantity: item.quantity,
              image: item.products?.image_url || '/placeholder.png',
              category: 'Accessories' as any,
              stock: 0,
              description: ''
            })) || [],
            total: orderData.total_price,
            status: orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1),
            date: orderData.created_at,
            paymentMethod: orderData.payment_method || 'card',
            shipping_address: orderData.delivery_location,
            payment_status: 'paid' as any,
            shipping_method: orderData.notes?.includes('pickup') ? 'pickup' : 'deliver',
            shipping_cost: 0
          };

          setOrder(transformedOrder);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        // Fallback to local storage or mock data
        const mockOrder: Order = {
          id: orderId,
          userId: 'local',
          userName: 'Customer',
          items: [],
          total: 0,
          status: 'Pending',
          date: new Date().toISOString(),
          paymentMethod: 'card',
          shipping_address: 'Store Pickup',
          payment_status: 'paid',
          shipping_method: 'pickup',
          shipping_cost: 0
        };
        setOrder(mockOrder);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleDownload = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share && order) {
      try {
        await navigator.share({
          title: `Order Receipt #${order.id.slice(-8).toUpperCase()}`,
          text: `Order Total: ${formatCurrency(order.total)}`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="text-[#B38B21] animate-pulse mx-auto mb-4" />
          <p>Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Order not found</h2>
          <button
            onClick={() => navigate({ to: '/profile' })}
            className="px-6 py-3 bg-[#B38B21] text-black rounded-lg font-medium"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = order.shipping_cost || 0;
  const total = subtotal + shippingCost;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate({ to: '/profile' })}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Profile
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8" id="receipt-content">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#B38B21]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={40} className="text-[#B38B21]" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Order Receipt</h1>
            <p className="text-gray-400">Thank you for your purchase!</p>
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package size={20} className="text-[#B38B21]" />
                Order Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Number</span>
                  <span className="text-white font-mono">#{order.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white">{formatDate(order.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' :
                    order.status === 'Ready' ? 'bg-blue-500/20 text-blue-400' :
                    order.status === 'Processing' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User size={20} className="text-[#B38B21]" />
                Customer Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span className="text-white">{order.userName}</span>
                </div>
                {order.shipping_address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="text-white">{order.shipping_address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-gray-400" />
                  <span className="text-white capitalize">{order.paymentMethod}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4">Items Ordered</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                      <Package size={24} className="text-[#B38B21]" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{item.name}</h4>
                      <p className="text-gray-400 text-sm">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatCurrency(item.price)}</p>
                    <p className="text-gray-400 text-sm">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="border-t border-white/10 pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">{formatCurrency(subtotal)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Delivery Fee</span>
                  <span className="text-white">{formatCurrency(shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                <span className="text-[#B38B21]">Total</span>
                <span className="text-[#B38B21]">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm">
              If you have any questions about your order, please contact our support team.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              This is a computer-generated receipt and does not require a signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
