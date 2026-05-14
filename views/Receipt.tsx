import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Download, Share2, User, Mail, Phone, MapPin, Truck } from 'lucide-react';
import { Order } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import {
  getOrderItemConfigurationLine,
  mergeVariantSkuFallback,
  normalizeOrderItemOptions,
} from '../lib/orderItemOptions';
import { BlackBoxReceiptLogo } from '../components/BlackBoxReceiptLogo';

export const Receipt: React.FC = () => {
  const { orderId } = useParams({ from: '/receipt/$orderId' });
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      try {
        const { data: orderData, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              product_id,
              quantity,
              price,
              unit_price,
              product_name,
              product_image,
              product_options,
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
          const transformedOrder: Order = {
            id: orderData.id,
            display_id: orderData.display_id,
            userId: orderData.user_id,
            userName: orderData.customer_name?.trim() || 'Customer',
            userEmail: orderData.customer_email?.trim() || undefined,
            userPhone: orderData.customer_phone?.trim() || undefined,
            notes: orderData.notes?.trim() || undefined,
            tracking_number: orderData.tracking_number || undefined,
            estimated_delivery: orderData.estimated_delivery || undefined,
            items: orderData.order_items?.map((item: any) => ({
              id: item.product_id,
              name: item.products?.name || item.product_name || 'Product',
              price: Number(item.price ?? item.unit_price ?? 0),
              quantity: Number(item.quantity ?? 1),
              image: item.products?.image_url || item.product_image || '/placeholder.png',
              category: 'Accessories' as any,
              stock: 0,
              description: '',
              selectedOptions: mergeVariantSkuFallback(
                normalizeOrderItemOptions(item.product_options),
                item.product_variants,
              ),
              configurationLine: getOrderItemConfigurationLine(item.product_options),
            })) || [],
            total: Number(orderData.total_price ?? 0),
            status: String(orderData.status || '')
              .charAt(0)
              .toUpperCase() + String(orderData.status || '').slice(1),
            date: orderData.created_at,
            paymentMethod: orderData.payment_method || 'card',
            payment_method: orderData.payment_method || 'card',
            shipping_address:
              orderData.shipping_address || orderData.delivery_location || undefined,
            payment_status: orderData.payment_status,
            shipping_method: orderData.shipping_method,
            shipping_cost: Number(orderData.shipping_cost ?? 0),
            actual_delivery: orderData.actual_delivery || undefined,
          };

          setOrder(transformedOrder);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        setOrder({
          id: orderId,
          userId: 'local',
          userName: 'Customer',
          items: [],
          total: 0,
          status: 'Pending',
          date: new Date().toISOString(),
          paymentMethod: 'card',
          payment_method: 'card',
          shipping_address: 'Store Pickup',
          payment_status: 'paid',
          shipping_method: 'pickup',
          shipping_cost: 0,
        });
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
          title: `BlackBox receipt ${order.display_id || `#${order.id.slice(-8).toUpperCase()}`}`,
          text: `Total: ${formatCurrency(order.total)}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-white/60">Loading receipt…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold">Order not found</h2>
          <button
            onClick={() => navigate({ to: '/profile' })}
            className="px-6 py-2 bg-[#B38B21] text-black rounded-lg text-sm font-bold"
          >
            Back to profile
          </button>
        </div>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = order.shipping_cost || 0;
  const total = subtotal + shippingCost;
  const orderRef = order.display_id || `#${order.id.slice(-8).toUpperCase()}`;
  const payMethod = String(order.paymentMethod || order.payment_method || '—');
  const shipMethod = String(order.shipping_method || '—');

  const isOrderOwner = Boolean(user?.id && order.userId && user.id === order.userId);
  const displayName =
    (order.userName && order.userName !== 'Customer' ? order.userName.trim() : '') ||
    (isOrderOwner && user?.name ? user.name.trim() : '') ||
    order.userName?.trim() ||
    'Customer';
  const displayEmail = (order.userEmail?.trim() || (isOrderOwner ? user?.email?.trim() : '')) || null;
  const displayPhone = (order.userPhone?.trim() || (isOrderOwner ? user?.phone?.trim() : '')) || null;
  const addressSegments =
    order.shipping_address
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const etaLabel = order.estimated_delivery ? formatDate(order.estimated_delivery) : null;

  return (
    <div className="min-h-screen bg-black text-white print:bg-white print:text-black print:min-h-0">
      {/* Screen toolbar — hidden when printing */}
      <div className="no-print border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate({ to: '/profile' })}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15"
              aria-label="Share receipt"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-lg bg-[#B38B21] text-black hover:opacity-90"
              aria-label="Print or save PDF"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-5 print:max-w-none print:px-4 print:py-2">
        <div
          id="receipt-content"
          className="receipt-print-root rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 space-y-4 print:rounded-none print:border-gray-300 print:bg-white print:p-3 print:space-y-2 print:shadow-none"
        >
          {/* Brand + reference — single compact band */}
          <header className="flex flex-wrap items-center gap-3 sm:gap-4 border-b border-white/10 pb-3 print:border-gray-300 print:pb-2">
            <BlackBoxReceiptLogo className="h-9 w-[200px] sm:h-10 sm:w-[220px] shrink-0 text-white print:text-black" />
            <div className="min-w-0 flex-1 text-right sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#B38B21] print:text-[#8a6a1a]">
                Receipt
              </p>
              <p className="text-sm font-mono font-bold text-white print:text-black">{orderRef}</p>
              <p className="text-[11px] text-white/45 print:text-gray-600">{formatDate(order.date)}</p>
            </div>
          </header>

          {/* Customer + order details (print-friendly) */}
          <div className="space-y-3 print:space-y-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 print:border-gray-300 print:bg-gray-50">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#B38B21] print:text-[#8a6a1a] mb-2">
                Bill to / Customer
              </p>
              <div className="space-y-2 text-[11px] print:text-[10px]">
                <div className="flex items-start gap-2.5 min-w-0">
                  <User size={14} className="shrink-0 mt-0.5 text-white/40 print:text-gray-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/35 print:text-gray-500">Name</p>
                    <p className="font-semibold text-white print:text-black break-words">{displayName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 min-w-0">
                  <Mail size={14} className="shrink-0 mt-0.5 text-white/40 print:text-gray-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/35 print:text-gray-500">Email</p>
                    <p className="text-white/85 print:text-gray-900 break-all">{displayEmail ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 min-w-0">
                  <Phone size={14} className="shrink-0 mt-0.5 text-white/40 print:text-gray-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/35 print:text-gray-500">Phone</p>
                    <p className="text-white/85 print:text-gray-900">{displayPhone ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin size={14} className="shrink-0 mt-0.5 text-white/40 print:text-gray-500" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/35 print:text-gray-500">
                      Shipping / pickup
                    </p>
                    {addressSegments.length > 0 ? (
                      <ul className="mt-0.5 space-y-0.5 text-white/80 print:text-gray-800 list-none pl-0">
                        {addressSegments.map((line, i) => (
                          <li key={i} className="break-words leading-snug">
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-white/50 print:text-gray-600">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-8 text-[11px] leading-snug print:text-[10px]">
              <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 print:border-gray-300 print:bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/35 print:text-gray-500">Order</p>
                <p>
                  <span className="text-white/50 print:text-gray-600">Status</span>{' '}
                  <span className="font-semibold text-white print:text-black">{order.status}</span>
                </p>
                {order.payment_status != null && (
                  <p>
                    <span className="text-white/50 print:text-gray-600">Payment status</span>{' '}
                    <span className="font-semibold text-white print:text-black">{String(order.payment_status)}</span>
                  </p>
                )}
                <p>
                  <span className="text-white/50 print:text-gray-600">Pay method</span>{' '}
                  <span className="font-medium capitalize text-white print:text-black">{payMethod}</span>
                </p>
              </div>
              <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 print:border-gray-300 print:bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/35 print:text-gray-500">
                  Fulfillment
                </p>
                <p className="flex items-start gap-2">
                  <Truck size={14} className="shrink-0 mt-0.5 text-white/40 print:text-gray-500" aria-hidden />
                  <span>
                    <span className="text-white/50 print:text-gray-600">Ship method</span>{' '}
                    <span className="font-medium capitalize text-white print:text-black">{shipMethod}</span>
                  </span>
                </p>
                {order.tracking_number ? (
                  <p>
                    <span className="text-white/50 print:text-gray-600">Tracking</span>{' '}
                    <span className="font-mono font-semibold text-white print:text-black break-all">
                      {order.tracking_number}
                    </span>
                  </p>
                ) : null}
                {etaLabel ? (
                  <p>
                    <span className="text-white/50 print:text-gray-600">Est. delivery</span>{' '}
                    <span className="font-medium text-white print:text-black">{etaLabel}</span>
                  </p>
                ) : null}
                {order.actual_delivery ? (
                  <p>
                    <span className="text-white/50 print:text-gray-600">Delivered</span>{' '}
                    <span className="font-medium text-white print:text-black">{formatDate(order.actual_delivery)}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {order.notes ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 print:border-gray-300 print:bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/35 print:text-gray-500 mb-1">
                  Notes
                </p>
                <p className="text-[11px] text-white/75 print:text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                  {order.notes}
                </p>
              </div>
            ) : null}
          </div>

          {/* Line items — table stays on one page for typical orders */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35 print:text-gray-500 mb-1.5 print:mb-1">
              Items
            </p>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-[11px] print:text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-white/15 text-[9px] font-black uppercase tracking-wider text-white/40 print:border-gray-400 print:text-gray-600">
                    <th className="py-1.5 pr-2 w-10">Qty</th>
                    <th className="py-1.5 pr-2">Item</th>
                    <th className="py-1.5 pr-2 text-right w-20">Each</th>
                    <th className="py-1.5 text-right w-24">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-white/40 print:text-gray-500">
                        No line items on this receipt.
                      </td>
                    </tr>
                  ) : (
                    order.items.map((item, index) => {
                      const cfg =
                        item.configurationLine ||
                        (Object.keys(item.selectedOptions || {}).length
                          ? Object.entries(item.selectedOptions || {})
                              .filter(([, v]) => v)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')
                          : '');
                      return (
                        <tr
                          key={index}
                          className="border-b border-white/[0.06] last:border-0 print:border-gray-200"
                        >
                          <td className="py-1.5 pr-2 align-top font-bold text-white print:text-black">
                            {item.quantity}
                          </td>
                          <td className="py-1.5 pr-2 align-top min-w-0">
                            <div className="font-medium text-white print:text-black leading-tight">{item.name}</div>
                            {cfg ? (
                              <div className="mt-0.5 text-[10px] print:text-[9px] text-[#B38B21]/90 print:text-gray-700 leading-snug">
                                {cfg}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-1.5 pr-2 align-top text-right tabular-nums text-white/80 print:text-gray-800">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="py-1.5 align-top text-right tabular-nums font-semibold text-white print:text-black">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals — compact */}
          <div className="border-t border-white/10 pt-3 space-y-1 text-[11px] print:border-gray-300 print:pt-2 print:text-[10px]">
            <div className="flex justify-between text-white/60 print:text-gray-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {shippingCost > 0 && (
              <div className="flex justify-between text-white/60 print:text-gray-600">
                <span>Shipping</span>
                <span className="tabular-nums">{formatCurrency(shippingCost)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1 border-t border-white/10 text-base font-black text-[#B38B21] print:border-gray-300 print:text-black">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <footer className="pt-2 border-t border-white/10 text-[9px] leading-relaxed text-white/35 text-center print:border-gray-200 print:text-gray-500">
            Questions? Contact BlackBox support with your order reference above. Computer-generated receipt — no
            signature required.
          </footer>
        </div>
      </div>
    </div>
  );
};
