/**
 * Repair form caches — mid-flow draft, issue list memo, prefetch.
 * Pricing matrix memo lives in repairPricingStore (invalidates on admin save).
 */
import {
  getAllAppleIphoneCatalogModels,
  getOrderedAppleIphoneSeriesKeys,
} from './repairAppleModels';
import { getEffectiveRepairPricing } from './repairPricingStore';
import { getIssuesForDevice, type RepairIssueOption } from './repairIssueCatalog';

const DRAFT_KEY = 'bb_repair_wizard_draft_v1';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const issuesMemo = new Map<string, RepairIssueOption[]>();
let warmed = false;

export type RepairWizardDraft = {
  v: 1;
  savedAt: number;
  step: number;
  subStep: number;
  issuePhase: 1 | 2 | 3;
  bookingPhase: 1 | 2 | 3;
  transitionKey: number;
  selectedSeries: string;
  selectedIssueKeys: string[];
  formData: Record<string, unknown>;
};

export function getCachedIssuesForDevice(
  deviceType: string,
  brand: string,
): RepairIssueOption[] {
  const key = `${String(deviceType).toLowerCase()}|${String(brand).trim().toLowerCase()}`;
  const hit = issuesMemo.get(key);
  if (hit) return hit;
  const value = getIssuesForDevice(deviceType, brand);
  issuesMemo.set(key, value);
  return value;
}

/** Warm Apple series/models + common issue lists on /repair mount. */
export function prefetchRepairCatalog(): void {
  if (warmed) return;
  warmed = true;
  try {
    void getOrderedAppleIphoneSeriesKeys();
    void getAllAppleIphoneCatalogModels();
    void getEffectiveRepairPricing();
    void getCachedIssuesForDevice('smartphone', 'Apple');
    void getCachedIssuesForDevice('smartphone', 'Samsung');
    void getCachedIssuesForDevice('tablet', 'Apple');
    void getCachedIssuesForDevice('laptop', 'Apple');
  } catch {
    warmed = false;
  }
}

export function invalidateRepairCatalogCache(): void {
  issuesMemo.clear();
  warmed = false;
}

export function saveRepairWizardDraft(draft: Omit<RepairWizardDraft, 'v' | 'savedAt'>): void {
  try {
    const payload: RepairWizardDraft = {
      v: 1,
      savedAt: Date.now(),
      ...draft,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function loadRepairWizardDraft(): RepairWizardDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RepairWizardDraft;
    if (parsed?.v !== 1 || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearRepairWizardDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
