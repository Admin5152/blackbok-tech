/**
 * Questionnaire editor — CRUD questions/answers per device type.
 * New active questions appear in customer quiz via getTradeQuestions (DB-driven).
 * Drag-and-drop reorder (HTML5) plus up/down controls. Deactivate when answers exist.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import {
  deactivateQuestion,
  deleteAnswer,
  deleteQuestionIfSafe,
  getAdminQuestions,
  reorderAnswers,
  reorderQuestions,
  tradeAdminErrorMessage,
  upsertAnswer,
  upsertQuestion,
} from '../../../lib/tradeAdminApi';
import {
  TRADE_ANSWER_OUTCOMES,
  type TradeAnswerOutcome,
  type TradeDeviceType,
  type TradeQuestionWithAnswers,
} from '../../../types/supabase';
import { useAppContext } from '../../../lib/appContext';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { FieldInfoTip } from '../../../components/trade/FieldInfoTip';
import {
  TRADE_GATE_TIP,
  TRADE_OUTCOME_TIP,
  componentLabel,
  outcomeLabel,
} from '../../../lib/tradeAdminCopy';

const COMPONENTS = [
  '',
  'screen',
  'battery',
  'backglass',
  'charging',
  'front_camera',
  'back_camera',
  'face_id',
  'aesthetic',
] as const;

export const TradeAdminQuestionnaire: React.FC = () => {
  const { notify } = useAppContext();
  const [deviceType, setDeviceType] = useState<TradeDeviceType>('iphone');
  const [questions, setQuestions] = useState<TradeQuestionWithAnswers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: 'question'; id: string }
    | { kind: 'answer'; id: string }
    | null
  >(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setQuestions(await getAdminQuestions(deviceType));
    } catch (e) {
      setError(tradeAdminErrorMessage(e));
      setQuestions([]);
    }
  }, [deviceType]);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const moveQuestion = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[index], next[j]] = [next[j], next[index]];
    setQuestions(next);
    setBusy(true);
    try {
      await reorderQuestions(next.map((q) => q.id));
      notify?.('Order saved.', 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const onDropQuestion = async (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = questions.findIndex((q) => q.id === dragId);
    const to = questions.findIndex((q) => q.id === targetId);
    setDragId(null);
    if (from < 0 || to < 0) return;
    const next = [...questions];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setQuestions(next);
    setBusy(true);
    try {
      await reorderQuestions(next.map((q) => q.id));
      notify?.('Order saved.', 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const addQuestion = async () => {
    const code = window.prompt('Question code (unique, e.g. screen_cracked):');
    if (!code?.trim()) return;
    const text = window.prompt('Question text shown to customer:');
    if (!text?.trim()) return;
    setBusy(true);
    try {
      await upsertQuestion({
        device_type: deviceType,
        code: code.trim(),
        question_text: text.trim(),
        display_order: questions.length + 1,
        is_active: true,
        is_gate: false,
      });
      await reload();
      notify?.('Question added — live in customer quiz when active.', 'success');
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveQuestionField = async (
    id: string,
    patch: Partial<TradeQuestionWithAnswers>,
  ) => {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    setBusy(true);
    try {
      await upsertQuestion({
        id: q.id,
        device_type: q.device_type,
        code: q.code,
        question_text: patch.question_text ?? q.question_text,
        help_text: patch.help_text !== undefined ? patch.help_text : q.help_text,
        component: patch.component !== undefined ? patch.component : q.component,
        is_gate: patch.is_gate ?? q.is_gate,
        is_active: patch.is_active ?? q.is_active,
        display_order: q.display_order,
      });
      await reload();
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeQuestion = (id: string) => {
    setPendingDelete({ kind: 'question', id });
  };

  const confirmPendingDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      if (pendingDelete.kind === 'question') {
        try {
          const result = await deleteQuestionIfSafe(pendingDelete.id);
          notify?.(
            result === 'deactivated'
              ? 'Question deactivated (answers still referenced).'
              : 'Question deleted.',
            'success',
          );
        } catch {
          await deactivateQuestion(pendingDelete.id);
          notify?.('Question deactivated.', 'success');
        }
      } else {
        await deleteAnswer(pendingDelete.id);
        notify?.('Answer deleted.', 'success');
      }
      setPendingDelete(null);
      await reload();
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addAnswer = async (questionId: string) => {
    const text = window.prompt('Answer text:');
    if (!text?.trim()) return;
    const q = questions.find((x) => x.id === questionId);
    setBusy(true);
    try {
      await upsertAnswer({
        question_id: questionId,
        answer_text: text.trim(),
        outcome: 'none',
        flag_verify: false,
        requires_description: false,
        display_order: (q?.answers.length ?? 0) + 1,
      });
      await reload();
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveAnswer = async (
    answerId: string,
    questionId: string,
    patch: {
      answer_text?: string;
      outcome?: TradeAnswerOutcome;
      flag_verify?: boolean;
      requires_description?: boolean;
    },
  ) => {
    const q = questions.find((x) => x.id === questionId);
    const a = q?.answers.find((x) => x.id === answerId);
    if (!a) return;
    setBusy(true);
    try {
      await upsertAnswer({
        id: a.id,
        question_id: questionId,
        answer_text: patch.answer_text ?? a.answer_text,
        outcome: patch.outcome ?? a.outcome,
        flag_verify: patch.flag_verify ?? a.flag_verify,
        requires_description: patch.requires_description ?? a.requires_description,
        display_order: a.display_order,
      });
      await reload();
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const moveAnswer = async (questionId: string, index: number, dir: -1 | 1) => {
    const q = questions.find((x) => x.id === questionId);
    if (!q) return;
    const j = index + dir;
    if (j < 0 || j >= q.answers.length) return;
    const next = [...q.answers];
    [next[index], next[j]] = [next[j], next[index]];
    setBusy(true);
    try {
      await reorderAnswers(next.map((a) => a.id));
      await reload();
    } catch (e) {
      notify?.(tradeAdminErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-white/30 text-sm">Loading questions…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1">
          {(['iphone', 'ipad'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDeviceType(t)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                deviceType === t ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40'
              }`}
            >
              {t === 'iphone' ? 'iPhone' : 'iPad'}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void addQuestion()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#B38B21] text-black disabled:opacity-40"
        >
          <Plus size={12} /> Add question
        </button>
      </div>

      <p className="text-[10px] text-white/40">
        Turn a question on (Active) and it appears in the customer condition quiz right away — no
        redeploy needed. Tap ⓘ next to Gate / Outcome for what each setting means.
      </p>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {questions.length === 0 && !error ? (
        <p className="text-center py-12 text-white/30 text-sm">No questions for this device type.</p>
      ) : (
        <div className="space-y-2">
          {questions.map((q, qi) => (
            <div
              key={q.id}
              draggable={!busy}
              onDragStart={() => setDragId(q.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onDropQuestion(q.id)}
              onDragEnd={() => setDragId(null)}
              className={`border rounded-xl overflow-hidden ${
                q.is_active ? 'border-white/10 bg-black/30' : 'border-white/5 bg-black/20 opacity-60'
              } ${dragId === q.id ? 'ring-1 ring-[#B38B21]/50' : ''}`}
            >
              <div className="p-3 flex flex-wrap items-start gap-2">
                <div
                  className="flex flex-col items-center gap-0.5 shrink-0 cursor-grab active:cursor-grabbing text-white/30 pt-1"
                  title="Drag to reorder"
                >
                  <GripVertical size={14} />
                  <button
                    type="button"
                    disabled={busy || qi === 0}
                    onClick={() => void moveQuestion(qi, -1)}
                    className="p-0.5 text-white/40 hover:text-white disabled:opacity-20"
                    aria-label="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={busy || qi === questions.length - 1}
                    onClick={() => void moveQuestion(qi, 1)}
                    className="p-0.5 text-white/40 hover:text-white disabled:opacity-20"
                    aria-label="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[9px] font-black uppercase text-[#B38B21]">{q.code}</span>
                    {!q.is_active && (
                      <span className="text-[8px] uppercase text-white/40">hidden</span>
                    )}
                    {q.is_gate && (
                      <span className="text-[8px] uppercase text-amber-300">must-pass</span>
                    )}
                  </div>
                  <input
                    defaultValue={q.question_text}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== q.question_text) {
                        void saveQuestionField(q.id, { question_text: e.target.value.trim() });
                      }
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
                  />
                  <input
                    defaultValue={q.help_text ?? ''}
                    placeholder="Help text (optional — shown under the question)"
                    onBlur={(e) => {
                      const next = e.target.value.trim() || null;
                      if (next !== (q.help_text ?? null)) {
                        void saveQuestionField(q.id, { help_text: next });
                      }
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white/80 text-[11px] focus:border-[#B38B21]/50 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-3 text-[10px] text-white/50">
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={q.is_gate}
                        onChange={(e) => void saveQuestionField(q.id, { is_gate: e.target.checked })}
                      />
                      Must-pass check
                      <FieldInfoTip title="Must-pass check" body={TRADE_GATE_TIP} />
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={q.is_active}
                        onChange={(e) =>
                          void saveQuestionField(q.id, { is_active: e.target.checked })
                        }
                      />
                      Shown to customers
                      <FieldInfoTip
                        title="Shown to customers"
                        body="When on, this question appears in the online trade-in quiz for this device type."
                      />
                    </label>
                    <label className="inline-flex items-center gap-1">
                      Linked part
                      <FieldInfoTip
                        title="Linked part"
                        body="Optional. Ties the question to a condition discount (screen, battery, etc.)."
                      />
                      <select
                        value={q.component ?? ''}
                        onChange={(e) =>
                          void saveQuestionField(q.id, {
                            component: e.target.value || null,
                          })
                        }
                        className="bg-black/50 border border-white/10 rounded-lg px-2 py-0.5 text-white text-[10px]"
                      >
                        {COMPONENTS.map((c) => (
                          <option key={c || 'none'} value={c}>
                            {componentLabel(c)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                    className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-white/5 text-white/50"
                  >
                    Answers ({q.answers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeQuestion(q.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                    aria-label="Remove question"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {expanded === q.id && (
                <div className="border-t border-white/10 p-3 space-y-2 bg-black/40">
                  {q.answers.map((a, ai) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap gap-2 items-start bg-white/[0.03] rounded-lg p-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={busy || ai === 0}
                          onClick={() => void moveAnswer(q.id, ai, -1)}
                          className="p-0.5 text-white/40 disabled:opacity-20"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={busy || ai === q.answers.length - 1}
                          onClick={() => void moveAnswer(q.id, ai, 1)}
                          className="p-0.5 text-white/40 disabled:opacity-20"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <input
                        defaultValue={a.answer_text}
                        onBlur={(e) => {
                          if (e.target.value.trim() !== a.answer_text) {
                            void saveAnswer(a.id, q.id, { answer_text: e.target.value.trim() });
                          }
                        }}
                        className="flex-1 min-w-[8rem] bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
                      />
                      <select
                        value={a.outcome}
                        title={TRADE_OUTCOME_TIP}
                        onChange={(e) =>
                          void saveAnswer(a.id, q.id, {
                            outcome: e.target.value as TradeAnswerOutcome,
                          })
                        }
                        className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-[10px] max-w-[12rem]"
                      >
                        {TRADE_ANSWER_OUTCOMES.map((o) => (
                          <option key={o} value={o}>
                            {outcomeLabel(o)}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex items-center gap-1 text-[9px] text-white/50">
                        <input
                          type="checkbox"
                          checked={a.flag_verify}
                          onChange={(e) =>
                            void saveAnswer(a.id, q.id, { flag_verify: e.target.checked })
                          }
                        />
                        Check in store
                      </label>
                      <label className="inline-flex items-center gap-1 text-[9px] text-white/50">
                        <input
                          type="checkbox"
                          checked={a.requires_description}
                          onChange={(e) =>
                            void saveAnswer(a.id, q.id, {
                              requires_description: e.target.checked,
                            })
                          }
                        />
                        Needs details
                      </label>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: 'answer', id: a.id })}
                        className="p-1 text-red-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => void addAnswer(q.id)}
                    className="text-[10px] font-black uppercase text-[#B38B21]"
                  >
                    + Add answer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={pendingDelete != null}
        title={
          pendingDelete?.kind === 'question' ? 'Delete question?' : 'Delete answer?'
        }
        message={
          pendingDelete?.kind === 'question'
            ? 'Remove this question? If answers are still referenced it will be deactivated instead of hard-deleted.'
            : 'Are you sure you want to delete this answer?'
        }
        requireTypedDelete={pendingDelete?.kind === 'question'}
        busy={busy}
        onCancel={() => !busy && setPendingDelete(null)}
        onConfirm={() => void confirmPendingDelete()}
      />
    </div>
  );
};
