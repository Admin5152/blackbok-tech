import {
  buildAppleIphoneSeriesGroups,
  getAllAppleIphoneCatalogModels,
  getAppleIphoneModelsForSeries,
  getOrderedAppleIphoneSeriesKeys,
} from '../data/appleIphoneCatalog';

export {
  buildAppleIphoneSeriesGroups,
  getAllAppleIphoneCatalogModels,
  getAppleIphoneModelsForSeries,
  getOrderedAppleIphoneSeriesKeys,
};

/** True when the repair wizard uses the Apple iPhone series + matrix model picker. */
export function isAppleIphoneRepairFlow(deviceType: string, brand: string): boolean {
  return brand.trim() === 'Apple' && deviceType === 'smartphone';
}

/** Sub-step index where the user picks a specific model (after type + brand [+ series]). */
export function repairModelPickerSubStep(deviceType: string, brand: string): number {
  return isAppleIphoneRepairFlow(deviceType, brand) ? 4 : 3;
}

/** Silhouette image for iPhone series / model cards. */
export function getIphoneModelImage(modelOrSeries: string): string {
  const num = parseInt(modelOrSeries.replace(/\D/g, ''), 10) || 0;
  if (num <= 8 || /SE/i.test(modelOrSeries)) return '/iphone_classic.png';
  if (num >= 14) return '/iphone_modern.png';
  return '/iphone_notch.png';
}
