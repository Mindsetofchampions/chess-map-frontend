import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export default function ServicesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .then(({ data }: { data: any[] | null }) => setRows(data ?? []));
  }, []);
  async function addService() {
    const org_id = (await supabase.auth.getUser()).data.user?.user_metadata?.org_id;
    if (!org_id || !category.trim()) return;
    const { data } = await supabase
      .from('services')
      .insert({ org_id, category, description })
      .select('*')
      .single();
    if (data) (setRows([data, ...rows]), setCategory(''), setDescription(''));
  }
  return (
    <div className='space-y-4'>
      <div className='grid sm:grid-cols-3 gap-2'>
        <input
          className='rounded bg-black/30 border border-white/10 px-3 py-2'
          placeholder='Category'
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          className='rounded bg-black/30 border border-white/10 px-3 py-2'
          placeholder='Description'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          onClick={addService}
          className='px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500'
        >
          Add
        </button>
      </div>
      <ul className='space-y-2'>
        {rows.map((r) => (
          <li key={r.id} className='p-3 rounded border border-white/10 bg-white/5'>
            <div className='font-medium'>{r.category}</div>
            <div className='text-white/70 text-sm'>{r.description}</div>
          </li>
        ))}
        {!rows.length && <li className='p-3 text-white/60'>No services yet.</li>}
      </ul>
    </div>
  );
}
