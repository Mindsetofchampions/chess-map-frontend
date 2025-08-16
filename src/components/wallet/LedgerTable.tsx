// filepath: src/components/wallet/LedgerTable.tsx
import React, { useEffect, useState } from 'react';
import { getMyLedger } from '@/lib/supabase';
import type { Ledger } from '@/types/backend';

interface LedgerTableProps {
  pageSize?: number;
  [key: string]: any; // Allow additional props like data-testid
}

function formatDelta(n: number) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}`;
}

const LedgerTable: React.FC<LedgerTableProps> = ({ pageSize = 20, ...props }) => {
  const [rows, setRows] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await getMyLedger(pageSize, page * pageSize);
        if (!alive) return;
        setRows(data || []);
      } catch (error: any) {
        if (!alive) return;
        setErr(error.message ?? 'Failed to load ledger');
        setRows([]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [page]);

  return (
    <div {...props} className="w-full rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/90">Recent Transactions</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded-md bg-white/10 text-white/90 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
          >
            Prev
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded-md bg-white/10 text-white/90 disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
            disabled={rows.length < pageSize || loading}
          >
            Next
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-white/70 text-sm">Loading…</div>
      ) : err ? (
        <div role="alert" className="text-red-300 text-sm">
          {err}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-white/60 text-sm">No transactions yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left font-medium py-2 pr-3">Date</th>
                <th className="text-left font-medium py-2 pr-3">Kind</th>
                <th className="text-left font-medium py-2 pr-3">Quest</th>
                <th className="text-right font-medium py-2 pl-3">Delta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="py-2 pr-3 text-white/90">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-white/80">{r.kind}</td>
                  <td className="py-2 pr-3 text-white/80 truncate max-w-[22ch]">
                    {r.quest_id ?? '—'}
                  </td>
                  <td className={`py-2 pl-3 text-right font-semibold ${r.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {formatDelta(r.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LedgerTable;