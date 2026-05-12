import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Return,
  ReturnStatus,
} from './useReturns';

export interface AdminReturn extends Return {
  order_display_id: string;
  user_name: string;
  user_email: string;
}

export interface UseAdminReturnsResult {
  returns: AdminReturn[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateReturn: (
    id: string,
    status: ReturnStatus,
    refund_amount?: number | null,
    admin_notes?: string | null,
  ) => Promise<AdminReturn | null>;
}

/**
 * Admin view of every return. Returns aren't FK-linked to `profiles`, so we
 * resolve order display ids and user profile info with secondary lookups
 * rather than a PostgREST embed (which would require a named relationship).
 */
export function useAdminReturns(): UseAdminReturnsResult {
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: rErr } = await supabase
        .from('returns')
        .select('*')
        .order('created_at', { ascending: false });
      if (rErr) throw rErr;

      const base = (rows ?? []) as Return[];

      const orderIds = Array.from(
        new Set(base.map((r) => r.order_id).filter((v): v is string => Boolean(v))),
      );
      const userIds = Array.from(
        new Set(base.map((r) => r.user_id).filter((v): v is string => Boolean(v))),
      );

      const orderMap = new Map<string, string>();
      const profileMap = new Map<string, { name: string; email: string }>();

      if (orderIds.length > 0) {
        const { data: orders, error: oErr } = await supabase
          .from('orders')
          .select('id, display_id')
          .in('id', orderIds);
        if (oErr) throw oErr;
        for (const o of (orders ?? []) as Array<{ id: string; display_id: string | null }>) {
          orderMap.set(o.id, o.display_id ?? '');
        }
      }

      if (userIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        if (pErr) throw pErr;
        for (const p of (profiles ?? []) as Array<{ id: string; name: string | null; email: string | null }>) {
          profileMap.set(p.id, {
            name: p.name ?? '',
            email: p.email ?? '',
          });
        }
      }

      const enriched: AdminReturn[] = base.map((r) => ({
        ...r,
        order_display_id: orderMap.get(r.order_id) ?? '',
        user_name: profileMap.get(r.user_id)?.name ?? '',
        user_email: profileMap.get(r.user_id)?.email ?? '',
      }));

      setReturns(enriched);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load returns';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateReturn = useCallback(async (
    id: string,
    status: ReturnStatus,
    refund_amount: number | null = null,
    admin_notes: string | null = null,
  ): Promise<AdminReturn | null> => {
    setError(null);
    const payload: Record<string, unknown> = { status };
    if (refund_amount !== null && refund_amount !== undefined) {
      payload.refund_amount = refund_amount;
    }
    if (admin_notes !== null && admin_notes !== undefined) {
      payload.admin_notes = admin_notes;
    }

    try {
      const { data: updated, error: upErr } = await supabase
        .from('returns')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (upErr) throw upErr;
      const row = updated as Return;

      // Merge into state, preserving the enrichment fields we already resolved.
      let mergedRef: AdminReturn | null = null;
      setReturns((prev) => prev.map((existing) => {
        if (existing.id !== id) return existing;
        const merged: AdminReturn = {
          ...existing,
          ...row,
          order_display_id: existing.order_display_id,
          user_name: existing.user_name,
          user_email: existing.user_email,
        };
        mergedRef = merged;
        return merged;
      }));
      return mergedRef;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update return';
      setError(message);
      return null;
    }
  }, []);

  return {
    returns,
    loading,
    error,
    refetch: fetchAll,
    updateReturn,
  };
}
