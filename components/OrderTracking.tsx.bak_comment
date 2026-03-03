import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

interface TrackingUpdate {
  id: string;
  status: string;
  location?: string;
  description?: string;
  timestamp: string;
}

interface OrderTrackingProps {
  order: Order;
  onStatusUpdate?: () => void;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({ order, onStatusUpdate }) => {
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');

  useEffect(() => {
    fetchTrackingUpdates();
  }, [order.id]);

  const fetchTrackingUpdates = async () => {
    try {
      setLoading(true);
      
      // Get order details with tracking number
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('tracking_number, estimated_delivery, actual_delivery, shipping_address')
        .eq('id', order.id)
        .single();

      if (orderError) throw orderError;
      
      if (orderData?.tracking_number) {
        setTrackingNumber(orderData.tracking_number);
      }

      // Get tracking updates
      const { data: updates, error } = await supabase
        .from('order_tracking_updates')
        .select('*')
        .eq('order_id', order.id)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      
      setTrackingUpdates(updates || []);
    } catch (error) {
      console.error('Error fetching tracking updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'processing':
        return <Package className="w-5 h-5 text-blue-400" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-purple-400" />;
      case 'out for delivery':
        return <Truck className="w-5 h-5 text-orange-400" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'border-gray-600 bg-gray-600/10';
      case 'processing':
        return 'border-blue-600 bg-blue-600/10';
      case 'shipped':
        return 'border-purple-600 bg-purple-600/10';
      case 'out for delivery':
        return 'border-orange-600 bg-orange-600/10';
      case 'delivered':
        return 'border-green-600 bg-green-600/10';
      default:
        return 'border-gray-600 bg-gray-600/10';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyTrackingNumber = () => {
    if (trackingNumber) {
      navigator.clipboard.writeText(trackingNumber);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-[#B38B21]" />
        <span className="ml-2 text-white/60">Loading tracking information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tracking Number */}
      {trackingNumber && (
        <div className="bg-gradient-to-r from-[#B38B21]/10 to-[#D4AF37]/10 border border-[#B38B21]/20 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-2">Tracking Number</h3>
              <div className="flex items-center gap-3">
                <span className="text-xl font-mono font-bold text-[#B38B21]">{trackingNumber}</span>
                <button
                  onClick={copyTrackingNumber}
                  className="text-[9px] font-bold text-white/40 hover:text-[#B38B21] uppercase tracking-wider transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Current Status</p>
              <p className="text-sm font-black text-white">{order.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-black uppercase tracking-wider text-white">Order Timeline</h3>
        
        {trackingUpdates.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">No tracking updates available yet</p>
            <p className="text-[10px] text-white/20 mt-1">Updates will appear once your order is processed</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10"></div>
            
            {/* Timeline Items */}
            {trackingUpdates.map((update, index) => (
              <div key={update.id} className="relative flex items-start gap-4 pb-6">
                {/* Status Icon */}
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 ${getStatusColor(update.status)}`}>
                  {getStatusIcon(update.status)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-black uppercase tracking-wider text-white mb-1">
                        {update.status}
                      </h4>
                      {update.location && (
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-3 h-3 text-white/40" />
                          <span className="text-[10px] text-white/40">{update.location}</span>
                        </div>
                      )}
                      {update.description && (
                        <p className="text-sm text-white/60 leading-relaxed">{update.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-white/30 whitespace-nowrap">
                      {formatTimestamp(update.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery Information */}
      {order.status === 'Shipped' && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
          <h4 className="text-sm font-black uppercase tracking-wider text-white mb-4">Delivery Information</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Truck className="w-4 h-4 text-[#B38B21]" />
              <span className="text-sm text-white/60">Your order is on its way</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#B38B21]" />
              <span className="text-sm text-white/60">Estimated delivery: 3-5 business days</span>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchTrackingUpdates}
        className="flex items-center gap-2 text-[10px] font-bold text-[#B38B21] uppercase tracking-wider hover:underline transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Refresh Tracking
      </button>
    </div>
  );
};
