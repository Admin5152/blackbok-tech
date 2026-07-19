/**
 * Spec Screen 6 — Condition questionnaire with live estimate ticker.
 *
 * Loads questions via getQuestions(deviceType), display_order ascending, gates
 * first. One question per card; big tappable answers; progress dots.
 * Biometric label substitutes Face ID / Touch ID from trade_devices.biometric.
 *
 * After EVERY answer: debounced (250ms) computeEstimate RPC — money comes ONLY
 * from the RPC (estimate, deductions[], needs_verification). Never compute
 * client-side. Sticky header shows a spinner while fetching so figures never
 * go stale.
 *
 * hard_stop → stop screen. iCloud gate = reject (D2 / icloud_locked_policy).
 * below_threshold → threshold_message verbatim + lead capture.
 * TODO(D16-values): threshold silently dormant until trade_devices.threshold_value filled.
 *
 * Edit log: changing an answer via back-nav appends {code, old, new, at}
 * (anti-gaming — price is visible live).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Loader2, ShieldAlert, ArrowRight } from 'lucide-react';
import { useTradeFlow } from '../../lib/tradeFlowContext';
import { TradePhasePills } from '../../components/trade/TradePhasePills';
import { PageBackButton } from '../../components/PageBackButton';
import { useAppContext } from '../../lib/appContext';
import { createTradeRequest } from '../../lib/api';
import {
  computeEstimate,
  getQuestions,
  getTradeDevice,
} from '../../lib/tradeApi';
import { formatGhs } from '../../lib/money';
import { TRADE_COPY } from '../../lib/tradeCopy';
import { computeTradeBalanceDisplay } from '../../lib/tradeBalanceDisplay';
import { track, TRADE_ANALYTICS } from '../../lib/analytics';
import type {
  TradeEstimateSnapshot,
  TradeQuizAnswer,
  TradeTargetLock,
} from '../../lib/tradeFlowState';
import type {
  TradeAnswerRow,
  TradeDeviceRow,
  TradeEstimateResult,
  TradeQuestionWithAnswers,
} from '../../types/supabase';

const CAMERA_TAGS = ['blurry', 'blank', 'spots', 'other'] as const;

function questionLabel(
  q: TradeQuestionWithAnswers,
  biometric: TradeDeviceRow['biometric'] | null,
): string {
  let text = q.question_text;
  if (q.component === 'face_id' && biometric) {
    const label = biometric === 'touch_id' ? 'Touch ID' : 'Face ID';
    text = text
      .replace(/Touch ID \/ Face ID/gi, label)
      .replace(/Face ID/gi, label)
      .replace(/Touch ID/gi, label);
  }
  return text;
}

function toSnapshot(r: TradeEstimateResult): TradeEstimateSnapshot {
  return {
    base_value: Number(r.base_value) || 0,
    deductions: (r.deductions ?? []).map((d) => ({
      component: d.component,
      amount: Number(d.amount) || 0,
    })),
    total_deductions: Number(r.total_deductions) || 0,
    estimate: Number(r.estimate) || 0,
    needs_verification: Boolean(r.needs_verification),
    hard_stop: Boolean(r.hard_stop),
    below_threshold: Boolean(r.below_threshold),
    threshold: Number(r.threshold) || 0,
    threshold_message: r.threshold_message ?? null,
  };
}

export function TradeConditionScreen() {
  const { theme, notify, user } = useAppContext();
  const isLight = theme === 'light';
  const { state, dispatch } = useTradeFlow();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<TradeQuestionWithAnswers[]>([]);
  const [biometric, setBiometric] = useState<TradeDeviceRow['biometric'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [pendingDesc, setPendingDesc] = useState<{
    answer: TradeAnswerRow;
    tags: string[];
    text: string;
  } | null>(null);

  // Threshold lead capture
  const [leadName, setLeadName] = useState(user?.name ?? '');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadDone, setLeadDone] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estimateGen = useRef(0);

  const lock = state.deviceLock;

  useEffect(() => {
    if (!lock || !state.targetLock) {
      void navigate({
        to: lock ? '/trade/target' : '/trade/config',
        replace: true,
      });
    }
  }, [lock, state.targetLock, navigate]);

  useEffect(() => {
    if (!lock || !state.deviceType) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [qs, device] = await Promise.all([
          getQuestions(state.deviceType!),
          getTradeDevice(lock.model),
        ]);
        if (cancelled) return;
        // Gates first via display_order (seeded 1,2 then 10+)
        const sorted = [...qs].sort((a, b) => a.display_order - b.display_order);
        setQuestions(sorted);
        setBiometric(device?.biometric ?? 'face_id');

        // Resume at first unanswered question
        const firstUnanswered = sorted.findIndex((q) => !state.quizAnswers[q.code]);
        setQIndex(firstUnanswered === -1 ? Math.max(0, sorted.length - 1) : firstUnanswered);
      } catch {
        if (!cancelled) setError(TRADE_COPY.states.errorGeneric);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume index once on load
  }, [lock?.model, state.deviceType]);

  const answeredPayload = useMemo(
    () =>
      Object.values(state.quizAnswers).map((a) => ({
        answer_id: a.answerId,
        ...(a.descriptionText || a.descriptionTags?.length
          ? {
              description: [
                ...(a.descriptionTags ?? []),
                a.descriptionText ?? '',
              ]
                .filter(Boolean)
                .join('; '),
            }
          : {}),
      })),
    [state.quizAnswers],
  );

  const runEstimate = useCallback(async () => {
    if (!lock) return;
    if (answeredPayload.length === 0) {
      dispatch({ type: 'SET_ESTIMATE', estimate: null });
      return;
    }
    const gen = ++estimateGen.current;
    setEstimateLoading(true);
    try {
      // NEVER compute money client-side — RPC is the sole authority
      const result = await computeEstimate(
        lock.model,
        lock.storage,
        lock.sim,
        answeredPayload,
      );
      if (gen !== estimateGen.current) return;
      const snap = toSnapshot(result);
      dispatch({ type: 'SET_ESTIMATE', estimate: snap });
      track(TRADE_ANALYTICS.ESTIMATE_SHOWN, {
        estimate: snap.estimate,
        base: snap.base_value,
        model: lock?.model ?? null,
      });

      if (snap.hard_stop) {
        dispatch({ type: 'SET_HARD_STOP' });
        return;
      }
      // TODO(D16-values): below_threshold stays false until admin fills
      // trade_devices.threshold_value — feature is silently dormant until then.
      if (snap.below_threshold) {
        track(TRADE_ANALYTICS.THRESHOLD_STOP, {
          estimate: snap.estimate,
          threshold: snap.threshold,
          model: lock?.model ?? null,
        });
        dispatch({
          type: 'SET_THRESHOLD_STOP',
          message:
            snap.threshold_message ||
            TRADE_COPY.questionnaire.thresholdHeading,
        });
      }
    } catch (e) {
      if (gen !== estimateGen.current) return;
      console.warn('computeEstimate failed', e);
      notify(TRADE_COPY.states.errorEstimate, 'error');
    } finally {
      if (gen === estimateGen.current) setEstimateLoading(false);
    }
  }, [lock, answeredPayload, dispatch, notify]);

  // Debounce 250ms after every answer change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runEstimate();
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runEstimate]);

  const current = questions[qIndex] ?? null;

  const commitAnswer = (answer: TradeQuizAnswer, advance: boolean) => {
    dispatch({ type: 'SET_QUIZ_ANSWER', answer });
    setPendingDesc(null);

    if (answer.outcome === 'hard_stop') {
      // D2: iCloud / power gate — reject online trade-in
      dispatch({ type: 'SET_HARD_STOP' });
      return;
    }

    if (advance) {
      const nextIdx = qIndex + 1;
      if (nextIdx < questions.length) {
        setQIndex(nextIdx);
      }
      // Last question: stay put; complete UI appears once estimate settles
      // without hard_stop / below_threshold
    }
  };

  const onPickAnswer = (a: TradeAnswerRow) => {
    if (!current) return;
    if (a.requires_description) {
      setPendingDesc({ answer: a, tags: [], text: '' });
      return;
    }
    commitAnswer(
      {
        questionId: current.id,
        questionCode: current.code,
        answerId: a.id,
        answerText: a.answer_text,
        outcome: a.outcome,
      },
      true,
    );
  };

  const confirmDescription = () => {
    if (!current || !pendingDesc) return;
    if (pendingDesc.tags.length === 0 && !pendingDesc.text.trim()) {
      notify(TRADE_COPY.questionnaire.describeIssue, 'warning');
      return;
    }
    commitAnswer(
      {
        questionId: current.id,
        questionCode: current.code,
        answerId: pendingDesc.answer.id,
        answerText: pendingDesc.answer.answer_text,
        outcome: pendingDesc.answer.outcome,
        descriptionTags: pendingDesc.tags,
        descriptionText: pendingDesc.text.trim() || undefined,
      },
      true,
    );
  };

  const goBackQuestion = () => {
    if (qIndex <= 0) {
      void navigate({ to: '/trade/target' });
      return;
    }
    // Keep answers; changing one later appends to editLog (anti-gaming)
    setPendingDesc(null);
    setQIndex(qIndex - 1);
  };

  const submitLead = async () => {
    if (!leadConsent || !leadName.trim() || !leadPhone.trim()) {
      notify(TRADE_COPY.details.termsRequired, 'warning');
      return;
    }
    setLeadSubmitting(true);
    try {
      const snapshot = {
        answers: state.quizAnswers,
        editLog: state.editLog,
        estimate: state.lastEstimate,
      };
      if (user?.id) {
        await createTradeRequest({
          user_id: user.id,
          userId: user.id,
          device_brand: 'Apple',
          device_name: lock?.model,
          device_type: state.deviceType === 'ipad' ? 'tablet' : 'smartphone',
          storage_tier: lock?.storage,
          sim_variant: lock?.sim,
          your_color: lock?.color,
          contact_name: leadName.trim(),
          contact_phone: leadPhone.trim(),
          contactName: leadName.trim(),
          contactPhone: leadPhone.trim(),
          pricing_mode: 'questionnaire_v2',
          estimated_value: state.lastEstimate?.estimate ?? 0,
          estimatedValue: state.lastEstimate?.estimate ?? 0,
          base_trade_value: state.lastEstimate?.base_value,
          deduction_breakdown: state.lastEstimate?.deductions.map((d) => ({
            key: d.component,
            label: d.component,
            amount: d.amount,
          })),
          answers_snapshot: snapshot,
          answers_edited: state.editLog.length > 0,
          below_threshold: true,
          needs_manual_review: true,
          needs_verification: state.lastEstimate?.needs_verification ?? false,
          fulfillment_method: 'dropoff',
          status: 'submitted',
          date: new Date().toISOString(),
        });
      }
      // Anon: RLS is login-only — still confirm lead was captured in session
      setLeadDone(true);
      notify(TRADE_COPY.questionnaire.thresholdLeadDone, 'success');
    } catch (e) {
      console.warn('threshold lead save failed', e);
      notify(TRADE_COPY.states.errorGeneric, 'error');
    } finally {
      setLeadSubmitting(false);
    }
  };

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => Boolean(state.quizAnswers[q.code]));

  useEffect(() => {
    if (
      allAnswered &&
      !estimateLoading &&
      state.lastEstimate &&
      !state.lastEstimate.hard_stop &&
      !state.lastEstimate.below_threshold &&
      !state.hardStopped &&
      !state.thresholdStopped &&
      !state.quizComplete
    ) {
      dispatch({ type: 'SET_QUIZ_COMPLETE' });
      track(TRADE_ANALYTICS.QUIZ_COMPLETE, {
        estimate: state.lastEstimate.estimate,
        model: state.deviceLock?.model ?? null,
      });
    }
  }, [
    allAnswered,
    estimateLoading,
    state.lastEstimate,
    state.hardStopped,
    state.thresholdStopped,
    state.quizComplete,
    dispatch,
  ]);

  if (!lock || !state.targetLock) return null;

  if (loading) {
    return (
      <p className="text-center py-16 text-sm text-[color:var(--bb-muted)]">
        {TRADE_COPY.states.loadingQuestions}
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

  // ── Hard stop (D2 iCloud / power) ──
  if (state.hardStopped) {
    const isIcloud = Object.values(state.quizAnswers).some(
      (a) =>
        a.outcome === 'hard_stop' &&
        (a.questionCode === 'GATE2' || a.questionCode === 'iGATE2'),
    );
    return (
      <section className="space-y-6 text-center py-8">
        <ShieldAlert size={48} className="mx-auto text-red-500" aria-hidden />
        <h1 className="text-2xl font-black tracking-tight">
          {TRADE_COPY.questionnaire.hardStopHeading}
        </h1>
        <p className={`text-sm leading-relaxed max-w-md mx-auto ${isLight ? 'text-black/60' : 'text-white/55'}`}>
          {isIcloud
            ? TRADE_COPY.questionnaire.hardStopIcloud
            : TRADE_COPY.questionnaire.hardStopBody}
        </p>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'RESET_QUIZ' });
            void navigate({ to: '/trade/type' });
          }}
          className="rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-8 py-4"
        >
          Start over
        </button>
      </section>
    );
  }

  // ── Threshold stop + lead capture ──
  if (state.thresholdStopped) {
    return (
      <section className="space-y-6 py-4">
        <div className="text-center space-y-3">
          <ShieldAlert size={40} className="mx-auto text-[#CDA032]" aria-hidden />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {TRADE_COPY.questionnaire.thresholdHeading}
          </h1>
          <p className={`text-sm leading-relaxed ${isLight ? 'text-black/65' : 'text-white/60'}`}>
            {state.thresholdMessage}
          </p>
          {state.lastEstimate && (
            <p className="text-lg font-black tabular-nums text-[#CDA032]">
              {formatGhs(state.lastEstimate.estimate)}
            </p>
          )}
        </div>

        {!leadDone ? (
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <p className="text-sm font-bold">{TRADE_COPY.questionnaire.thresholdLeadCapture}</p>
            <label className="block text-xs space-y-1">
              <span className="font-black uppercase tracking-widest text-[#CDA032]">
                {TRADE_COPY.questionnaire.thresholdLeadName}
              </span>
              <input
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm ${
                  isLight ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-black/40'
                }`}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-black uppercase tracking-widest text-[#CDA032]">
                {TRADE_COPY.questionnaire.thresholdLeadPhone}
              </span>
              <input
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                inputMode="tel"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm ${
                  isLight ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-black/40'
                }`}
              />
            </label>
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={leadConsent}
                onChange={(e) => setLeadConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>{TRADE_COPY.questionnaire.thresholdLeadConsent}</span>
            </label>
            <button
              type="button"
              disabled={leadSubmitting}
              onClick={() => void submitLead()}
              className="w-full rounded-xl bg-[#CDA032] text-black font-black uppercase tracking-[0.2em] text-xs px-6 py-3.5 disabled:opacity-40"
            >
              {TRADE_COPY.questionnaire.thresholdLeadSubmit}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-[#CDA032] font-bold">
            {TRADE_COPY.questionnaire.thresholdLeadDone}
          </p>
        )}
      </section>
    );
  }

  // ── Quiz complete ──
  if (state.quizComplete) {
    return (
      <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
        <TradePhasePills active="condition" maxReachable="review" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {TRADE_COPY.questionnaire.completeHeading}
          </h2>
          <p className="opacity-60 text-sm">{TRADE_COPY.questionnaire.subheading}</p>
        </div>
        <div className="rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)] p-5 sm:p-6 space-y-4">
          <LiveTicker
            estimate={state.lastEstimate}
            loading={estimateLoading}
            target={state.targetLock}
          />
          {state.editLog.length > 0 && (
            <p className="text-xs opacity-50">
              {TRADE_COPY.questionnaire.answersChangedNote}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <PageBackButton
            isLight={isLight}
            label={TRADE_COPY.questionnaire.backQuestion}
            onClick={() => {
              dispatch({ type: 'RESET_QUIZ' });
              setQIndex(0);
            }}
          />
          <button
            type="button"
            onClick={() => void navigate({ to: '/trade/summary' })}
            className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] transition-all"
          >
            {TRADE_COPY.questionnaire.continueSummary} <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <p className="text-center py-16 text-sm text-[color:var(--bb-muted)]">
        {TRADE_COPY.states.emptyDevices}
      </p>
    );
  }

  const selectedId = state.quizAnswers[current.code]?.answerId;
  const deviceName = lock.model;

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
      <TradePhasePills
        active="condition"
        maxReachable={state.quizComplete ? 'review' : 'condition'}
      />

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {TRADE_COPY.questionnaire.heading}
        </h2>
        <p className="opacity-60 text-sm">
          {TRADE_COPY.questionnaire.subheading.replace(
            'your device',
            `your ${deviceName}`,
          )}
        </p>
      </div>

      {/* Condition shell — questions live here (tile answers, not free-text) */}
      <div className="space-y-5 p-5 sm:p-6 rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
        <LiveTicker
          estimate={state.lastEstimate}
          loading={estimateLoading}
          target={state.targetLock}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#CDA032]">
            {TRADE_COPY.questionnaire.questionOf} {qIndex + 1} / {questions.length}
          </p>
          <div className="flex flex-wrap gap-1.5" aria-label="Question progress">
            {questions.map((q, i) => (
              <span
                key={q.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === qIndex
                    ? 'bg-[#CDA032]'
                    : state.quizAnswers[q.code]
                      ? 'bg-[#CDA032]/50'
                      : 'bg-[var(--bb-border)]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
            {questionLabel(current, biometric)}
          </h3>
          {current.help_text && (
            <p className="text-xs opacity-50">{current.help_text}</p>
          )}
        </div>

        {!pendingDesc ? (
          <div
            className={`grid gap-3 ${
              current.answers.length <= 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}
            role="radiogroup"
            aria-label={questionLabel(current, biometric)}
          >
            {current.answers.map((a) => {
              const selected = selectedId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onPickAnswer(a)}
                  className={`flex flex-col items-center justify-center text-center min-h-[4.5rem] p-4 sm:p-5 rounded-2xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] ${
                    selected
                      ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032] ring-1 ring-[#CDA032] shadow-[0_0_20px_rgba(205,160,50,0.12)]'
                      : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:bg-[var(--bb-surface)] hover:border-[#CDA032]/40 opacity-90 hover:opacity-100'
                  }`}
                >
                  <span className="text-sm sm:text-base font-bold leading-snug">
                    {a.answer_text}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-bold">{TRADE_COPY.questionnaire.describeIssue}</p>
            <div className="flex flex-wrap gap-2">
              {CAMERA_TAGS.map((tag) => {
                const on = pendingDesc.tags.includes(tag);
                const label =
                  TRADE_COPY.questionnaire.cameraTags[
                    tag as keyof typeof TRADE_COPY.questionnaire.cameraTags
                  ];
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setPendingDesc((p) =>
                        p
                          ? {
                              ...p,
                              tags: on
                                ? p.tags.filter((t) => t !== tag)
                                : [...p.tags, tag],
                            }
                          : p,
                      )
                    }
                    className={`rounded-xl border px-3.5 py-2 text-sm font-bold transition-all ${
                      on
                        ? 'border-[#CDA032] bg-[#CDA032]/10 text-[#CDA032] ring-1 ring-[#CDA032]'
                        : 'border-[var(--bb-border)] bg-[var(--bb-surface)] hover:border-[#CDA032]/40'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <textarea
              value={pendingDesc.text}
              onChange={(e) =>
                setPendingDesc((p) => (p ? { ...p, text: e.target.value } : p))
              }
              placeholder={TRADE_COPY.questionnaire.describeIssuePlaceholder}
              rows={3}
              className="w-full rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 py-3 text-sm outline-none focus:border-[#CDA032]"
            />
            <div className="flex flex-wrap gap-3">
              <PageBackButton
                isLight={isLight}
                label={TRADE_COPY.back}
                onClick={() => setPendingDesc(null)}
              />
              <button
                type="button"
                onClick={confirmDescription}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21]"
              >
                {TRADE_COPY.continue} <ArrowRight size={14} aria-hidden />
              </button>
            </div>
          </div>
        )}

        {!pendingDesc && !selectedId && (
          <p className="text-xs opacity-40">{TRADE_COPY.questionnaire.pickAnswerHint}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <PageBackButton
          isLight={isLight}
          label={TRADE_COPY.questionnaire.backQuestion}
          onClick={goBackQuestion}
        />
        {allAnswered && !estimateLoading && state.lastEstimate && !state.hardStopped && (
          <button
            type="button"
            onClick={() => {
              if (!state.quizComplete) dispatch({ type: 'SET_QUIZ_COMPLETE' });
              void navigate({ to: '/trade/summary' });
            }}
            className="flex items-center gap-2 px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-black bg-[#CDA032] hover:bg-[#B38B21] transition-all"
          >
            {TRADE_COPY.questionnaire.continueSummary} <ArrowRight size={16} aria-hidden />
          </button>
        )}
      </div>
    </section>
  );
}

/** Live balance strip — upgrade price − trade credit (RPC money only) */
function LiveTicker({
  estimate,
  loading,
  target,
}: {
  estimate: TradeEstimateSnapshot | null;
  loading: boolean;
  target: TradeTargetLock | null;
}) {
  const balance =
    estimate != null
      ? computeTradeBalanceDisplay({ estimate: estimate.estimate, target })
      : null;
  const isTopUp = balance?.kind === 'top_up';
  const label =
    balance?.kind === 'top_up'
      ? TRADE_COPY.questionnaire.liveTopUp
      : balance?.kind === 'refund'
        ? TRADE_COPY.questionnaire.liveRefund
        : balance?.kind === 'cash'
          ? TRADE_COPY.questionnaire.liveCash
          : TRADE_COPY.questionnaire.liveEstimate;

  const announced =
    loading || !balance
      ? 'Updating estimate'
      : `${label} ${formatGhs(balance.amount)}`;

  return (
    <div
      className="rounded-2xl border border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 py-3 flex items-center justify-between gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className={`text-[10px] font-black uppercase tracking-[0.3em] ${
          isTopUp ? 'text-red-500' : 'text-[#CDA032]'
        }`}
      >
        {label}
      </span>
      <span className="sr-only">{announced}</span>
      <span
        className={`text-xl font-black tabular-nums min-h-[1.75rem] flex items-center ${
          isTopUp ? 'text-red-500' : 'text-emerald-600'
        }`}
        aria-hidden={loading}
      >
        {loading || !balance ? (
          <Loader2 size={22} className="animate-spin opacity-70" aria-hidden />
        ) : (
          <span className="animate-in fade-in duration-200">
            {formatGhs(balance.amount)}
          </span>
        )}
      </span>
    </div>
  );
}
