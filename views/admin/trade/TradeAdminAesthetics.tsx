/**
 * Aesthetic overrides — per-model a1/a2 fixed amounts (when config mode = per_model).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAestheticOverride,
  getAestheticOverrides,
  tradeAdminErrorMessage,
  upsertAestheticOverride,
} from '../../../lib/tradeAdminApi';
import { getTradeDevices } from '../../../lib/tradeApi';
import { formatGhs } from '../../../lib/money';
import type { TradeAestheticOverrideRow, TradeDeviceRow } from '../../../types/supabase';
import { useAppContext } from '../../../lib/appContext';

type Pair = { model: string; a1: number | null; a2: number | null };

export const TradeAdminAesthetics: React.FC = () => {
  const { notify } = useAppContext();
  const [overrides, setOverrides] = useState<TradeAestheticOverrideRow[]>([]);
  const [devices, setDevices] = useState<TradeDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [o, dIphone, dIpad] = await Promise.all([
        getAestheticOverrides(),
        getTradeDevices('iphone'),
        getTradeDevices('ipad'),
      ]);
      setOverrides(o);
      setDevices([...dIphone, ...dIpad]);
    } catch (e) {
      setError(tradeAdminErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const pairs: Pair[] = useMemo(() => {
    const byModel = new Map<string, Pair>();
    for (const d of devices) {
      byModel.set(d.model, { model: d.model, a1: null, a2: null });
    }
    for (const o of overrides) {
      const cur = byModel.get(o.model) ?? { model: o.model, a1: null, a2: null };
      if (o.grade === 'a1') cur.a1 = o.amount;
      if (o.grade === 'a2') cur.a2 = o.amount;
      byModel.set(o.model, cur);
    }
    const ql = q.trim().toLowerCase();
    return Array.from(byModel.values())
      .filter((p) => !ql || p.model.toLowerCase().includes(ql))
      .sort((a, b) => a.model.localeCompare(b.model, undefined, { numeric: true }));
  }, [devices, overrides, q]);

  const saveGrade = async (model: string, grade: 'a1' | 'a2', raw: string) => {
    const key = `${model}:${grade}`;
    setSaving(key);
    try {
      const trimmed = raw.trim();
      if (trimmed === '') {
        await deleteAestheticOverride(model, grade);
      } else {
        const n = Number(trimmed);
        if (!Number.isFinite(n) || n < 0) {
          notify?.('Enter a non-negative amount or clear.', 'error');
          return;
        }
        await upsertAestheticOverride(model, grade, n);
      }
      await reload();
      notify?.('Aesthetic override saved.', 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-white/30 text-sm">Loading aesthetics…</div>;
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
      <p className="text-[10px] text-white/40 leading-relaxed">
        Used when aesthetic_a*_mode = per_model. Otherwise global percent/fixed from Config applies.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter model…"
        className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs w-full sm:w-56 focus:border-[#B38B21]/50 focus:outline-none"
      />
      <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#0a0a0a] text-[9px] uppercase tracking-widest text-white/40">
              <tr>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">A1 amount</th>
                <th className="px-3 py-2">A2 amount</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.model} className="border-t border-white/[0.04]">
                  <td className="px-3 py-2 text-xs font-bold text-white">{p.model}</td>
                  {(['a1', 'a2'] as const).map((grade) => {
                    const val = grade === 'a1' ? p.a1 : p.a2;
                    return (
                      <td key={grade} className="px-3 py-2">
                        <input
                          type="number"
                          defaultValue={val ?? ''}
                          placeholder="—"
                          disabled={saving === `${p.model}:${grade}`}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            const prev = val == null ? '' : String(val);
                            if (next === prev) return;
                            void saveGrade(p.model, grade, next);
                          }}
                          className="w-28 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[#B38B21] text-xs font-bold focus:border-[#B38B21]/50 focus:outline-none"
                        />
                        {val != null && (
                          <span className="ml-2 text-[9px] text-white/25 hidden lg:inline">
                            {formatGhs(val)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {pairs.length === 0 && (
            <p className="p-6 text-center text-white/30 text-sm">No models found.</p>
          )}
        </div>
      </div>
    </div>
  );
};
