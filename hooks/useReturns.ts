import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type ReturnCondition = 'unopened' | 'opened' | 'damaged';
export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'completed';
export type RefundMethod = 'original_payment' | 'store_credit';

export interface Return {
  id: string;
  display_id: string;
  order_id: string;
  user_id: string;
  reason: string;
  condition: ReturnCondition;
  status: ReturnStatus;
  refund_method: RefundMethod | null;
  refund_amount: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitReturnData {
  order_id: string;
  reason: string;
  condition: ReturnCondition;
  refund_method: RefundMethod;
}

export interface UseReturnsResult {
  returns: Return[];
  loading: boolean;
  error: string | null;
  submitReturn: (data: SubmitReturnData) => Promise<Return | null>;
  refetch: () => Promise<void>;
}

/**
 * User-facing returns hook. Lists the signed-in user's returns and lets
 * them submit a new return request. RLS scopes both queries automatically.
 */
export function useReturns(): UseReturnsResult {
  const [returns, setReturns] = useState<Return[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setUserId(data.user?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchReturns = useCallback(async (): Promise<void> => {
    if (!userId) {
      setReturns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('returns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (fetchErr) throw fetchErr;
      setReturns((data ?? []) as Return[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load returns';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const submitReturn = useCallback(async (
    data: SubmitReturnData,
  ): Promise<Return | null> => {
    if (!userId) {
      setError('You must be signed in to submit a return.');
      return null;
    }
    setError(null);
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('returns')
        .insert({
          order_id: data.order_id,
          user_id: userId,
          reason: data.reason,
          condition: data.condition,
          refund_method: data.refund_method,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;
      const row = inserted as Return;
      setReturns((prev) => [row, ...prev]);
      return row;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit return';
      setError(message);
      return null;
    }
  }, [userId]);

  return {
    returns,
    loading,
    error,
    submitReturn,
    refetch: fetchReturns,
  };
}
