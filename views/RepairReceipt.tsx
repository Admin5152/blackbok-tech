import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { RepairRequest } from '../types';
import { formatDate } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { mapRepairFromDb } from '../lib/api';
import { formatCustomerStatusShort } from '../lib/customerStatusLabels';
import { InvoiceDocument } from '../components/invoice/InvoiceDocument';

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

  const model = useMemo(() => {
    if (!repair) return null;

    const finalCostRaw = (repair as { final_cost?: number | string | null }).final_cost;
    const estimateRaw = repair.estimatedCost;
    const parseMoney = (v: unknown): number => {
      if (v == null || v === '') return 0;
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
      const n = Number(String(v).replace(/[^\d.]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const rate =
      parseMoney(finalCostRaw) ||
      parseMoney(estimateRaw) ||
      0;

    const descParts = [
      repair.issue ? `Issue: ${repair.issue}` : null,
      repair.fulfillmentMethod ? `Fulfillment: ${repair.fulfillmentMethod}` : null,
      `Status: ${formatCustomerStatusShort('repair', repair.status) || '—'}`,
    ].filter(Boolean);

    return {
      billToName: repair.userName || 'Customer',
      billToLines: [] as string[],
      invoiceDate: formatDate(repair.date),
      items: [
        {
          name: repair.device || 'Repair service',
          description: descParts.join(', '),
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
      notes: repair.adminNote || 'Repair service invoice — amount may be updated after diagnostics.',
    };
  }, [repair]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <p className="text-sm text-black/50">Loading repair invoice…</p>
      </div>
    );
  }

  if (!repair || loadError || !model) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-bold text-black">Invoice not available</h2>
          <p className="text-sm text-black/50">This repair request could not be loaded, or you do not have access.</p>
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
      kindLabel="Repair"
      invoiceId={repair.id}
      displayId={repair.display_id}
      billToName={model.billToName}
      billToLines={model.billToLines}
      meta={{
        invoiceDate: model.invoiceDate,
        dueDate: model.invoiceDate,
        terms: 'Due on Receipt',
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
            title: `BlackBox repair invoice ${refLabel}`,
            text: `${repair.device} — ${formatCustomerStatusShort('repair', repair.status)}`,
            url: window.location.href,
          });
        } catch {
          /* cancelled */
        }
      }}
    />
  );
};
