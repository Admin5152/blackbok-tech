import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { RepairRequest } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { mapRepairFromDb } from '../lib/api';
import { BlackBoxReceiptLogo } from '../components/BlackBoxReceiptLogo';

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

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (!navigator.share || !repair) return;
    try {
      await navigator.share({
        title: `BlackBox repair ${refLabel}`,
        text: `${repair.device} — ${repair.status}`,
        url: window.location.href,
      });
    } catch {
      /* user cancelled */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-white/60">Loading repair receipt…</p>
      </div>
    );
  }

  if (!repair || loadError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-bold">Receipt not available</h2>
          <p className="text-sm text-white/50">This repair request could not be loaded, or you do not have access.</p>
          <button
            type="button"
            onClick={() => navigate({ to: '/profile' })}
            className="px-6 py-2 bg-[#B38B21] text-black rounded-lg text-sm font-bold"
          >
            Back to profile
          </button>
        </div>
      </div>
    );
  }

  const finalCostRaw = (repair as { final_cost?: number | string | null }).final_cost;
  const finalCost =
    finalCostRaw != null && finalCostRaw !== '' && Number.isFinite(Number(finalCostRaw))
      ? formatCurrency(Number(finalCostRaw))
      : null;

  const rows: { label: string; value: string }[] = [
    { label: 'Reference', value: refLabel },
    { label: 'Submitted', value: formatDate(repair.date) },
    { label: 'Device', value: repair.device || '—' },
    { label: 'Issue', value: repair.issue || '—' },
    { label: 'Status', value: String(repair.status || '—') },
  ];
  if (repair.estimatedCost) rows.push({ label: 'Estimate', value: repair.estimatedCost });
  if (finalCost) rows.push({ label: 'Final cost', value: finalCost });
  if (repair.userName) rows.push({ label: 'Customer', value: repair.userName });
  if (repair.fulfillmentMethod) rows.push({ label: 'Fulfillment', value: repair.fulfillmentMethod });
  if (repair.adminNote) rows.push({ label: 'Note', value: repair.adminNote });

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-black text-white print:min-h-0 print:bg-white print:text-black">
      <div className="no-print border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
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
              onClick={handlePrint}
              className="p-2 rounded-lg bg-[#B38B21] text-black hover:opacity-90"
              aria-label="Print or save PDF"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl flex-1 px-3 py-3 print:max-w-none print:px-3 print:py-1">
        <div className="receipt-print-root space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 print:space-y-2 print:rounded-none print:border-gray-300 print:bg-white print:p-3 print:shadow-none">
          <header className="flex flex-wrap items-end justify-between gap-2 border-b border-white/10 pb-2 print:border-gray-300 print:pb-1.5">
            <BlackBoxReceiptLogo className="h-8 w-[180px] shrink-0 text-white sm:h-9 sm:w-[200px] print:h-7 print:w-[170px] print:text-black" />
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#B38B21] print:text-[#8a6a1a]">
                Repair receipt
              </p>
              <p className="text-sm font-mono font-bold text-white print:text-black">{refLabel}</p>
              <p className="text-[11px] text-white/45 print:text-gray-600">{formatDate(repair.date)}</p>
            </div>
          </header>

          <div className="space-y-1 text-[10px] print:text-[8.5px]">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 border-b border-white/[0.06] py-1.5 last:border-0 print:border-gray-200 print:py-1"
              >
                <span className="text-white/45 print:text-gray-600 font-black uppercase tracking-wider text-[9px]">
                  {r.label}
                </span>
                <span className="font-medium text-white print:text-black text-right max-w-[70%] break-words">
                  {r.value}
                </span>
              </div>
            ))}
          </div>

          <footer className="border-t border-white/10 pt-1.5 text-center text-[7px] leading-snug text-white/35 print:border-gray-200 print:text-[6.5px] print:text-gray-500">
            Repair acknowledgment — reference this ID for support.
          </footer>
        </div>
      </div>
    </div>
  );
};
