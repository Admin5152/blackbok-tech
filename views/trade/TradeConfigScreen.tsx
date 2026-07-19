/**
 * Spec Screen 4 — Device configuration (storage → SIM → color → IMEI/serial).
 *
 * Progressive selects driven by trade_base_values for the chosen model:
 * only tiers/sims that exist as active pricing rows can be chosen.
 * SIM picker auto-skips when the model has only `single` (or one variant).
 * Colour is identification-only (D3) — no price effect.
 * IMEI 1 / IMEI 2 / serial collected here with per-field info tips.
 *
 * After Continue: LOCK_DEVICE_CONFIG stores lockedBaseValue internally.
 * WHY never displayed here: anti-anchoring — money appears on Screen 7
 * after the condition quiz, not before.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Info } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { FieldInfoTip } from '../../components/trade/FieldInfoTip';
import { getAppleColorsForModel } from '../../lib/appleColors';
import {
  distinctSimsFromRows,
  distinctStorageFromRows,
  getTradeBaseValuesForModel,
  lookupBaseValueFromRows,
  resolveAutoSim,
} from '../../lib/tradeApi';
import { isValidImei, isValidSerial } from '../../lib/imeiValidation';
import { TRADE_COPY, simVariantLabel } from '../../lib/tradeCopy';
import { useAppContext } from '../../lib/appContext';
import type { TradeBaseValueRow } from '../../types/supabase';

function primaryIdentity(imei1: string | null, serial: string | null, imei2: string | null): string {
  return (imei1 || serial || imei2 || '').trim();
}

export function TradeConfigScreen() {
  const { notify } = useAppContext();
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();

  const [rows, setRows] = useState<TradeBaseValueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.model) {
      void navigate({
        to: state.category ? '/trade/model' : '/trade/type',
        replace: true,
      });
    }
  }, [state.model, state.category, navigate]);

  useEffect(() => {
    if (!state.model) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getTradeBaseValuesForModel(state.model!);
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError(TRADE_COPY.states.errorPricing);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.model]);

  const storageOptions = useMemo(() => distinctStorageFromRows(rows), [rows]);

  const simOptions = useMemo(() => {
    if (!state.storage) return [];
    return distinctSimsFromRows(rows, state.storage);
  }, [rows, state.storage]);

  // Auto-select SIM when only one variant exists (pre-14 / 17 Air → 'single')
  useEffect(() => {
    if (!state.storage || state.sim) return;
    const auto = resolveAutoSim(rows, state.storage);
    if (auto && distinctSimsFromRows(rows, state.storage).length === 0) {
      dispatch({ type: 'SET_SIM', sim: auto });
    }
  }, [rows, state.storage, state.sim, dispatch]);

  const colors = useMemo(
    () => (state.model ? getAppleColorsForModel(state.model) : []),
    [state.model],
  );

  const showSimPicker = state.storage != null && simOptions.length > 0;
  const simResolved =
    state.sim != null ||
    (state.storage != null &&
      distinctSimsFromRows(rows, state.storage).length === 0 &&
      resolveAutoSim(rows, state.storage) != null);

  const resolvedSim =
    state.sim ??
    (state.storage ? resolveAutoSim(rows, state.storage) : null);
  const wifiOnly = resolvedSim === 'wifi';

  const imei1Raw = (state.imei1 ?? '').trim();
  const imei2Raw = (state.imei2 ?? '').trim();
  const serialRaw = (state.serialNumber ?? '').trim();

  const imei1Ok = !imei1Raw || isValidImei(imei1Raw);
  const imei2Ok = !imei2Raw || isValidImei(imei2Raw);
  const serialOk = !serialRaw || isValidSerial(serialRaw);

  const identityOk = wifiOnly
    ? Boolean(serialRaw && isValidSerial(serialRaw)) && imei1Ok && imei2Ok
    : Boolean(imei1Raw && isValidImei(imei1Raw)) && imei2Ok && serialOk;

  const canContinue =
    Boolean(state.model && state.storage && simResolved && state.color && identityOk);

  const chipClass = (selected: boolean) =>
    `min-h-11 rounded-2xl border px-4 py-3 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
      selected
        ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032] shadow-[0_0_16px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
        : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'
    }`;

  const handleContinue = () => {
    if (!state.model || !state.storage || !state.color) return;

    const sim =
      state.sim ??
      (state.storage ? resolveAutoSim(rows, state.storage) : null);
    if (!sim) {
      notify(TRADE_COPY.states.errorPricing, 'error');
      return;
    }

    const isWifi = sim === 'wifi';
    if (isWifi) {
      if (!serialRaw || !isValidSerial(serialRaw)) {
        setIdentityError(TRADE_COPY.config.serialInvalid);
        return;
      }
    } else if (!imei1Raw || !isValidImei(imei1Raw)) {
      setIdentityError(TRADE_COPY.config.imei1Invalid);
      return;
    }
    if (imei2Raw && !isValidImei(imei2Raw)) {
      setIdentityError(TRADE_COPY.config.imei2Invalid);
      return;
    }
    if (serialRaw && !isValidSerial(serialRaw)) {
      setIdentityError(TRADE_COPY.config.serialInvalid);
      return;
    }

    const primary = primaryIdentity(imei1Raw || null, serialRaw || null, imei2Raw || null);
    if (!primary) {
      setIdentityError(TRADE_COPY.config.identityRequired);
      return;
    }
    setIdentityError(null);

    const base = lookupBaseValueFromRows(rows, state.storage, sim);
    if (base == null || base <= 0) {
      notify(TRADE_COPY.states.errorPricing, 'error');
      return;
    }

    setSubmitting(true);
    dispatch({
      type: 'LOCK_DEVICE_CONFIG',
      lock: {
        model: state.model,
        storage: state.storage,
        sim,
        color: state.color,
        imei1: imei1Raw || null,
        imei2: imei2Raw || null,
        serialNumber: serialRaw || null,
        imeiSerial: primary,
        lockedBaseValue: base,
      },
    });
    setSubmitting(false);
    void navigate({ to: '/trade/target' });
  };

  if (!state.model) return null;

  if (loading) {
    return (
      <p className="text-center py-16 text-sm text-[color:var(--bb-muted)]">
        {TRADE_COPY.states.loading}
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center py-16 text-sm text-red-500" role="alert">
        {error}
      </p>
    );
  }

  if (storageOptions.length === 0) {
    return (
      <p className="text-center py-16 text-sm text-[color:var(--bb-muted)]">
        {TRADE_COPY.states.emptyDevices}
      </p>
    );
  }

  const fieldClass =
    'w-full rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface)] px-3 py-2.5 text-sm text-[color:var(--bb-text)] outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032]';

  return (
    <section aria-labelledby="trade-config-heading" className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-[#CDA032] opacity-70">
          {state.model}
        </p>
        <h2 id="trade-config-heading" className="text-2xl font-bold tracking-tight">
          {TRADE_COPY.config.heading}
        </h2>
      </div>

      <div className="flex gap-2.5 rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface)] px-3.5 py-3 text-xs leading-relaxed text-[color:var(--bb-muted)]">
        <Info size={16} className="shrink-0 mt-0.5 text-[#CDA032]" aria-hidden />
        <span>{TRADE_COPY.configHelpShort}</span>
      </div>

      <fieldset>
        <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
          {TRADE_COPY.config.storage}
        </legend>
        <div className="flex flex-wrap gap-2">
          {storageOptions.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => dispatch({ type: 'SET_STORAGE', storage: tier })}
              className={chipClass(state.storage === tier)}
            >
              {tier}
            </button>
          ))}
        </div>
      </fieldset>

      {showSimPicker && (
        <fieldset>
          <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-3">
            {TRADE_COPY.config.simType}
          </legend>
          <div className="flex flex-wrap gap-2">
            {simOptions.map((sim) => (
              <button
                key={sim}
                type="button"
                onClick={() => dispatch({ type: 'SET_SIM', sim })}
                className={chipClass(state.sim === sim)}
              >
                {simVariantLabel(sim)}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {simResolved && (
        <fieldset>
          <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032] mb-1">
            {TRADE_COPY.config.color}
          </legend>
          <p className="text-[11px] mb-3 text-[color:var(--bb-muted)]">
            {TRADE_COPY.config.colorNote}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const selected = state.color === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_COLOR', color: c.name })}
                  className={`inline-flex items-center gap-2 min-h-11 rounded-2xl border px-3.5 py-2.5 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
                    selected
                      ? 'border-[#CDA032] bg-[#CDA032]/10 shadow-[0_0_16px_rgba(205,160,50,0.15)] ring-1 ring-[#CDA032]'
                      : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface-2)] hover:border-[#CDA032]/40'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                    style={{ backgroundColor: c.hex }}
                    aria-hidden
                  />
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {state.color && (
        <div className="space-y-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CDA032]">
            Device identity
          </p>

          <label className="block text-xs space-y-1">
            <span className="font-black uppercase tracking-widest text-[#CDA032] inline-flex items-center gap-1.5">
              {TRADE_COPY.config.imei1}
              {!wifiOnly && <span className="text-red-400 normal-case tracking-normal">*</span>}
              <FieldInfoTip
                title={TRADE_COPY.config.imei1InfoTitle}
                body={TRADE_COPY.config.imei1InfoBody}
              />
            </span>
            <input
              className={fieldClass}
              value={state.imei1 ?? ''}
              onChange={(e) => {
                dispatch({ type: 'SET_IMEI_1', imei1: e.target.value });
                setIdentityError(null);
              }}
              placeholder="15-digit IMEI"
              autoComplete="off"
              inputMode="numeric"
            />
            <span className="text-[color:var(--bb-muted)]">{TRADE_COPY.config.imei1Help}</span>
          </label>

          <label className="block text-xs space-y-1">
            <span className="font-black uppercase tracking-widest text-[#CDA032] inline-flex items-center gap-1.5">
              {TRADE_COPY.config.imei2}
              <FieldInfoTip
                title={TRADE_COPY.config.imei2InfoTitle}
                body={TRADE_COPY.config.imei2InfoBody}
              />
            </span>
            <input
              className={fieldClass}
              value={state.imei2 ?? ''}
              onChange={(e) => {
                dispatch({ type: 'SET_IMEI_2', imei2: e.target.value });
                setIdentityError(null);
              }}
              placeholder="Optional second IMEI"
              autoComplete="off"
              inputMode="numeric"
            />
            <span className="text-[color:var(--bb-muted)]">{TRADE_COPY.config.imei2Help}</span>
          </label>

          <label className="block text-xs space-y-1">
            <span className="font-black uppercase tracking-widest text-[#CDA032] inline-flex items-center gap-1.5">
              {TRADE_COPY.config.serialNumber}
              {wifiOnly && <span className="text-red-400 normal-case tracking-normal">*</span>}
              <FieldInfoTip
                title={TRADE_COPY.config.serialInfoTitle}
                body={TRADE_COPY.config.serialInfoBody}
              />
            </span>
            <input
              className={fieldClass}
              value={state.serialNumber ?? ''}
              onChange={(e) => {
                dispatch({ type: 'SET_SERIAL', serialNumber: e.target.value });
                setIdentityError(null);
              }}
              placeholder="Serial number"
              autoComplete="off"
              inputMode="text"
            />
            <span className="text-[color:var(--bb-muted)]">{TRADE_COPY.config.serialHelp}</span>
          </label>

          {identityError && (
            <p className="text-sm text-red-500 font-medium" role="alert">
              {identityError}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!canContinue || submitting}
        onClick={handleContinue}
        className="w-full sm:w-auto min-w-[12rem] rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-4 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 transition-all"
      >
        {TRADE_COPY.continue}
      </button>
    </section>
  );
}
