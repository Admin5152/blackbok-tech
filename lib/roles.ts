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

/** Admin dashboard (/admin*): admin or staff. Customers never. */
export function canAccessAdminDashboard(role: unknown): boolean {
  const r = normalizeCanonicalRole(role);
  return r === 'admin' || r === 'staff';
}

export function isAdminRole(role: unknown): boolean {
  return normalizeCanonicalRole(role) === 'admin';
}

export function isStaffRole(role: unknown): boolean {
  return normalizeCanonicalRole(role) === 'staff';
}

/** Promote/demote accounts — admin only. */
export function canManageUserRoles(role: unknown): boolean {
  return isAdminRole(role);
}

/** Shop catalog, returns, orders tooling — admin + staff. */
export function canEditStoreOps(role: unknown): boolean {
  return canAccessAdminDashboard(role);
}

/** Repair queue mutations — admin + staff (matches RLS). */
export function canEditRepairs(role: unknown): boolean {
  return canAccessAdminDashboard(role);
}

/**
 * Pick highest privilege from user_roles rows (admin > staff > user).
 * Used whenever multiple role rows may exist.
 */
export function pickHighestRole(
  rows: { role?: string | null }[] | null | undefined,
  fallback: unknown = 'user',
): CanonicalAppRole {
  const list = (rows ?? [])
    .map((r) => String(r.role ?? '').toLowerCase())
    .filter(Boolean);
  if (list.includes('admin')) return 'admin';
  if (list.includes('staff')) return 'staff';
  if (list.length > 0) return normalizeCanonicalRole(list[0]);
  return normalizeCanonicalRole(fallback);
}
