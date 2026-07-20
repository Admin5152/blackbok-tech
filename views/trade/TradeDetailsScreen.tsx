/**
 * Spec Screen 8 — Contact details, T&C, drop-off (D9), submit.
 *
 * Guests can fill the form; sign-in is required only at submit (Amazon-style).
 * Draft + returnTo restore progress after auth — including for staff accounts.
 * Submit via submitTradeRequest — render server display_id / expires_at / top_up.
 *
 * Layout mirrors Repair “Your details”: icon fields, 2-col grid, tight spacing.
 * Field errors show inline next to the input with a clear reason (not “something went wrong”).
 * IMEI / serial are confirmed at BlackBox — not collected online.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Info, Mail, MapPin, Phone, User } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { useAppContext } from '../../lib/appContext';
import { submitTradeRequest, getTradeConfigValue } from '../../lib/tradeApi';
import { saveReturnTo } from '../../lib/returnTo';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { tradeFriendlyError } from '../../lib/tradeErrors';

const AUTH_RETURN = '/trade/details';
const DETAILS_DRAFT_KEY = 'trade_v2_details_draft';

type FieldKey = 'name' | 'phone' | 'email' | 'terms';

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

/** Ghana mobile: 0XXXXXXXXX (10) or +233 / 233 with 9 subscriber digits. */
function isValidGhanaPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (/^0[2-5]\d{8}$/.test(digits)) return true;
  if (/^233[2-5]\d{8}$/.test(digits)) return true;
  return false;
}

function isValidOptionalEmail(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-[11px] font-semibold text-red-500 leading-snug" role="alert">
      {message}
    </p>
  );
}

export function TradeDetailsScreen() {
  const { theme, notify, user, authReady } = useAppContext();
  const isLight = theme === 'light';
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();
  const autoSubmitTried = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const draft = loadDraft();
  const [name, setName] = useState(draft?.name || user?.name || '');
  const [phone, setPhone] = useState(draft?.phone || user?.phone || '');
  const [email, setEmail] = useState(draft?.email || user?.email || '');
  const [terms, setTerms] = useState(draft?.terms ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [storeLocation, setStoreLocation] = useState<string>(TRADE_COPY.details.storeLocation);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

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

  useEffect(() => {
    saveDraft({ name, phone, email, terms, pendingSubmit: loadDraft()?.pendingSubmit });
  }, [name, phone, email, terms]);

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormError(null);
  };

  const validateFields = useCallback((): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!name.trim()) next.name = TRADE_COPY.details.nameRequired;
    if (!phone.trim()) next.phone = TRADE_COPY.details.phoneRequired;
    else if (!isValidGhanaPhone(phone)) next.phone = TRADE_COPY.details.phoneInvalid;
    if (!isValidOptionalEmail(email)) next.email = TRADE_COPY.details.emailInvalid;
    if (!terms) next.terms = TRADE_COPY.details.termsRequired;
    return next;
  }, [name, phone, email, terms]);

  const focusFirstError = (errs: Partial<Record<FieldKey, string>>) => {
    if (errs.name) nameRef.current?.focus();
    else if (errs.phone) phoneRef.current?.focus();
    else if (errs.email) emailRef.current?.focus();
    else if (errs.terms) termsRef.current?.focus();
  };

  const onSubmit = useCallback(async () => {
    setFormError(null);
    const errs = validateFields();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }
    if (!authReady) return;

    if (!user?.id) {
      goSignIn(navigate, notify, { name, phone, email, terms, pendingSubmit: true });
      return;
    }

    if (!state.deviceLock || !state.lastEstimate || !state.targetLock) {
      setFormError(TRADE_COPY.details.incompleteFlow);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitTradeRequest({
        userId: user.id,
        contactName: name.trim(),
        contactPhone: phone.trim(),
        contactEmail: email.trim() || undefined,
        imeiSerial: '',
        imei1: null,
        imei2: null,
        serialNumber: null,
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
      const reason = tradeFriendlyError(err);
      setFormError(reason);
      notify(reason, 'error');
      console.warn('submitTradeRequest failed', err);
    } finally {
      setSubmitting(false);
    }
  }, [
    validateFields,
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
    dispatch,
  ]);

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

  const inputBase =
    'w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm bg-[var(--bb-surface)] outline-none transition-colors';
  const inputOk = `${inputBase} border-[var(--bb-border)] focus:border-[#CDA032]/50`;
  const inputBad = `${inputBase} border-red-500/70 bg-red-500/[0.04] focus:border-red-500`;

  return (
    <section className="space-y-4 pt-1">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{TRADE_COPY.details.heading}</h1>
        <p className="opacity-60 text-sm">We’ll use this to send your final trade-in offer.</p>
      </div>

      <div
        className="flex gap-2.5 items-start px-3 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10"
        role="status"
      >
        <Info size={16} className="text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs leading-snug font-medium text-amber-950 dark:text-amber-50">
          <span className="font-black uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-200 mr-1.5">
            {TRADE_COPY.details.estimateDisclaimerTitle}
          </span>
          {TRADE_COPY.details.estimateDisclaimerBanner}
        </p>
      </div>

      {!user?.id && authReady && (
        <p className={`text-xs ${isLight ? 'text-black/50' : 'text-white/45'}`}>
          {TRADE_COPY.details.signInToContinue}
        </p>
      )}

      {formError && (
        <div
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-600 dark:text-red-300"
          role="alert"
        >
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="relative">
            <User
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                fieldErrors.name ? 'text-red-500 opacity-80' : 'opacity-40'
              }`}
              aria-hidden
            />
            <input
              ref={nameRef}
              className={fieldErrors.name ? inputBad : inputOk}
              placeholder={TRADE_COPY.details.name}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError('name');
              }}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'trade-name-error' : undefined}
            />
          </div>
          <div id="trade-name-error">
            <FieldError message={fieldErrors.name} />
          </div>
        </div>
        <div>
          <div className="relative">
            <Phone
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                fieldErrors.phone ? 'text-red-500 opacity-80' : 'opacity-40'
              }`}
              aria-hidden
            />
            <input
              ref={phoneRef}
              className={fieldErrors.phone ? inputBad : inputOk}
              placeholder={TRADE_COPY.details.phone}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError('phone');
              }}
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? 'trade-phone-error' : 'trade-phone-hint'}
            />
          </div>
          {fieldErrors.phone ? (
            <div id="trade-phone-error">
              <FieldError message={fieldErrors.phone} />
            </div>
          ) : (
            <p id="trade-phone-hint" className="mt-1 text-[10px] opacity-45">
              {TRADE_COPY.details.phoneHint}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <div className="relative">
            <Mail
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                fieldErrors.email ? 'text-red-500 opacity-80' : 'opacity-40'
              }`}
              aria-hidden
            />
            <input
              ref={emailRef}
              className={fieldErrors.email ? inputBad : inputOk}
              type="email"
              placeholder={TRADE_COPY.details.email}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'trade-email-error' : undefined}
            />
          </div>
          <div id="trade-email-error">
            <FieldError message={fieldErrors.email} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface)] px-3 py-2.5 flex gap-2.5">
        <MapPin className="text-[#CDA032] shrink-0 mt-0.5" size={18} aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest">
            {TRADE_COPY.details.dropoff}
          </p>
          <p className="text-[11px] opacity-55 mt-0.5 leading-snug">
            {TRADE_COPY.details.dropoffNote}
          </p>
          <p className="text-xs font-bold mt-1">{TRADE_COPY.details.storeName}</p>
          <p className="text-[11px] opacity-50 truncate">{storeLocation}</p>
        </div>
      </div>

      <div>
        <label
          className={`flex items-start gap-2 text-xs cursor-pointer rounded-lg px-1 py-1 ${
            fieldErrors.terms ? 'bg-red-500/[0.06] ring-1 ring-red-500/40' : ''
          }`}
        >
          <input
            ref={termsRef}
            type="checkbox"
            checked={terms}
            onChange={(e) => {
              setTerms(e.target.checked);
              clearFieldError('terms');
            }}
            className="mt-0.5"
            aria-invalid={Boolean(fieldErrors.terms)}
          />
          <span className="leading-snug opacity-80">{TRADE_COPY.details.terms}</span>
        </label>
        <FieldError message={fieldErrors.terms} />
      </div>

      <button
        type="button"
        disabled={submitting || !authReady}
        onClick={() => void onSubmit()}
        className="flex items-center justify-center gap-2 w-full sm:w-auto min-w-[12rem] rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-wider text-xs sm:text-sm px-8 py-3.5 disabled:opacity-40 hover:bg-[#B38B21] active:scale-[0.98] transition-all"
      >
        {submitting ? TRADE_COPY.details.submitting : TRADE_COPY.details.submit}
      </button>
    </section>
  );
}
