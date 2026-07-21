import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { TradeRequest } from '../types';
import { formatDate } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { mapTradeFromDb } from '../lib/api';
import { formatCustomerStatusShort } from '../lib/customerStatusLabels';
import { maskPhone } from '../lib/phoneMask';
import { maskImeiSerial } from '../lib/imeiValidation';
import { InvoiceDocument } from '../components/invoice/InvoiceDocument';

export const TradeReceipt: React.FC = () => {
  const { tradeId } = useParams({ from: '/receipt/trade/$tradeId' });
  const navigate = useNavigate();
  const [trade, setTrade] = useState<TradeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!tradeId) return;
      setLoadError(false);
      try {
        const { data, error } = await supabase.from('trade_in_requests').select('*').eq('id', tradeId).single();
        if (error) throw error;
        if (!data) {
          setTrade(null);
          setLoadError(true);
          return;
        }
        setTrade(mapTradeFromDb(data));
      } catch (e) {
        console.error('TradeReceipt fetch:', e);
        setTrade(null);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [tradeId]);

  useEffect(() => {
    if (loading || !trade) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('print') !== '1') return;
    const timer = window.setTimeout(() => {
      window.print();
      sp.delete('print');
      const q = sp.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [loading, trade]);

  const refLabel = trade?.display_id || (trade ? `#${trade.id.slice(-8).toUpperCase()}` : '—');

  const model = useMemo(() => {
    if (!trade) return null;
    const value = Number(trade.finalValue ?? trade.offeredPrice ?? trade.estimatedValue ?? 0);
    const descParts = [
      trade.condition ? `Condition: ${trade.condition}` : null,
      trade.targetDevice ? `Target upgrade: ${trade.targetDevice}` : null,
      trade.fulfillmentMethod ? `Fulfillment: ${trade.fulfillmentMethod}` : null,
      trade.imei_1 ? `IMEI 1: ${maskImeiSerial(trade.imei_1)}` : null,
      trade.imei_2 ? `IMEI 2: ${maskImeiSerial(trade.imei_2)}` : null,
      trade.serial_number
        ? `Serial: ${maskImeiSerial(trade.serial_number)}`
        : trade.imei_serial
          ? `IMEI / serial: ${maskImeiSerial(trade.imei_serial)}`
          : null,
      `Status: ${formatCustomerStatusShort('trade', trade.status) || '—'}`,
    ].filter(Boolean);

    const billToLines = [
      trade.contactEmail,
      trade.contactPhone ? maskPhone(trade.contactPhone) : null,
    ].filter(Boolean) as string[];

    const notesBits = [trade.userDescription, trade.adminNote].filter(Boolean).join('\n\n');

    return {
      billToName: trade.contactName || 'Customer',
      billToLines,
      invoiceDate: formatDate(trade.date),
      items: [
        {
          name: trade.device || 'Trade-in device',
          description: descParts.join(', '),
          qty: 1,
          rate: value,
        },
      ],
      totals: {
        subTotal: value,
        total: value,
        paymentMade: 0,
        balanceDue: value,
        adjustmentLabel: 'Trade-in credit',
      },
      notes: notesBits || 'Trade-in valuation invoice — credit applies toward an eligible upgrade.',
    };
  }, [trade]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <p className="text-sm text-black/50">Loading trade-in invoice…</p>
      </div>
    );
  }

  if (!trade || loadError || !model) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-bold text-black">Invoice not available</h2>
          <p className="text-sm text-black/50">This trade-in could not be loaded, or you do not have access.</p>
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

  return (
    <InvoiceDocument
      kindLabel="Trade-in"
      invoiceId={trade.id}
      displayId={trade.display_id}
      billToName={model.billToName}
      billToLines={model.billToLines}
      meta={{
        invoiceDate: model.invoiceDate,
        dueDate: model.invoiceDate,
        terms: 'Trade-in credit',
      }}
      items={model.items}
      totals={model.totals}
      notes={model.notes}
      onBack={() => navigate({ to: '/profile' })}
      onPrint={() => window.print()}
      onShare={async () => {
        if (!navigator.share) return;
        try {
          await navigator.share({
            title: `BlackBox trade-in invoice ${refLabel}`,
            text: `${trade.device} — ${formatCustomerStatusShort('trade', trade.status)}`,
            url: window.location.href,
          });
        } catch {
          /* cancelled */
        }
      }}
    />
  );
};
