/**
 * Aesthetic overrides — per-model a1/a2 fixed amounts (when config mode = per_model).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  deleteAestheticOverride,
  getAdminTradeConfig,
  getAestheticOverrides,
  tradeAdminErrorMessage,
  upsertAestheticOverride,
} from '../../../lib/tradeAdminApi';
import { getTradeDevices } from '../../../lib/tradeApi';
import { formatGhs } from '../../../lib/money';
import type { TradeAestheticOverrideRow, TradeDeviceRow } from '../../../types/supabase';
import { useAppContext } from '../../../lib/appContext';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { Link } from '@tanstack/react-router';

type Pair = { model: string; a1: number | null; a2: number | null };
type PendingClear =
  | { kind: 'grade'; model: string; grade: 'a1' | 'a2' }
  | { kind: 'model'; model: string };

export const TradeAdminAesthetics: React.FC = () => {
  const { notify } = useAppContext();
  const [overrides, setOverrides] = useState<TradeAestheticOverrideRow[]>([]);
  const [devices, setDevices] = useState<TradeDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [pendingClear, setPendingClear] = useState<PendingClear | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [a1Mode, setA1Mode] = useState<string | null>(null);
  const [a2Mode, setA2Mode] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [o, dIphone, dIpad, cfg] = await Promise.all([
        getAestheticOverrides(),
        getTradeDevices('iphone'),
        getTradeDevices('ipad'),
        getAdminTradeConfig(),
      ]);
      setOverrides(o);
      setDevices([...dIphone, ...dIpad]);
      setA1Mode(cfg.find((c) => c.key === 'aesthetic_a1_mode')?.value ?? null);
      setA2Mode(cfg.find((c) => c.key === 'aesthetic_a2_mode')?.value ?? null);
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

  const clearGrade = (model: string, grade: 'a1' | 'a2') => {
    setPendingClear({ kind: 'grade', model, grade });
  };

  const clearModel = (model: string) => {
    setPendingClear({ kind: 'model', model });
  };

  const confirmClear = async () => {
    if (!pendingClear) return;
    setDeleting(true);
    const key =
      pendingClear.kind === 'grade'
        ? `${pendingClear.model}:${pendingClear.grade}`
        : pendingClear.model;
    setSaving(key);
    try {
      if (pendingClear.kind === 'grade') {
        await deleteAestheticOverride(pendingClear.model, pendingClear.grade);
        notify?.(
          `${pendingClear.grade.toUpperCase()} override deleted.`,
          'success',
        );
      } else {
        await deleteAestheticOverride(pendingClear.model, 'a1');
        await deleteAestheticOverride(pendingClear.model, 'a2');
        notify?.(`Cleared aesthetics for ${pendingClear.model}.`, 'success');
      }
      await reload();
      setPendingClear(null);
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setDeleting(false);
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
      {(a1Mode !== 'per_model' || a2Mode !== 'per_model') && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100 space-y-2">
          <p className="font-bold">Some columns are not driving quotes right now</p>
          <ul className="text-[11px] text-amber-100/85 space-y-1 list-disc pl-4">
            {a1Mode !== 'per_model' && (
              <li>
                <span className="font-bold">Light wear</span> uses Business rules (
                {a1Mode === 'fixed' ? 'fixed GHS' : a1Mode === 'percent' ? 'percent' : a1Mode || '—'}
                ), not this table.
              </li>
            )}
            {a2Mode !== 'per_model' && (
              <li>
                <span className="font-bold">Heavier wear</span> uses Business rules (
                {a2Mode === 'fixed' ? 'fixed GHS' : a2Mode === 'percent' ? 'percent' : a2Mode || '—'}
                ), not this table.
              </li>
            )}
          </ul>
          <p className="text-[11px] text-amber-100/80">
            To use the real GHS figures on this page, set that wear level to “Set per phone model” in{' '}
            <Link to="/admin/trade/config" className="underline underline-offset-2">
              Business rules
            </Link>
            .
          </p>
        </div>
      )}
      {(a1Mode === 'per_model' || a2Mode === 'per_model') && (
        <p className="text-[10px] text-white/40 leading-relaxed">
          Active here:{' '}
          {[
            a1Mode === 'per_model' ? 'Light wear' : null,
            a2Mode === 'per_model' ? 'Heavier wear' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          . Blank cells deduct ₵0 for that model until you enter an amount.
        </p>
      )}
      <p className="text-[10px] text-white/40 leading-relaxed">
        Light wear = small scratches; Heavier wear = more visible marks. Clear a field or tap Delete
        to remove.
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
                <th className="px-3 py-2">
                  Light wear (GHS)
                  {a1Mode !== 'per_model' && (
                    <span className="block normal-case tracking-normal text-amber-400/80 font-bold mt-0.5">
                      Not active
                    </span>
                  )}
                </th>
                <th className="px-3 py-2">
                  Heavier wear (GHS)
                  {a2Mode !== 'per_model' && (
                    <span className="block normal-case tracking-normal text-amber-400/80 font-bold mt-0.5">
                      Not active
                    </span>
                  )}
                </th>
                <th className="px-3 py-2">Clear</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.model} className="border-t border-white/[0.04]">
                  <td className="px-3 py-2 text-xs font-bold text-white">{p.model}</td>
                  {(['a1', 'a2'] as const).map((grade) => {
                    const val = grade === 'a1' ? p.a1 : p.a2;
                    const gradeActive =
                      grade === 'a1' ? a1Mode === 'per_model' : a2Mode === 'per_model';
                    return (
                      <td key={grade} className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            defaultValue={val ?? ''}
                            key={`${p.model}-${grade}-${val ?? 'empty'}`}
                            placeholder="—"
                            disabled={
                              !gradeActive ||
                              saving === `${p.model}:${grade}` ||
                              saving === p.model
                            }
                            title={
                              gradeActive
                                ? undefined
                                : 'Switch Business rules to “Set per phone model” to use this amount'
                            }
                            onBlur={(e) => {
                              if (!gradeActive) return;
                              const next = e.target.value.trim();
                              const prev = val == null ? '' : String(val);
                              if (next === prev) return;
                              void saveGrade(p.model, grade, next);
                            }}
                            className={`w-28 border rounded-lg px-2 py-1 text-xs font-bold focus:border-[#B38B21]/50 focus:outline-none ${
                              gradeActive
                                ? 'bg-black/50 border-white/10 text-[#B38B21]'
                                : 'bg-white/5 border-white/5 text-white/25 cursor-not-allowed'
                            }`}
                          />
                          {val != null && (
                            <>
                              <span className="text-[9px] text-white/25 hidden lg:inline">
                                {formatGhs(val)}
                              </span>
                              <button
                                type="button"
                                title={`Delete ${grade.toUpperCase()}`}
                                disabled={
                                  !gradeActive ||
                                  saving === `${p.model}:${grade}` ||
                                  saving === p.model
                                }
                                onClick={() => void clearGrade(p.model, grade)}
                                className="inline-flex p-1 rounded text-red-400/70 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
                              >
                                <Trash2 size={12} aria-hidden />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    {(p.a1 != null || p.a2 != null) && (
                      <button
                        type="button"
                        title="Clear all overrides for model"
                        disabled={
                          saving === p.model ||
                          (a1Mode !== 'per_model' && a2Mode !== 'per_model')
                        }
                        onClick={() => void clearModel(p.model)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-red-400/80 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        <Trash2 size={11} aria-hidden /> All
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pairs.length === 0 && (
            <p className="p-6 text-center text-white/30 text-sm">No models found.</p>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={pendingClear != null}
        title="Delete aesthetic override?"
        message={
          pendingClear?.kind === 'grade'
            ? `Delete ${pendingClear.grade.toUpperCase()} override for ${pendingClear.model}?`
            : pendingClear
              ? `Delete all aesthetic overrides for ${pendingClear.model}?`
              : ''
        }
        busy={deleting}
        onCancel={() => !deleting && setPendingClear(null)}
        onConfirm={() => void confirmClear()}
      />
    </div>
  );
};
