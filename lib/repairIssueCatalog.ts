import { repairServicesMap } from '../data/repairPrices';
import { getEffectiveRepairRow } from '../lib/repairPricingStore';
import {
  type DeviceType,
  type PricingMode,
  DEVICE_TYPE,
  isAppleIphoneModel,
  parseDeviceType,
} from './repairDeviceTypes';

export type { DeviceType, PricingMode };
export { resolveRepairPricingMode, buildRepairDeviceFields, PRICING_MODE, DEVICE_TYPE } from './repairDeviceTypes';

/** Apple iPhone matrix keys (priced per model). */
export type AppleRepairIssueKey = keyof typeof repairServicesMap;

/** Diagnostic-only issues (no component prices on the form). */
export type DiagnosticRepairIssueKey =
  | 'SM_SCREEN'
  | 'SM_BATTERY'
  | 'SM_CHARGING'
  | 'SM_CAMERA_FRONT'
  | 'SM_CAMERA_REAR'
  | 'SM_SPEAKER'
  | 'SM_SOFTWARE'
  | 'SM_WATER'
  | 'SM_UNKNOWN'
  | 'TB_SCREEN'
  | 'TB_BATTERY'
  | 'TB_CHARGING'
  | 'TB_CAMERA'
  | 'TB_SPEAKER'
  | 'TB_UNKNOWN'
  | 'LP_SCREEN'
  | 'LP_KEYBOARD'
  | 'LP_BATTERY'
  | 'LP_CHARGING'
  | 'LP_TRACKPAD'
  | 'LP_HINGE'
  | 'LP_STORAGE'
  | 'LP_OVERHEATING'
  | 'LP_UNKNOWN'
  | 'GM_HDMI'
  | 'GM_CONTROLLER'
  | 'GM_DISK'
  | 'GM_POWER'
  | 'GM_OVERHEATING'
  | 'GM_UNKNOWN'
  | 'SW_SCREEN'
  | 'SW_BATTERY'
  | 'SW_CHARGING'
  | 'SW_BAND'
  | 'SW_SENSORS'
  | 'SW_UNKNOWN'
  | 'OT_UNKNOWN';

export type RepairIssueKey = AppleRepairIssueKey | DiagnosticRepairIssueKey;

export interface RepairIssueOption {
  key: RepairIssueKey;
  label: string;
  desc: string;
  /** When set, price is resolved from `repairPricing[model][pricingKey]`. */
  pricingKey?: Exclude<AppleRepairIssueKey, 'UNKNOWN'>;
}

export type RepairPricingMode = PricingMode;

export interface RepairAccessoryOption {
  id: keyof {
    charger: boolean;
    caseCover: boolean;
    cables: boolean;
    memorySim: boolean;
    stylus: boolean;
    controller: boolean;
    powerAdapter: boolean;
    band: boolean;
    other: boolean;
  };
  label: string;
}

const DIAGNOSTIC_ISSUE: RepairIssueOption = {
  key: 'SM_UNKNOWN',
  label: "I'm not sure",
  desc: 'Our technicians will run a full diagnostic to find the problem.',
};

function diag(
  key: DiagnosticRepairIssueKey,
  label: string,
  desc: string,
): RepairIssueOption {
  return { key, label, desc };
}

const SMARTPHONE_ISSUES: RepairIssueOption[] = [
  diag('SM_SCREEN', 'Screen / Display', 'Cracks, dead pixels, touch not responding, or blank display.'),
  diag('SM_BATTERY', 'Battery', 'Poor battery life, swelling, or device shutting off unexpectedly.'),
  diag('SM_CHARGING', 'Charging / Port', 'Won’t charge, loose port, or intermittent power.'),
  diag('SM_CAMERA_FRONT', 'Front Camera', 'Blurry selfies, Face unlock issues, or cracked lens.'),
  diag('SM_CAMERA_REAR', 'Rear Camera', 'Blurry photos, focusing problems, or cracked lens.'),
  diag('SM_SPEAKER', 'Speaker / Microphone', 'Muffled audio, no sound, or mic not working on calls.'),
  diag('SM_SOFTWARE', 'Software / Boot Loop', 'Stuck on logo, random restarts, or system errors.'),
  diag('SM_WATER', 'Liquid Damage', 'Exposure to water or moisture — tell us what happened in details.'),
  { ...DIAGNOSTIC_ISSUE, key: 'SM_UNKNOWN' },
];

const TABLET_ISSUES: RepairIssueOption[] = [
  diag('TB_SCREEN', 'Screen / Display', 'Cracks, touch issues, or display not working.'),
  diag('TB_BATTERY', 'Battery', 'Battery drains quickly or device won’t hold a charge.'),
  diag('TB_CHARGING', 'Charging / Port', 'Charging port or cable connection problems.'),
  diag('TB_CAMERA', 'Camera', 'Camera not focusing or image quality issues.'),
  diag('TB_SPEAKER', 'Speaker / Audio', 'No sound or distorted audio from speakers.'),
  { ...DIAGNOSTIC_ISSUE, key: 'TB_UNKNOWN', label: "I'm not sure" },
];

const LAPTOP_ISSUES: RepairIssueOption[] = [
  diag('LP_SCREEN', 'Screen / Display', 'Cracked screen, lines, flickering, or no display.'),
  diag('LP_KEYBOARD', 'Keyboard / Keys', 'Stuck keys, unresponsive keyboard, or backlight issues.'),
  diag('LP_BATTERY', 'Battery', 'Won’t hold charge or battery needs replacement.'),
  diag('LP_CHARGING', 'Charging / Power', 'Charger not detected or loose charging port.'),
  diag('LP_TRACKPAD', 'Trackpad / Touchpad', 'Cursor jumping, clicks not registering, or trackpad dead.'),
  diag('LP_HINGE', 'Hinge / Chassis', 'Loose hinge, cracked casing, or structural damage.'),
  diag('LP_STORAGE', 'Storage / SSD', 'Slow performance, failing drive, or storage upgrade.'),
  diag('LP_OVERHEATING', 'Overheating / Fan', 'Loud fan, thermal shutdowns, or heavy throttling.'),
  { ...DIAGNOSTIC_ISSUE, key: 'LP_UNKNOWN', label: "I'm not sure" },
];

const GAMING_ISSUES: RepairIssueOption[] = [
  diag('GM_HDMI', 'HDMI / Video Output', 'No signal to TV or monitor.'),
  diag('GM_CONTROLLER', 'Controller / Input', 'Stick drift, buttons not working, or pairing issues.'),
  diag('GM_DISK', 'Disc Drive', 'Won’t read discs or eject problems (where applicable).'),
  diag('GM_POWER', 'Power / Won’t Turn On', 'No power, blinking lights, or sudden shutdowns.'),
  diag('GM_OVERHEATING', 'Overheating', 'Console shuts down from heat or runs very loud.'),
  { ...DIAGNOSTIC_ISSUE, key: 'GM_UNKNOWN', label: "I'm not sure" },
];

const WATCH_ISSUES: RepairIssueOption[] = [
  diag('SW_SCREEN', 'Screen / Glass', 'Cracked glass or touch not responding.'),
  diag('SW_BATTERY', 'Battery', 'Battery life degraded or watch dying quickly.'),
  diag('SW_CHARGING', 'Charging / Dock', 'Won’t charge on dock or cable.'),
  diag('SW_BAND', 'Band / Fit', 'Band connector or strap hardware issues.'),
  diag('SW_SENSORS', 'Sensors / Health', 'Heart rate, GPS, or sensor accuracy problems.'),
  { ...DIAGNOSTIC_ISSUE, key: 'SW_UNKNOWN', label: "I'm not sure" },
];

const OTHER_ISSUES: RepairIssueOption[] = [
  { ...DIAGNOSTIC_ISSUE, key: 'OT_UNKNOWN', label: 'General diagnostic', desc: 'Describe the issue — we will quote after inspection.' },
];

const APPLE_IPHONE_ISSUES: RepairIssueOption[] = (
  Object.entries(repairServicesMap) as [AppleRepairIssueKey, (typeof repairServicesMap)[AppleRepairIssueKey]][]
).map(([key, service]) => ({
  key,
  label: service.label,
  desc: service.desc,
  pricingKey: key === 'UNKNOWN' ? undefined : key,
}));

const ALL_ISSUE_OPTIONS: RepairIssueOption[] = [
  ...APPLE_IPHONE_ISSUES,
  ...SMARTPHONE_ISSUES,
  ...TABLET_ISSUES,
  ...LAPTOP_ISSUES,
  ...GAMING_ISSUES,
  ...WATCH_ISSUES,
  ...OTHER_ISSUES,
];

const ISSUE_BY_KEY = new Map<RepairIssueKey, RepairIssueOption>(
  ALL_ISSUE_OPTIONS.map((o) => [o.key, o]),
);

export function supportsAppleComponentPricing(
  deviceType: string,
  brand: string,
  model?: string,
): boolean {
  if (brand !== 'Apple' || parseDeviceType(deviceType) !== DEVICE_TYPE.SMARTPHONE) return false;
  if (model?.trim()) return isAppleIphoneModel(model);
  return true;
}

export function getIssuesForDevice(deviceType: string, brand: string): RepairIssueOption[] {
  if (supportsAppleComponentPricing(deviceType, brand)) {
    return APPLE_IPHONE_ISSUES;
  }
  switch (deviceType) {
    case 'smartphone':
      return SMARTPHONE_ISSUES;
    case 'tablet':
      return TABLET_ISSUES;
    case 'laptop':
      return LAPTOP_ISSUES;
    case 'gaming':
      return GAMING_ISSUES;
    case 'smartwatch':
      return WATCH_ISSUES;
    default:
      return OTHER_ISSUES;
  }
}

export function isRepairIssueKey(key: string): key is RepairIssueKey {
  return ISSUE_BY_KEY.has(key as RepairIssueKey);
}

export function getIssueLabel(key: RepairIssueKey): string {
  return ISSUE_BY_KEY.get(key)?.label ?? key;
}

export function getIssueDescription(key: RepairIssueKey): string {
  return ISSUE_BY_KEY.get(key)?.desc ?? '';
}

/** Keys that require a written symptom description before continuing. */
export function issueKeysNeedDetail(keys: Iterable<RepairIssueKey>): boolean {
  for (const key of keys) {
    if (
      key === 'UNKNOWN' ||
      key === 'H' ||
      key.endsWith('_UNKNOWN') ||
      key === 'SM_WATER' ||
      key === 'SM_SOFTWARE' ||
      key === 'SM_SPEAKER' ||
      key === 'LP_OVERHEATING' ||
      key === 'GM_OVERHEATING'
    ) {
      return true;
    }
  }
  return false;
}

export function getQuickTagsForIssues(keys: Set<RepairIssueKey>): string[] {
  if (keys.has('H') || keys.has('SM_SPEAKER') || keys.has('TB_SPEAKER')) {
    return ['Microphone', 'Earpiece', 'Main Speaker', 'Crackling Sound', 'No Sound'];
  }
  if (
    keys.has('UNKNOWN') ||
    [...keys].some((k) => String(k).endsWith('_UNKNOWN'))
  ) {
    return ["Won't turn on", 'Water damage', 'Overheating', 'Software loop', 'Random shutdowns'];
  }
  if (keys.has('SM_WATER')) {
    return ['Fresh water', 'Dropped in liquid', 'Moisture in port', 'Corrosion visible'];
  }
  if (keys.has('LP_KEYBOARD')) {
    return ['Sticky keys', 'Missing key', 'Backlight out', 'Whole keyboard dead'];
  }
  return [];
}

export function getAccessoryOptions(deviceType: string): RepairAccessoryOption[] {
  switch (deviceType) {
    case 'laptop':
      return [
        { id: 'powerAdapter', label: 'Power adapter' },
        { id: 'cables', label: 'Cables' },
        { id: 'caseCover', label: 'Sleeve / case' },
        { id: 'other', label: 'Other' },
      ];
    case 'gaming':
      return [
        { id: 'controller', label: 'Controller' },
        { id: 'cables', label: 'HDMI / USB cables' },
        { id: 'powerAdapter', label: 'Power cable' },
        { id: 'other', label: 'Other' },
      ];
    case 'smartwatch':
      return [
        { id: 'charger', label: 'Charger / dock' },
        { id: 'band', label: 'Band / strap' },
        { id: 'other', label: 'Other' },
      ];
    case 'tablet':
      return [
        { id: 'charger', label: 'Charger' },
        { id: 'caseCover', label: 'Case / cover' },
        { id: 'cables', label: 'Cables' },
        { id: 'stylus', label: 'Stylus' },
        { id: 'other', label: 'Other' },
      ];
    default:
      return [
        { id: 'charger', label: 'Charger' },
        { id: 'caseCover', label: 'Case / cover' },
        { id: 'cables', label: 'Cables' },
        { id: 'other', label: 'Other' },
      ];
  }
}

export function getSerialFieldLabel(deviceType: string): string {
  switch (deviceType) {
    case 'laptop':
    case 'gaming':
      return 'Serial number';
    case 'smartwatch':
      return 'Serial / case size';
    default:
      return 'Serial / IMEI number';
  }
}

export type ApplePriceRow = Record<string, string>;

export function getAppleIssuePrice(
  model: string,
  pricingKey: Exclude<AppleRepairIssueKey, 'UNKNOWN'>,
): { display: string; amount: number } | null {
  const row = getEffectiveRepairRow(model);
  if (!row) return null;
  const costStr = row[pricingKey];
  if (!costStr || costStr === 'N/A' || costStr === 'Consult' || costStr.includes('xxxxx')) {
    return null;
  }
  const amount = parseInt(costStr.split('-')[0].replace(/\D/g, ''), 10);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    display: costStr.includes('-') ? `₵${costStr}` : `₵${amount}`,
    amount,
  };
}

export function filterAppleIssuesForModel(
  issues: RepairIssueOption[],
  model: string,
): RepairIssueOption[] {
  if (!model) return issues.filter((i) => i.key === 'UNKNOWN');
  return issues.filter((issue) => {
    if (issue.key === 'UNKNOWN' || !issue.pricingKey) return true;
    const price = getAppleIssuePrice(model, issue.pricingKey);
    return price !== null;
  });
}
