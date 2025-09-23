import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export default function StaffTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');
  useEffect(() => {
    supabase
      .from('staff')
      .select('*')
      .then(({ data }: { data: any[] | null }) => setRows(data ?? []));
  }, []);
  async function add() {
    const org_id = (await supabase.auth.getUser()).data.user?.user_metadata?.org_id;
    if (!org_id || !name.trim()) return;
    const { data } = await supabase
      .from('staff')
      .insert({ org_id, demographics: { name } })
      .select('*')
      .single();
    if (data) (setRows([data, ...rows]), setName(''));
  }
  return (
    <div className='space-y-4'>
      <div className='flex gap-2'>
        <input
          className='rounded bg-black/30 border border-white/10 px-3 py-2'
          placeholder='Staff name'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={add} className='px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500'>
          Add
        </button>
      </div>
      <ul className='space-y-2'>
        {rows.map((r) => (
          <li key={r.id} className='p-3 rounded border border-white/10 bg-white/5'>
            {r.demographics?.name ?? r.id}
          </li>
        ))}
        {!rows.length && <li className='p-3 text-white/60'>No staff yet.</li>}
      </ul>
    </div>
  );
}
