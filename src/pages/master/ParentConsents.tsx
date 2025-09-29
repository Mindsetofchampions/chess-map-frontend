/* eslint-disable import/order */
import { useEffect, useState } from 'react';

import { useToast } from '@/components/ToastProvider';
import { notifyOnboarding } from '@/lib/notifyOnboarding';
import { getSignedUrlFromStoredUrl } from '@/lib/storage';
import { supabase, approveParentConsent, rejectParentConsent } from '@/lib/supabase';
// ProtectedRoute intentionally not used here; page uses project-level route guards

export default function ParentConsentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState<
    Record<string, { name?: string; age?: number; school?: string }>
  >({});
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useToast();
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [awardCoins, setAwardCoins] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, { sig?: string; id?: string }>>({});

  useEffect(() => {
    void fetchRows();
  }, []);

  async function fetchRows() {
    setLoading(true);
    const { data, error } = await supabase
      .from('parent_consents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
    } else {
      const list = data || [];
      setRows(list);
      // resolve signed URLs for previews
      try {
        const entries: Record<string, { sig?: string; id?: string }> = {};
        await Promise.all(
          list.map(async (r: any) => {
            const sig = await getSignedUrlFromStoredUrl(r.signature_image_url);
            const pid = await getSignedUrlFromStoredUrl(r.parent_id_image_url);
            entries[r.id] = { sig, id: pid };
          }),
        );
        setSignedUrls(entries);
      } catch {}
      // Enrich with student onboarding info for display
      try {
        const ids = Array.from(new Set(list.map((r: any) => r.student_id).filter(Boolean)));
        if (ids.length) {
          const { data: infos } = await supabase
            .from('onboarding_responses')
            .select('student_id, student_name, student_age, student_school')
            .in('student_id', ids);
          const map: Record<string, { name?: string; age?: number; school?: string }> = {};
          (infos || []).forEach((row: any) => {
            map[row.student_id] = {
              name: row.student_name || undefined,
              age: typeof row.student_age === 'number' ? row.student_age : undefined,
              school: row.student_school || undefined,
            };
          });
          setStudentInfo(map);
        } else {
          setStudentInfo({});
        }
      } catch (e) {
        console.warn('Failed to load student info', e);
        setStudentInfo({});
      }
    }
    setLoading(false);
  }

  async function setStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    try {
      setActionLoading((m) => ({ ...m, [id]: true }));
      const notes = adminNotes[id]?.trim() || undefined;
      if (status === 'APPROVED') {
        const coins = Number(awardCoins[id] ?? '0') || 0;
        await approveParentConsent(id, notes, coins);
        showSuccess('Consent approved', coins > 0 ? `Awarded ${coins} coins` : undefined);
      } else {
        await rejectParentConsent(id, notes);
        showSuccess('Consent rejected');
      }

      await fetchRows();

      // attempt to notify parent for the updated consent row
      try {
        const { data } = await supabase
          .from('parent_consents')
          .select('parent_email, student_id, parent_name, admin_notes')
          .eq('id', id)
          .maybeSingle();
        const row = (data as any) || {};
        // Try to resolve student display name from profiles for clearer notifications
        let studentName: string = row.student_id || '';
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', row.student_id)
            .maybeSingle();
          if (prof?.display_name) studentName = prof.display_name;
        } catch (_) {}

        const adminEmail = (supabase as any).auth?.user?.email || null;

        await notifyOnboarding('consent_reviewed', {
          parent_email: row.parent_email,
          status,
          student_id: row.student_id,
          student_name: studentName,
          parent_name: row.parent_name,
          admin_name: adminEmail,
          admin_notes: row.admin_notes || notes,
        });
      } catch (e) {
        console.warn('notify failed', e);
      }
    } catch (err: any) {
      showError('Failed to update consent', err?.message || String(err));
    } finally {
      setActionLoading((m) => ({ ...m, [id]: false }));
    }
  }

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold text-white mb-4'>Parent Consents (Admin)</h1>
      {loading ? <div>Loading…</div> : null}
      <div className='space-y-4'>
        {rows.map((r) => (
          <div key={r.id} className='bg-glass border-glass rounded-lg p-4'>
            <div className='flex justify-between items-start'>
              <div>
                <div className='text-white font-semibold'>
                  {r.parent_name} — {r.parent_email}
                </div>
                <div className='text-sm text-gray-300'>
                  {(() => {
                    const info = studentInfo[r.student_id] || {};
                    const parts = [
                      info.name ? `Student: ${info.name}` : `Student: ${r.student_id}`,
                      typeof info.age === 'number' ? `Age: ${info.age}` : undefined,
                      info.school ? `School: ${info.school}` : undefined,
                    ].filter(Boolean);
                    return parts.join(' • ');
                  })()}
                </div>
                <div className='text-sm text-gray-300 mt-2'>Status: {r.status}</div>
                {r.admin_notes ? (
                  <div className='text-xs text-gray-400 mt-1'>Admin notes: {r.admin_notes}</div>
                ) : null}
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => void setStatus(r.id, 'APPROVED')}
                  className='px-3 py-1 rounded bg-emerald-500 text-white disabled:opacity-50'
                  disabled={!!actionLoading[r.id]}
                >
                  Approve
                </button>
                <button
                  onClick={() => void setStatus(r.id, 'REJECTED')}
                  className='px-3 py-1 rounded bg-rose-500 text-white disabled:opacity-50'
                  disabled={!!actionLoading[r.id]}
                >
                  Reject
                </button>
              </div>
            </div>
            <div className='mt-3 grid md:grid-cols-2 gap-4'>
              <div>
                <label className='text-xs text-gray-400 block mb-1'>
                  Message to parent (optional)
                </label>
                <textarea
                  className='w-full bg-gray-900/60 border border-white/20 rounded p-2 text-gray-100'
                  placeholder='Let them know why it was approved or rejected'
                  value={adminNotes[r.id] ?? ''}
                  onChange={(e) => setAdminNotes((m) => ({ ...m, [r.id]: e.target.value }))}
                  rows={2}
                />
                <div className='text-xs text-gray-500 mt-1'>
                  This note is stored as admin_notes and included in the notification.
                </div>
              </div>

              <div>
                <label className='text-xs text-gray-400 block mb-1'>
                  Award coins on approval (optional)
                </label>
                <input
                  type='number'
                  min={0}
                  className='w-full bg-gray-900/60 border border-white/20 rounded p-2 text-gray-100'
                  placeholder='e.g., 100'
                  value={awardCoins[r.id] ?? ''}
                  onChange={(e) => setAwardCoins((m) => ({ ...m, [r.id]: e.target.value }))}
                />
                <div className='text-xs text-gray-500 mt-1'>
                  If set, coins are deposited to the student wallet upon approval.
                </div>
              </div>
            </div>

            <div className='mt-3 text-sm text-gray-300'>Submitted Notes: {r.notes}</div>
            <div className='mt-3'>
              {r.signature_image_url ? (
                <div>
                  <div className='text-xs text-gray-400'>Signature:</div>
                  <a href={signedUrls[r.id]?.sig || r.signature_image_url} target='_blank' rel='noreferrer'>
                    <img
                      src={signedUrls[r.id]?.sig || r.signature_image_url}
                      alt='signature'
                      className='max-h-32 rounded border border-white/20'
                    />
                  </a>
                </div>
              ) : null}
              {r.parent_id_image_url ? (
                <div className='mt-2'>
                  <div className='text-xs text-gray-400'>ID:</div>
                  <a href={signedUrls[r.id]?.id || r.parent_id_image_url} target='_blank' rel='noreferrer'>
                    <img
                      src={signedUrls[r.id]?.id || r.parent_id_image_url}
                      alt='parent id'
                      className='max-h-48 rounded border border-white/20'
                    />
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
