import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminRepair {
  id: string;
  display_id: string | null;
  user_id: string | null;
  device_brand: string | null;
  device_model: string | null;
  issue_type: string | null;
  issue_description: string | null;
  status: string;
  assigned_technician: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  technician_notes: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  user_id: string;
  name: string | null;
  email: string | null;
}

export interface UseAdminRepairsResult {
  repairs: AdminRepair[];
  technicians: Technician[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  assignTechnician: (
    repairId: string,
    technicianId: string | null,
  ) => Promise<AdminRepair | null>;
  updateRepair: (
    id: string,
    updates: Partial<AdminRepair>,
  ) => Promise<AdminRepair | null>;
}

function normalizeRepair(row: Record<string, unknown>): AdminRepair {
  const numberOrNull = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  return {
    id: String(row.id ?? ''),
    display_id: (row.display_id as string | null | undefined) ?? null,
    user_id: (row.user_id as string | null | undefined) ?? null,
    device_brand: (row.device_brand as string | null | undefined) ?? null,
    device_model: (row.device_model as string | null | undefined) ?? null,
    issue_type: (row.issue_type as string | null | undefined) ?? null,
    issue_description: (row.issue_description as string | null | undefined) ?? null,
    status: String(row.status ?? ''),
    assigned_technician: (row.assigned_technician as string | null | undefined) ?? null,
    estimated_cost: numberOrNull(row.estimated_cost),
    final_cost: numberOrNull(row.final_cost),
    technician_notes: (row.technician_notes as string | null | undefined) ?? null,
    admin_note: (row.admin_note as string | null | undefined) ?? null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

/**
 * Admin-side repair list + technician roster. The roster query joins
 * `user_roles` with `profiles` in two steps to avoid relying on a
 * specific FK constraint name in PostgREST.
 */
export function useAdminRepairs(): UseAdminRepairsResult {
  const [repairs, setRepairs] = useState<AdminRepair[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [repairsRes, rolesRes] = await Promise.all([
        supabase
          .from('repair_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['admin', 'staff']),
      ]);

      if (repairsRes.error) throw repairsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const repairsList = ((repairsRes.data ?? []) as Array<Record<string, unknown>>)
        .map(normalizeRepair);

      const techIds = Array.from(
        new Set(
          ((rolesRes.data ?? []) as Array<{ user_id: string | null }>)
            .map((r) => r.user_id)
            .filter((v): v is string => Boolean(v)),
        ),
      );

      const techList: Technician[] = [];
      if (techIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', techIds);
        if (pErr) throw pErr;

        const profileMap = new Map<string, { name: string | null; email: string | null }>();
        for (const p of (profiles ?? []) as Array<{ id: string; name: string | null; email: string | null }>) {
          profileMap.set(p.id, { name: p.name ?? null, email: p.email ?? null });
        }

        // Preserve every technician, even ones missing a profile row.
        for (const id of techIds) {
          const profile = profileMap.get(id);
          techList.push({
            user_id: id,
            name: profile?.name ?? null,
            email: profile?.email ?? null,
          });
        }
      }

      setRepairs(repairsList);
      setTechnicians(techList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load repairs';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const assignTechnician = useCallback(async (
    repairId: string,
    technicianId: string | null,
  ): Promise<AdminRepair | null> => {
    setError(null);
    try {
      const { data, error: upErr } = await supabase
        .from('repair_requests')
        .update({ assigned_technician: technicianId })
        .eq('id', repairId)
        .select()
        .single();
      if (upErr) throw upErr;
      const fresh = normalizeRepair(data as Record<string, unknown>);

      let mergedRef: AdminRepair | null = null;
      setRepairs((prev) => prev.map((existing) => {
        if (existing.id !== repairId) return existing;
        const merged: AdminRepair = { ...existing, ...fresh };
        mergedRef = merged;
        return merged;
      }));
      return mergedRef ?? fresh;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign technician';
      setError(message);
      return null;
    }
  }, []);

  const updateRepair = useCallback(async (
    id: string,
    updates: Partial<AdminRepair>,
  ): Promise<AdminRepair | null> => {
    setError(null);
    // Never send synthetic / read-only fields back to the DB.
    const payload: Record<string, unknown> = { ...updates };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    try {
      const { data, error: upErr } = await supabase
        .from('repair_requests')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (upErr) throw upErr;
      const fresh = normalizeRepair(data as Record<string, unknown>);

      let mergedRef: AdminRepair | null = null;
      setRepairs((prev) => prev.map((existing) => {
        if (existing.id !== id) return existing;
        const merged: AdminRepair = { ...existing, ...fresh };
        mergedRef = merged;
        return merged;
      }));
      return mergedRef ?? fresh;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update repair';
      setError(message);
      return null;
    }
  }, []);

  return {
    repairs,
    technicians,
    loading,
    error,
    refetch: fetchAll,
    assignTechnician,
    updateRepair,
  };
}
