/**
 * Thin analytics facade for trade funnel instrumentation.
 *
 * WHY one util: swap console → GA4 / Segment / PostHog later without touching screens.
 * Each event constant documents the business question it answers.
 */
export const TRADE_ANALYTICS = {
  /** Funnel: which screens drop off before estimate? */
  FLOW_STEP_VIEW: 'trade_flow_step_view',
  /** Completion rate of condition questionnaire */
  QUIZ_COMPLETE: 'trade_quiz_complete',
  /** How often online estimate hard-stops into lead lane */
  THRESHOLD_STOP: 'trade_threshold_stop',
  /** Distribution of estimate GHS values (bucket in props) */
  ESTIMATE_SHOWN: 'trade_estimate_shown',
  /** Offer accept vs decline after staff offer_made */
  OFFER_RESPONSE: 'trade_offer_response',
} as const;

export type TradeAnalyticsEvent =
  (typeof TRADE_ANALYTICS)[keyof typeof TRADE_ANALYTICS];

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Fire a named product analytics event. Never throws into UX.
 */
export function track(event: TradeAnalyticsEvent | string, props?: TrackProps): void {
  try {
    // TODO(ops): wire GA4 gtag / PostHog when measurement ID is configured
    if (import.meta.env.DEV) {
      console.info('[analytics]', event, props ?? {});
    }
    const w = window as Window & {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: unknown[];
    };
    if (typeof w.gtag === 'function') {
      w.gtag('event', event, props ?? {});
    } else if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event, ...props });
    }
  } catch {
    /* ignore */
  }
}
