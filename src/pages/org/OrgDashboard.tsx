import React, { useEffect, useMemo, useState } from 'react';

import OnboardingGate from '@/components/auth/OnboardingGate';
import GlassContainer from '@/components/GlassContainer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast } from '@/components/ToastProvider';
import Tabs from '@/components/ui/Tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  createOrgEngagement,
  distributeEngagement,
  EngagementRecipient,
  fundOrgEngagement,
  getMyOrg,
  getMyOrgWallet,
  listEngagementRecipients,
  listOrgEngagements,
  OrgEngagement,
  OrgWallet,
  removeEngagementRecipient,
  upsertEngagementRecipient,
} from '@/lib/supabase';
import AttendanceTab from '@/pages/org/tabs/AttendanceTab';
import ReportsTab from '@/pages/org/tabs/ReportsTab';
import ServicesTab from '@/pages/org/tabs/ServicesTab';
import StaffTab from '@/pages/org/tabs/StaffTab';
import StudentsTab from '@/pages/org/tabs/StudentsTab';
import QuestBuilder from '@/components/QuestBuilder';
import { supabase } from '@/lib/supabase';
import SEO from '@/components/SEO';

const OrgDashboard: React.FC = () => {
  const { showSuccess, showError } = useToast();
  useAuth();
  const [orgStatus, setOrgStatus] = useState<'approved' | 'active' | 'pending' | 'rejected' | null>(
    null,
  );
  const orgApproved = orgStatus === 'approved' || orgStatus === 'active';

  // Wallet and org state
  const [org, setOrg] = useState<{ org_id: string; name: string } | null>(null);
  const [wallet, setWallet] = useState<OrgWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Engagements state
  const [engagements, setEngagements] = useState<OrgEngagement[]>([]);
  const [loadingEngagements, setLoadingEngagements] = useState(true);

  // Create engagement modal
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Funding modal per engagement
  const [fundingId, setFundingId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundReason, setFundReason] = useState('Fund engagement');
  const [funding, setFunding] = useState(false);

  // Recipients modal state
  const [recpId, setRecpId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<EngagementRecipient[]>([]);
  const [recpLoading, setRecpLoading] = useState(false);
  const [newRecpEmail, setNewRecpEmail] = useState('');
  const [newRecpAmount, setNewRecpAmount] = useState('100');
  const [savingRecp, setSavingRecp] = useState(false);

  // Distribute
  const [distributingId, setDistributingId] = useState<string | null>(null);
  const [distributing, setDistributing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('students');
  const [showQuestBuilder, setShowQuestBuilder] = useState(false);
  // My quests tracking
  const [myQuests, setMyQuests] = useState<any[]>([]);
  const [loadingMyQuests, setLoadingMyQuests] = useState(true);

  const selectedEngagement = useMemo(
    () =>
      engagements.find((e) => e.id === recpId) ||
      engagements.find((e) => e.id === fundingId) ||
      engagements.find((e) => e.id === distributingId) ||
      null,
    [engagements, recpId, fundingId, distributingId],
  );

  useEffect(() => {
    (async () => {
      try {
        setLoadingWallet(true);
        setLoadingEngagements(true);
        const [orgRes, walletRes, engRes] = await Promise.all([
          getMyOrg(),
          getMyOrgWallet().catch(() => null),
          listOrgEngagements(),
        ]);
        setOrg(orgRes);
        setWallet(walletRes);
        setEngagements(engRes);
        // Fetch organization status for gating/banner
        if (orgRes?.org_id) {
          const { data } = await (await import('@/lib/supabase')).supabase
            .from('organizations')
            .select('status')
            .eq('id', orgRes.org_id)
            .maybeSingle();
          setOrgStatus((data?.status as any) ?? null);
        }
      } catch (e: any) {
        showError('Load failed', e?.message || 'Could not load org data');
      } finally {
        setLoadingWallet(false);
        setLoadingEngagements(false);
      }
    })();
  }, []);

  // Load my quests (created by me or by my org) and subscribe to updates
  useEffect(() => {
    let sub: any;
    (async () => {
      try {
        setLoadingMyQuests(true);
        // Fetch quests either created by current user or linked to their org (if any)
        const [{ data: session }, { data: orgRow }] = await Promise.all([
          supabase.auth.getSession(),
          org?.org_id
            ? supabase.from('quests').select('*').eq('org_id', org.org_id)
            : supabase.from('quests').select('*').eq('created_by', (await supabase.auth.getUser()).data.user?.id ?? '0'),
        ] as any);
        const list = Array.isArray(orgRow) ? orgRow : Array.isArray(session) ? session : [];
        setMyQuests(list || []);
      } catch (_) {
        setMyQuests([]);
      } finally {
        setLoadingMyQuests(false);
      }

      // Realtime subscription scoped to my org if available, otherwise creator id
      try {
        const filter = org?.org_id
          ? { event: '*', schema: 'public', table: 'quests', filter: `org_id=eq.${org.org_id}` }
          : { event: '*', schema: 'public', table: 'quests' };
        sub = supabase
          .channel('org_my_quests')
          .on('postgres_changes', filter as any, async () => {
            try {
              const { data } = org?.org_id
                ? await supabase.from('quests').select('*').eq('org_id', org.org_id)
                : await supabase
                    .from('quests')
                    .select('*')
                    .eq('created_by', (await supabase.auth.getUser()).data.user?.id ?? '0');
              setMyQuests(data || []);
            } catch {}
          })
          .subscribe();
      } catch {}
    })();
    return () => {
      try { sub?.unsubscribe?.(); } catch {}
    };
  }, [org?.org_id]);

  // Subscribe to organization status changes to refresh banner/actions
  useEffect(() => {
    let sub: any;
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      sub = supabase
        .channel('org_status_channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, (p: any) => {
          if ((p.new as any)?.id && org?.org_id && (p.new as any).id === org.org_id) {
            setOrgStatus(((p.new as any).status as any) ?? null);
          }
        })
        .subscribe();
    })();
    return () => {
      try {
        sub?.unsubscribe?.();
      } catch {}
    };
  }, [org?.org_id]);

  // Realtime: refresh wallet when org_wallet changes for my org
  useEffect(() => {
    if (!org?.org_id) return;
    let sub: any;
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      sub = supabase
        .channel('org_wallet_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'org_coin_wallets', filter: `org_id=eq.${org.org_id}` },
          () => {
            // Refetch wallet when this org's wallet changes
            getMyOrgWallet()
              .then((w) => {
                setWallet(w);
                showSuccess('Wallet updated', `${(w?.balance ?? 0).toLocaleString()} coins`);
              })
              .catch(() => {});
          },
        )
        .subscribe();
    })();
    return () => {
      try {
        sub?.unsubscribe?.();
      } catch {}
    };
  }, [org?.org_id]);

  async function refreshEngagements() {
    try {
      setLoadingEngagements(true);
      const data = await listOrgEngagements();
      setEngagements(data);
    } catch (e: any) {
      showError('Refresh failed', e?.message || 'Unable to refresh engagements');
    } finally {
      setLoadingEngagements(false);
    }
  }

  async function refreshWallet() {
    try {
      setLoadingWallet(true);
      const w = await getMyOrgWallet();
      setWallet(w);
    } catch (e: any) {
      showError('Wallet refresh failed', e?.message || 'Unable to refresh wallet');
    } finally {
      setLoadingWallet(false);
    }
  }

  async function onCreateEngagement() {
    if (!newName.trim()) return showError('Missing name', 'Provide an engagement name');
    setCreating(true);
    try {
      await createOrgEngagement(newName.trim(), newDesc.trim() || undefined);
      showSuccess('Engagement created', 'You can now fund and add recipients');
      setNewName('');
      setNewDesc('');
      await refreshEngagements();
    } catch (e: any) {
      showError('Create failed', e?.message || 'Unable to create engagement');
    } finally {
      setCreating(false);
    }
  }

  async function onOpenRecipients(id: string) {
    setRecpId(id);
    setRecpLoading(true);
    try {
      const rows = await listEngagementRecipients(id);
      setRecipients(rows);
    } catch (e: any) {
      showError('Load recipients failed', e?.message || 'Unable to load recipients');
    } finally {
      setRecpLoading(false);
    }
  }

  async function onAddRecipient() {
    if (!recpId) return;
    if (!newRecpEmail.trim()) return showError('Missing email', 'Provide a user email');
    const amt = Number(newRecpAmount || 0);
    if (!(amt > 0)) return showError('Invalid amount', 'Amount must be > 0');
    setSavingRecp(true);
    try {
      await upsertEngagementRecipient(recpId, newRecpEmail.trim(), amt);
      showSuccess('Recipient added', 'They will receive coins upon distribution');
      setNewRecpEmail('');
      setNewRecpAmount('100');
      await onOpenRecipients(recpId);
    } catch (e: any) {
      showError('Add failed', e?.message || 'Unable to add recipient');
    } finally {
      setSavingRecp(false);
    }
  }

  async function onRemoveRecipient(email: string) {
    if (!recpId) return;
    try {
      await removeEngagementRecipient(recpId, email);
      showSuccess('Recipient removed', 'They will no longer be included');
      await onOpenRecipients(recpId);
    } catch (e: any) {
      showError('Remove failed', e?.message || 'Unable to remove recipient');
    }
  }

  async function onFundEngagement() {
    if (!fundingId) return;
    const amt = Number(fundAmount || 0);
    if (!(amt > 0)) return showError('Invalid amount', 'Amount must be > 0');
    setFunding(true);
    try {
      await fundOrgEngagement(fundingId, amt, fundReason.trim() || undefined);
      showSuccess('Engagement funded', 'Budget increased');
      setFundAmount('');
      setFundReason('Fund engagement');
      setFundingId(null);
      await Promise.all([refreshEngagements(), refreshWallet()]);
    } catch (e: any) {
      showError('Funding failed', e?.message || 'Unable to fund engagement');
    } finally {
      setFunding(false);
    }
  }

  async function onDistribute(id: string) {
    setDistributingId(id);
    setDistributing(true);
    try {
      await distributeEngagement(id);
      showSuccess('Distributed', 'Coins sent to recipients');
      await Promise.all([refreshEngagements(), refreshWallet()]);
    } catch (e: any) {
      showError('Distribution failed', e?.message || 'Unable to distribute');
    } finally {
      setDistributing(false);
      setDistributingId(null);
    }
  }

  return (
    <ProtectedRoute requiredRole={'staff'}>
      <OnboardingGate>
        <SEO title="Organization Dashboard" description="Manage your CHESS Quest organization: students, staff, services, attendance, and reports." image="/icons/google.svg" />
        <div className='container mx-auto p-6 max-w-6xl'>
          <h1 className='text-2xl font-bold text-white mb-6'>Organization Dashboard</h1>

          {/* Pending Approval Banner */}
          {orgStatus === 'pending' && (
            <GlassContainer className='mb-4 bg-yellow-500/10 border-yellow-400/30'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='text-yellow-300 font-semibold'>Organization Pending Approval</div>
                  <div className='text-gray-200 text-sm'>
                    Your organization onboarding is under review. You can set up engagements, but
                    distributions may be limited until approval is granted.
                  </div>
                </div>
                <a href='/onboarding/org' className='btn-secondary'>
                  View Onboarding
                </a>
              </div>
            </GlassContainer>
          )}
          {orgStatus === 'rejected' && (
            <GlassContainer className='mb-4 bg-red-500/10 border-red-400/30'>
              <div className='text-red-300'>Organization onboarding was rejected. Please update your submission.</div>
            </GlassContainer>
          )}

          {/* Wallet Panel */}
          <GlassContainer className='mb-6'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <div className='text-gray-200 text-sm'>Organization</div>
                <div className='text-white font-semibold text-lg'>{org?.name ?? '—'}</div>
              </div>
              <div>
                <div className='text-gray-200 text-sm'>Wallet Balance</div>
                <div className='text-2xl font-bold text-cyber-green-400'>
                  {loadingWallet ? '…' : (wallet?.balance ?? 0).toLocaleString()} coins
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <button className='btn-esports' onClick={refreshWallet} disabled={loadingWallet}>
                  {loadingWallet ? 'Refreshing…' : 'Refresh Wallet'}
                </button>
              </div>
            </div>
          </GlassContainer>

          {/* Create Engagement */}
          <GlassContainer className='mb-6'>
            <div className='flex items-center justify-between mb-3'>
              <h2 className='text-lg font-semibold text-white'>Create Engagement</h2>
              <button className='btn-esports' onClick={() => setShowQuestBuilder(true)}>
                New Quest
              </button>
            </div>
            <div className='grid md:grid-cols-3 gap-3'>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='Engagement name'
                className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder='Optional description'
                className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
              />
              <button className='btn-esports' onClick={onCreateEngagement} disabled={creating}>
                {creating ? 'Creating…' : 'Create Engagement'}
              </button>
            </div>
          </GlassContainer>

          {showQuestBuilder && (
            <QuestBuilder open={showQuestBuilder} onClose={() => setShowQuestBuilder(false)} />
          )}

          {/* Engagements List */}
          <GlassContainer>
            <div className='flex items-center justify-between mb-3'>
              <h2 className='text-lg font-semibold text-white'>Engagements</h2>
              <button
                className='btn-esports'
                onClick={refreshEngagements}
                disabled={loadingEngagements}
              >
                {loadingEngagements ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {loadingEngagements ? (
              <div className='text-gray-300'>Loading…</div>
            ) : engagements.length === 0 ? (
              <div className='text-gray-300'>No engagements yet. Create one above.</div>
            ) : (
              <div className='space-y-4'>
                {engagements.map((e) => (
                  <div key={e.id} className='bg-glass-dark border-glass-dark rounded-xl p-4'>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                      <div>
                        <div className='text-white font-semibold'>{e.name}</div>
                        {e.description && (
                          <div className='text-gray-300 text-sm'>{e.description}</div>
                        )}
                        <div className='text-gray-200 text-sm mt-1'>
                          Budget: {(e.budget_total ?? 0).toLocaleString()} • Remaining:{' '}
                          <span className='text-cyber-green-300 font-semibold'>
                            {(e.remaining ?? 0).toLocaleString()}
                          </span>{' '}
                          • Distributed: {(e.total_distributed ?? 0).toLocaleString()} • Status:{' '}
                          {e.status}
                        </div>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <button
                          className='btn-esports disabled:opacity-50 disabled:cursor-not-allowed'
                          onClick={() => {
                            if (!orgApproved) return;
                            setFundingId(e.id);
                            setFundAmount('');
                            setFundReason('Fund engagement');
                          }}
                          disabled={!orgApproved}
                          title={!orgApproved ? 'Pending approval required to fund' : undefined}
                        >
                          Fund
                        </button>
                        <button className='btn-esports' onClick={() => onOpenRecipients(e.id)}>
                          Recipients
                        </button>
                        <button
                          className='btn-esports disabled:opacity-50 disabled:cursor-not-allowed'
                          onClick={() => onDistribute(e.id)}
                          disabled={!orgApproved || (distributing && distributingId === e.id)}
                          title={
                            !orgApproved ? 'Pending approval required to distribute' : undefined
                          }
                        >
                          {distributing && distributingId === e.id ? 'Distributing…' : 'Distribute'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassContainer>

          {/* My Quests Tracker */}
          <div className='mt-8'>
            <GlassContainer>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-lg font-semibold text-white'>My Quests</h2>
                <button
                  className='btn-esports'
                  onClick={async () => {
                    try {
                      setLoadingMyQuests(true);
                      const { data } = org?.org_id
                        ? await supabase.from('quests').select('*').eq('org_id', org.org_id)
                        : await supabase
                            .from('quests')
                            .select('*')
                            .eq('created_by', (await supabase.auth.getUser()).data.user?.id ?? '0');
                      setMyQuests(data || []);
                    } catch {}
                    finally { setLoadingMyQuests(false); }
                  }}
                  disabled={loadingMyQuests}
                >
                  {loadingMyQuests ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              {loadingMyQuests ? (
                <div className='text-gray-300'>Loading…</div>
              ) : myQuests.length === 0 ? (
                <div className='text-gray-300'>No quests yet. Use "New Quest" to submit one.</div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm text-left'>
                    <thead>
                      <tr className='text-gray-300'>
                        <th className='py-2 pr-3 font-medium'>Title</th>
                        <th className='py-2 pr-3 font-medium'>Status</th>
                        <th className='py-2 pr-3 font-medium'>Reward</th>
                        <th className='py-2 pr-3 font-medium'>Seats</th>
                        <th className='py-2 pr-3 font-medium'>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myQuests.map((q) => (
                        <tr key={q.id} className='border-t border-white/10 hover:bg-white/5'>
                          <td className='py-2 pr-3 text-white'>{q.title}</td>
                          <td className='py-2 pr-3'>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${q.status === 'approved' ? 'bg-green-500/20 text-green-300 border border-green-400/30' : q.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'}`}>
                              {q.status}
                            </span>
                          </td>
                          <td className='py-2 pr-3 text-gray-200'>{Number(q.reward_coins ?? 0).toLocaleString()}</td>
                          <td className='py-2 pr-3 text-gray-200'>
                            {q.seats_total != null ? `${q.seats_taken ?? 0}/${q.seats_total}` : '—'}
                          </td>
                          <td className='py-2 pr-3 text-gray-400'>{new Date(q.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassContainer>
          </div>

          {/* CAMS Org Tabs */}
          <div className='mt-8'>
            <GlassContainer>
              <div className='mb-4'>
                <h2 className='text-lg font-semibold text-white'>C.A.M.S.</h2>
              </div>
              <Tabs
                tabs={[
                  { key: 'students', label: 'Students' },
                  { key: 'services', label: 'Services' },
                  { key: 'attendance', label: 'Attendance' },
                  { key: 'staff', label: 'Staff' },
                  { key: 'reports', label: 'Reports' },
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />
              <div className='mt-4'>
                {activeTab === 'students' && <StudentsTab />}
                {activeTab === 'services' && <ServicesTab />}
                {activeTab === 'attendance' && <AttendanceTab />}
                {activeTab === 'staff' && <StaffTab />}
                {activeTab === 'reports' && <ReportsTab />}
              </div>
            </GlassContainer>
          </div>

          {/* Funding Modal */}
          {fundingId && (
            <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
              <div className='w-full max-w-md bg-glass border-glass rounded-2xl p-6'>
                <div className='text-lg font-semibold text-white mb-3'>Fund Engagement</div>
                <div className='text-gray-300 text-sm mb-3'>
                  {selectedEngagement?.name} • Org wallet: {(wallet?.balance ?? 0).toLocaleString()}{' '}
                  coins
                </div>
                <div className='grid gap-3'>
                  <input
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder='Amount'
                    type='number'
                    className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
                  />
                  <input
                    value={fundReason}
                    onChange={(e) => setFundReason(e.target.value)}
                    placeholder='Reason'
                    className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
                  />
                  <div className='flex justify-end gap-2'>
                    <button
                      className='btn-secondary'
                      onClick={() => setFundingId(null)}
                      disabled={funding}
                    >
                      Cancel
                    </button>
                    <button className='btn-esports' onClick={onFundEngagement} disabled={funding}>
                      {funding ? 'Funding…' : 'Fund'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recipients Modal */}
          {recpId && (
            <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
              <div className='w-full max-w-2xl bg-glass border-glass rounded-2xl p-6'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='text-lg font-semibold text-white'>
                    Recipients • {selectedEngagement?.name}
                  </div>
                  <button className='btn-secondary' onClick={() => setRecpId(null)}>
                    Close
                  </button>
                </div>

                <div className='grid md:grid-cols-3 gap-3 mb-4'>
                  <input
                    value={newRecpEmail}
                    onChange={(e) => setNewRecpEmail(e.target.value)}
                    placeholder='Student email'
                    className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
                  />
                  <input
                    value={newRecpAmount}
                    onChange={(e) => setNewRecpAmount(e.target.value)}
                    placeholder='Amount'
                    type='number'
                    className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
                  />
                  <button className='btn-esports' onClick={onAddRecipient} disabled={savingRecp}>
                    {savingRecp ? 'Saving…' : 'Add/Update'}
                  </button>
                </div>

                {recpLoading ? (
                  <div className='text-gray-300'>Loading…</div>
                ) : recipients.length === 0 ? (
                  <div className='text-gray-300'>No recipients yet. Add one above.</div>
                ) : (
                  <div className='space-y-2'>
                    {recipients.map((r) => (
                      <div
                        key={r.user_id}
                        className='flex items-center justify-between bg-glass-dark border-glass-dark rounded-xl p-3'
                      >
                        <div>
                          <div className='text-white font-medium'>{r.email}</div>
                          <div className='text-gray-300 text-sm'>
                            Planned: {r.planned_amount.toLocaleString()}
                          </div>
                        </div>
                        <button
                          className='btn-secondary'
                          onClick={() => onRemoveRecipient(r.email)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </OnboardingGate>
    </ProtectedRoute>
  );
};

export default OrgDashboard;
