/** Trade-in condition component fault keys (shared by pricing store + valuation matrix). */
export const TRADE_COMPONENT_KEYS = [
  'screen',
  'battery',
  'backglass',
  'charging',
  'front_camera',
  'back_camera',
  'face_id',
] as const;

export type TradeComponentKey = (typeof TRADE_COMPONENT_KEYS)[number];

export function isTradeComponentKey(value: string): value is TradeComponentKey {
  return TRADE_COMPONENT_KEYS.includes(value as TradeComponentKey);
}
