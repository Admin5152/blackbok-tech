import type { RepairRequest } from '../types';
import type { PricingMode } from './repairDeviceTypes';

export const REPAIR_ADMIN_WORKFLOW = [
  { key: 'intake', label: 'Intake', hint: 'Assign a tech and start diagnosis' },
  { key: 'diagnose', label: 'Diagnose', hint: 'Inspect the device, then prepare a quote' },
  { key: 'quote', label: 'Quote', hint: 'Waiting for customer to approve the estimate' },
  { key: 'repair', label: 'In repair', hint: 'Fix the device, then mark ready / complete' },
  { key: 'done', label: 'Done', hint: 'Job closed — no further action needed' },
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

/** One clear next action for the repair review modal — reduces status/estimate slip. */
export function getRepairStageGuidance(input: {
  status?: string;
  pricingMode?: PricingMode | null;
  hasTechnician?: boolean;
  hasEstimate?: boolean;
}): {
  stage: RepairWorkflowStage;
  title: string;
  body: string;
  primaryAction: 'assign' | 'diagnose' | 'send_estimate' | 'await_customer' | 'complete' | 'none';
} {
  const stage = getRepairWorkflowStage(input.status);
  const db = normalizeRepairStatusKey(input.status);
  const matrix = input.pricingMode === 'apple_matrix';

  if (stage === 'done') {
    return {
      stage,
      title: db === 'rejected' ? 'Repair declined / closed' : 'Repair completed',
      body: 'No further workflow steps. Review history only.',
      primaryAction: 'none',
    };
  }

  if (stage === 'quote') {
    return {
      stage,
      title: 'Waiting on customer approval',
      body: 'Estimate is out. Do not mark In repair until the customer approves. You can call them if needed.',
      primaryAction: 'await_customer',
    };
  }

  if (stage === 'repair') {
    return {
      stage,
      title: db === 'ready' ? 'Ready for pickup / handover' : 'Repair in progress',
      body: 'Finish the work, then mark Completed when the device is returned or collected.',
      primaryAction: 'complete',
    };
  }

  if (stage === 'intake') {
    if (!input.hasTechnician) {
      return {
        stage,
        title: '1 · Assign a technician',
        body: 'Pick who will inspect this device before changing status or sending a quote.',
        primaryAction: 'assign',
      };
    }
    return {
      stage,
      title: '2 · Start diagnosis',
      body: matrix
        ? 'Confirm the customer’s selected parts after physical check, then move to Diagnosing.'
        : 'Receive the device and move to Diagnosing once inspection starts.',
      primaryAction: 'diagnose',
    };
  }

  // diagnose
  if (!input.hasEstimate) {
    return {
      stage,
      title: '3 · Enter & send estimate',
      body: matrix
        ? 'Confirm or adjust the matrix total after inspection, then send for customer approval.'
        : 'Finish inspection, enter the repair cost (GHS), then send the estimate.',
      primaryAction: 'send_estimate',
    };
  }

  return {
    stage,
    title: '3 · Send estimate to customer',
    body: 'Amount is ready. Send it so the customer can approve before repair begins.',
    primaryAction: 'send_estimate',
  };
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
  mode?: 'actual_pricing' | 'matrix_estimate' | 'inspection_quote' | 'questionnaire_v2' | null,
): string {
  if (mode === 'questionnaire_v2') {
    return 'Customer completed the v7 condition questionnaire with live RPC estimates. Review answers snapshot, verification flags, and confirm final value after inspection.';
  }
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
