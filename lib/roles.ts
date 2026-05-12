/**
 * Matches public.app_role and profiles.role CHECK (user | admin | staff).
 * Legacy UI / metadata may still send "customer" etc.; normalize before writes.
 */
export type CanonicalAppRole = 'user' | 'admin' | 'staff';

export function normalizeCanonicalRole(role: unknown): CanonicalAppRole {
  const r = String(role ?? 'user').trim().toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'staff') return 'staff';
  if (r === 'user' || r === 'customer' || r === 'member' || r === 'guest') return 'user';
  return 'user';
}

export function canAccessAdminDashboard(role: unknown): boolean {
  const r = normalizeCanonicalRole(role);
  return r === 'admin' || r === 'staff';
}
