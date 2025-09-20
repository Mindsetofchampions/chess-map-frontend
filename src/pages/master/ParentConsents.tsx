import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyOnboarding } from '@/lib/notifyOnboarding';
// ProtectedRoute intentionally not used here; page uses project-level route guards

export default function ParentConsentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRows();
  }, []);

  async function fetchRows() {
    setLoading(true);
    const { data, error } = await supabase.from('parent_consents').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  async function setStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    const { error } = await supabase.from('parent_consents').update({ status }).eq('id', id);
    if (error) return alert(error.message);
    // fetch updated rows
    fetchRows();

    // attempt to notify parent for the updated consent row
    try {
      const { data } = await supabase.from('parent_consents').select('parent_email, student_id, parent_name').eq('id', id).maybeSingle();
      const row = (data as any) || {};
  // Try to resolve student display name from profiles for clearer notifications
  let studentName: string = row.student_id || '';
      try {
        const { data: prof } = await supabase.from('profiles').select('display_name').eq('user_id', row.student_id).maybeSingle();
        if (prof?.display_name) studentName = prof.display_name;
      } catch (_) {
        // ignore profile lookup failures; fallback to id
      }

      const adminEmail = ((supabase as any).auth && (supabase as any).auth.user && (supabase as any).auth.user.email) || null;

      await notifyOnboarding('consent_reviewed', { parent_email: row.parent_email, status, student_id: row.student_id, student_name: studentName, parent_name: row.parent_name, admin_name: adminEmail });
    } catch (e) {
      console.warn('notify failed', e);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Parent Consents (Admin)</h1>
      {loading ? <div>Loading…</div> : null}
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.id} className="bg-glass border-glass rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white font-semibold">{r.parent_name} — {r.parent_email}</div>
                <div className="text-sm text-gray-300">Student: {r.student_id}</div>
                <div className="text-sm text-gray-300 mt-2">Status: {r.status}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStatus(r.id, 'APPROVED')} className="px-3 py-1 rounded bg-emerald-500 text-white">Approve</button>
                <button onClick={() => setStatus(r.id, 'REJECTED')} className="px-3 py-1 rounded bg-rose-500 text-white">Reject</button>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-300">Notes: {r.notes}</div>
            <div className="mt-3">
              {r.signature_image_url ? <div><div className="text-xs text-gray-400">Signature:</div><img src={r.signature_image_url} alt="signature" className="max-h-32" /></div> : null}
              {r.parent_id_image_url ? <div className="mt-2"><div className="text-xs text-gray-400">ID:</div><img src={r.parent_id_image_url} alt="parent id" className="max-h-48" /></div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
