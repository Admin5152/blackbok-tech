import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { TradeRequest } from '../types';
import { supabase } from '../lib/supabase';
import { mapTradeFromDb } from '../lib/api';
import { formatCustomerStatusShort } from '../lib/customerStatusLabels';
import { maskPhone } from '../lib/phoneMask';
import { maskImeiSerial } from '../lib/imeiValidation';
import { InvoiceDocument } from '../components/invoice/InvoiceDocument';
import {
  formatInvoiceDate,
  INVOICE_COPY,
  tradeInvoicePhase,
} from '../lib/invoiceFormat';
import { tradeOfferAmount } from '../lib/tradeOffer';

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
  const phase = trade ? tradeInvoicePhase(trade) : 'estimate';

  const model = useMemo(() => {
    if (!trade) return null;
    const docPhase = tradeInvoicePhase(trade);
    const offerAmt = tradeOfferAmount(trade);
    const estimateAmt = Number(trade.estimatedValue ?? 0) || 0;
    const value =
      docPhase === 'final' ? offerAmt ?? estimateAmt : estimateAmt || offerAmt || 0;

    const descParts = [
      docPhase === 'estimate'
        ? 'Document: ESTIMATE (not final)'
        : 'Document: FINAL valuation / offer',
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
    ].filter(Boolean) as string[];

    const billToLines = [
      trade.contactEmail,
      trade.contactPhone ? maskPhone(trade.contactPhone) : null,
    ].filter(Boolean) as string[];

    const defaultNote =
      docPhase === 'estimate' ? INVOICE_COPY.tradeEstimateNote : INVOICE_COPY.tradeFinalNote;
    const notesBits = [defaultNote, trade.userDescription, trade.adminNote]
      .filter(Boolean)
      .join('\n\n');

    return {
      documentPhase: docPhase,
      billToName: trade.contactName || 'Customer',
      billToLines,
      invoiceDate: formatInvoiceDate(trade.date),
      items: [
        {
          name: (trade.device || 'Trade-in device').toUpperCase(),
          description: descParts.join('\n'),
          qty: 1,
          rate: value,
        },
      ],
      totals: {
        subTotal: value,
        total: value,
        paymentMade: 0,
        balanceDue: 0,
      },
      tradeInValuation: value > 0
        ? [
            {
              label: `${(trade.device || 'Device').toUpperCase()} (${
                docPhase === 'estimate' ? 'estimate' : 'final'
              })`,
              amount: value,
            },
          ]
        : [],
      notes: notesBits,
      terms:
        docPhase === 'estimate'
          ? INVOICE_COPY.phaseEstimateTerms
          : 'Trade-in credit — final offer',
    };
  }, [trade]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <p className="text-sm text-black/50">{INVOICE_COPY.loadingTrade}</p>
      </div>
    );
  }

  if (!trade || loadError || !model) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-bold text-black">{INVOICE_COPY.missing}</h2>
          <p className="text-sm text-black/50">{INVOICE_COPY.missingTradeHint}</p>
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
      kindLabel={INVOICE_COPY.tradeKind}
      documentPhase={model.documentPhase}
      invoiceId={trade.id}
      displayId={trade.display_id}
      billToName={model.billToName}
      billToLines={model.billToLines}
      meta={{
        invoiceDate: model.invoiceDate,
        dueDate: model.invoiceDate,
        terms: model.terms,
      }}
      items={model.items}
      totals={model.totals}
      notes={model.notes}
      tradeInValuation={model.tradeInValuation}
      onBack={() => navigate({ to: '/profile' })}
      onPrint={() => window.print()}
      shareTitle={`BlackBox trade-in ${phase === 'estimate' ? 'estimate' : 'invoice'} ${refLabel}`}
      shareText={`${trade.device} — ${phase === 'estimate' ? 'Estimate' : 'Final'} — ${formatCustomerStatusShort('trade', trade.status)}`}
    />
  );
};
