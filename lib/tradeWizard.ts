import type { TradeInCatalogDevice } from '../data/tradeInDevices';

export const TRADE_FLOW_STEPS = [
  { id: 1, label: 'Device', hint: 'iPhone or iPad' },
  { id: 2, label: 'Details', hint: 'Upgrade & condition' },
  { id: 3, label: 'Schedule', hint: 'Book drop-off' },
  { id: 4, label: 'Review', hint: 'Confirm estimate' },
];

export interface TradeDeviceLabelInput {
  usesFreeTextModel: boolean;
  customModelName: string;
  resolvedBrand: string;
  selectedBrand: string;
  selectedDevice: Pick<TradeInCatalogDevice, 'name'> | null;
  selectedVariant: string;
  variantNeedsCustomName: boolean;
}

/** Customer-facing label for the device being traded in. */
export function formatTradeDeviceDisplayLabel(input: TradeDeviceLabelInput): string {
  const {
    usesFreeTextModel,
    customModelName,
    resolvedBrand,
    selectedBrand,
    selectedDevice,
    selectedVariant,
    variantNeedsCustomName,
  } = input;

  if (usesFreeTextModel) {
    const model = customModelName.trim();
    return model ? `${resolvedBrand} ${model}` : resolvedBrand || '—';
  }
  if (!selectedDevice) return resolvedBrand || selectedBrand || '—';
  if (variantNeedsCustomName && customModelName.trim()) {
    return `${resolvedBrand} ${selectedDevice.name} — ${customModelName.trim()}`;
  }
  if (selectedVariant) {
    return `${resolvedBrand} ${selectedDevice.name} — ${selectedVariant}`;
  }
  return `${resolvedBrand} ${selectedDevice.name}`;
}

/** API `device_name` field (model line only, without brand prefix). */
export function formatTradeDeviceNameForApi(input: TradeDeviceLabelInput): string {
  const { usesFreeTextModel, customModelName, selectedDevice, selectedVariant, variantNeedsCustomName } =
    input;
  if (usesFreeTextModel) return customModelName.trim();
  if (!selectedDevice) return '';
  if (variantNeedsCustomName && customModelName.trim()) {
    return `${selectedDevice.name} — ${customModelName.trim()}`;
  }
  return `${selectedDevice.name} — ${selectedVariant}`;
}
