import { normalizeTradeModelKey } from '../data/tradeInPrices';
import {
  lookupTradeBasePrice,
  readTradeComponentPercentOverrides,
} from './tradePricingStore';
import { type TradeComponentKey } from './tradeComponentKeys';

export { TRADE_COMPONENT_KEYS, type TradeComponentKey } from './tradeComponentKeys';

export type TradePricingMode = 'matrix_estimate' | 'inspection_quote';

export interface TradeComponentDef {
  key: TradeComponentKey;
  label: string;
  description: string;
  /** Percent of base trade-in purchase price deducted when flagged faulty */
  deductionPercent: number;
}

export const TRADE_COMPONENT_DEFS: TradeComponentDef[] = [
  {
    key: 'battery',
    label: 'Battery',
    description: 'Battery health below threshold or poor battery life',
    deductionPercent: 10,
  },
  {
    key: 'screen',
    label: 'Screen',
    description: 'Cracks, dead pixels, touch issues, or display faults',
    deductionPercent: 15,
  },
  {
    key: 'camera',
    label: 'Camera',
    description: 'Blurry photos, focusing problems, or cracked lens',
    deductionPercent: 8,
  },
  {
    key: 'biometrics',
    label: 'Face ID / Touch ID',
    description: 'Biometrics not working or unreliable',
    deductionPercent: 10,
  },
  {
    key: 'charging_port',
    label: 'Charging port',
    description: 'Won’t charge, loose port, or intermittent power',
    deductionPercent: 7,
  },
  {
    key: 'speakers',
    label: 'Speakers',
    description: 'Muffled audio, no sound, or microphone issues',
    deductionPercent: 5,
  },
  {
    key: 'back_glass',
    label: 'Back glass',
    description: 'Cracked or shattered rear panel',
    deductionPercent: 5,
  },
  {
    key: 'buttons',
    label: 'Buttons',
    description: 'Power, volume, or home button faults',
    deductionPercent: 4,
  },
];

const COMPONENT_BY_KEY = new Map(TRADE_COMPONENT_DEFS.map((c) => [c.key, c]));

export function getTradeComponentDefs(): TradeComponentDef[] {
  const overrides = readTradeComponentPercentOverrides();
  return TRADE_COMPONENT_DEFS.map((def) => ({
    ...def,
    deductionPercent: overrides[def.key] ?? def.deductionPercent,
  }));
}

export interface TradeDeductionLine {
  key: TradeComponentKey;
  label: string;
  percent: number;
  amount: number;
}

export interface TradeValuationResult {
  pricingMode: TradePricingMode;
  modelKey: string;
  basePurchasePrice: number;
  totalDeductionPercent: number;
  totalDeductionAmount: number;
  finalTradeValue: number;
  deductions: TradeDeductionLine[];
  hasKnownBasePrice: boolean;
}

export function isTradeComponentKey(key: string): key is TradeComponentKey {
  return COMPONENT_BY_KEY.has(key as TradeComponentKey);
}

export function computeTradeValuation(
  modelKey: string,
  faultyComponents: Iterable<TradeComponentKey>,
): TradeValuationResult {
  const normalized = normalizeTradeModelKey(modelKey);
  const basePurchasePrice = lookupTradeBasePrice(normalized);
  const componentDefs = getTradeComponentDefs();
  const componentByKey = new Map(componentDefs.map((c) => [c.key, c]));

  if (basePurchasePrice == null || basePurchasePrice <= 0) {
    return {
      pricingMode: 'inspection_quote',
      modelKey: normalized,
      basePurchasePrice: 0,
      totalDeductionPercent: 0,
      totalDeductionAmount: 0,
      finalTradeValue: 0,
      deductions: [],
      hasKnownBasePrice: false,
    };
  }

  const deductions: TradeDeductionLine[] = [];
  let totalPercent = 0;

  for (const key of faultyComponents) {
    const def = componentByKey.get(key);
    if (!def) continue;
    totalPercent += def.deductionPercent;
    const amount = Math.round((basePurchasePrice * def.deductionPercent) / 100);
    deductions.push({
      key,
      label: def.label,
      percent: def.deductionPercent,
      amount,
    });
  }

  const cappedPercent = Math.min(totalPercent, 100);
  const totalDeductionAmount = Math.min(
    basePurchasePrice,
    deductions.reduce((sum, line) => sum + line.amount, 0),
  );
  const finalTradeValue = Math.max(0, basePurchasePrice - totalDeductionAmount);

  return {
    pricingMode: 'matrix_estimate',
    modelKey: normalized,
    basePurchasePrice,
    totalDeductionPercent: cappedPercent,
    totalDeductionAmount,
    finalTradeValue,
    deductions,
    hasKnownBasePrice: true,
  };
}

export function formatTradePricingModeLabel(mode: TradePricingMode | null | undefined): string {
  if (!mode) return 'Unknown';
  if (mode === 'matrix_estimate') return 'Matrix estimate';
  return 'Inspection quote';
}

export function computeTopUpAmount(newDevicePrice: number, finalTradeValue: number): number {
  const price = Number.isFinite(newDevicePrice) ? newDevicePrice : 0;
  const credit = Number.isFinite(finalTradeValue) ? finalTradeValue : 0;
  return Math.max(0, Math.round(price - credit));
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
