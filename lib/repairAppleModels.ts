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

export function buildAppleIphoneSeriesGroups(models: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const model of models) {
    const match = model.match(/iPhone (\d+|X[sr]?|SE)/i);
    let series = match ? match[0] : 'Other iPhones';
    if (series.startsWith('iPhone X')) series = 'iPhone X Series';
    if (series.startsWith('iPhone 6')) series = 'iPhone 6 Series';
    if (!groups[series]) groups[series] = [];
    groups[series].push(model);
  }
  return groups;
}
