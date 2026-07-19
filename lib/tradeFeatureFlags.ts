/**
 * Trade-in v2 cutover flag.
 *
 * Default ON (v2 at /trade). Set VITE_TRADE_V2_ENABLED=false to rollback to
 * the legacy estimator at /trades without reverting schema (additive migrations).
 */
export function isTradeV2Enabled(): boolean {
  const raw = import.meta.env.VITE_TRADE_V2_ENABLED;
  if (raw === 'false' || raw === '0') return false;
  return true;
}
