import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { RepairRequest } from '../types';
import { supabase } from '../lib/supabase';
import { mapRepairFromDb } from '../lib/api';
import { formatCustomerStatusShort } from '../lib/customerStatusLabels';
import { InvoiceDocument } from '../components/invoice/InvoiceDocument';
import {
  formatInvoiceDate,
  INVOICE_COPY,
  repairInvoicePhase,
} from '../lib/invoiceFormat';

export const RepairReceipt: React.FC = () => {
  const { repairId } = useParams({ from: '/receipt/repair/$repairId' });
  const navigate = useNavigate();
  const [repair, setRepair] = useState<RepairRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!repairId) return;
      setLoadError(false);
      try {
        const { data, error } = await supabase.from('repair_requests').select('*').eq('id', repairId).single();
        if (error) throw error;
        if (!data) {
          setRepair(null);
          setLoadError(true);
          return;
        }
        setRepair(mapRepairFromDb(data));
      } catch (e) {
        console.error('RepairReceipt fetch:', e);
        setRepair(null);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [repairId]);

  useEffect(() => {
    if (loading || !repair) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('print') !== '1') return;
    const timer = window.setTimeout(() => {
      window.print();
      sp.delete('print');
      const q = sp.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [loading, repair]);

  const refLabel = repair?.display_id || (repair ? `#${repair.id.slice(-8).toUpperCase()}` : '—');
  const phase = repair ? repairInvoicePhase(repair) : 'estimate';

  const model = useMemo(() => {
    if (!repair) return null;

    const docPhase = repairInvoicePhase(repair);
    const finalCostRaw = (repair as { final_cost?: number | string | null }).final_cost;
    const estimateRaw = repair.estimatedCost;
    const parseMoney = (v: unknown): number => {
      if (v == null || v === '') return 0;
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
      const n = Number(String(v).replace(/[^\d.]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const finalAmt = parseMoney(finalCostRaw);
    const estimateAmt = parseMoney(estimateRaw);
    const rate = docPhase === 'final' ? finalAmt || estimateAmt : estimateAmt || finalAmt;

    const descParts = [
      docPhase === 'estimate' ? 'Document: ESTIMATE (not final)' : 'Document: FINAL INVOICE',
      repair.issue ? `Issue: ${repair.issue}` : null,
      repair.fulfillmentMethod ? `Fulfillment: ${repair.fulfillmentMethod}` : null,
      `Status: ${formatCustomerStatusShort('repair', repair.status) || '—'}`,
    ].filter(Boolean) as string[];

    const defaultNote =
      docPhase === 'estimate' ? INVOICE_COPY.repairEstimateNote : INVOICE_COPY.repairFinalNote;
    const notes = [defaultNote, repair.adminNote].filter(Boolean).join('\n\n');

    return {
      documentPhase: docPhase,
      billToName: repair.userName || 'Customer',
      billToLines: [] as string[],
      invoiceDate: formatInvoiceDate(repair.date),
      items: [
        {
          name: (repair.device || 'Repair service').toUpperCase(),
          description: descParts.join('\n'),
          qty: 1,
          rate,
        },
      ],
      totals: {
        subTotal: rate,
        total: rate,
        paymentMade: 0,
        balanceDue: rate,
      },
      notes,
      terms:
        docPhase === 'estimate'
          ? INVOICE_COPY.phaseEstimateTerms
          : INVOICE_COPY.phaseFinalTerms,
    };
  }, [repair]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <p className="text-sm text-black/50">{INVOICE_COPY.loadingRepair}</p>
      </div>
    );
  }

  if (!repair || loadError || !model) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-bold text-black">{INVOICE_COPY.missing}</h2>
          <p className="text-sm text-black/50">{INVOICE_COPY.missingRepairHint}</p>
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
      kindLabel={INVOICE_COPY.repairKind}
      documentPhase={model.documentPhase}
      invoiceId={repair.id}
      displayId={repair.display_id}
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
      onBack={() => navigate({ to: '/profile' })}
      onPrint={() => window.print()}
      shareTitle={`BlackBox repair ${phase === 'estimate' ? 'estimate' : 'invoice'} ${refLabel}`}
      shareText={`${repair.device} — ${phase === 'estimate' ? 'Estimate' : 'Final'} — ${formatCustomerStatusShort('repair', repair.status)}`}
    />
  );
};
