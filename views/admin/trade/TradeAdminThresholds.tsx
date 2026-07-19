/**
 * Per-model threshold worksheet — editable threshold_value on trade_devices.
 * Empty banner when cut-off cannot fire for models without a value.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getThresholdWorksheet,
  tradeAdminErrorMessage,
  updateDeviceThreshold,
} from '../../../lib/tradeAdminApi';
import { formatGhs } from '../../../lib/money';
import type { TradeThresholdWorksheetRow } from '../../../types/supabase';
import { useAppContext } from '../../../lib/appContext';

export const TradeAdminThresholds: React.FC = () => {
  const { notify } = useAppContext();
  const [rows, setRows] = useState<TradeThresholdWorksheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setRows(await getThresholdWorksheet());
    } catch (e) {
      setError(tradeAdminErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const missing = rows.filter((r) => r.current_threshold == null || r.status === 'NEEDS CLIENT VALUE');

  const save = async (model: string, raw: string) => {
    setSaving(model);
    try {
      const trimmed = raw.trim();
      const value = trimmed === '' ? null : Number(trimmed);
      if (value != null && !Number.isFinite(value)) {
        notify?.('Enter a number or clear the field.', 'error');
        return;
      }
      await updateDeviceThreshold(model, value);
      await reload();
      notify?.('Threshold saved.', 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-white/30 text-sm">Loading thresholds…</div>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Cut-off messages are OFF for models without a value ({missing.length} model
          {missing.length === 1 ? '' : 's'}).
        </div>
      )}

      <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#0a0a0a] text-[9px] uppercase tracking-widest text-white/40">
              <tr>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Base range</th>
                <th className="px-3 py-2">Threshold</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.model} className="border-t border-white/[0.04]">
                  <td className="px-3 py-2 text-xs font-bold text-white">{r.model}</td>
                  <td className="px-3 py-2 text-xs text-white/50">{r.device_type}</td>
                  <td className="px-3 py-2 text-xs text-white/50">
                    {r.lowest_base != null
                      ? `${formatGhs(r.lowest_base)} – ${formatGhs(r.highest_base ?? r.lowest_base)}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      defaultValue={r.current_threshold ?? ''}
                      disabled={saving === r.model}
                      placeholder="—"
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        const prev =
                          r.current_threshold == null ? '' : String(r.current_threshold);
                        if (next === prev) return;
                        void save(r.model, next);
                      }}
                      className="w-28 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[#B38B21] text-xs font-bold focus:border-[#B38B21]/50 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[9px] font-black uppercase ${
                        r.status === 'NEEDS CLIENT VALUE' || r.current_threshold == null
                          ? 'text-amber-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      {r.current_threshold == null ? 'NEEDS VALUE' : r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-6 text-center text-white/30 text-sm">No active trade devices.</p>
          )}
        </div>
      </div>
    </div>
  );
};
