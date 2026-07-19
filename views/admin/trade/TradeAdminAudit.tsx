/**
 * Audit log viewer — filter by entity / actor / date; show old→new JSON diff.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  diffJson,
  getAuditLog,
  tradeAdminErrorMessage,
} from '../../../lib/tradeAdminApi';
import type { AuditLogRow } from '../../../types/supabase';

export const TradeAdminAudit: React.FC = () => {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const data = await getAuditLog({
        entity: entity.trim() || undefined,
        actor: actor.trim() || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        limit: 250,
      });
      setRows(data);
    } catch (e) {
      setError(tradeAdminErrorMessage(e));
      setRows([]);
    }
  }, [entity, actor, from, to]);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <input
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          placeholder="Entity (e.g. trade_in_requests)"
          className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
        />
        <input
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="Actor UUID"
          className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-white/30 text-sm">Loading audit log…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center py-12 text-white/30 text-sm">No audit rows match.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const diffs = diffJson(r.old_data, r.new_data);
            const open = expanded === r.id;
            return (
              <div
                key={r.id}
                className="border border-white/10 rounded-xl bg-black/30 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : r.id)}
                  className="w-full text-left p-3 flex flex-wrap gap-2 items-center justify-between hover:bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white">
                      {r.action} · {r.entity}
                    </p>
                    <p className="text-[10px] text-white/35 truncate">
                      {r.entity_id} · {new Date(r.created_at).toLocaleString()}
                      {r.actor_id ? ` · actor ${r.actor_id.slice(0, 8)}…` : ''}
                    </p>
                  </div>
                  <span className="text-[9px] font-black uppercase text-white/40">
                    {diffs.length} change{diffs.length === 1 ? '' : 's'}
                  </span>
                </button>
                {open && (
                  <div className="border-t border-white/10 p-3 space-y-1.5 bg-black/40">
                    {diffs.length === 0 ? (
                      <p className="text-[10px] text-white/30">No field-level diff (empty payloads).</p>
                    ) : (
                      diffs.map((d) => (
                        <div key={d.key} className="text-[10px] font-mono">
                          <span className="text-[#B38B21]">{d.key}</span>
                          <span className="text-white/30"> : </span>
                          <span className="text-red-300/80 break-all">{d.from}</span>
                          <span className="text-white/30"> → </span>
                          <span className="text-emerald-300/80 break-all">{d.to}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
