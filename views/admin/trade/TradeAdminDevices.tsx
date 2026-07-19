/**
 * Trade Admin — Devices: list / add / activate models for customer trade-in.
 *
 * Active + priced models appear on /trade type → series → model.
 * Deactivating removes them from the customer list (and soft-hides base rows).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, RefreshCcw } from 'lucide-react';
import {
  getAdminDevices,
  seedDefaultDeductionsForModel,
  setDeviceActive,
  tradeAdminErrorMessage,
  upsertTradeDevice,
} from '../../../lib/tradeAdminApi';
import { useAppContext } from '../../../lib/appContext';
import type { TradeDeviceRow, TradeDeviceType } from '../../../types/supabase';

type Filter = 'all' | 'iphone' | 'ipad' | 'inactive';

export const TradeAdminDevices: React.FC = () => {
  const { notify } = useAppContext();
  const [rows, setRows] = useState<TradeDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const [model, setModel] = useState('');
  const [deviceType, setDeviceType] = useState<TradeDeviceType>('iphone');
  const [series, setSeries] = useState('');
  const [productLine, setProductLine] = useState('pro');
  const [biometric, setBiometric] = useState<'face_id' | 'touch_id'>('face_id');
  const [adding, setAdding] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setRows(await getAdminDevices(true));
    } catch (e) {
      setError(tradeAdminErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'iphone' && r.device_type !== 'iphone') return false;
      if (filter === 'ipad' && r.device_type !== 'ipad') return false;
      if (filter === 'inactive' && r.is_active) return false;
      if (
        ql &&
        !r.model.toLowerCase().includes(ql) &&
        !(r.series ?? '').toLowerCase().includes(ql) &&
        !(r.product_line ?? '').toLowerCase().includes(ql)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, filter, q]);

  const counts = useMemo(() => {
    const activeIphone = rows.filter((r) => r.device_type === 'iphone' && r.is_active).length;
    const activeIpad = rows.filter((r) => r.device_type === 'ipad' && r.is_active).length;
    return { total: rows.length, activeIphone, activeIpad };
  }, [rows]);

  const toggleActive = async (row: TradeDeviceRow) => {
    setSaving(row.model);
    try {
      const next = await setDeviceActive(row.model, !row.is_active);
      setRows((prev) => prev.map((r) => (r.model === row.model ? next : r)));
      notify?.(
        next.is_active
          ? `${row.model} is now listed for trade-in.`
          : `${row.model} removed from the trade-in list.`,
        'success',
      );
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  const addDevice = async () => {
    const name = model.trim();
    if (!name) {
      notify?.('Enter a model name (e.g. iPhone 15 Pro).', 'warning');
      return;
    }
    setAdding(true);
    try {
      const row = await upsertTradeDevice({
        model: name,
        device_type: deviceType,
        series: deviceType === 'iphone' ? series.trim() || undefined : null,
        product_line: deviceType === 'ipad' ? productLine : null,
        biometric,
        is_active: true,
        sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 10,
      });
      const seeded = await seedDefaultDeductionsForModel(row.model);
      await reload();
      setModel('');
      setSeries('');
      notify?.(
        seeded > 0
          ? `Added ${row.model} with ${seeded} deduction rows. Set base values on Pricing & deductions.`
          : `Added ${row.model}. Set base values on Pricing & deductions so it appears for customers.`,
        'success',
      );
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setAdding(false);
    }
  };

  const saveMeta = async (
    row: TradeDeviceRow,
    patch: Partial<Pick<TradeDeviceRow, 'series' | 'product_line' | 'biometric' | 'sort_order'>>,
  ) => {
    setSaving(row.model);
    try {
      const next = await upsertTradeDevice({
        model: row.model,
        device_type: row.device_type,
        series: patch.series !== undefined ? patch.series : row.series,
        product_line:
          patch.product_line !== undefined ? patch.product_line : row.product_line,
        biometric: patch.biometric ?? row.biometric,
        sort_order: patch.sort_order ?? row.sort_order,
        is_active: row.is_active,
        image_url: row.image_url,
        threshold_value: row.threshold_value,
        generation: row.generation,
        screen_size: row.screen_size,
      });
      setRows((prev) => prev.map((r) => (r.model === row.model ? next : r)));
      notify?.('Device updated.', 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <p className="text-sm opacity-60 py-8">Loading devices…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight">Tradable devices</h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl">
            Turn models on/off for the customer trade-in list. After adding a device, set
            base values and fault deductions on{' '}
            <Link to="/admin/trade/pricing" className="text-[#CDA032] underline font-bold">
              Pricing & deductions
            </Link>
            . Only active devices with pricing appear for customers. If no iPads are
            active and priced, the iPad option is hidden.
          </p>
          <p className="text-[10px] uppercase tracking-widest mt-2 opacity-50">
            {counts.activeIphone} iPhone · {counts.activeIpad} iPad active · {counts.total}{' '}
            total
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--bb-border)] px-3 py-2 text-xs font-black uppercase tracking-wider hover:border-[#CDA032]/50"
        >
          <RefreshCcw size={14} aria-hidden /> Refresh
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {/* Add device */}
      <div className="rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface)] p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">
          Add device
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Model (e.g. iPhone 15 Pro)"
            className="lg:col-span-2 rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-3 py-2 text-sm"
          />
          <select
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value as TradeDeviceType)}
            className="rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-3 py-2 text-sm"
          >
            <option value="iphone">iPhone</option>
            <option value="ipad">iPad</option>
          </select>
          {deviceType === 'iphone' ? (
            <input
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder="Series (17, 16, XR…)"
              className="rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-3 py-2 text-sm"
            />
          ) : (
            <select
              value={productLine}
              onChange={(e) => setProductLine(e.target.value)}
              className="rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-3 py-2 text-sm"
            >
              <option value="pro">Pro</option>
              <option value="air">Air</option>
              <option value="mini">Mini</option>
              <option value="base">iPad</option>
            </select>
          )}
          <select
            value={biometric}
            onChange={(e) => setBiometric(e.target.value as 'face_id' | 'touch_id')}
            className="rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-3 py-2 text-sm"
          >
            <option value="face_id">Face ID</option>
            <option value="touch_id">Touch ID</option>
          </select>
          <button
            type="button"
            disabled={adding}
            onClick={() => void addDevice()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-wider text-xs px-4 py-2 disabled:opacity-40"
          >
            <Plus size={14} aria-hidden /> Add
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(
          [
            ['all', 'All'],
            ['iphone', 'iPhone'],
            ['ipad', 'iPad'],
            ['inactive', 'Off list'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
              filter === id
                ? 'bg-[#CDA032] text-black'
                : 'border border-[var(--bb-border)] opacity-70 hover:opacity-100'
            }`}
          >
            {label}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search models…"
          className="ml-auto rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface)] px-3 py-1.5 text-sm min-w-[10rem]"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--bb-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest opacity-50 border-b border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
              <th className="p-3">Model</th>
              <th className="p-3">Type</th>
              <th className="p-3">Series / line</th>
              <th className="p-3">Biometric</th>
              <th className="p-3">Sort</th>
              <th className="p-3">On list</th>
              <th className="p-3">Market pricing</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.model}
                className="border-b border-[var(--bb-border)]/60 hover:bg-[var(--bb-surface-2)]/50"
              >
                <td className="p-3 font-bold">{row.model}</td>
                <td className="p-3 uppercase text-[10px] font-black tracking-wider opacity-60">
                  {row.device_type}
                </td>
                <td className="p-3">
                  {row.device_type === 'iphone' ? (
                    <input
                      defaultValue={row.series ?? ''}
                      disabled={saving === row.model}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (row.series ?? '')) {
                          void saveMeta(row, { series: v || null });
                        }
                      }}
                      className="w-20 rounded-lg border border-[var(--bb-border)] bg-transparent px-2 py-1 text-xs"
                    />
                  ) : (
                    <select
                      value={row.product_line ?? 'base'}
                      disabled={saving === row.model}
                      onChange={(e) =>
                        void saveMeta(row, { product_line: e.target.value })
                      }
                      className="rounded-lg border border-[var(--bb-border)] bg-transparent px-2 py-1 text-xs"
                    >
                      <option value="pro">pro</option>
                      <option value="air">air</option>
                      <option value="mini">mini</option>
                      <option value="base">base</option>
                    </select>
                  )}
                </td>
                <td className="p-3">
                  <select
                    value={row.biometric}
                    disabled={saving === row.model}
                    onChange={(e) =>
                      void saveMeta(row, {
                        biometric: e.target.value as 'face_id' | 'touch_id',
                      })
                    }
                    className="rounded-lg border border-[var(--bb-border)] bg-transparent px-2 py-1 text-xs"
                  >
                    <option value="face_id">Face ID</option>
                    <option value="touch_id">Touch ID</option>
                  </select>
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    defaultValue={row.sort_order}
                    disabled={saving === row.model}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n !== row.sort_order) {
                        void saveMeta(row, { sort_order: n });
                      }
                    }}
                    className="w-16 rounded-lg border border-[var(--bb-border)] bg-transparent px-2 py-1 text-xs"
                  />
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    disabled={saving === row.model}
                    onClick={() => void toggleActive(row)}
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      row.is_active
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : 'bg-red-500/15 text-red-500'
                    }`}
                  >
                    {row.is_active ? 'Listed' : 'Hidden'}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/admin/trade/pricing"
                      search={{ model: row.model, tab: 'bases' } as any}
                      className="text-xs font-bold text-[#CDA032] underline"
                    >
                      Bases
                    </Link>
                    <span className="opacity-30">·</span>
                    <Link
                      to="/admin/trade/pricing"
                      search={{ model: row.model, tab: 'deductions' } as any}
                      className="text-xs font-bold text-[#CDA032] underline"
                    >
                      Deductions
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm opacity-50">
                  No devices match. Add one above or clear filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
