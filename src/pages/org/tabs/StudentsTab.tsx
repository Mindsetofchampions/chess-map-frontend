import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import ParentConsentInline from './intake/ParentConsentInline';

export default function StudentsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');
  useEffect(() => {
    supabase
      .from('students')
      .select('*')
      .then(({ data }) => setRows(data ?? []));
  }, []);
  async function addStudent() {
    const org_id = (await supabase.auth.getUser()).data.user?.user_metadata?.org_id;
    if (!org_id || !name.trim()) return;
    const payload = { org_id, demographics: { name } };
    const { data } = await supabase.from('students').insert(payload).select('*').single();
    if (data) (setRows([data, ...rows]), setName(''));
  }
  return (
    <div className='space-y-4'>
      <div className='grid sm:grid-cols-3 gap-2'>
        <input
          className='rounded bg-black/30 border border-white/10 px-3 py-2'
          placeholder='Student name'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={addStudent}
          className='px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500'
        >
          Add
        </button>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr>
              <th className='p-2'>Name</th>
              <th className='p-2'>Parent Intake</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className='border-t border-white/10'>
                <td className='p-2'>{r.demographics?.name ?? r.id}</td>
                <td className='p-2'>
                  <ParentConsentInline student={r} />
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className='p-3 text-white/60' colSpan={2}>
                  No students yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
