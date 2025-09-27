import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';

export default function AttendanceTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [serviceByStudent, setServiceByStudent] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase
      .from('students')
      .select('*')
      .then(({ data }: { data: any[] | null }) => setStudents(data ?? []));
    supabase
      .from('services')
      .select('*')
      .then(({ data }: { data: any[] | null }) => setServices(data ?? []));
    supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data }: { data: any[] | null }) => setRows(data ?? []));
  }, []);
  const selectedServiceId = useMemo(
    () => (studentId: string) => {
      return serviceByStudent[studentId] || services[0]?.id || '';
    },
    [serviceByStudent, services],
  );

  async function mark(student_id: string, status: string) {
    const service_id = selectedServiceId(student_id);
    if (!service_id) return;
    // prevent duplicate mark for same student/service/date
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', student_id)
      .eq('service_id', service_id)
      .eq('date', date)
      .limit(1)
      .maybeSingle();
    if (existing) {
      // Update status instead of inserting duplicate
      const { data: updated } = await supabase
        .from('attendance')
        .update({ status })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (updated) setRows([updated, ...rows.filter((r) => r.id !== updated.id)]);
      return;
    }
    const { data } = await supabase
      .from('attendance')
      .insert({ student_id, service_id, date, status })
      .select('*')
      .single();
    if (data) setRows([data, ...rows]);
  }
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <label className='text-sm'>Date</label>
        <input
          type='date'
          className='rounded bg-black/30 border border-white/10 px-3 py-2'
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr>
              <th className='p-2'>Student</th>
              <th className='p-2'>Service</th>
              <th className='p-2'>Mark</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => (
              <tr key={st.id} className='border-t border-white/10'>
                <td className='p-2'>{st.demographics?.name ?? st.id}</td>
                <td className='p-2'>
                  <select
                    className='bg-black/30 border border-white/10 rounded px-2 py-1'
                    value={selectedServiceId(st.id)}
                    onChange={(e) =>
                      setServiceByStudent((prev) => ({ ...prev, [st.id]: e.target.value }))
                    }
                  >
                    {services.map((sv) => (
                      <option key={sv.id} value={sv.id}>
                        {sv.category}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='p-2 flex gap-2'>
                  {['present', 'absent', 'tardy', 'excused'].map((sta) => (
                    <button
                      key={sta}
                      onClick={() => mark(st.id, sta)}
                      className='px-2 py-1 rounded bg-white/10 hover:bg-white/20 capitalize'
                    >
                      {sta}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
            {!students.length && (
              <tr>
                <td className='p-3 text-white/60' colSpan={3}>
                  No students.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className='pt-2'>
        <h4 className='font-semibold mb-2'>Recent</h4>
        <ul className='text-sm space-y-1 max-h-64 overflow-auto'>
          {rows.map((r) => (
            <li key={r.id} className='text-white/80'>
              {r.date}: {r.student_id} - {r.status}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
