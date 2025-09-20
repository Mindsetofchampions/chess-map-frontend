import React, { useEffect, useMemo, useState } from 'react';
import { supabase, adminCreateUser, adminGenerateLink, adminSetPassword } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Award, Shield, Link as LinkIcon, KeyRound, Plus } from 'lucide-react';
import GlassContainer from '@/components/GlassContainer';

type Row = { id: string; email: string; role?: string };

export default function MasterUsersPage() {
  const { user, resolvedRole } = useAuth() as any;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin'|'student'>('student');
  const [users, setUsers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [tempPass, setTempPass] = useState('');
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email?: string; password?: string; link?: string } | null>(null);
  // accessToken not needed because admin helper functions handle auth tokens

  const isMaster = useMemo(() => (resolvedRole ?? user?.user_metadata?.role) === 'master_admin', [resolvedRole, user]);

  useEffect(() => {
    if (!isMaster) return;
    (async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const { data: vw } = await supabase.from('admin_user_list_vw' as any).select('*').order('email', { ascending: true });
      if (vw?.length) {
        setUsers(vw as any);
      } else {
        setUsers((roles ?? []).map((r: any) => ({ id: r.user_id, email: r.user_id, role: r.role })));
      }
      // load organizations for optional association
      try {
        const { data: orgData } = await supabase.from('organizations').select('id,name').order('name', { ascending: true });
        if (Array.isArray(orgData)) setOrgs(orgData as any);
      } catch (e) {
        // ignore
      }
    })();
  }, [isMaster]);

  if (!isMaster) {
    return <div className="p-6 text-red-300">Access denied (master_admin only)</div>;
  }

  async function createUser() {
    try {
      setLoading(true);
      // generate a reasonably strong temporary password if not provided in the temp field
      const generatedPassword = tempPass && tempPass.length >= 10 ? tempPass : `tmp_${Math.random().toString(36).slice(2, 12)}`;
      const data = await adminCreateUser({ email, role, password: generatedPassword, org_id: selectedOrg || undefined });
      // If function returned a temporaryPassword, show it in a modal plus magic link when requested
      const temp = data?.temporaryPassword || (generatedPassword && generatedPassword);
      setCreatedCreds({ email: data?.user?.email || email, password: temp });
      setShowCredsModal(true);
      setEmail('');
      setRole('student');
      setTempPass('');
    } catch (e: any) {
      alert(`Create error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function genLink(targetEmail: string) {
    try {
      setLoading(true);
      const data = await adminGenerateLink(targetEmail, window.location.origin);
      setLinkUrl(data.url);
    } catch (e: any) {
      alert(`Link error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function setPassword(targetEmail: string) {
    if (!tempPass || tempPass.length < 10) {
      alert('Provide a strong temp password (>= 10 chars)');
      return;
    }
    try {
      setLoading(true);
      const data = await adminSetPassword(targetEmail, tempPass);
      alert(`Password set for ${data.id || targetEmail}. Ask user to log in and rotate immediately.`);
      setTempPass('');
    } catch (e: any) {
      alert(`Password error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <button
        className="mb-4 inline-flex items-center gap-2 text-cyber-green-300 hover:text-cyber-green-200 text-sm font-medium"
        onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/master/dashboard')}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Back to Dashboard
      </button>
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-electric-blue-400" />
        <h1 className="text-2xl font-bold text-white">Master Admin – Create Users</h1>
      </div>
      {/* Create form */}
      <div className="bg-glass border-glass rounded-xl p-4 flex flex-col gap-3 max-w-xl">
        <div className="flex gap-2 items-center">
          <input
            className="flex-1 bg-glass border-glass rounded-lg px-3 py-2 text-white"
            placeholder="user@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <select
            className="bg-glass border-glass rounded-lg px-3 py-2 text-white"
            value={role}
            onChange={e => setRole(e.target.value as any)}
          >
            <option value="student">student</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="bg-glass border-glass rounded-lg px-3 py-2 text-white"
            value={selectedOrg ?? ''}
            onChange={e => setSelectedOrg(e.target.value || null)}
          >
            <option value="">No organization</option>
            {orgs.map(o => (
              <option value={o.id} key={o.id}>{o.name}</option>
            ))}
          </select>
          <input
            type="password"
            placeholder="temp password (optional, >=10)"
            className="bg-glass border-glass rounded px-2 py-1 text-white"
            value={tempPass}
            onChange={e => setTempPass(e.target.value)}
            style={{ width: 220 }}
            title="Provide a temporary password to assign directly (will be shown once only)"
          />
          <button
            onClick={createUser}
            disabled={loading || !email}
            className="inline-flex items-center gap-2 bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded-lg px-3 py-2"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
        <p className="text-gray-300 text-sm">Creates the user and assigns the selected role.</p>
      </div>
      {/* Users list */}
      <div className="bg-glass border-glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-neon-purple-400" />
          <h2 className="text-white font-semibold">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-200">
            <thead className="text-gray-400">
              <tr>
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Role</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-glass">
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.role ?? '—'}</td>
                  <td className="py-2">
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => genLink(u.email)}
                        disabled={loading}
                        className="inline-flex items-center gap-1 bg-electric-blue-500/20 border border-electric-blue-500/30 text-electric-blue-300 hover:bg-electric-blue-500/30 rounded-lg px-2 py-1"
                        title="Generate magic login link"
                      >
                        <LinkIcon className="w-4 h-4" /> Link
                      </button>
                      <input
                        type="password"
                        placeholder="temp password (>=10)"
                        className="bg-glass border-glass rounded px-2 py-1 text-white"
                        value={tempPass}
                        onChange={e => setTempPass(e.target.value)}
                        style={{ width: 220 }}
                      />
                      <button
                        onClick={() => setPassword(u.email)}
                        disabled={loading || tempPass.length < 10}
                        className="inline-flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 rounded-lg px-2 py-1"
                        title="Set temporary password"
                      >
                        <KeyRound className="w-4 h-4" /> Temp PW
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={3} className="py-4 text-gray-400">No users available to show. Create one above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {linkUrl && (
          <div className="mt-4 bg-glass border-glass rounded-lg p-3">
            <div className="text-gray-200 text-sm mb-2">Magic login link:</div>
            <div className="break-all text-cyber-green-300 text-sm">{linkUrl}</div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(linkUrl)}
                className="bg-glass border-glass rounded px-2 py-1 text-white"
              >
                Copy
              </button>
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded px-2 py-1"
              >
                Open link
              </a>
              <button onClick={() => setLinkUrl(null)} className="bg-glass border-glass rounded px-2 py-1 text-gray-300">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Credentials modal */}
      {showCredsModal && createdCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCredsModal(false)} />
          <GlassContainer className="z-10 max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-3">User created</h3>
            <p className="text-gray-300 text-sm mb-4">Copy credentials and send them to the user. They should rotate the password on first login.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-glass rounded px-3 py-2">
                <div>
                  <div className="text-xs text-gray-400">Email</div>
                  <div className="text-sm text-white">{createdCreds.email}</div>
                </div>
                <button className="text-electric-blue-300" onClick={() => navigator.clipboard.writeText(createdCreds.email || '')}>Copy</button>
              </div>
              <div className="flex items-center justify-between bg-glass rounded px-3 py-2">
                <div>
                  <div className="text-xs text-gray-400">Temporary password</div>
                  <div className="text-sm text-white break-all">{createdCreds.password}</div>
                </div>
                <button className="text-electric-blue-300" onClick={() => navigator.clipboard.writeText(createdCreds.password || '')}>Copy</button>
              </div>
              <div className="flex items-center justify-between bg-glass rounded px-3 py-2">
                <div>
                  <div className="text-xs text-gray-400">Magic link (optional)</div>
                  <div className="text-sm text-white break-all">{createdCreds.link ?? 'Not generated'}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-electric-blue-300"
                    onClick={async () => {
                      try {
                                            const body = await adminGenerateLink(createdCreds.email || '', window.location.origin);
                                            const url = body.url;
                        setCreatedCreds(prev => ({ ...(prev || {}), link: url }));
                        // auto-copy
                        if (url) await navigator.clipboard.writeText(url);
                        alert('Magic link generated and copied to clipboard');
                      } catch (e: any) {
                        alert(`Link error: ${e.message}`);
                      }
                    }}
                  >Generate</button>
                  <button className="text-electric-blue-300" onClick={() => createdCreds?.link && navigator.clipboard.writeText(createdCreds.link)}>Copy</button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button className="bg-glass border-glass rounded px-3 py-1 text-gray-300" onClick={() => setShowCredsModal(false)}>Close</button>
            </div>
          </GlassContainer>
        </div>
      )}
    </div>
  );
}
