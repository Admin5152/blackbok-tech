/**
 * trade_config editor — typed inputs by key; add/delete keys; invalidates pricing cache on save.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  createTradeConfigKey,
  deleteTradeConfigKey,
  getAdminTradeConfig,
  tradeAdminErrorMessage,
  updateTradeConfigValue,
} from '../../../lib/tradeAdminApi';
import type { TradeConfigRow } from '../../../types/supabase';
import { useAppContext } from '../../../lib/appContext';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { FieldInfoTip } from '../../../components/trade/FieldInfoTip';
import {
  configKeyLabel,
  configKeyTip,
  configValueLabel,
} from '../../../lib/tradeAdminCopy';
import { UPGRADE_TARGET_CONFIG_KEY } from '../../../lib/tradeUpgradePicks';
import { Link } from '@tanstack/react-router';

const HIDDEN_CONFIG_KEYS = new Set([UPGRADE_TARGET_CONFIG_KEY]);

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

type InputKind = 'select' | 'number' | 'percent' | 'ghs' | 'per_model_hint' | 'text';

/** Resolve input unit from sibling mode so % / GHS / Appearance stay consistent. */
function inputKind(key: string, drafts: Record<string, string>): InputKind {
  if (SELECT_OPTIONS[key]) return 'select';

  if (key === 'aesthetic_a1_value' || key === 'aesthetic_a2_value') {
    const modeKey = key === 'aesthetic_a1_value' ? 'aesthetic_a1_mode' : 'aesthetic_a2_mode';
    const mode = String(drafts[modeKey] || '').trim();
    if (mode === 'fixed') return 'ghs';
    if (mode === 'per_model') return 'per_model_hint';
    return 'percent';
  }

  if (key === 'threshold_value') {
    const mode = String(drafts.threshold_mode || '').trim();
    if (mode === 'percent') return 'percent';
    return 'number';
  }

  if (PERCENT_KEYS.has(key)) return 'percent';
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
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      notify?.(`Saved ${configKeyLabel(key)}.`, 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  const addKey = async () => {
    const key = newKey.trim();
    if (!key) {
      notify?.('Enter a config key.', 'warning');
      return;
    }
    if (rows.some((r) => r.key === key)) {
      notify?.(`Key “${key}” already exists.`, 'error');
      return;
    }
    setAdding(true);
    try {
      await createTradeConfigKey({
        key,
        value: newValue,
        description: newDescription.trim() || null,
      });
      setNewKey('');
      setNewValue('');
      setNewDescription('');
      await reload();
      notify?.(`Added ${key}.`, 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setAdding(false);
    }
  };

  const removeKey = (key: string) => {
    setPendingDeleteKey(key);
  };

  const confirmRemoveKey = async () => {
    if (!pendingDeleteKey) return;
    setDeleting(true);
    setSaving(pendingDeleteKey);
    try {
      await deleteTradeConfigKey(pendingDeleteKey);
      setRows((prev) => prev.filter((r) => r.key !== pendingDeleteKey));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[pendingDeleteKey];
        return next;
      });
      notify?.(`Deleted ${pendingDeleteKey}.`, 'success');
      setPendingDeleteKey(null);
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setDeleting(false);
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
        Change these only when you understand the effect. Tap the ⓘ next to each rule for a short
        explanation. Saves update customer estimates within a few minutes.
      </p>
      <p className="text-[11px] text-white/50 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
        Appearance / wear: choose <span className="text-white/70">Percent</span> or{' '}
        <span className="text-white/70">Fixed cedis</span> here — or{' '}
        <span className="text-white/70">Set per phone model</span> and enter real GHS amounts under{' '}
        <Link to="/admin/trade/aesthetics" className="text-[#B38B21] hover:underline">
          Appearance discounts
        </Link>
        . Only one mode applies at a time.
      </p>
      <p className="text-[11px] text-white/50 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
        Upgrade phone list is edited under{' '}
        <Link to="/admin/trade/upgrades" className="text-[#B38B21] hover:underline">
          Upgrade phones
        </Link>
        , not here.
      </p>

      <div className="rounded-xl border border-[#B38B21]/25 bg-[#B38B21]/5 p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21] inline-flex items-center gap-1.5">
          Add a new rule
          <FieldInfoTip
            title="When to add a rule"
            body="Most day-to-day settings already exist below. Only add a new key if a manager or developer asks you to."
          />
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Internal name (e.g. store_location)"
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
          />
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value"
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="What this rule does (optional)"
            className="sm:col-span-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
          />
          <button
            type="button"
            disabled={adding}
            onClick={() => void addKey()}
            className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#B38B21] text-black text-[10px] font-black uppercase disabled:opacity-40"
          >
            <Plus size={12} /> {adding ? 'Adding…' : 'Add rule'}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/30 py-8 text-center">No business rules found.</p>
      ) : (
        rows
          .filter((r) => !HIDDEN_CONFIG_KEYS.has(r.key))
          .map((r) => {
          const kind = inputKind(r.key, drafts);
          return (
            <div
              key={r.key}
              className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-white inline-flex items-center gap-1.5">
                    {configKeyLabel(r.key)}
                    <FieldInfoTip title={configKeyLabel(r.key)} body={configKeyTip(r.key)} />
                  </p>
                  <p className="text-[10px] text-white/35 mt-0.5">
                    {r.description || configKeyTip(r.key)}
                  </p>
                  <p className="text-[9px] text-white/20 mt-0.5 font-mono">{r.key}</p>
                </div>
                <div className="flex items-center gap-2">
                  {kind !== 'per_model_hint' && (
                    <button
                      type="button"
                      disabled={saving === r.key || drafts[r.key] === r.value}
                      onClick={() => void save(r.key)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-[#B38B21] text-black disabled:opacity-30"
                    >
                      {saving === r.key ? 'Saving…' : 'Save'}
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete config key"
                    disabled={saving === r.key}
                    onClick={() => void removeKey(r.key)}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-400/80 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
                  >
                    <Trash2 size={14} aria-hidden />
                    <span className="sr-only">Delete</span>
                  </button>
                </div>
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
                      {configValueLabel(opt)}
                    </option>
                  ))}
                  {!SELECT_OPTIONS[r.key]?.includes(drafts[r.key] ?? '') && (
                    <option value={drafts[r.key]}>
                      {configValueLabel(drafts[r.key] ?? '')}
                    </option>
                  )}
                </select>
              ) : kind === 'per_model_hint' ? (
                <div className="rounded-xl border border-[#B38B21]/25 bg-[#B38B21]/10 px-3 py-3 text-[11px] text-white/70 leading-relaxed">
                  Amounts for this wear level come from{' '}
                  <Link
                    to="/admin/trade/aesthetics"
                    className="text-[#B38B21] font-bold hover:underline"
                  >
                    Appearance discounts
                  </Link>{' '}
                  (real GHS per phone model). The percentage / fixed value below is not used while
                  mode is “Set per phone model”.
                </div>
              ) : kind === 'number' || kind === 'percent' || kind === 'ghs' ? (
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
                  {kind === 'ghs' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">
                      GHS
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

      <ConfirmDeleteDialog
        open={pendingDeleteKey != null}
        title="Delete config key?"
        message={
          pendingDeleteKey
            ? `Permanently delete config key “${pendingDeleteKey}”? Estimates that depend on it may break until you re-add it.`
            : ''
        }
        requireTypedDelete
        busy={deleting}
        onCancel={() => !deleting && setPendingDeleteKey(null)}
        onConfirm={() => void confirmRemoveKey()}
      />
    </div>
  );
};
