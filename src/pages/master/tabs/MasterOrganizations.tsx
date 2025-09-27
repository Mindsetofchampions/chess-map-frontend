import { useEffect, useState } from 'react';

import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';

export default function MasterOrganizations() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');
  const { showError, showSuccess } = useToast();
  useEffect(() => {
    supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }: { data: any[] | null }) => setRows(data ?? []));
  }, []);
  async function createOrg() {
    const trimmed = name.trim();
    if (!trimmed) {
      showError('Organization name required');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({ name: trimmed })
        .select('*')
        .single();
      if (error) throw error;
      if (data) {
        setRows((r) => [data, ...r]);
        showSuccess('Organization created', trimmed);
        setName('');
      }
    } catch (e: any) {
      const msg = e?.message || 'Create organization failed';
      showError('Create organization failed', msg);
    }
  }
  async function setStatus(id: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update({ status })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      if (data) {
        setRows((r) => r.map((x) => (x.id === id ? data : x)));
        showSuccess('Organization updated', `${data.name} → ${data.status}`);
      }
    } catch (e: any) {
      const msg = e?.message || 'Update status failed';
      showError('Update organization failed', msg);
    }
  }
  return (
    <div className='space-y-4'>
      <div className='flex gap-2'>
        <input
          className='flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2'
          placeholder='New organization name'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={createOrg}
          className='px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500'
        >
          Create
        </button>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='text-left text-white/70'>
            <tr>
              <th className='p-2'>Name</th>
              <th className='p-2'>Status</th>
              <th className='p-2'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className='border-t border-white/10'>
                <td className='p-2'>{r.name}</td>
                <td className='p-2 capitalize'>{r.status}</td>
                <td className='p-2 flex gap-2'>
                  <button
                    onClick={() => setStatus(r.id, 'active')}
                    className='px-3 py-1 rounded bg-emerald-700'
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setStatus(r.id, 'rejected')}
                    className='px-3 py-1 rounded bg-rose-700'
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setStatus(r.id, 'suspended')}
                    className='px-3 py-1 rounded bg-amber-700'
                  >
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className='p-4 text-white/60' colSpan={3}>
                  No organizations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
