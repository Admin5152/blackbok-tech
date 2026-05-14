import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
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

  useEffect(() => {
    if (loading || !order) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('print') !== '1') return;
    const timer = window.setTimeout(() => {
      window.print();
      sp.delete('print');
      const q = sp.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [loading, order]);

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
    <div className="flex min-h-0 flex-1 flex-col bg-black text-white print:min-h-0 print:bg-white print:text-black">
      {/* Screen toolbar — hidden when printing */}
      <div className="no-print border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
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

      <div className="mx-auto max-w-3xl flex-1 px-3 py-3 print:max-w-none print:px-3 print:py-1">
        <div
          id="receipt-content"
          className="receipt-print-root space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 print:space-y-1.5 print:rounded-none print:border-gray-300 print:bg-white print:p-2.5 print:shadow-none"
        >
          {/* Brand + reference — single compact band */}
          <header className="flex flex-wrap items-end justify-between gap-2 border-b border-white/10 pb-2 print:border-gray-300 print:pb-1.5">
            <BlackBoxReceiptLogo className="h-8 w-[180px] shrink-0 text-white sm:h-9 sm:w-[200px] print:h-7 print:w-[170px] print:text-black" />
            <div className="min-w-0 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#B38B21] print:text-[#8a6a1a]">
                Receipt
              </p>
              <p className="font-mono text-sm font-bold text-white print:text-black">{orderRef}</p>
              <p className="text-[10px] text-white/45 print:text-gray-600">{formatDate(order.date)}</p>
            </div>
          </header>

          {/* Customer + order + fulfillment — one dense band for screen + single print page */}
          <div className="overflow-hidden rounded-xl border border-white/10 print:border-gray-300">
            <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-12 md:divide-x md:divide-y-0 print:grid-cols-12 print:divide-x print:divide-y-0 print:divide-gray-200">
              <div className="bg-white/[0.03] p-2.5 md:col-span-5 print:bg-gray-50 print:p-2">
                <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.28em] text-[#B38B21] print:text-[#8a6a1a]">
                  Customer
                </p>
                <dl className="grid grid-cols-[4.5rem_1fr] gap-x-1.5 gap-y-0.5 text-[10px] leading-snug print:grid-cols-[4rem_1fr] print:text-[8.5px]">
                  <dt className="text-white/40 print:text-gray-500">Name</dt>
                  <dd className="min-w-0 font-medium text-white print:text-black break-words">{displayName}</dd>
                  <dt className="text-white/40 print:text-gray-500">Email</dt>
                  <dd className="min-w-0 break-all text-white/85 print:text-gray-900">{displayEmail ?? '—'}</dd>
                  <dt className="text-white/40 print:text-gray-500">Phone</dt>
                  <dd className="text-white/85 print:text-gray-900">{displayPhone ?? '—'}</dd>
                  <dt className="align-top text-white/40 print:text-gray-500">Address</dt>
                  <dd className="min-w-0 text-white/80 print:text-gray-800">
                    {addressSegments.length > 0 ? (
                      <span className="block leading-snug">{addressSegments.join(' · ')}</span>
                    ) : (
                      <span className="text-white/50 print:text-gray-600">—</span>
                    )}
                  </dd>
                </dl>
              </div>
              <div className="space-y-1 p-2.5 text-[10px] leading-snug md:col-span-3 print:col-span-3 print:p-2 print:text-[8.5px]">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/35 print:text-gray-500">Order</p>
                <p>
                  <span className="text-white/50 print:text-gray-600">Status</span>{' '}
                  <span className="font-semibold text-white print:text-black">{order.status}</span>
                </p>
                {order.payment_status != null && (
                  <p>
                    <span className="text-white/50 print:text-gray-600">Payment</span>{' '}
                    <span className="font-semibold text-white print:text-black">{String(order.payment_status)}</span>
                  </p>
                )}
                <p>
                  <span className="text-white/50 print:text-gray-600">Pay</span>{' '}
                  <span className="font-medium capitalize text-white print:text-black">{payMethod}</span>
                </p>
              </div>
              <div className="space-y-1 p-2.5 text-[10px] leading-snug md:col-span-4 print:col-span-4 print:p-2 print:text-[8.5px]">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/35 print:text-gray-500">
                  Fulfillment
                </p>
                <p>
                  <span className="text-white/50 print:text-gray-600">Ship</span>{' '}
                  <span className="font-medium capitalize text-white print:text-black">{shipMethod}</span>
                </p>
                {order.tracking_number ? (
                  <p className="break-all">
                    <span className="text-white/50 print:text-gray-600">Tracking</span>{' '}
                    <span className="font-mono font-semibold text-white print:text-black">{order.tracking_number}</span>
                  </p>
                ) : null}
                {etaLabel ? (
                  <p>
                    <span className="text-white/50 print:text-gray-600">Est.</span>{' '}
                    <span className="text-white print:text-black">{etaLabel}</span>
                  </p>
                ) : null}
                {order.actual_delivery ? (
                  <p>
                    <span className="text-white/50 print:text-gray-600">Delivered</span>{' '}
                    <span className="text-white print:text-black">{formatDate(order.actual_delivery)}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {order.notes ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2 print:border-gray-300 print:bg-white print:p-1.5">
              <p className="mb-0.5 text-[8px] font-black uppercase tracking-widest text-white/35 print:text-gray-500">
                Notes
              </p>
              <p className="max-h-16 overflow-y-auto text-[10px] leading-snug text-white/75 print:max-h-none print:text-[8px] print:text-gray-800 whitespace-pre-wrap break-words">
                {order.notes}
              </p>
            </div>
          ) : null}

          {/* Line items */}
          <div>
            <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-white/35 print:text-gray-500 print:mb-0.5">
              Items
            </p>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse text-left text-[10px] print:text-[8.5px]">
                <thead>
                  <tr className="border-b border-white/15 text-[8px] font-black uppercase tracking-wider text-white/40 print:border-gray-400 print:text-gray-600">
                    <th className="w-8 py-1 pr-1 print:py-0.5">Qty</th>
                    <th className="py-1 pr-1 print:py-0.5">Item</th>
                    <th className="w-[4.5rem] py-1 pr-1 text-right print:py-0.5">Each</th>
                    <th className="w-[4.5rem] py-1 text-right print:py-0.5">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-2 text-white/40 print:py-1 print:text-gray-500">
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
                          <td className="py-1 pr-1 align-top font-bold text-white print:py-0.5 print:text-black">
                            {item.quantity}
                          </td>
                          <td className="min-w-0 py-1 pr-1 align-top print:py-0.5">
                            <div className="font-medium leading-tight text-white print:text-black">{item.name}</div>
                            {cfg ? (
                              <div className="mt-0.5 text-[9px] leading-snug text-[#B38B21]/90 print:text-[7.5px] print:text-gray-700">
                                {cfg}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-1 pr-1 align-top text-right tabular-nums text-white/80 print:py-0.5 print:text-gray-800">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="py-1 align-top text-right tabular-nums font-semibold text-white print:py-0.5 print:text-black">
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
          <div className="space-y-0.5 border-t border-white/10 pt-2 text-[10px] print:border-gray-300 print:pt-1 print:text-[8.5px]">
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
            <div className="flex items-baseline justify-between border-t border-white/10 pt-1 text-sm font-black text-[#B38B21] print:border-gray-300 print:pt-0.5 print:text-xs print:text-black">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <footer className="border-t border-white/10 pt-1.5 text-center text-[7px] leading-snug text-white/35 print:border-gray-200 print:text-[6.5px] print:text-gray-500">
            Questions? Contact BlackBox with your order reference. Computer-generated receipt — no signature required.
          </footer>
        </div>
      </div>
    </div>
  );
};
