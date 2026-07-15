import type { RepairRequest } from '../types';
import type { PricingMode } from './repairDeviceTypes';

export const REPAIR_ADMIN_WORKFLOW = [
  { key: 'intake', label: 'Intake' },
  { key: 'diagnose', label: 'Diagnose' },
  { key: 'quote', label: 'Quote' },
  { key: 'repair', label: 'In repair' },
  { key: 'done', label: 'Done' },
] as const;

export type RepairWorkflowStage = (typeof REPAIR_ADMIN_WORKFLOW)[number]['key'];

const STATUS_TO_STAGE: Record<string, RepairWorkflowStage> = {
  pending: 'intake',
  diagnosing: 'diagnose',
  estimate_sent: 'quote',
  in_repair: 'repair',
  ready: 'repair',
  completed: 'done',
  rejected: 'done',
};

export function normalizeRepairStatusKey(status?: string): string {
  const value = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (value === 'estimate sent') return 'estimate_sent';
  if (value === 'in repair') return 'in_repair';
  return value || 'pending';
}

export function getRepairWorkflowStage(status?: string): RepairWorkflowStage {
  return STATUS_TO_STAGE[normalizeRepairStatusKey(status)] ?? 'intake';
}

export function parseRepairIssueTypes(issueType?: string | null): string[] {
  if (!issueType?.trim()) return [];
  return issueType
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function repairPricingPathDescription(mode?: PricingMode | null): string {
  if (mode === 'apple_matrix') {
    return 'iPhone matrix — customer selected priced components from your repair matrix. Confirm or adjust after inspection, then send the quote.';
  }
  if (mode === 'diagnostic_quote') {
    return 'Diagnostic quote — no fixed matrix. Inspect the device, then send a manual estimate for customer approval.';
  }
  return 'Legacy request — treat as diagnostic until pricing mode is known.';
}

export function repairCustomerMatrixTotal(r: RepairRequest): number | null {
  if (r.pricing_mode !== 'apple_matrix') return null;
  const raw = r.estimated_cost;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  const legacy = parseFloat(String((r as { estimatedCost?: string }).estimatedCost || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(legacy) && legacy > 0 ? legacy : null;
}

export const TRADE_ADMIN_WORKFLOW = [
  { key: 'submit', label: 'Submitted' },
  { key: 'inspect', label: 'Inspect' },
  { key: 'offer', label: 'Offer' },
  { key: 'complete', label: 'Complete' },
] as const;

export type TradeWorkflowStage = (typeof TRADE_ADMIN_WORKFLOW)[number]['key'];

export function getTradeWorkflowStage(status?: string): TradeWorkflowStage {
  const s = String(status || '').toLowerCase();
  if (['completed', 'rejected'].includes(s)) return 'complete';
  if (['offer_made', 'awaiting_user', 'accepted'].includes(s)) return 'offer';
  if (s === 'inspecting') return 'inspect';
  return 'submit';
}

export function tradePricingPathDescription(
  mode?: 'actual_pricing' | 'matrix_estimate' | 'inspection_quote' | null,
): string {
  if (mode === 'actual_pricing') {
    return 'Customer received an exact quote (base purchase minus exact component faults). Confirm or adjust after physical inspection.';
  }
  if (mode === 'matrix_estimate') {
    return 'Customer received a component-based estimate (base purchase minus faulty parts). Confirm or adjust after physical inspection.';
  }
  if (mode === 'inspection_quote') {
    return 'Unknown model pricing — customer needs an inspection quote. Set offer after you assess the device.';
  }
  return 'Review device details and send an offer after inspection.';
}
