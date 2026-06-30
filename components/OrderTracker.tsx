import React, { useState, useEffect } from 'react';
import { Package, Check, Truck, MapPin, Clock, Calendar } from 'lucide-react';
import { Order, TrackingUpdate } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { getTrackingUpdates } from '../lib/api';
import { customerStatusBadgeClasses, formatCustomerStatusShort } from '../lib/customerStatusLabels';

interface OrderTrackerProps {
  order: Order;
  isExpanded?: boolean;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ order, isExpanded = false }) => {
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrackingUpdates = async () => {
      if (!order.id) return;

      setLoading(true);
      try {
        setTrackingUpdates(await getTrackingUpdates(order.id));
      } catch (error) {
        console.error('Error fetching tracking updates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackingUpdates();
  }, [order.id]);

  // Define tracking stages
  const trackingStages = [
    { 
      key: 'order-placed', 
      status: 'Order Placed', 
      icon: Package, 
      description: 'Your order has been received and is being processed',
      completed: true 
    },
    { 
      key: 'processing', 
      status: 'Processing', 
      icon: Clock, 
      description: 'Your order is being prepared for shipment',
      completed: ['Processing', 'Shipped', 'Delivered'].includes(order.status) 
    },
    { 
      key: 'on-way', 
      status: 'On its way', 
      icon: Truck, 
      description: 'Your order is out for delivery',
      completed: ['Shipped', 'Delivered'].includes(order.status) 
    },
    { 
      key: 'delivered', 
      status: 'Delivered', 
      icon: MapPin, 
      description: 'Your order has been delivered successfully',
      completed: order.status === 'Delivered' 
    }
  ];

  const currentStageIndex = trackingStages.findIndex(stage => !stage.completed);
  const activeStage = currentStageIndex === -1 ? trackingStages.length - 1 : currentStageIndex - 1;

  if (!isExpanded) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[#B38B21]" />
            <span className="text-sm font-semibold text-white">Order Status</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${customerStatusBadgeClasses(order.status, 'order', false)}`}>
            {formatCustomerStatusShort('order', order.status)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar size={12} />
          <span>Order placed: {formatDate(order.date)}</span>
        </div>
        
        {order.tracking_number && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
            <Package size={12} />
            <span>Tracking: {order.tracking_number}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={20} className="text-[#B38B21]" />
          <div>
            <h3 className="text-lg font-bold text-white">Order Tracking</h3>
            <p className="text-xs text-gray-400">Order #{order.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${customerStatusBadgeClasses(order.status, 'order', false)}`}>
            {formatCustomerStatusShort('order', order.status)}
          </span>
          <p className="text-xs text-gray-400 mt-1">{formatCurrency(order.total)}</p>
        </div>
      </div>

      {/* Tracking Timeline */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-white mb-4">Delivery Progress</h4>
        
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-white/10" />
          
          {trackingStages.map((stage, index) => {
            const Icon = stage.icon;
            const isCompleted = stage.completed;
            const isActive = index === activeStage;
            const isUpcoming = index > activeStage;
            
            return (
              <div key={stage.key} className="relative flex items-start gap-4 mb-6">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 transition-all ${
                  isCompleted ? 'bg-[#B38B21]' : 
                  isActive ? 'bg-[#B38B21]/20 border-2 border-[#B38B21]' :
                  'bg-white/10 border-2 border-white/20'
                }`}>
                  <Icon size={20} className={
                    isCompleted ? 'text-black' : 
                    isActive ? 'text-[#B38B21]' :
                    'text-white/40'
                  } />
                  
                  {/* Animated pulse for active stage */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-[#B38B21]/20 animate-ping" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className={`text-sm font-semibold ${
                      isCompleted ? 'text-white' : 
                      isActive ? 'text-[#B38B21]' :
                      'text-white/40'
                    }`}>
                      {stage.status}
                    </h5>
                    {isCompleted && (
                      <Check size={16} className="text-green-400" />
                    )}
                  </div>
                  <p className={`text-xs ${
                    isCompleted ? 'text-gray-400' : 
                    isActive ? 'text-gray-300' :
                    'text-gray-500'
                  }`}>
                    {stage.description}
                  </p>
                  
                  {/* Show timestamp for completed stages */}
                  {isCompleted && trackingUpdates[index] && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(trackingUpdates[index].timestamp)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <h4 className="text-sm font-semibold text-white">Order Details</h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Payment Method</span>
            <p className="text-white capitalize">{order.paymentMethod}</p>
          </div>
          <div>
            <span className="text-gray-400">Shipping Method</span>
            <p className="text-white capitalize">{order.shipping_method || 'Standard'}</p>
          </div>
          {order.tracking_number && (
            <div>
              <span className="text-gray-400">Tracking Number</span>
              <p className="text-white font-mono text-xs">{order.tracking_number}</p>
            </div>
          )}
          {order.estimated_delivery && (
            <div>
              <span className="text-gray-400">Est. Delivery</span>
              <p className="text-white">{formatDate(order.estimated_delivery)}</p>
            </div>
          )}
        </div>
        
        {order.shipping_address && (
          <div>
            <span className="text-gray-400">Delivery Address</span>
            <p className="text-white text-sm">{order.shipping_address}</p>
          </div>
        )}
      </div>

      {/* Items Summary */}
      <div className="border-t border-white/10 pt-4">
        <h4 className="text-sm font-semibold text-white mb-3">Items ({order.items.length})</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                  <Package size={14} className="text-[#B38B21]" />
                </div>
                <span className="text-white">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-white">x{item.quantity}</span>
                <span className="text-gray-400 ml-2">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
