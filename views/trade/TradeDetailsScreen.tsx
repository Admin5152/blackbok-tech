/**
 * Spec Screen 8 — Contact details, T&C, drop-off (D9), submit.
 *
 * Guests can fill the form; sign-in is required only at submit (Amazon-style).
 * Draft + returnTo restore progress after auth — including for staff accounts.
 * IMEI/serial already collected on Screen 4 — shown read-only.
 * Submit via submitTradeRequest — render server display_id / expires_at / top_up.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Info, MapPin } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { useAppContext } from '../../lib/appContext';
import { submitTradeRequest, getTradeConfigValue } from '../../lib/tradeApi';
import { saveReturnTo } from '../../lib/returnTo';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { tradeFriendlyError } from '../../lib/tradeErrors';

const AUTH_RETURN = '/trade/details';
const DETAILS_DRAFT_KEY = 'trade_v2_details_draft';

interface DetailsDraft {
  name: string;
  phone: string;
  email: string;
  terms: boolean;
  pendingSubmit?: boolean;
}

function loadDraft(): DetailsDraft | null {
  try {
    const raw = sessionStorage.getItem(DETAILS_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DetailsDraft;
  } catch {
    return null;
  }
}

function saveDraft(draft: DetailsDraft): void {
  try {
    sessionStorage.setItem(DETAILS_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

function clearDraft(): void {
  try {
    sessionStorage.removeItem(DETAILS_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function goSignIn(
  navigate: ReturnType<typeof useNavigate>,
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void,
  draft: DetailsDraft,
) {
  saveDraft({ ...draft, pendingSubmit: true });
  saveReturnTo(AUTH_RETURN);
  notify(TRADE_COPY.details.signInToContinue, 'info');
  void navigate({
    to: '/auth',
    search: { returnTo: AUTH_RETURN } as any,
  });
}

export function TradeDetailsScreen() {
  const { theme, notify, user, authReady } = useAppContext();
  const isLight = theme === 'light';
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();
  const autoSubmitTried = useRef(false);

  const draft = loadDraft();
  const [name, setName] = useState(draft?.name || user?.name || '');
  const [phone, setPhone] = useState(draft?.phone || user?.phone || '');
  const [email, setEmail] = useState(draft?.email || user?.email || '');
  const [terms, setTerms] = useState(draft?.terms ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [storeLocation, setStoreLocation] = useState<string>(TRADE_COPY.details.storeLocation);

  const imei1 = state.deviceLock?.imei1?.trim() || state.imei1?.trim() || '';
  const imei2 = state.deviceLock?.imei2?.trim() || state.imei2?.trim() || '';
  const serialNumber =
    state.deviceLock?.serialNumber?.trim() || state.serialNumber?.trim() || '';
  const imeiSerial =
    state.deviceLock?.imeiSerial?.trim() ||
    imei1 ||
    serialNumber ||
    imei2 ||
    state.imeiSerial?.trim() ||
    '';

  useEffect(() => {
    getTradeConfigValue('store_location', TRADE_COPY.details.storeLocation)
      .then(setStoreLocation)
      .catch(() => setStoreLocation(TRADE_COPY.details.storeLocation));
  }, []);

  useEffect(() => {
    if (!state.quizComplete || !state.deviceLock || !state.lastEstimate) {
      void navigate({ to: '/trade/summary', replace: true });
      return;
    }
    if (!state.targetLock) {
      void navigate({ to: '/trade/target', replace: true });
    }
  }, [
    state.quizComplete,
    state.deviceLock,
    state.lastEstimate,
    state.targetLock,
    navigate,
  ]);

  useEffect(() => {
    if (user) {
      setName((n) => n || user.name || '');
      setPhone((p) => p || user.phone || '');
      setEmail((e) => e || user.email || '');
    }
  }, [user]);

  // Persist draft as they type so refresh / auth hop keeps values
  useEffect(() => {
    saveDraft({ name, phone, email, terms, pendingSubmit: loadDraft()?.pendingSubmit });
  }, [name, phone, email, terms]);

  const onSubmit = useCallback(async () => {
    if (!name.trim() || !phone.trim()) {
      notify(TRADE_COPY.states.errorGeneric, 'warning');
      return;
    }
    if (!terms) {
      notify(TRADE_COPY.details.termsRequired, 'warning');
      return;
    }
    if (!authReady) return;

    if (!user?.id) {
      goSignIn(navigate, notify, { name, phone, email, terms, pendingSubmit: true });
      return;
    }

    if (!state.deviceLock || !state.lastEstimate || !state.targetLock) {
      notify(TRADE_COPY.states.errorGeneric, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitTradeRequest({
        userId: user.id,
        contactName: name.trim(),
        contactPhone: phone.trim(),
        contactEmail: email.trim() || undefined,
        imeiSerial,
        imei1: imei1 || null,
        imei2: imei2 || null,
        serialNumber: serialNumber || null,
        deviceLock: state.deviceLock,
        targetLock: {
          productId: state.targetLock.productId,
          variantId: state.targetLock.variantId,
          productName: state.targetLock.productName,
          color: state.targetLock.color,
          cashOnly: state.targetLock.cashOnly,
        },
        deviceType: state.deviceType ?? 'iphone',
        estimate: {
          base_value: state.lastEstimate.base_value,
          estimate: state.lastEstimate.estimate,
          deductions: state.lastEstimate.deductions,
          needs_verification: state.lastEstimate.needs_verification,
        },
        quizAnswers: state.quizAnswers,
        editLog: state.editLog,
      });
      clearDraft();
      dispatch({ type: 'SET_SUBMITTED_TRADE', result });
      void navigate({ to: '/trade/confirmation' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('DUPLICATE_IMEI') || /duplicate_imei|uq_trade_active_imei/i.test(msg)) {
        const ref = msg.includes(':') ? msg.split(':')[1] : null;
        notify(
          ref
            ? `${TRADE_COPY.details.imeiDuplicateWithRef} ${ref}.`
            : TRADE_COPY.details.imeiDuplicate,
          'error',
        );
        void navigate({ to: '/trade/config' });
      } else {
        notify(tradeFriendlyError(err), 'error');
        console.warn('submitTradeRequest failed', err);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    name,
    phone,
    email,
    terms,
    authReady,
    user?.id,
    navigate,
    notify,
    state.deviceLock,
    state.lastEstimate,
    state.targetLock,
    state.deviceType,
    state.quizAnswers,
    state.editLog,
    imeiSerial,
    dispatch,
  ]);

  // After Amazon-style sign-in: resume and auto-submit once
  useEffect(() => {
    if (!authReady || !user?.id || autoSubmitTried.current) return;
    const d = loadDraft();
    if (!d?.pendingSubmit) return;
    autoSubmitTried.current = true;
    saveDraft({ ...d, pendingSubmit: false });
    void onSubmit();
  }, [authReady, user?.id, onSubmit]);

  if (!state.deviceLock || !state.lastEstimate || !state.targetLock) {
    return (
      <p className="text-sm text-[color:var(--bb-muted)] py-12 text-center">
        {TRADE_COPY.states.loading}
      </p>
    );
  }

  const fieldClass = `w-full rounded-xl border px-3 py-2.5 text-sm ${
    isLight ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-black/40'
  }`;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
        {TRADE_COPY.details.heading}
      </h1>

      <div className="flex gap-3 items-start p-4 rounded-2xl border border-[#CDA032]/30 bg-[#CDA032]/10">
        <Info size={18} className="text-[#CDA032] shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs leading-relaxed text-[#CDA032] font-semibold">
          {TRADE_COPY.details.estimateDisclaimerBanner}
        </p>
      </div>

      {!user?.id && authReady && (
        <p className={`text-xs ${isLight ? 'text-black/50' : 'text-white/45'}`}>
          {TRADE_COPY.details.signInToContinue}
        </p>
      )}

      <div className="space-y-4">
        <label className="block text-xs space-y-1">
          <span className="font-black uppercase tracking-widest text-[#CDA032]">
            {TRADE_COPY.details.name}
          </span>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-xs space-y-1">
          <span className="font-black uppercase tracking-widest text-[#CDA032]">
            {TRADE_COPY.details.phone}
          </span>
          <input
            className={fieldClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
          <span className={isLight ? 'text-black/40' : 'text-white/35'}>
            {TRADE_COPY.details.phoneHint}
          </span>
        </label>
        <label className="block text-xs space-y-1">
          <span className="font-black uppercase tracking-widest text-[#CDA032]">
            {TRADE_COPY.details.email}
          </span>
          <input
            className={fieldClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <div className="block text-xs space-y-3">
          <span className="font-black uppercase tracking-widest text-[#CDA032]">
            Device identity
          </span>
          {(
            [
              ['IMEI 1', imei1],
              ['IMEI 2', imei2],
              ['Serial', serialNumber],
            ] as const
          )
            .filter(([, v]) => Boolean(v))
            .map(([label, value]) => (
              <div key={label}>
                <p className={`text-[10px] uppercase tracking-widest mb-1 ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                  {label}
                </p>
                <p
                  className={`rounded-xl border px-3 py-2.5 text-sm font-mono ${
                    isLight ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-black/40'
                  }`}
                >
                  {value}
                </p>
              </div>
            ))}
          {!imei1 && !imei2 && !serialNumber && (
            <p className={isLight ? 'text-black/45' : 'text-white/40'}>
              No IMEI or serial added — you can share these at drop-off, or add them now.
            </p>
          )}
          <button
            type="button"
            className={`underline text-xs ${isLight ? 'text-black/45' : 'text-white/40'}`}
            onClick={() => void navigate({ to: '/trade/config' })}
          >
            {imei1 || imei2 || serialNumber ? 'Change IMEI / serial' : 'Add IMEI / serial (optional)'}
          </button>
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 flex gap-3 ${
          isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <MapPin className="text-[#CDA032] shrink-0 mt-0.5" size={22} aria-hidden />
        <div>
          <p className="text-sm font-black uppercase tracking-widest">
            {TRADE_COPY.details.dropoff}
          </p>
          <p className={`text-xs mt-1 ${isLight ? 'text-black/50' : 'text-white/45'}`}>
            {TRADE_COPY.details.dropoffNote}
          </p>
          <p className="text-sm font-bold mt-2">{TRADE_COPY.details.storeName}</p>
          <p className={`text-xs ${isLight ? 'text-black/45' : 'text-white/40'}`}>
            {storeLocation}
          </p>
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-0.5"
        />
        <span>{TRADE_COPY.details.terms}</span>
      </label>

      <button
        type="button"
        disabled={submitting || !authReady}
        onClick={() => void onSubmit()}
        className="w-full sm:w-auto min-w-[12rem] rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-4 disabled:opacity-40"
      >
        {submitting ? TRADE_COPY.details.submitting : TRADE_COPY.details.submit}
      </button>
    </section>
  );
}
