import { useEffect, useState } from 'react';
import GlassContainer from '@/components/GlassContainer';
import { useToast } from '@/components/ToastProvider';
import { listOrgOnboardings, approveOrgOnboarding, rejectOrgOnboarding, sendSystemNotification, OrgOnboardingRow } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function OrgOnboardingApprovals() {
  const { role } = useAuth() as any;
  const { showError, showSuccess, showWarning } = useToast();
  const [rows, setRows] = useState<OrgOnboardingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listOrgOnboardings(filter === 'all' ? undefined : (filter as any));
        setRows(data);
      } catch (e: any) {
        showError('Failed to load', e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [filter]);

  if (role !== 'master_admin') return <div className='p-6 text-red-300'>Access denied</div>;

  async function doApprove(r: OrgOnboardingRow) {
    try {
      setLoading(true);
      await approveOrgOnboarding(r.id, note[r.id]);
      showSuccess('Approved', `${r.org_name} approved.`);
      // Notify submitter (best-effort)
      if (r.submitter_email) {
        sendSystemNotification(
          r.submitter_email,
          'Organization approved',
          `Your organization "${r.org_name}" has been approved. Welcome!`,
        );
      }
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'approved' } : x)));
    } catch (e: any) {
      showError('Approve failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function doReject(r: OrgOnboardingRow) {
    const notes = (note[r.id] || '').trim();
    if (!notes) return showWarning('Notes required', 'Provide a reason for rejection.');
    try {
      setLoading(true);
      await rejectOrgOnboarding(r.id, notes);
      showSuccess('Rejected', `${r.org_name} rejected.`);
      if (r.submitter_email) {
        sendSystemNotification(
          r.submitter_email,
          'Organization rejected',
          `Your organization "${r.org_name}" was rejected. Reason: ${notes}`,
        );
      }
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'rejected' } : x)));
    } catch (e: any) {
      showError('Reject failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h1 className='text-2xl font-bold text-white'>Org Onboarding Approvals</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className='bg-gray-800/70 border border-white/20 rounded-lg px-3 py-2 text-white'
        >
          <option value='pending'>Pending</option>
          <option value='approved'>Approved</option>
          <option value='rejected'>Rejected</option>
          <option value='all'>All</option>
        </select>
      </div>
      <GlassContainer className='p-4'>
        {loading ? (
          <div className='text-gray-300'>Loading…</div>
        ) : rows.length === 0 ? (
          <div className='text-gray-400'>No records.</div>
        ) : (
          <div className='space-y-4'>
            {rows.map((r) => (
              <div key={r.id} className='bg-glass border-glass rounded-xl p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <div className='text-white font-semibold'>{r.org_name}</div>
                    <div className='text-gray-300 text-sm'>Submitted by: {r.submitter_email || r.submitted_by}</div>
                    <div className='text-gray-400 text-xs'>Status: {r.status}</div>
                  </div>
                </div>
                <div className='mt-3 grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <div>
                    <div className='text-gray-400 text-xs mb-1'>Logo Path</div>
                    <div className='text-gray-200 text-xs break-all'>{r.org_logo_path}</div>
                  </div>
                  <div>
                    <div className='text-gray-400 text-xs mb-1'>Admin ID Path</div>
                    <div className='text-gray-200 text-xs break-all'>{r.admin_id_path}</div>
                  </div>
                </div>
                <div className='mt-3'>
                  <textarea
                    placeholder='Admin notes (reason, comments, etc.)'
                    className='w-full bg-glass border-glass rounded-lg px-3 py-2 text-white'
                    value={note[r.id] || ''}
                    onChange={(e) => setNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  />
                </div>
                <div className='mt-3 flex gap-2'>
                  <button
                    onClick={() => doApprove(r)}
                    disabled={loading || r.status !== 'pending'}
                    className='px-3 py-2 rounded bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 disabled:opacity-50'
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => doReject(r)}
                    disabled={loading || r.status !== 'pending'}
                    className='px-3 py-2 rounded bg-red-500/20 border border-red-500/30 text-red-300 disabled:opacity-50'
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassContainer>
    </div>
  );
}
