import { repairPricing, repairServicesMap } from '../data/repairPrices';
import { readLocalStorageJson, writeLocalStorageJson } from './localStorageJson';

export const REPAIR_MATRIX_OVERRIDES_KEY = 'bb_v4_repair_matrix_prices';
export const REPAIR_PRICING_UPDATED_EVENT = 'bb_repair_pricing_updated';

export type RepairMatrixRow = Record<string, string>;
export type RepairMatrixOverrides = Record<string, RepairMatrixRow>;

export const REPAIR_MATRIX_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type RepairMatrixKey = (typeof REPAIR_MATRIX_KEYS)[number];

function dispatchRepairPricingUpdated(): void {
  window.dispatchEvent(new CustomEvent(REPAIR_PRICING_UPDATED_EVENT));
}

export function readRepairMatrixOverrides(): RepairMatrixOverrides {
  const parsed = readLocalStorageJson<unknown>(REPAIR_MATRIX_OVERRIDES_KEY);
  if (!parsed || typeof parsed !== 'object') return {};
  const out: RepairMatrixOverrides = {};
  for (const [model, row] of Object.entries(parsed as Record<string, unknown>)) {
    if (!model.trim() || !row || typeof row !== 'object') continue;
    const cleanRow: RepairMatrixRow = {};
    for (const key of REPAIR_MATRIX_KEYS) {
      const val = (row as Record<string, unknown>)[key];
      if (val == null) continue;
      const s = String(val).trim();
      if (s) cleanRow[key] = s;
    }
    if (Object.keys(cleanRow).length > 0) out[model] = cleanRow;
  }
  return out;
}

export function persistRepairMatrixOverrides(overrides: RepairMatrixOverrides): void {
  const clean = readRepairMatrixOverrides();
  for (const [model, row] of Object.entries(overrides)) {
    if (!model.trim()) continue;
    clean[model] = { ...(clean[model] || {}), ...row };
  }
  if (Object.keys(clean).length === 0) {
    localStorage.removeItem(REPAIR_MATRIX_OVERRIDES_KEY);
  } else {
    writeLocalStorageJson(REPAIR_MATRIX_OVERRIDES_KEY, clean);
  }
  dispatchRepairPricingUpdated();
}

export function replaceRepairMatrixOverrides(overrides: RepairMatrixOverrides): void {
  if (Object.keys(overrides).length === 0) {
    localStorage.removeItem(REPAIR_MATRIX_OVERRIDES_KEY);
  } else {
    writeLocalStorageJson(REPAIR_MATRIX_OVERRIDES_KEY, overrides);
  }
  dispatchRepairPricingUpdated();
}

export function getDefaultRepairPricing(): Record<string, RepairMatrixRow> {
  return { ...(repairPricing as Record<string, RepairMatrixRow>) };
}

export function getEffectiveRepairPricing(): Record<string, RepairMatrixRow> {
  const merged: Record<string, RepairMatrixRow> = getDefaultRepairPricing();
  const overrides = readRepairMatrixOverrides();
  for (const [model, row] of Object.entries(overrides)) {
    merged[model] = { ...(merged[model] || {}), ...row };
  }
  return merged;
}

export function getEffectiveRepairRow(model: string): RepairMatrixRow | undefined {
  return getEffectiveRepairPricing()[model];
}

export function getRepairMatrixColumnLabels(): { key: RepairMatrixKey; label: string }[] {
  return REPAIR_MATRIX_KEYS.map((key) => ({
    key,
    label: repairServicesMap[key]?.label || key,
  }));
}

export function clearRepairMatrixOverrides(): void {
  localStorage.removeItem(REPAIR_MATRIX_OVERRIDES_KEY);
  dispatchRepairPricingUpdated();
}
