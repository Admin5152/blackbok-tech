/**
 * Display name for UI: prefer Supabase Auth user_metadata (signup form),
 * then profiles.name, then email local-part.
 */
export function resolveUserDisplayName(
  profileName: string | null | undefined,
  user: { user_metadata?: Record<string, unknown> | null; email?: string | null }
): string {
  const meta = user.user_metadata;
  if (meta && typeof meta === 'object') {
    for (const key of ['name', 'full_name', 'display_name', 'given_name']) {
      const v = meta[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  const p = typeof profileName === 'string' ? profileName.trim() : '';
  if (p) return p;
  return user.email?.split('@')[0] || 'User';
}
