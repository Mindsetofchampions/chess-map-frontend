import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { exportCSV } from '@/utils/exporters';

export default function MasterLedger() {
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  useEffect(() => {
    supabase
      .from('v_master_services_ledger')
      .select('*')
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className='space-y-3'>
      <div className='flex gap-2 justify-end'>
        <button
          className='px-3 py-2 rounded bg-white/10'
          onClick={() => exportCSV(rows, 'master_ledger.csv')}
        >
          Export CSV
        </button>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr>
              <th className='p-2'>Org</th>
              <th className='p-2'>Category</th>
              <th className='p-2'>Date</th>
              <th className='p-2'>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className='border-t border-white/10'>
                <td className='p-2'>{r.org_id}</td>
                <td className='p-2'>{r.category}</td>
                <td className='p-2'>{r.date}</td>
                <td className='p-2 capitalize'>{r.status}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className='p-4 text-white/60' colSpan={4}>
                  No data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
