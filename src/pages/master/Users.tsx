import { Award, Shield, Link as LinkIcon, KeyRound, Plus, Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import GlassContainer from '@/components/GlassContainer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, adminCreateUser, adminGenerateLink, adminSetPassword, adminDeleteUser, setUserRole } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

interface Row {
  id: string;
  email: string;
  role?: string;
}

export default function MasterUsersPage() {
  const { user, resolvedRole } = useAuth() as any;
  const { showSuccess, showError, showWarning } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'org_admin' | 'student'>('student');
  const [users, setUsers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [createTempPass, setCreateTempPass] = useState('');
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [rowTempPass, setRowTempPass] = useState<Record<string, string>>({});
  const [showRowPass, setShowRowPass] = useState<Record<string, boolean>>({});
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{
    email?: string;
    password?: string;
    link?: string;
  } | null>(null);
  // accessToken not needed because admin helper functions handle auth tokens

  const isMaster = useMemo(
    () => (resolvedRole ?? user?.user_metadata?.role) === 'master_admin',
    [resolvedRole, user],
  );

  useEffect(() => {
    if (!isMaster) return;
    (async () => {
      try {
        // Prefer secure RPC for master admins
        const { data, error } = await supabase.rpc('get_admin_user_list');
        if (error) throw error;
        if (Array.isArray(data)) setUsers(data as any);
      } catch (e) {
        console.error('Load users failed', e);
      }
      // load organizations for optional association
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id,name')
          .order('name', { ascending: true });
        if (Array.isArray(orgData)) setOrgs(orgData as any);
      } catch (e) {
        // ignore
      }
    })();
  }, [isMaster]);

  if (!isMaster) {
    return <div className='p-6 text-red-300'>Access denied (master_admin only)</div>;
  }

  async function createUser() {
    try {
      setLoading(true);
      // generate a reasonably strong temporary password if not provided in the temp field
      const generatedPassword =
        createTempPass && createTempPass.length >= 10
          ? createTempPass
          : `tmp_${Math.random().toString(36).slice(2, 12)}`;
      console.log('[master/users] creating user', { email, role, selectedOrg });
      const data = await adminCreateUser({
        email,
        role,
        password: generatedPassword,
        org_id: selectedOrg || undefined,
      });
      console.log('[master/users] create response', data);
      // If function returned a temporaryPassword, show it in a modal plus magic link when requested
      const temp = data?.temporaryPassword || (generatedPassword && generatedPassword);
      setCreatedCreds({ email: data?.user?.email || email, password: temp });
      setShowCredsModal(true);
      setEmail('');
      setRole('student');
      setCreateTempPass('');
      showSuccess('User created', 'Credentials shown in the modal.');
    } catch (e: any) {
      showError('Create user failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function genLink(targetEmail: string) {
    try {
      setLoading(true);
      const data = await adminGenerateLink(targetEmail, window.location.origin);
      setLinkUrl(data.url);
      if (data?.url) {
        try {
          await navigator.clipboard.writeText(data.url);
          showSuccess('Magic link ready', 'Copied to clipboard.');
        } catch (_) {
          // ignore clipboard failure
        }
      }
    } catch (e: any) {
      showError('Magic link failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function setPasswordForUser(u: Row) {
    const pass = rowTempPass[u.id] || '';
    if (!pass || pass.length < 10) {
      showWarning('Weak password', 'Provide a strong temp password (>= 10 chars).');
      return;
    }
    try {
      setLoading(true);
      const data = await adminSetPassword(u.email, pass);
      showSuccess('Temporary password set', `For ${data.id || u.email}.`);
      setRowTempPass((prev) => ({ ...prev, [u.id]: '' }));
    } catch (e: any) {
      showError('Set password failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(u: Row) {
    // Prevent deleting current signed-in user (self-delete guard)
    if (user?.email && u.email === user.email) {
      showWarning('Blocked', 'You cannot delete your own account.');
      return;
    }
    // Simple browser confirm retained; could be upgraded to a modal
    if (!confirm(`Delete user ${u.email}? This action cannot be undone.`)) return;
    try {
      setLoading(true);
      await adminDeleteUser(u.email);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      showSuccess('User deleted', `${u.email} removed.`);
    } catch (e: any) {
      showError('Delete failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(u: Row, newRole: 'student' | 'staff' | 'org_admin' | 'master_admin') {
    // prevent self-demotion to avoid accidental lockout
    if ((user?.email && u.email === user.email) && newRole !== 'master_admin') {
      showWarning('Blocked', 'You cannot change your own role away from master_admin.');
      return;
    }
    try {
      setSavingRole(u.id);
      await setUserRole(u.email, newRole);
      // update local state optimistically
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, role: newRole } : row)));
      showSuccess('Role updated', `${u.email} is now ${newRole}.`);
    } catch (e: any) {
      showError('Role update failed', e?.message || String(e));
    } finally {
      setSavingRole(null);
    }
  }

  return (
    <div className='p-6 space-y-6'>
      <button
        className='mb-4 inline-flex items-center gap-2 text-cyber-green-300 hover:text-cyber-green-200 text-sm font-medium'
        onClick={() =>
          window.history.length > 1
            ? window.history.back()
            : window.location.assign('/master/dashboard')
        }
      >
        <svg
          width='20'
          height='20'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          viewBox='0 0 24 24'
        >
          <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
        </svg>
        Back to Dashboard
      </button>
      <div className='flex items-center gap-3'>
        <Shield className='w-6 h-6 text-electric-blue-400' />
        <h1 className='text-2xl font-bold text-white'>Master Admin – Create Users</h1>
      </div>
      {/* Create form */}
      <div className='bg-glass border-glass rounded-xl p-4 flex flex-col gap-3 max-w-xl'>
        <div className='flex gap-2 items-center'>
          <input
            className='flex-1 bg-glass border-glass rounded-lg px-3 py-2 text-white'
            placeholder='user@example.com'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className='bg-gray-800/70 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-electric-blue-400'
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value='student'>student</option>
            <option value='org_admin'>org_admin</option>
          </select>
        </div>
        <div className='flex gap-2 items-center'>
          <select
            className='bg-gray-800/70 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-electric-blue-400'
            value={selectedOrg ?? ''}
            onChange={(e) => setSelectedOrg(e.target.value || null)}
          >
            <option value=''>No organization</option>
            {orgs.map((o) => (
              <option value={o.id} key={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <div className='relative'>
            <input
              type={showCreatePass ? 'text' : 'password'}
              placeholder='temp password (optional, >=10)'
              className='bg-glass border-glass rounded px-2 py-1 text-white pr-8'
              value={createTempPass}
              onChange={(e) => setCreateTempPass(e.target.value)}
              style={{ width: 220 }}
              title='Provide a temporary password to assign directly (will be shown once only)'
            />
            <button
              type='button'
              onClick={() => setShowCreatePass((v) => !v)}
              className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white'
              aria-label={showCreatePass ? 'Hide password' : 'Show password'}
            >
              {showCreatePass ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
            </button>
          </div>
          <button
            onClick={createUser}
            disabled={loading || !email}
            className='inline-flex items-center gap-2 bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded-lg px-3 py-2'
          >
            <Plus className='w-4 h-4' /> Create
          </button>
        </div>
        <p className='text-gray-300 text-sm'>Creates the user and assigns the selected role.</p>
      </div>
      {/* Users list */}
      <div className='bg-glass border-glass rounded-xl p-4'>
        <div className='flex items-center gap-2 mb-3'>
          <Award className='w-5 h-5 text-neon-purple-400' />
          <h2 className='text-white font-semibold'>Users</h2>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm text-gray-200'>
            <thead className='text-gray-400'>
              <tr>
                <th className='text-left py-2'>Email</th>
                <th className='text-left py-2'>Role</th>
                <th className='text-left py-2'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className='border-t border-glass'>
                  <td className='py-2'>{u.email}</td>
                  <td className='py-2'>
                    <select
                      className='bg-gray-800/70 border border-white/20 rounded-lg px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-electric-blue-400 disabled:opacity-60'
                      value={(u.role as any) || 'student'}
                      disabled={loading || savingRole === u.id}
                      onChange={(e) =>
                        updateRole(
                          u,
                          e.target.value as 'student' | 'staff' | 'org_admin' | 'master_admin',
                        )
                      }
                      title='Change role'
                    >
                      <option value='student'>student</option>
                      <option value='staff'>staff</option>
                      <option value='org_admin'>org_admin</option>
                      <option value='master_admin'>master_admin</option>
                    </select>
                  </td>
                  <td className='py-2'>
                    <div className='flex gap-2 items-center'>
                      <button
                        onClick={() => genLink(u.email)}
                        disabled={loading}
                        className='inline-flex items-center gap-1 bg-electric-blue-500/20 border border-electric-blue-500/30 text-electric-blue-300 hover:bg-electric-blue-500/30 rounded-lg px-2 py-1'
                        title='Generate magic login link'
                      >
                        <LinkIcon className='w-4 h-4' /> Link
                      </button>
                      <div className='relative'>
                        <input
                          type={showRowPass[u.id] ? 'text' : 'password'}
                          placeholder='temp password (>=10)'
                          className='bg-glass border-glass rounded px-2 py-1 text-white pr-8'
                          value={rowTempPass[u.id] || ''}
                          onChange={(e) =>
                            setRowTempPass((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          style={{ width: 220 }}
                        />
                        <button
                          type='button'
                          onClick={() =>
                            setShowRowPass((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                          }
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white'
                          aria-label={showRowPass[u.id] ? 'Hide password' : 'Show password'}
                        >
                          {showRowPass[u.id] ? (
                            <EyeOff className='w-4 h-4' />
                          ) : (
                            <Eye className='w-4 h-4' />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => setPasswordForUser(u)}
                        disabled={loading || (rowTempPass[u.id]?.length || 0) < 10}
                        className='inline-flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 rounded-lg px-2 py-1'
                        title='Set temporary password'
                      >
                        <KeyRound className='w-4 h-4' /> Temp PW
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        disabled={loading}
                        className='inline-flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-lg px-2 py-1'
                        title='Delete user'
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={3} className='py-4 text-gray-400'>
                    No users available to show. Create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {linkUrl && (
          <div className='mt-4 bg-glass border-glass rounded-lg p-3'>
            <div className='text-gray-200 text-sm mb-2'>Magic login link:</div>
            <div className='break-all text-cyber-green-300 text-sm'>{linkUrl}</div>
            <div className='mt-2 flex gap-2'>
              <button
                onClick={() => navigator.clipboard.writeText(linkUrl)}
                className='bg-glass border-glass rounded px-2 py-1 text-white'
              >
                Copy
              </button>
              <a
                href={linkUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded px-2 py-1'
              >
                Open link
              </a>
              <button
                onClick={() => setLinkUrl(null)}
                className='bg-glass border-glass rounded px-2 py-1 text-gray-300'
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Credentials modal */}
      {showCredsModal && createdCreds && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/60' onClick={() => setShowCredsModal(false)} />
          <GlassContainer className='z-10 max-w-lg w-full p-6'>
            <h3 className='text-lg font-semibold text-white mb-3'>User created</h3>
            <p className='text-gray-300 text-sm mb-4'>
              Copy credentials and send them to the user. They should rotate the password on first
              login.
            </p>
            <div className='space-y-3'>
              <div className='flex items-center justify-between bg-glass rounded px-3 py-2'>
                <div>
                  <div className='text-xs text-gray-400'>Email</div>
                  <div className='text-sm text-white'>{createdCreds.email}</div>
                </div>
                <button
                  className='text-electric-blue-300'
                  onClick={() => navigator.clipboard.writeText(createdCreds.email || '')}
                >
                  Copy
                </button>
              </div>
              <div className='flex items-center justify-between bg-glass rounded px-3 py-2'>
                <div>
                  <div className='text-xs text-gray-400'>Temporary password</div>
                  <div className='text-sm text-white break-all'>{createdCreds.password}</div>
                </div>
                <button
                  className='text-electric-blue-300'
                  onClick={() => navigator.clipboard.writeText(createdCreds.password || '')}
                >
                  Copy
                </button>
              </div>
              <div className='flex items-center justify-between bg-glass rounded px-3 py-2'>
                <div>
                  <div className='text-xs text-gray-400'>Magic link (optional)</div>
                  <div className='text-sm text-white break-all'>
                    {createdCreds.link ?? 'Not generated'}
                  </div>
                </div>
                <div className='flex gap-2'>
                  <button
                    className='text-electric-blue-300'
                    onClick={async () => {
                      try {
                        const body = await adminGenerateLink(
                          createdCreds.email || '',
                          window.location.origin,
                        );
                        const url = body.url;
                        setCreatedCreds((prev) => ({ ...(prev || {}), link: url }));
                        // auto-copy
                        if (url) await navigator.clipboard.writeText(url);
                        showSuccess('Magic link ready', 'Copied to clipboard.');
                      } catch (e: any) {
                        showError('Magic link failed', e?.message || String(e));
                      }
                    }}
                  >
                    Generate
                  </button>
                  <button
                    className='text-electric-blue-300'
                    onClick={() =>
                      createdCreds?.link && navigator.clipboard.writeText(createdCreds.link)
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            <div className='mt-4 flex gap-2 justify-end'>
              <button
                className='bg-glass border-glass rounded px-3 py-1 text-gray-300'
                onClick={() => setShowCredsModal(false)}
              >
                Close
              </button>
            </div>
          </GlassContainer>
        </div>
      )}
    </div>
  );
}
