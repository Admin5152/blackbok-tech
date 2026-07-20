import { normalizeTradeModelKey } from '../data/tradeInPrices';
import { lookupBaseValue, lookupDeductions } from './tradePricingStore';
import { type TradeComponentKey } from './tradeComponentKeys';
import { computeTopUpFromCredit } from './skuPrice';

export { TRADE_COMPONENT_KEYS, type TradeComponentKey } from './tradeComponentKeys';

export type TradePricingMode = 'actual_pricing' | 'matrix_estimate' | 'inspection_quote' | 'questionnaire_v2';

export interface TradeDeductionLine {
  key: TradeComponentKey;
  label: string;
  amount: number;
}

export interface TradeValuationResult {
  pricingMode: TradePricingMode;
  modelKey: string;
  storageTier: string;
  simVariant: string;
  basePurchasePrice: number;
  totalDeductionAmount: number;
  finalTradeValue: number;
  deductions: TradeDeductionLine[];
  hasKnownBasePrice: boolean;
  needsManualReview: boolean;
}

const FAULT_LABELS: Record<TradeComponentKey, string> = {
  screen: 'Screen',
  battery: 'Battery',
  backglass: 'Backglass',
  charging: 'Charging System',
  front_camera: 'Front Camera',
  back_camera: 'Back Camera',
  face_id: 'Face ID',
};

export const TRADE_COMPONENT_DEFS = [
  { key: 'screen' as TradeComponentKey, label: 'Screen', description: 'Cracks, dead pixels, touch issues, or display faults' },
  { key: 'battery' as TradeComponentKey, label: 'Battery', description: 'Battery health below threshold or poor battery life' },
  { key: 'backglass' as TradeComponentKey, label: 'Back glass', description: 'Cracked or shattered rear panel' },
  { key: 'charging' as TradeComponentKey, label: 'Charging System', description: 'Won’t charge, loose port, or intermittent power' },
  { key: 'front_camera' as TradeComponentKey, label: 'Front Camera', description: 'Blurry photos, focusing problems, or cracked lens' },
  { key: 'back_camera' as TradeComponentKey, label: 'Back Camera', description: 'Blurry photos, focusing problems, or cracked lens' },
  { key: 'face_id' as TradeComponentKey, label: 'Face ID', description: 'Biometrics not working or unreliable' },
];

export function computeTradeValuation(
  modelKey: string,
  storage: string,
  simVariant: string,
  faultyComponents: Iterable<TradeComponentKey>,
): TradeValuationResult {
  const normalizedModel = normalizeTradeModelKey(modelKey);
  const basePurchasePrice = lookupBaseValue(normalizedModel, storage, simVariant);

  if (basePurchasePrice == null || basePurchasePrice <= 0) {
    return {
      pricingMode: 'inspection_quote',
      modelKey: normalizedModel,
      storageTier: storage,
      simVariant,
      basePurchasePrice: 0,
      totalDeductionAmount: 0,
      finalTradeValue: 0,
      deductions: [],
      hasKnownBasePrice: false,
      needsManualReview: false,
    };
  }

  const modelDeductions = lookupDeductions(normalizedModel);
  const deductions: TradeDeductionLine[] = [];
  
  for (const key of faultyComponents) {
    const amount = modelDeductions.get(key) || 0;
    if (amount > 0) {
      deductions.push({
        key,
        label: FAULT_LABELS[key] || key,
        amount,
      });
    }
  }

  const totalDeductionAmount = deductions.reduce((sum, line) => sum + line.amount, 0);
  const rawFinalValue = basePurchasePrice - totalDeductionAmount;
  const finalTradeValue = Math.max(0, rawFinalValue);
  const needsManualReview = rawFinalValue <= 0;

  return {
    pricingMode: 'actual_pricing',
    modelKey: normalizedModel,
    storageTier: storage,
    simVariant,
    basePurchasePrice,
    totalDeductionAmount,
    finalTradeValue,
    deductions,
    hasKnownBasePrice: true,
    needsManualReview,
  };
}

export function formatTradePricingModeLabel(mode: TradePricingMode | null | undefined): string {
  if (!mode) return 'Unknown';
  if (mode === 'actual_pricing') return 'Actual pricing';
  if (mode === 'questionnaire_v2') return 'Questionnaire estimate';
  if (mode === 'matrix_estimate') return 'Matrix estimate (Legacy)';
  return 'Inspection quote';
}

export function computeTopUpAmount(newDevicePrice: number, finalTradeValue: number): number {
  return computeTopUpFromCredit(newDevicePrice, finalTradeValue);
}

/** Resolve catalog variant / free-text into a trade price lookup key. */
export function resolveTradeModelKey(input: {
  selectedVariant?: string;
  customModelName?: string;
  usesFreeTextModel?: boolean;
}): string {
  if (input.usesFreeTextModel && input.customModelName?.trim()) {
    return normalizeTradeModelKey(input.customModelName);
  }
  const variant = input.selectedVariant?.trim();
  if (variant && !/^other/i.test(variant)) {
    return normalizeTradeModelKey(variant);
  }
  if (input.customModelName?.trim()) return normalizeTradeModelKey(input.customModelName);
  return '';
}
