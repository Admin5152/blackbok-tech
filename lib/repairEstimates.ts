import type { RepairIssueKey } from './repairIssueCatalog';
import {
  getAppleIssuePrice,
  getIssuesForDevice,
  supportsAppleComponentPricing,
} from './repairIssueCatalog';
import { getRepairUrgencyLevel } from '../data/repairBooking';

export function getRepairIssueCost(
  key: RepairIssueKey,
  opts: {
    deviceType: string;
    brand: string;
    model: string;
    usesApplePricing: boolean;
  },
): number {
  if (!opts.usesApplePricing || !opts.model || key === 'UNKNOWN') return 0;
  const issue = getIssuesForDevice(opts.deviceType, opts.brand).find((i) => i.key === key);
  if (!issue?.pricingKey) return 0;
  return getAppleIssuePrice(opts.model, issue.pricingKey)?.amount ?? 0;
}

export function sumRepairMatrixTotal(
  issueKeys: Iterable<RepairIssueKey>,
  opts: {
    deviceType: string;
    brand: string;
    model: string;
  },
): number {
  const usesApplePricing = supportsAppleComponentPricing(
    opts.deviceType,
    opts.brand,
    opts.model,
  );
  let total = 0;
  for (const key of issueKeys) {
    total += getRepairIssueCost(key, { ...opts, usesApplePricing });
  }
  return total;
}

export function formatRepairEstimateDisplay(
  issueKeys: Iterable<RepairIssueKey>,
  opts: {
    deviceType: string;
    brand: string;
    model: string;
    urgencyId: string;
  },
): string {
  const urgencyFee = getRepairUrgencyLevel(opts.urgencyId)?.price ?? 0;
  const usesApplePricing = supportsAppleComponentPricing(
    opts.deviceType,
    opts.brand,
    opts.model,
  );

  if (!usesApplePricing) {
    return urgencyFee > 0 ? `Diagnostic + ₵${urgencyFee}` : 'Quote after diagnostic';
  }

  const base = sumRepairMatrixTotal(issueKeys, opts);
  if (base > 0) return `₵${base + urgencyFee}`;
  if (urgencyFee > 0) return `Diagnostic + ₵${urgencyFee}`;
  return 'Subject to Diagnostic';
}
