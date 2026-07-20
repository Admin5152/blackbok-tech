/**
 * Trade v2 flow state — reducer + sessionStorage persistence.
 *
 * Role in flow: single source of wizard progress for Screens 1–9.
 * Persisted under `trade_v2_state` so refresh/back never lose selections.
 * Every mutation is one typed reducer action (commented below).
 *
 * Money fields (lockedBaseValue, target snapshot price) are stored for later
 * RPC / display but Screens 1–4 never show trade-in money (anti-anchoring).
 * Target effective_price IS shown on Screen 5 (shop retail price).
 */
import type { TradeDeviceType } from '../types/supabase';

export const TRADE_V2_STORAGE_KEY = 'trade_v2_state';

/** Locked device identity after Screen 4 — drives Screens 5+ */
export interface TradeDeviceLock {
  model: string;
  storage: string;
  sim: string;
  color: string;
  /** Primary IMEI (15-digit) when provided — optional */
  imei1: string | null;
  /** Secondary IMEI for dual-SIM — optional */
  imei2: string | null;
  /** Apple serial — optional */
  serialNumber: string | null;
  /**
   * Primary identity for duplicate checks / legacy column:
   * imei1 || serialNumber || imei2 (may be empty when all optional fields skipped)
   */
  imeiSerial: string;
  /**
   * Server base_value for this exact config.
   * WHY not shown yet: anti-anchoring — customers should finish the condition
   * quiz before seeing money (spec Screen 4).
   */
  lockedBaseValue: number;
}

/**
 * Target SKU snapshot after Screen 5.
 *
 * LOUD COMMENT — display-only:
 * `effectivePrice` / name / colour here are a UI snapshot for the summary
 * screen. On submit (Phase 5) the DB trigger fn_trade_snapshot_target_price
 * re-derives price and top-up from the live catalog. Never trust this number
 * for money; always pass target_variant_id and let the server recompute.
 */
export interface TradeTargetLock {
  /** null when cash trade-in only */
  productId: string | null;
  /** null when cash trade-in only — the SKU the server will re-price */
  variantId: string | null;
  productName: string | null;
  storage: string | null;
  simType: string | null;
  color: string | null;
  /** Optional RAM when the upgrade SKU matrix includes it */
  ram: string | null;
  /** DISPLAY-ONLY snapshot of v_trade_targets.effective_price — server re-derives on insert */
  effectivePrice: number | null;
  displayImage: string | null;
  /** true when customer chose cash instead of an upgrade device */
  cashOnly: boolean;
}

/** One answered question in the Screen 6 quiz */
export interface TradeQuizAnswer {
  questionId: string;
  questionCode: string;
  answerId: string;
  answerText: string;
  outcome: string;
  /** Camera issue tags when requires_description */
  descriptionTags?: string[];
  descriptionText?: string;
}

/**
 * Anti-gaming edit log — appended when the customer changes an answer via
 * back-navigation. Price is visible live, so engineers need the audit trail.
 */
export interface TradeAnswerEditEntry {
  code: string;
  old: string | null;
  new: string;
  at: string;
}

/** Server estimate snapshot — NEVER recompute money client-side */
export interface TradeEstimateSnapshot {
  base_value: number;
  deductions: Array<{ component: string; amount: number }>;
  total_deductions: number;
  estimate: number;
  needs_verification: boolean;
  hard_stop: boolean;
  below_threshold: boolean;
  threshold: number;
  threshold_message: string | null;
}

export interface TradeFlowState {
  deviceType: TradeDeviceType | null;
  /** iPhone series ('17') or iPad product_line ('pro') */
  category: string | null;
  model: string | null;
  storage: string | null;
  sim: string | null;
  color: string | null;
  /** Draft identity fields on Screen 4 before lock */
  imei1: string | null;
  imei2: string | null;
  serialNumber: string | null;
  /** @deprecated Prefer imei1/serialNumber — kept for older session snapshots */
  imeiSerial: string | null;
  /** Set only when Screen 4 is complete — null until then */
  deviceLock: TradeDeviceLock | null;
  /**
   * Target selection (Screen 5). Null until chosen.
   * cashOnly path sets targetLock with variantId=null.
   */
  targetLock: TradeTargetLock | null;
  /** Screen 6 — condition quiz answers keyed by question code */
  quizAnswers: Record<string, TradeQuizAnswer>;
  /**
   * Anti-gaming: every back-nav answer change is logged because the live
   * ticker shows price — engineers see answers_edited on the request.
   */
  editLog: TradeAnswerEditEntry[];
  /** Last successful compute_trade_estimate payload — money display ONLY from here */
  lastEstimate: TradeEstimateSnapshot | null;
  /** hard_stop gate fired (power / iCloud D2) */
  hardStopped: boolean;
  /** below_threshold from RPC — quiz halted */
  thresholdStopped: boolean;
  /** Verbatim threshold_message from RPC / trade_config */
  thresholdMessage: string | null;
  /** Quiz finished all questions without stop */
  quizComplete: boolean;
  /** Server response after submit — use THESE numbers, not client snapshots */
  submittedTrade: TradeSubmitResult | null;
}

/** Fields returned by insert — server-derived money & codes */
export interface TradeSubmitResult {
  id: string;
  displayId: string;
  expiresAt: string | null;
  topUpAmount: number | null;
  targetProductPrice: number | null;
  estimatedValue: number;
  status: string;
}

export const initialTradeFlowState: TradeFlowState = {
  deviceType: null,
  category: null,
  model: null,
  storage: null,
  sim: null,
  color: null,
  imei1: null,
  imei2: null,
  serialNumber: null,
  imeiSerial: null,
  deviceLock: null,
  targetLock: null,
  quizAnswers: {},
  editLog: [],
  lastEstimate: null,
  hardStopped: false,
  thresholdStopped: false,
  thresholdMessage: null,
  quizComplete: false,
  submittedTrade: null,
};

export type TradeFlowAction =
  /** Screen 1: pick iPhone or iPad — clears downstream selections */
  | { type: 'SET_DEVICE_TYPE'; deviceType: TradeDeviceType }
  /** Screen 2: pick series/line — clears model+config+target */
  | { type: 'SET_CATEGORY'; category: string }
  /** Screen 3: pick model — clears storage/sim/color/lock/target */
  | { type: 'SET_MODEL'; model: string }
  /** Screen 4: storage tier — clears sim/color/lock/target (SIM options depend on storage) */
  | { type: 'SET_STORAGE'; storage: string }
  /** Screen 4: SIM variant — clears color/lock/target */
  | { type: 'SET_SIM'; sim: string }
  /** Screen 4: identification colour — no price effect (D3) */
  | { type: 'SET_COLOR'; color: string }
  /** Screen 4: IMEI 1 / IMEI 2 / serial drafts */
  | { type: 'SET_IMEI_1'; imei1: string }
  | { type: 'SET_IMEI_2'; imei2: string }
  | { type: 'SET_SERIAL'; serialNumber: string }
  /** @deprecated use SET_IMEI_1 / SET_SERIAL */
  | { type: 'SET_IMEI'; imeiSerial: string }
  /**
   * Screen 4 complete: lock device config + identity fields.
   * lockedBaseValue is stored for RPC use but never displayed on this screen.
   * Clears any prior target so Screen 5 must be re-confirmed.
   */
  | { type: 'LOCK_DEVICE_CONFIG'; lock: TradeDeviceLock }
  /**
   * Screen 5: lock upgrade SKU (or cash-only).
   * Snapshot fields are DISPLAY-ONLY — server re-derives price on submit.
   */
  | { type: 'LOCK_TARGET'; lock: TradeTargetLock }
  /** Screen 5: clear target so customer can re-pick */
  | { type: 'CLEAR_TARGET' }
  /**
   * Screen 6: record / change an answer. If the question was already answered
   * with a different answerId, append to editLog (anti-gaming).
   */
  | { type: 'SET_QUIZ_ANSWER'; answer: TradeQuizAnswer }
  /** Screen 6: go back one question index (UI tracks index; state keeps answers) */
  | { type: 'CLEAR_QUIZ_FROM'; questionCode: string }
  /** Cache latest RPC estimate — display-only money source */
  | { type: 'SET_ESTIMATE'; estimate: TradeEstimateSnapshot | null }
  /** Gate hard_stop (power / iCloud D2) */
  | { type: 'SET_HARD_STOP' }
  /**
   * Threshold stop from RPC below_threshold.
   * TODO(D16-values): per-model threshold_value still pending client — feature
   * is silently dormant until admin fills trade_devices.threshold_value.
   */
  | { type: 'SET_THRESHOLD_STOP'; message: string }
  /** All questions answered without stop */
  | { type: 'SET_QUIZ_COMPLETE' }
  /** Wipe quiz only (e.g. restart condition check) */
  | { type: 'RESET_QUIZ' }
  /** After successful submit — store server-derived fields for confirmation */
  | { type: 'SET_SUBMITTED_TRADE'; result: TradeSubmitResult }
  /** Wipe wizard (e.g. start over) */
  | { type: 'RESET' }
  /** Hydrate from sessionStorage on mount */
  | { type: 'HYDRATE'; state: TradeFlowState };

/**
 * Pure reducer — one action = one intentional state change.
 * Downstream fields clear when an upstream choice changes so impossible
 * combinations (stale storage for a new model) cannot survive.
 */
export function tradeFlowReducer(
  state: TradeFlowState,
  action: TradeFlowAction,
): TradeFlowState {
  switch (action.type) {
    case 'SET_DEVICE_TYPE':
      return {
        ...initialTradeFlowState,
        deviceType: action.deviceType,
      };

    case 'SET_CATEGORY':
      return {
        ...state,
        category: action.category,
        model: null,
        storage: null,
        sim: null,
        color: null,
        imei1: null,
        imei2: null,
        serialNumber: null,
        imeiSerial: null,
        deviceLock: null,
        targetLock: null,
        quizAnswers: {},
        editLog: [],
        lastEstimate: null,
        hardStopped: false,
        thresholdStopped: false,
        thresholdMessage: null,
        quizComplete: false,
      };

    case 'SET_MODEL':
      return {
        ...state,
        model: action.model,
        storage: null,
        sim: null,
        color: null,
        imei1: null,
        imei2: null,
        serialNumber: null,
        imeiSerial: null,
        deviceLock: null,
        targetLock: null,
        quizAnswers: {},
        editLog: [],
        lastEstimate: null,
        hardStopped: false,
        thresholdStopped: false,
        thresholdMessage: null,
        quizComplete: false,
      };

    case 'SET_STORAGE':
      return {
        ...state,
        storage: action.storage,
        sim: null,
        color: null,
        deviceLock: null,
        targetLock: null,
        quizAnswers: {},
        editLog: [],
        lastEstimate: null,
        hardStopped: false,
        thresholdStopped: false,
        thresholdMessage: null,
        quizComplete: false,
      };

    case 'SET_SIM':
      return {
        ...state,
        sim: action.sim,
        color: null,
        deviceLock: null,
        targetLock: null,
        quizAnswers: {},
        editLog: [],
        lastEstimate: null,
        hardStopped: false,
        thresholdStopped: false,
        thresholdMessage: null,
        quizComplete: false,
      };

    case 'SET_COLOR':
      return {
        ...state,
        color: action.color,
        deviceLock: null,
        targetLock: null,
        quizAnswers: {},
        editLog: [],
        lastEstimate: null,
        hardStopped: false,
        thresholdStopped: false,
        thresholdMessage: null,
        quizComplete: false,
      };

    case 'SET_IMEI_1':
      return {
        ...state,
        imei1: action.imei1,
        imeiSerial: action.imei1 || state.serialNumber,
        deviceLock: null,
      };

    case 'SET_IMEI_2':
      return {
        ...state,
        imei2: action.imei2,
        deviceLock: null,
      };

    case 'SET_SERIAL':
      return {
        ...state,
        serialNumber: action.serialNumber,
        imeiSerial: state.imei1 || action.serialNumber,
        deviceLock: null,
      };

    case 'SET_IMEI':
      return {
        ...state,
        imeiSerial: action.imeiSerial,
        imei1: action.imeiSerial,
        deviceLock: null,
      };

    case 'LOCK_DEVICE_CONFIG':
      return {
        ...state,
        model: action.lock.model,
        storage: action.lock.storage,
        sim: action.lock.sim,
        color: action.lock.color,
        imei1: action.lock.imei1,
        imei2: action.lock.imei2,
        serialNumber: action.lock.serialNumber,
        imeiSerial: action.lock.imeiSerial,
        deviceLock: action.lock,
        targetLock: null,
        quizAnswers: {},
        editLog: [],
        lastEstimate: null,
        hardStopped: false,
        thresholdStopped: false,
        thresholdMessage: null,
        quizComplete: false,
      };

    case 'LOCK_TARGET':
      return {
        ...state,
        targetLock: action.lock,
        // Re-entering target clears quiz so estimate matches current path
        quizAnswers: {},
        editLog: [],
        lastEstimate: null,
        hardStopped: false,
        thresholdStopped: false,
        thresholdMessage: null,
        quizComplete: false,
      };

    case 'CLEAR_TARGET':
      return {
        ...state,
        targetLock: null,
      };

    case 'SET_QUIZ_ANSWER': {
      const prev = state.quizAnswers[action.answer.questionCode];
      const editLog =
        prev && prev.answerId !== action.answer.answerId
          ? [
              ...state.editLog,
              {
                code: action.answer.questionCode,
                old: prev.answerId,
                new: action.answer.answerId,
                at: new Date().toISOString(),
              },
            ]
          : state.editLog;
      return {
        ...state,
        quizAnswers: {
          ...state.quizAnswers,
          [action.answer.questionCode]: action.answer,
        },
        editLog,
        quizComplete: false,
      };
    }

    case 'CLEAR_QUIZ_FROM': {
      // Drop this question and any later answers when stepping back
      const next = { ...state.quizAnswers };
      delete next[action.questionCode];
      return { ...state, quizAnswers: next, quizComplete: false };
    }

    case 'SET_ESTIMATE':
      return { ...state, lastEstimate: action.estimate };

    case 'SET_HARD_STOP':
      return {
        ...state,
        hardStopped: true,
        quizComplete: false,
      };

    case 'SET_THRESHOLD_STOP':
      return {
        ...state,
        thresholdStopped: true,
        thresholdMessage: action.message,
        quizComplete: false,
      };

    case 'SET_QUIZ_COMPLETE':
      return { ...state, quizComplete: true };

    case 'RESET_QUIZ':
      return {
        ...state,
        quizAnswers: {},
        editLog: [],
        lastEstimate: null,
        hardStopped: false,
        thresholdStopped: false,
        thresholdMessage: null,
        quizComplete: false,
      };

    case 'SET_SUBMITTED_TRADE':
      return { ...state, submittedTrade: action.result };

    case 'RESET':
      return { ...initialTradeFlowState };

    case 'HYDRATE':
      return { ...initialTradeFlowState, ...action.state };

    default:
      return state;
  }
}

/** Persist to sessionStorage — silent no-op if storage is unavailable */
export function persistTradeFlowState(state: TradeFlowState): void {
  try {
    sessionStorage.setItem(TRADE_V2_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — progress lost on refresh only */
  }
}

/** Load from sessionStorage; returns null if missing or corrupt */
export function loadTradeFlowState(): TradeFlowState | null {
  try {
    const raw = sessionStorage.getItem(TRADE_V2_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TradeFlowState>;
    const merged: TradeFlowState = {
      ...initialTradeFlowState,
      ...parsed,
    };
    // Backfill new lock fields for sessions started before RAM cascade shipped
    if (merged.targetLock && merged.targetLock.ram === undefined) {
      merged.targetLock = { ...merged.targetLock, ram: null };
    }
    // Backfill IMEI 1 / 2 / serial from older single imeiSerial sessions
    if (merged.imei1 == null && merged.imeiSerial) {
      const digits = merged.imeiSerial.replace(/\D/g, '');
      if (digits.length === 15) merged.imei1 = merged.imeiSerial;
      else merged.serialNumber = merged.imeiSerial;
    }
    if (merged.deviceLock) {
      const lock = merged.deviceLock as TradeDeviceLock & { imei1?: string | null };
      if (lock.imei1 === undefined) {
        const primary = lock.imeiSerial || '';
        const digits = primary.replace(/\D/g, '');
        merged.deviceLock = {
          ...lock,
          imei1: digits.length === 15 ? primary : null,
          imei2: null,
          serialNumber: digits.length === 15 ? null : primary || null,
          imeiSerial: primary,
        };
      }
    }
    return merged;
  } catch {
    return null;
  }
}

/** Clear persisted wizard (after successful submit in later phases) */
export function clearTradeFlowState(): void {
  try {
    sessionStorage.removeItem(TRADE_V2_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** iPhone series sort: numeric DESC, XR last */
export function sortIphoneSeries(series: string[]): string[] {
  return [...series].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aNum = Number.isFinite(na);
    const bNum = Number.isFinite(nb);
    if (aNum && bNum) return nb - na;
    if (aNum) return -1;
    if (bNum) return 1;
    return a.localeCompare(b);
  });
}

/** iPad product_line display order */
const IPAD_LINE_ORDER = ['pro', 'air', 'mini', 'base'] as const;

export function sortIpadProductLines(lines: string[]): string[] {
  return [...lines].sort((a, b) => {
    const ia = IPAD_LINE_ORDER.indexOf(a as (typeof IPAD_LINE_ORDER)[number]);
    const ib = IPAD_LINE_ORDER.indexOf(b as (typeof IPAD_LINE_ORDER)[number]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

/** Storage tier display order */
const STORAGE_ORDER: Record<string, number> = {
  '64GB': 1,
  '128GB': 2,
  '256GB': 3,
  '512GB': 4,
  '1TB': 5,
  '2TB': 6,
};

export function sortStorageTiers(tiers: string[]): string[] {
  return [...tiers].sort(
    (a, b) => (STORAGE_ORDER[a] ?? 99) - (STORAGE_ORDER[b] ?? 99),
  );
}
