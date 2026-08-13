import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Order } from '../types';
import { formatProductOptionLabel } from '../lib/productLabels';
import { getOrder, getOrderByRef } from '../lib/api';
import { useAppContext } from '../App';
import { PosReceiptDocument } from '../components/invoice/PosReceiptDocument';
import { InvoiceDocument } from '../components/invoice/InvoiceDocument';
import { formatInvoiceDate, INVOICE_COPY } from '../lib/invoiceFormat';

export const Receipt: React.FC = () => {
  const { orderId } = useParams({ from: '/receipt/$orderId' });
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setOrder(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let mapped = await getOrder(orderId).catch(() => null);
        if (!mapped) mapped = await getOrderByRef(orderId);
        setOrder(mapped);
      } catch (error) {
        console.error('Error fetching order:', error);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchOrder();
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
      const fromOptions = Object.entries(item.selectedOptions || {})
        .filter(([, v]) => v)
        .map(([k, v]) => `${formatProductOptionLabel(k)}: ${v}`);
      const fromLine = String(item.configurationLine || '')
        .split(/\s*,\s*(?=[A-Za-z][^:]*:)/)
        .map((s) => s.trim())
        .filter(Boolean);
      const descLines = fromOptions.length ? fromOptions : fromLine;
      return {
        name: String(item.name || 'Product').toUpperCase(),
        description: descLines.length ? descLines.join('\n') : undefined,
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
    const invoiceDate = formatInvoiceDate(order.date);

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
        <p className="text-sm text-black/50">{INVOICE_COPY.loadingPurchase}</p>
      </div>
    );
  }

  if (!order || !invoiceModel) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-black">{INVOICE_COPY.missing}</h2>
          <p className="text-sm text-black/50 max-w-sm mx-auto">{INVOICE_COPY.missingPurchaseHint}</p>
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

  // Letterhead invoice by default; POS mini-printer via ?format=pos
  const usePos =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('format') === 'pos';

  return usePos ? (
    <PosReceiptDocument
      kindLabel={INVOICE_COPY.purchaseKind}
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
      kindLabel={INVOICE_COPY.purchaseKind}
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
