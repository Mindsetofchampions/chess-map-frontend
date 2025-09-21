import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { exportCSV } from '@/utils/exporters';

export default function ReportsTab() {
  const [agg, setAgg] = useState<Array<Record<string, any>>>([]);
  useEffect(() => {
    supabase.rpc('report_attendance_by_service').then(({ data }) => setAgg(data ?? []));
  }, []);
  const [services, setServices] = useState<Array<{ id: string; category: string }>>([]);
  useEffect(() => {
    supabase
      .from('services')
      .select('id,category')
      .then(({ data }) => setServices(data ?? []));
  }, []);
  const labelById = useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s.category])),
    [services],
  );
  return (
    <div className='space-y-3'>
      <div className='flex gap-2 justify-end'>
        <button
          className='px-3 py-2 rounded bg-white/10'
          onClick={() => exportCSV(agg, 'org_attendance.csv')}
        >
          Export CSV
        </button>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr>
              <th className='p-2'>Service</th>
              <th className='p-2'>Present</th>
              <th className='p-2'>Absent</th>
              <th className='p-2'>Tardy</th>
            </tr>
          </thead>
          <tbody>
            {agg.map((r, i) => (
              <tr key={i} className='border-t border-white/10'>
                <td className='p-2'>{labelById[r.service_id] ?? r.service_id}</td>
                <td className='p-2'>{r.present}</td>
                <td className='p-2'>{r.absent}</td>
                <td className='p-2'>{r.tardy}</td>
              </tr>
            ))}
            {!agg.length && (
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
