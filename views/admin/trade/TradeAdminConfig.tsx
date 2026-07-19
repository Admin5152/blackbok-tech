/**
 * trade_config editor — typed inputs by key; invalidates pricing cache on save.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getAdminTradeConfig,
  tradeAdminErrorMessage,
  updateTradeConfigValue,
} from '../../../lib/tradeAdminApi';
import type { TradeConfigRow } from '../../../types/supabase';
import { useAppContext } from '../../../lib/appContext';

const PERCENT_KEYS = new Set([
  'aesthetic_a1_value',
  'aesthetic_a2_value',
  'threshold_value',
]);

const NUMBER_KEYS = new Set([
  'battery_healthy_min',
  'battery_half_min',
  'rounding_ghs',
  'estimate_validity_days',
  'offer_sla_hours',
  'threshold_value',
  'aesthetic_a1_value',
  'aesthetic_a2_value',
]);

const SELECT_OPTIONS: Record<string, string[]> = {
  battery_replaced_policy: ['full', 'half_if_85', 'none_if_90', 'full_verify'],
  camera_replaced_policy: ['full_verify', 'none_if_working'],
  icloud_locked_policy: ['hard_stop', 'screen_deduction'],
  threshold_mode: ['percent', 'fixed'],
  aesthetic_a1_mode: ['percent', 'fixed', 'per_model'],
  aesthetic_a2_mode: ['percent', 'fixed', 'per_model'],
  notification_channel: ['in_app', 'sms', 'whatsapp', 'email'],
};

function inputKind(key: string): 'select' | 'number' | 'percent' | 'text' {
  if (SELECT_OPTIONS[key]) return 'select';
  if (PERCENT_KEYS.has(key) && key.includes('aesthetic')) return 'percent';
  if (NUMBER_KEYS.has(key)) return 'number';
  return 'text';
}

export const TradeAdminConfig: React.FC = () => {
  const { notify } = useAppContext();
  const [rows, setRows] = useState<TradeConfigRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const data = await getAdminTradeConfig();
      setRows(data);
      const d: Record<string, string> = {};
      for (const r of data) d[r.key] = r.value;
      setDrafts(d);
    } catch (e) {
      setError(tradeAdminErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const save = async (key: string) => {
    const value = drafts[key] ?? '';
    const current = rows.find((r) => r.key === key)?.value;
    if (value === current) return;
    setSaving(key);
    try {
      await updateTradeConfigValue(key, value);
      await reload();
      notify?.(`Saved ${key}.`, 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-white/30 text-sm">Loading config…</div>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-3xl">
      <p className="text-[10px] text-white/40 leading-relaxed">
        Business rules for the live estimate engine. Saves invalidate the pricing cache so the
        customer ticker reflects changes within the normal TTL.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-white/30 py-8 text-center">No trade_config rows.</p>
      ) : (
        rows.map((r) => {
          const kind = inputKind(r.key);
          return (
            <div
              key={r.key}
              className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-white">{r.key}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{r.description}</p>
                </div>
                <button
                  type="button"
                  disabled={saving === r.key || drafts[r.key] === r.value}
                  onClick={() => void save(r.key)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-[#B38B21] text-black disabled:opacity-30"
                >
                  {saving === r.key ? 'Saving…' : 'Save'}
                </button>
              </div>
              {kind === 'select' ? (
                <select
                  value={drafts[r.key] ?? ''}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [r.key]: e.target.value }))
                  }
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none"
                >
                  {(SELECT_OPTIONS[r.key] || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {!SELECT_OPTIONS[r.key]?.includes(drafts[r.key] ?? '') && (
                    <option value={drafts[r.key]}>{drafts[r.key]}</option>
                  )}
                </select>
              ) : kind === 'number' || kind === 'percent' ? (
                <div className="relative">
                  <input
                    type="number"
                    value={drafts[r.key] ?? ''}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [r.key]: e.target.value }))
                    }
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none"
                  />
                  {kind === 'percent' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">
                      %
                    </span>
                  )}
                </div>
              ) : (
                <textarea
                  rows={r.key.includes('message') ? 3 : 1}
                  value={drafts[r.key] ?? ''}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [r.key]: e.target.value }))
                  }
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm resize-y focus:border-[#B38B21]/50 focus:outline-none"
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
