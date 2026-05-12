/** Keys aligned with `AdminSection` nav items that receive count badges (excl. overview). */
export type AdminNavBadgeKey = 'orders' | 'customers' | 'products' | 'trades' | 'repairs' | 'users';

export type StoreNavBadgeKey = 'orders' | 'repairs' | 'trades';

const ADMIN_PREFIX = 'bb_admin_nav_seen_v1_';
const STORE_PREFIX = 'bb_store_nav_seen_v1_';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

const defaultAdminSeen = (): Record<AdminNavBadgeKey, string> => ({
  orders: new Date(0).toISOString(),
  customers: new Date(0).toISOString(),
  products: new Date(0).toISOString(),
  trades: new Date(0).toISOString(),
  repairs: new Date(0).toISOString(),
  users: new Date(0).toISOString(),
});

const defaultStoreSeen = (): Record<StoreNavBadgeKey, string> => ({
  orders: new Date(0).toISOString(),
  repairs: new Date(0).toISOString(),
  trades: new Date(0).toISOString(),
});

/** First visit to admin: treat nothing as “backlogged” — only rows created after this moment count as new. */
export function initAdminNavBaselineIfNeeded(userId: string): void {
  if (typeof localStorage === 'undefined' || !userId) return;
  const k = ADMIN_PREFIX + userId;
  if (localStorage.getItem(k)) return;
  const now = new Date().toISOString();
  const initial: Record<AdminNavBadgeKey, string> = {
    orders: now,
    customers: now,
    products: now,
    trades: now,
    repairs: now,
    users: now,
  };
  localStorage.setItem(k, JSON.stringify(initial));
}

export function getAdminNavSeen(userId: string): Record<AdminNavBadgeKey, string> {
  if (typeof localStorage === 'undefined' || !userId) return defaultAdminSeen();
  const merged = safeParse<Record<string, string>>(localStorage.getItem(ADMIN_PREFIX + userId), {});
  const base = defaultAdminSeen();
  (Object.keys(base) as AdminNavBadgeKey[]).forEach((key) => {
    if (typeof merged[key] === 'string' && merged[key]) base[key] = merged[key];
  });
  return base;
}

export function markAdminNavSectionSeen(userId: string, section: AdminNavBadgeKey): void {
  if (typeof localStorage === 'undefined' || !userId) return;
  initAdminNavBaselineIfNeeded(userId);
  const cur = getAdminNavSeen(userId);
  cur[section] = new Date().toISOString();
  localStorage.setItem(ADMIN_PREFIX + userId, JSON.stringify(cur));
}

export function initStoreNavBaselineIfNeeded(userId: string): void {
  if (typeof localStorage === 'undefined' || !userId) return;
  const k = STORE_PREFIX + userId;
  if (localStorage.getItem(k)) return;
  const now = new Date().toISOString();
  localStorage.setItem(
    k,
    JSON.stringify({ orders: now, repairs: now, trades: now } satisfies Record<StoreNavBadgeKey, string>),
  );
}

export function getStoreNavSeen(userId: string): Record<StoreNavBadgeKey, string> {
  if (typeof localStorage === 'undefined' || !userId) return defaultStoreSeen();
  const merged = safeParse<Record<string, string>>(localStorage.getItem(STORE_PREFIX + userId), {});
  const base = defaultStoreSeen();
  (Object.keys(base) as StoreNavBadgeKey[]).forEach((key) => {
    if (typeof merged[key] === 'string' && merged[key]) base[key] = merged[key];
  });
  return base;
}

export function markStoreNavSectionSeen(userId: string, section: StoreNavBadgeKey): void {
  if (typeof localStorage === 'undefined' || !userId) return;
  initStoreNavBaselineIfNeeded(userId);
  const cur = getStoreNavSeen(userId);
  cur[section] = new Date().toISOString();
  localStorage.setItem(STORE_PREFIX + userId, JSON.stringify(cur));
}

export function formatUnreadCountLabel(count: number): string | null {
  if (count < 1) return null;
  return count > 99 ? '99+' : String(count);
}
