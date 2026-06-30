export interface RepairTimeSlot {
  id: string;
  time: string;
  label: string;
  available: boolean;
}

export interface RepairUrgencyLevel {
  id: string;
  label: string;
  desc: string;
  price: number;
}

export const REPAIR_TIME_SLOTS: RepairTimeSlot[] = [
  { id: 'morning-1', time: '9:00 AM', label: 'Early Morning', available: true },
  { id: 'morning-2', time: '10:30 AM', label: 'Mid Morning', available: true },
  { id: 'afternoon-1', time: '12:00 PM', label: 'Noon', available: false },
  { id: 'afternoon-2', time: '2:00 PM', label: 'Early Afternoon', available: true },
  { id: 'afternoon-3', time: '3:30 PM', label: 'Mid Afternoon', available: true },
  { id: 'evening-1', time: '5:00 PM', label: 'Evening', available: true },
];

export const REPAIR_URGENCY_LEVELS: RepairUrgencyLevel[] = [
  { id: 'standard', label: 'Standard', desc: '2–3 days', price: 0 },
  { id: 'express', label: 'Express', desc: '24 hours', price: 50 },
  { id: 'emergency', label: 'Emergency', desc: 'Same day', price: 150 },
];

export function getRepairTimeSlot(id: string): RepairTimeSlot | undefined {
  return REPAIR_TIME_SLOTS.find((t) => t.id === id);
}

export function getRepairUrgencyLevel(id: string): RepairUrgencyLevel | undefined {
  return REPAIR_URGENCY_LEVELS.find((u) => u.id === id);
}

/** Trade-in booking uses the same slots as repair, excluding unavailable times. */
export const TRADE_BOOKING_TIME_SLOTS = REPAIR_TIME_SLOTS.filter((s) => s.available);

export function getTradeBookingTimeSlot(id: string): RepairTimeSlot | undefined {
  return TRADE_BOOKING_TIME_SLOTS.find((t) => t.id === id);
}
