import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Order } from '../types';
import { formatDate } from '../lib/utils';
import { formatProductOptionLabel } from '../lib/productLabels';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import {
  getOrderItemConfigurationLine,
  mergeVariantSkuFallback,
  normalizeOrderItemOptions,
} from '../lib/orderItemOptions';
import { PosReceiptDocument } from '../components/invoice/PosReceiptDocument';
import { InvoiceDocument } from '../components/invoice/InvoiceDocument';

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

  const handleDownload = () => window.print();

  const handleShare = async () => {
    if (navigator.share && order) {
      try {
        await navigator.share({
          title: `BlackBox invoice ${order.display_id || order.id.slice(-8).toUpperCase()}`,
          text: `Invoice for your BlackBox order`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const invoiceModel = useMemo(() => {
    if (!order) return null;

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

    const billToLines = [
      displayEmail,
      displayPhone,
      ...addressSegments,
    ].filter(Boolean) as string[];

    const items = order.items.map((item) => {
      const cfg =
        item.configurationLine ||
        (Object.keys(item.selectedOptions || {}).length
          ? Object.entries(item.selectedOptions || {})
              .filter(([, v]) => v)
              .map(([k, v]) => `${formatProductOptionLabel(k)}: ${v}`)
              .join(', ')
          : '');
      return {
        name: String(item.name || 'Product').toUpperCase(),
        description: cfg || undefined,
        qty: item.quantity,
        rate: item.price,
      };
    });

    const subTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = order.shipping_cost || 0;
    const total = Number(order.total) > 0 ? Number(order.total) : subTotal + shipping;
    const payStatus = String(order.payment_status || '').toLowerCase();
    const isPaid = payStatus === 'paid' || payStatus === 'completed' || payStatus === 'success';
    const paymentMade = isPaid ? total : 0;
    const balanceDue = Math.max(0, total - paymentMade);
    const invoiceDate = formatDate(order.date);

    const terms =
      String(order.shipping_method || '').toLowerCase() === 'pickup' ||
      String(order.paymentMethod || order.payment_method || '')
        .toLowerCase()
        .includes('pickup')
        ? 'Pay on Pickup'
        : 'Due on Receipt';

    const payMethod = String(order.paymentMethod || order.payment_method || '').trim();
    const noteParts = [
      order.notes?.trim() || null,
      !isPaid && payMethod
        ? `Payment method: ${payMethod}. Balance is due per the terms above.`
        : null,
      order.tracking_number ? `Tracking: ${order.tracking_number}` : null,
    ].filter(Boolean);

    return {
      billToName: displayName,
      billToLines,
      items,
      invoiceDate,
      terms,
      notes: noteParts.length ? noteParts.join('\n') : null,
      totals: {
        subTotal,
        shipping,
        total,
        paymentMade,
        balanceDue,
      },
    };
  }, [order, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <p className="text-sm text-black/50">Loading invoice…</p>
      </div>
    );
  }

  if (!order || !invoiceModel) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-black">Order not found</h2>
          <button
            type="button"
            onClick={() => navigate({ to: '/profile' })}
            className="px-6 py-2 bg-black text-white rounded-lg text-sm font-bold"
          >
            Back to profile
          </button>
        </div>
      </div>
    );
  }

  // Admin / POS mini-printer layout by default (?format=letter for full invoice).
  const usePos =
    typeof window === 'undefined' ||
    new URLSearchParams(window.location.search).get('format') !== 'letter';

  return usePos ? (
    <PosReceiptDocument
      kindLabel="Sales receipt"
      invoiceId={order.id}
      displayId={order.display_id}
      customerName={invoiceModel.billToName}
      customerLines={invoiceModel.billToLines}
      dateLabel={invoiceModel.invoiceDate}
      items={invoiceModel.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        rate: item.rate,
        description: item.description,
      }))}
      subTotal={invoiceModel.totals.subTotal}
      shipping={invoiceModel.totals.shipping}
      total={invoiceModel.totals.total}
      paymentLabel={invoiceModel.terms}
      notes={invoiceModel.notes}
      onBack={() => navigate({ to: '/profile' })}
      onPrint={handleDownload}
    />
  ) : (
    <InvoiceDocument
      invoiceId={order.id}
      displayId={order.display_id}
      billToName={invoiceModel.billToName}
      billToLines={invoiceModel.billToLines}
      meta={{
        invoiceDate: invoiceModel.invoiceDate,
        dueDate: invoiceModel.invoiceDate,
        terms: invoiceModel.terms,
      }}
      items={invoiceModel.items}
      totals={invoiceModel.totals}
      notes={invoiceModel.notes}
      onBack={() => navigate({ to: '/profile' })}
      onPrint={handleDownload}
      onShare={handleShare}
    />
  );
};
