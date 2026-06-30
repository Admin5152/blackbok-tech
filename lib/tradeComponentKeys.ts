/** Trade-in condition component keys (shared by pricing store + valuation matrix). */
export const TRADE_COMPONENT_KEYS = [
  'battery',
  'screen',
  'camera',
  'biometrics',
  'charging_port',
  'speakers',
  'back_glass',
  'buttons',
] as const;

export type TradeComponentKey = (typeof TRADE_COMPONENT_KEYS)[number];
