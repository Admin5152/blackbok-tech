/**
 * Plain-language labels & tips for Trade Admin (and related staff UI).
 * Prefer these over raw DB keys / codes so any staff member can use the tools.
 */
import type { TradeAnswerOutcome } from '../types/supabase';

/** Ordered setup chain — shown on every Trade Admin page. */
export const TRADE_ADMIN_SETUP_STEPS: Array<{
  step: number;
  label: string;
  to: string;
  tip: string;
}> = [
  {
    step: 1,
    label: 'Devices',
    to: '/admin/trade/devices',
    tip: 'List models customers can trade in',
  },
  {
    step: 2,
    label: 'Prices',
    to: '/admin/trade/pricing',
    tip: 'Starting value + condition discounts for each storage/SIM',
  },
  {
    step: 3,
    label: 'Link products',
    to: '/admin/products',
    tip: 'On each shop phone, set Matching trade-in model',
  },
  {
    step: 4,
    label: 'Upgrade phones',
    to: '/admin/trade/upgrades',
    tip: 'Which linked products customers can trade into',
  },
  {
    step: 5,
    label: 'Questions',
    to: '/admin/trade/questionnaire',
    tip: 'Condition quiz answers that change the estimate',
  },
];

export const TRADE_ADMIN_PAGE_INTRO: Record<
  string,
  { title: string; body: string; next?: string }
> = {
  queue: {
    title: 'Trade-in requests',
    body: 'Every customer submission lands here. Open one to read answers, send an offer, or mark it complete.',
    next: 'Need setup first? Use the checklist above (Devices → Prices → Link products → Upgrade phones).',
  },
  devices: {
    title: 'Devices we accept',
    body: 'Turn models on or off for the online trade-in list. The model name must match exactly what you set on Products → Matching trade-in model.',
    next: 'Next: Prices & discounts — add starting prices for each storage and SIM type.',
  },
  upgrades: {
    title: 'Upgrade phones we sell into',
    body: 'Only trade-linked shop products can be listed (Matching trade-in model must be set). Empty list = show all linked iPhone/iPad. Press Save list to publish for every staff browser.',
    next: 'If Add is locked, open Products and set Matching trade-in model first.',
  },
  pricing: {
    title: 'Prices & condition discounts',
    body: 'Starting trade-in price is per model + storage + SIM (Physical / eSIM). Customers can only pick storage/SIM combinations you price here. Condition discounts are fixed cedis off that starting price.',
    next: 'Tip: if you sell both Physical SIM and eSIM, add a price row for each — missing eSIM means no eSIM option for customers.',
  },
  thresholds: {
    title: 'Minimum trade-in values',
    body: 'If the running estimate falls below this amount, the online quiz stops. Leave a model blank to use the global minimum under Business rules (blank is not “off”).',
    next: 'Set the global fallback on Business rules if most models share one cut-off.',
  },
  config: {
    title: 'Business rules',
    body: 'Battery bands, appearance discounts, Find My / iCloud behaviour, rounding, and store location. These affect live customer quotes — change carefully.',
    next: 'Do not edit the upgrade product ID list here — use Upgrade phones instead.',
  },
  questionnaire: {
    title: 'Condition questions',
    body: 'Each answer can leave the price alone, apply a condition discount, mark for in-store check, or block the online estimate. Link answers to a part (screen, battery…) so discounts match Pricing.',
    next: 'Deduct answers need a matching Condition discount row on Prices for that part.',
  },
  aesthetics: {
    title: 'Appearance discounts',
    body: 'Per-model amounts for light wear and heavier wear. These only apply when Business rules set appearance calculation to “Set per phone model”.',
    next: 'If mode is percent/fixed globally, edit Business rules instead — this page is unused until mode is per model.',
  },
  audit: {
    title: 'Change history',
    body: 'A log of important edits staff made — who changed prices, rules, or requests.',
  },
};

/** Nav label overrides (plain English) */
export const TRADE_ADMIN_NAV_PLAIN: Record<string, string> = {
  Queue: 'Requests',
  'Tradable devices': 'Devices we accept',
  'Upgrade targets': 'Upgrade phones',
  'Pricing & deductions': 'Prices & discounts',
  Thresholds: 'Minimum values',
  Config: 'Business rules',
  Questionnaire: 'Condition questions',
  Aesthetics: 'Appearance discounts',
  Audit: 'Change history',
};

export const TRADE_ADMIN_STATUS_PLAIN: Record<string, string> = {
  submitted: 'New request',
  inspecting: 'Being inspected',
  under_review: 'Under review',
  offer_made: 'Offer sent',
  awaiting_user: 'Waiting for customer',
  accepted: 'Accepted',
  scheduled: 'Scheduled',
  completed: 'Completed',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/** Human titles for trade_config keys */
export const TRADE_CONFIG_KEY_LABELS: Record<string, { label: string; tip: string }> = {
  battery_healthy_min: {
    label: 'Healthy battery minimum %',
    tip: 'Battery health at or above this % is treated as fine (no battery discount).',
  },
  battery_half_min: {
    label: 'Half-discount battery %',
    tip: 'Between this % and the healthy minimum, apply a smaller battery discount.',
  },
  battery_replaced_policy: {
    label: 'If battery was replaced',
    tip: 'What happens when the customer says the battery was replaced.',
  },
  camera_replaced_policy: {
    label: 'If camera was replaced',
    tip: 'What happens when the customer says a camera was replaced.',
  },
  icloud_locked_policy: {
    label: 'If Find My / iCloud is still on',
    tip: 'Block the online trade-in, or treat it like screen damage, until the device is unlocked.',
  },
  rounding_ghs: {
    label: 'Round estimates to (GHS)',
    tip: 'Final estimate amounts are rounded to this cedis step (for example 10 or 50).',
  },
  threshold_mode: {
    label: 'Global minimum — mode',
    tip: 'Fallback when a model has no per-model minimum. Fixed amount or percent of starting price.',
  },
  threshold_value: {
    label: 'Global minimum — value',
    tip: 'Used with the mode above when a model has no its own minimum value.',
  },
  threshold_message: {
    label: 'Message when value is too low',
    tip: 'Shown to the customer if their estimate falls below the minimum.',
  },
  aesthetic_a1_mode: {
    label: 'Light wear — how to calculate',
    tip: 'Percent of starting price, fixed cedis, or different amount per model.',
  },
  aesthetic_a1_value: {
    label: 'Light wear — amount',
    tip: 'Discount for light scratches / wear when mode is percent or fixed.',
  },
  aesthetic_a2_mode: {
    label: 'Heavier wear — how to calculate',
    tip: 'Percent of starting price, fixed cedis, or different amount per model.',
  },
  aesthetic_a2_value: {
    label: 'Heavier wear — amount',
    tip: 'Discount for more visible wear when mode is percent or fixed.',
  },
  estimate_validity_days: {
    label: 'Estimate valid for (days)',
    tip: 'How long a submitted online estimate stays open before it expires.',
  },
  offer_sla_hours: {
    label: 'Offer response target (hours)',
    tip: 'Internal target for how quickly staff should send an offer.',
  },
  store_location: {
    label: 'Drop-off store location',
    tip: 'Address or landmark shown to customers for bringing the device in.',
  },
  notification_channel: {
    label: 'Customer notification channel',
    tip: 'Preferred way to notify customers about offer updates.',
  },
  upgrade_target_product_ids: {
    label: 'Upgrade product list (advanced)',
    tip: 'Usually managed on the Upgrade phones page — do not edit by hand unless you know the product IDs.',
  },
};

export const TRADE_CONFIG_VALUE_LABELS: Record<string, string> = {
  full: 'Full discount',
  half_if_85: 'Half discount if under 85%',
  none_if_90: 'No discount if 90% or higher',
  full_verify: 'Full discount + check in store',
  none_if_working: 'No discount if it still works',
  hard_stop: 'Block online trade-in',
  screen_deduction: 'Treat like screen damage',
  percent: 'Percent of starting price',
  fixed: 'Fixed cedis amount',
  per_model: 'Set per phone model',
  in_app: 'In the app',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
};

export const TRADE_OUTCOME_LABELS: Record<TradeAnswerOutcome | string, string> = {
  none: 'No change to price',
  deduct_full: 'Full condition discount',
  deduct_half: 'Half condition discount',
  deduct_quarter: 'Quarter condition discount',
  aesthetic_a1: 'Apply light-wear discount',
  aesthetic_a2: 'Apply heavier-wear discount',
  battery_replaced_policy: 'Use battery-replaced rule',
  camera_replaced_policy: 'Use camera-replaced rule',
  hard_stop: 'Block online trade-in',
};

export const TRADE_OUTCOME_TIP =
  'What this answer does to the live estimate. “Block online trade-in” stops the quiz (for example Find My still on).';

export const TRADE_GATE_TIP =
  'Must-pass questions are critical checks (power on, Find My off). A failing answer can stop the online estimate.';

export const TRADE_COMPONENT_LABELS: Record<string, string> = {
  '': 'Not linked to a part',
  screen: 'Screen',
  battery: 'Battery',
  backglass: 'Back glass',
  charging: 'Charging port',
  front_camera: 'Front camera',
  back_camera: 'Back camera',
  face_id: 'Face ID / Touch ID',
  aesthetic: 'Appearance / wear',
};

export function configKeyLabel(key: string): string {
  return TRADE_CONFIG_KEY_LABELS[key]?.label ?? key.replace(/_/g, ' ');
}

export function configKeyTip(key: string): string {
  return (
    TRADE_CONFIG_KEY_LABELS[key]?.tip ??
    'Business rule used by the trade-in estimate. Ask a manager before changing unfamiliar settings.'
  );
}

export function configValueLabel(value: string): string {
  return TRADE_CONFIG_VALUE_LABELS[value] ?? value;
}

export function outcomeLabel(outcome: string): string {
  return TRADE_OUTCOME_LABELS[outcome] ?? outcome.replace(/_/g, ' ');
}

export function componentLabel(code: string): string {
  return TRADE_COMPONENT_LABELS[code] ?? code.replace(/_/g, ' ');
}
