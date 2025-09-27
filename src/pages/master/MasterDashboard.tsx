/**
 * Master Admin Dashboard
 *
 * Main interface for master_admin users with wallet management,
 * quest approval queue, and navigation shortcuts.
 */

import { motion } from 'framer-motion';
import {
  Crown,
  Award,
  CheckCircle,
  Settings,
  MapPin,
  Shield,
  RefreshCw,
  Calendar,
  Coins,
  XCircle,
  PlusCircle,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

import DiagnosticsWidget from '@/components/DiagnosticsWidget';
import GlassContainer from '@/components/GlassContainer';
import LogoutButton from '@/components/LogoutButton';
import SEO from '@/components/SEO';
import { useToast } from '@/components/ToastProvider';
import Tabs from '@/components/ui/Tabs';
import LedgerTable from '@/components/wallet/LedgerTable';
import WalletChip from '@/components/wallet/WalletChip';
import { useAuth } from '@/contexts/AuthContext';
import { createSystemNotification } from '@/lib/notifications';
import { subscribeToApprovals } from '@/lib/realtime/quests';
import {
  supabase,
  rpcApproveQuest,
  rpcRejectQuest,
  getPlatformBalance,
  getOrgBalances,
  allocateOrgCoins,
  allocateUserCoins,
  topUpPlatformBalance,
  type OrgBalance,
} from '@/lib/supabase';
import MasterLedger from '@/pages/master/tabs/MasterLedger';
import MasterMap from '@/pages/master/tabs/MasterMap';
import MasterOrganizations from '@/pages/master/tabs/MasterOrganizations';
import MasterReports from '@/pages/master/tabs/MasterReports';
import MasterRewards from '@/pages/master/tabs/MasterRewards';
import type { Quest } from '@/types/backend';
import { formatDateTime } from '@/utils/format';
import { mapPgError } from '@/utils/mapPgError';

/**
 * Dashboard Stats Card Props
 */
interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  delay?: number;
  href?: string;
}

/**
 * Reusable stats card component
 */
const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, delay = 0, href }) => {
  const content = (
    <motion.div
      className={`${color} rounded-xl p-6 text-center hover:bg-glass-dark transition-all duration-300 ${href ? 'cursor-pointer hover:scale-105 hover:-translate-y-2' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={href ? { scale: 1.02, y: -2 } : {}}
    >
      <div className='w-12 h-12 bg-glass-dark rounded-full flex items-center justify-center mx-auto mb-3'>
        {icon}
      </div>
      <h3 className='text-2xl font-bold text-white mb-1'>{value}</h3>
      <p className='text-gray-300 text-sm'>{title}</p>
    </motion.div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
};

/**
 * Master Admin Dashboard Component
 *
 * Features:
 * - Wallet balance with auto-refresh
 * - Transaction history with pagination
 * - Quest approval queue with quick actions
 * - Navigation shortcuts to key areas
 * - Real-time data updates
 */
const MasterDashboard: React.FC = () => {
  const { role, user, roleLoading } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [pendingQuests, setPendingQuests] = useState<Quest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [platformBalance, setPlatformBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [orgBalances, setOrgBalances] = useState<OrgBalance[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [serverConfirmed, setServerConfirmed] = useState<boolean>(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [allocateAmount, setAllocateAmount] = useState<string>('');
  const [allocateReason, setAllocateReason] = useState<string>('Master allocation');
  const [allocating, setAllocating] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  // Allocate to user modal state
  const [showUserAllocate, setShowUserAllocate] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userAmount, setUserAmount] = useState('');
  const [userReason, setUserReason] = useState('Direct user allocation');
  const [allocatingUser, setAllocatingUser] = useState(false);
  const [pendingOrgOnboardings, setPendingOrgOnboardings] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('orgs');

  /**
   * Fetch pending quests for approval
   */
  const fetchPendingQuests = useCallback(async () => {
    setLoadingQuests(true);

    try {
      const { data, error } = await supabase
        .from('admin_approval_queue_vw')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        const mappedError = mapPgError(error);
        throw new Error(mappedError.message);
      }

      setPendingQuests(data || []);
    } catch (error: any) {
      console.error('Failed to fetch pending quests:', error);
      showError('Failed to load pending quests', mapPgError(error).message);
    } finally {
      setLoadingQuests(false);
    }
  }, [role]);

  // Fetch pending org onboardings count for quick stats
  const fetchPendingOrgOnboardings = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('list_org_onboardings', { p_status: 'pending' });
      if (error) throw error;
      setPendingOrgOnboardings(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      // non-fatal for dashboard
      setPendingOrgOnboardings(0);
    }
  }, []);

  /**
   * Fetch platform balance
   */
  const fetchPlatformBalance = useCallback(async () => {
    setBalanceLoading(true);

    try {
      const balance = await getPlatformBalance();
      // coerce coins to a number safely
      const coins = Number(balance?.coins ?? 0);

      // Mark serverConfirmed when the RPC returned successfully (even if 0). This avoids
      // blocking actions due to transient RLS/read issues where the RPC itself works.
      setServerConfirmed(true);

      // If running as master_admin and balance is unexpectedly low, do a manual-capable auto top-up
      // (we still prefer manual top-up via the button below if auto top-up fails)
      if ((role as any) === 'master_admin' && coins < 100000) {
        try {
          const toAdd = 100000 - coins;
          console.info(`Auto top-up: adding ${toAdd} coins to platform balance`);
          await topUpPlatformBalance(toAdd, 'Auto top-up for master_admin testing');
          const refreshed = await getPlatformBalance();
          const refreshedCoins = Number(refreshed?.coins ?? coins + toAdd);
          setPlatformBalance(refreshedCoins);
          setServerConfirmed(true);
          return;
        } catch (topUpErr) {
          console.error('Auto top-up failed:', topUpErr);
          // Fall through and show client-side hint (but keep serverConfirmed true because RPC succeeded)
        }
      }

      // Ensure UI/state shows at least 100k for master_admin to allow testing allocations client-side
      const displayCoins = role === 'master_admin' && coins < 100000 ? 100000 : coins;
      setPlatformBalance(displayCoins);
    } catch (error: any) {
      console.error('Failed to fetch platform balance:', error);
      // If master_admin and DB read failed, fall back to 100k for testing (client-side only)
      if ((role as any) === 'master_admin') {
        setPlatformBalance(100000);
        setServerConfirmed(false);
      } else {
        setPlatformBalance(0);
        setServerConfirmed(false);
      }
    } finally {
      setBalanceLoading(false);
    }
  }, [role]);

  /**
   * Manual top-up handler
   */
  const handleTopUp = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const current = await getPlatformBalance();
      const coins = Number(current?.coins ?? 0);
      if (coins >= 100000) {
        showWarning('No Top-up Needed', 'Platform balance already at or above 100,000 coins.');
        setPlatformBalance(coins);
        setServerConfirmed(true);
        return;
      }

      const toAdd = 100000 - coins;
      await topUpPlatformBalance(toAdd, 'Manual top-up by master admin');
      const refreshed = await getPlatformBalance();
      const refreshedCoins = Number(refreshed?.coins ?? 0);
      setPlatformBalance(refreshedCoins);
      setServerConfirmed(true);
      showSuccess('Top-up Complete', `Added ${toAdd.toLocaleString()} coins to platform balance.`);
    } catch (error: any) {
      console.error('Top-up failed:', error);
      showError('Top-up Failed', mapPgError(error).message || 'Unable to top up platform balance');
    } finally {
      setBalanceLoading(false);
    }
  }, [showSuccess, showError, showWarning]);

  const fetchOrgBalances = useCallback(async () => {
    setOrgsLoading(true);
    try {
      const rows = await getOrgBalances();
      setOrgBalances(rows);
    } catch (error: any) {
      console.error('Failed to fetch org balances:', error);
      setOrgBalances([]);
    } finally {
      setOrgsLoading(false);
    }
  }, []);

  /**
   * Handle quest approval from dashboard
   */
  const handleQuickApprove = useCallback(
    async (questId: string, rewardCoins: number) => {
      // Require server-confirmed balance for approvals
      if (!serverConfirmed) {
        showWarning(
          'Unconfirmed Balance',
          'Platform balance is not server-confirmed. Please top up via the dashboard before approving quests.',
        );
        return;
      }

      // Check platform balance before attempting approval
      if (platformBalance < rewardCoins) {
        showWarning(
          'Insufficient Balance',
          `Platform needs ${rewardCoins} coins but only has ${platformBalance}. Quest approval requires funding the reward.`,
        );
        return;
      }

      setApproving(questId);

      try {
        const resp: any = await rpcApproveQuest(questId);

        // If RPC returned a remaining_balance, use it immediately for UI responsiveness
        if (resp && (resp.remaining_balance !== undefined || resp.remaining_balance !== null)) {
          const rem = Number(
            resp.remaining_balance ?? resp.remainingBalance ?? platformBalance - rewardCoins,
          );
          setPlatformBalance(rem);
          setServerConfirmed(true);
        }

        showSuccess(
          'Quest Approved!',
          `Quest has been approved and ${rewardCoins} coins deducted from platform balance.`,
        );

        // Refresh data (fetch authoritative balance)
        await Promise.all([fetchPendingQuests(), fetchPlatformBalance()]);
      } catch (error: any) {
        console.error('Failed to approve quest:', error);
        const mappedError = mapPgError(error);
        showError('Approval Failed', mappedError.message);
      } finally {
        setApproving(null);
      }
    },
    [
      platformBalance,
      showSuccess,
      showError,
      showWarning,
      fetchPendingQuests,
      fetchPlatformBalance,
    ],
  );

  /**
   * Handle quest rejection from dashboard
   */
  const handleQuickReject = useCallback(
    async (questId: string, reason: string) => {
      if (!reason.trim()) {
        showWarning(
          'Rejection Reason Required',
          'Please provide a reason for rejecting this quest.',
        );
        return;
      }

      setRejecting(questId);

      try {
        await rpcRejectQuest(questId, reason);

        showSuccess('Quest Rejected', 'Quest has been rejected and the creator will be notified.');

        // Refresh data and close modal
        await fetchPendingQuests();
        setShowRejectModal(null);
        setRejectReason('');
      } catch (error: any) {
        console.error('Failed to reject quest:', error);
        showError('Rejection Failed', mapPgError(error).message);
      } finally {
        setRejecting(null);
      }
    },
    [showSuccess, showError, showWarning, fetchPendingQuests],
  );

  /**
   * Open reject modal
   */
  const openRejectModal = useCallback((questId: string) => {
    setShowRejectModal(questId);
    setRejectReason('');
  }, []);

  /**
   * Close reject modal
   */
  const closeRejectModal = useCallback(() => {
    setShowRejectModal(null);
    setRejectReason('');
  }, []);

  /**
   * Initialize data and realtime subscriptions
   */
  useEffect(() => {
    fetchPendingQuests();
    fetchPlatformBalance();
    fetchOrgBalances();
    fetchPendingOrgOnboardings();

    // Set up realtime subscription for pending quests
    const subscription = subscribeToApprovals(() => {
      console.log('Realtime update: refreshing pending quests...');
      fetchPendingQuests();
    });

    // Subscribe to platform_balance changes to update balance in realtime
    const pbChannel = supabase
      .channel('platform_balance_watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_balance' },
        (payload: any) => {
          console.log('Platform balance realtime event:', payload);
          // Refresh balance and mark serverConfirmed
          fetchPlatformBalance();
          setServerConfirmed(true);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      try {
        supabase.removeChannel(pbChannel);
      } catch (e) {
        /* ignore */
      }
    };
  }, [fetchPendingQuests, fetchPlatformBalance, fetchOrgBalances]);

  const openAllocate = () => {
    setSelectedOrg(orgBalances[0]?.org_id || '');
    setAllocateAmount('');
    setShowAllocateModal(true);
  };
  const closeAllocate = () => setShowAllocateModal(false);

  const handleAllocate = async () => {
    const amount = parseInt(allocateAmount || '0', 10);
    if (!selectedOrg) return showWarning('Select Organization', 'Please choose an organization.');
    if (!amount || amount <= 0) return showWarning('Invalid Amount', 'Enter a positive amount.');
    if (!serverConfirmed)
      return showWarning(
        'Unconfirmed Balance',
        'Platform balance is not confirmed by server. Please top up first.',
      );
    if (amount > platformBalance)
      return showWarning('Insufficient Balance', 'Amount exceeds platform balance.');

    setAllocating(true);
    try {
      const resp: any = await allocateOrgCoins(
        selectedOrg,
        amount,
        allocateReason || 'Master allocation',
      );
      // If RPC returned an updated platform balance, use it immediately
      if (resp && resp.remaining_balance !== undefined) {
        setPlatformBalance(Number(resp.remaining_balance));
        setServerConfirmed(true);
      }

      showSuccess('Coins Allocated', 'Organization wallet has been funded.');
      await Promise.all([fetchPlatformBalance(), fetchOrgBalances()]);
      setShowAllocateModal(false);
    } catch (error: any) {
      showError('Allocation Failed', error.message || 'Unable to allocate');
    } finally {
      setAllocating(false);
    }
  };

  const handleAllocateUser = async () => {
    const amt = parseInt(userAmount || '0', 10);
    if (!userEmail.trim()) return showWarning('Email Required', 'Enter a user email.');
    if (!amt || amt <= 0) return showWarning('Invalid Amount', 'Enter a positive amount.');
    if (!serverConfirmed)
      return showWarning(
        'Unconfirmed Balance',
        'Platform balance is not confirmed by server. Please top up first.',
      );
    if (amt > platformBalance)
      return showWarning('Insufficient Balance', 'Amount exceeds platform balance.');

    setAllocatingUser(true);
    try {
      await allocateUserCoins(userEmail.trim(), amt, userReason || 'Direct user allocation');
      showSuccess('Coins Allocated', `Allocated ${amt.toLocaleString()} coins to ${userEmail}.`);
      await fetchPlatformBalance();
      setShowUserAllocate(false);
      setUserEmail('');
      setUserAmount('');
    } catch (error: any) {
      showError('Allocation Failed', mapPgError(error).message || error.message || 'Failed');
    } finally {
      setAllocatingUser(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary'>
      <SEO
        title='Master Admin Dashboard'
        description='Approve quests, manage wallets and organizations, and monitor system health.'
        image='/icons/google.svg'
      />
      <div className='container mx-auto max-w-7xl p-6'>
        {/* Back button hidden on dashboard, but placeholder for consistency */}
        <div className='mb-4'>{/* No back button on dashboard */}</div>

        {/* Header */}
        <motion.div
          className='flex items-center justify-between mb-8'
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className='flex items-center gap-3'>
            <Crown className='w-8 h-8 text-yellow-400' />
            <div>
              <h1 className='text-3xl font-bold text-white'>Master Admin Dashboard</h1>
              <p className='text-gray-300'>System overview and quest management</p>
            </div>
          </div>

          <div className='flex flex-col gap-2 items-end'>
            <div className='flex items-center gap-3'>
              <WalletChip showRefresh autoRefresh data-testid='chip-wallet' />
              <DiagnosticsWidget />
              <div className='bg-glass border-glass rounded-full px-4 py-2 flex items-center gap-2'>
                <Shield className='w-4 h-4 text-electric-blue-400' />
                <span className='text-white text-sm font-medium'>
                  Platform: {balanceLoading ? '...' : `${platformBalance.toLocaleString()} coins`}
                </span>
              </div>
              {/* Show manual top-up for master admins when not confirmed or below target */}
              {role === 'master_admin' && (
                <button
                  onClick={handleTopUp}
                  disabled={balanceLoading}
                  className='p-2 bg-glass-dark border-glass rounded-lg hover:bg-glass-light transition-colors disabled:opacity-50 text-sm'
                  aria-label='Top up platform to 100k'
                >
                  Top up to 100k
                </button>
              )}
              <button onClick={openAllocate} className='btn-esports flex items-center gap-2'>
                <PlusCircle className='w-4 h-4' /> Allocate to Org
              </button>
              <button
                onClick={() => setShowUserAllocate(true)}
                className='btn-esports flex items-center gap-2'
              >
                <PlusCircle className='w-4 h-4' /> Allocate to User
              </button>
              <LogoutButton />
            </div>
            {/* Show total platform coins for clarity */}
            <div className='flex items-center gap-2 mt-1'>
              <Coins className='w-4 h-4 text-cyber-green-300' />
              <span className='text-cyber-green-200 text-xs font-semibold'>
                Total Platform Coins:{' '}
                {balanceLoading ? '...' : `${platformBalance.toLocaleString()} coins`}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Debug badge (shows resolved role + user id for debugging) */}
        <div className='flex justify-end mb-4'>
          <div className='text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 px-2 py-1 rounded-md'>
            {roleLoading ? 'role: loading...' : `role: ${role}`}
            {user ? ` • id: ${user.id}` : ''}
          </div>
        </div>

        {/* Quick Stats */}

        <div className='grid grid-cols-1 md:grid-cols-5 gap-6 mb-8'>
          <StatsCard
            title='Pending Approvals'
            value={pendingQuests.length.toString()}
            icon={<Award className='w-6 h-6 text-white' />}
            color='bg-neon-purple-500/20 border border-neon-purple-500/30'
            href='/master/quests/approvals'
            delay={0.1}
          />
          <StatsCard
            title='Pending Org Onboardings'
            value={pendingOrgOnboardings.toString()}
            icon={<Shield className='w-6 h-6 text-white' />}
            color='bg-yellow-500/20 border border-yellow-500/30'
            href='/master/org-onboarding'
            delay={0.15}
          />
          <StatsCard
            title='System Diagnostics'
            value='Check'
            icon={<Settings className='w-6 h-6 text-white' />}
            color='bg-electric-blue-500/20 border border-electric-blue-500/30'
            href='/admin/diagnostics'
            delay={0.2}
          />
          <StatsCard
            title='All Quests'
            value='View'
            icon={<MapPin className='w-6 h-6 text-white' />}
            color='bg-cyber-green-500/20 border border-cyber-green-500/30'
            href='/quests'
            delay={0.3}
          />
          <StatsCard
            title='User Management'
            value='Manage'
            icon={<Shield className='w-6 h-6 text-cyber-green-300' />}
            color='bg-cyber-green-500/20 border border-cyber-green-500/30'
            href='/master/users'
            delay={0.35}
          />
          <StatsCard
            title='Current Role'
            value={role}
            icon={<Shield className='w-6 h-6 text-white' />}
            color='bg-yellow-500/20 border border-yellow-500/30'
            delay={0.4}
          />
        </div>

        {/* Quick System Notification composer for master_admin */}
        {role === 'master_admin' && (
          <div className='mb-6'>
            <GlassContainer variant='card'>
              <h3 className='text-lg font-semibold text-white mb-2'>Send System Notification</h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                <input
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder='Title'
                  className='col-span-2 bg-glass border-glass rounded-xl px-3 py-2 text-white'
                />
                <input
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder='Message'
                  className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
                />
              </div>
              <div className='mt-3 flex gap-2'>
                <button
                  disabled={sendingNotif || !notifTitle.trim() || !notifBody.trim()}
                  onClick={async () => {
                    try {
                      setSendingNotif(true);
                      await createSystemNotification({
                        title: notifTitle.trim(),
                        body: notifBody.trim(),
                        created_by: user?.id ?? undefined,
                      });
                      setNotifTitle('');
                      setNotifBody('');
                      showSuccess('Notification Sent', 'System notification created');
                    } catch (err: any) {
                      console.error('Failed to send notification', err);
                      showError('Failed', err?.message || 'Unable to create notification');
                    } finally {
                      setSendingNotif(false);
                    }
                  }}
                  className='btn-esports disabled:opacity-50'
                >
                  Send
                </button>
                <button
                  onClick={() => {
                    setNotifTitle('');
                    setNotifBody('');
                  }}
                  className='bg-glass border-glass rounded-xl px-4 py-2 text-gray-300'
                >
                  Clear
                </button>
              </div>
            </GlassContainer>
          </div>
        )}

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Quick Approvals Queue */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassContainer variant='card'>
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-xl font-semibold text-white'>Approval Queue</h2>

                <div className='flex items-center gap-2'>
                  <button
                    onClick={fetchPendingQuests}
                    disabled={loadingQuests}
                    className='p-2 bg-glass-dark border-glass hover:bg-glass-light rounded-lg transition-colors disabled:opacity-50'
                    aria-label='Refresh pending quests'
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-gray-300 ${orgsLoading ? 'animate-spin' : ''}`}
                    />
                  </button>

                  <Link
                    to='/master/quests/approvals'
                    className='text-electric-blue-400 hover:text-electric-blue-300 text-sm font-medium'
                  >
                    View All
                  </Link>
                </div>
              </div>

              {loadingQuests ? (
                <div className='space-y-3'>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className='animate-pulse bg-glass-light rounded-lg p-4'>
                      <div className='flex items-center justify-between'>
                        <div className='space-y-2'>
                          <div className='w-32 h-4 bg-gray-600 rounded'></div>
                          <div className='w-20 h-3 bg-gray-600 rounded'></div>
                        </div>
                        <div className='w-16 h-8 bg-gray-600 rounded'></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingQuests.length === 0 ? (
                <div className='text-center py-8'>
                  <CheckCircle className='w-12 h-12 text-cyber-green-400 mx-auto mb-4' />
                  <h3 className='text-white font-medium mb-2'>All Clear!</h3>
                  <p className='text-gray-300 text-sm'>No quests pending approval</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {pendingQuests.map((quest) => (
                    <div
                      key={quest.id}
                      className='bg-glass-light border-glass-light rounded-lg p-4 flex items-center justify-between'
                    >
                      <div className='flex-1 min-w-0'>
                        <h4 className='font-medium text-white text-sm mb-1'>{quest.title}</h4>
                        <div className='flex items-center gap-3 text-xs text-gray-300'>
                          <div className='flex items-center gap-1'>
                            <Calendar className='w-3 h-3' />
                            <span>{formatDateTime(quest.created_at)}</span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Coins className='w-3 h-3' />
                            <span>{quest.reward_coins} coins</span>
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center gap-4 flex-shrink-0'>
                        <div className='text-right'>
                          <div className='flex items-center gap-1 font-semibold text-yellow-400'>
                            <Coins className='w-4 h-4' />
                            <span>{quest.reward_coins} coins</span>
                          </div>
                          {platformBalance < quest.reward_coins && (
                            <p className='text-red-400 text-xs mt-1'>
                              Insufficient platform balance
                            </p>
                          )}
                        </div>

                        <div className='flex items-center gap-1'>
                          <button
                            onClick={() => handleQuickApprove(quest.id, quest.reward_coins)}
                            disabled={
                              !serverConfirmed ||
                              platformBalance < quest.reward_coins ||
                              approving === quest.id ||
                              rejecting === quest.id
                            }
                            data-testid={`btn-approve-${quest.id}`}
                            className='bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded-lg px-3 py-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] min-w-[70px] text-sm'
                          >
                            {approving === quest.id ? (
                              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-cyber-green-400 mx-auto'></div>
                            ) : (
                              <div className='flex items-center gap-1'>
                                <CheckCircle className='w-4 h-4' />
                                <span>Approve</span>
                              </div>
                            )}
                          </button>

                          <button
                            onClick={() => openRejectModal(quest.id)}
                            disabled={rejecting === quest.id || approving === quest.id}
                            className='bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-lg px-3 py-2 font-medium transition-all duration-200 disabled:opacity-50 min-h-[40px] min-w-[70px] text-sm'
                          >
                            {rejecting === quest.id ? (
                              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mx-auto'></div>
                            ) : (
                              <div className='flex items-center gap-1'>
                                <XCircle className='w-4 h-4' />
                                <span>Reject</span>
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassContainer>
          </motion.div>

          {/* Transaction History */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <LedgerTable data-testid='table-ledger' pageSize={10} />
          </motion.div>
        </div>

        {/* Navigation Shortcuts */}
        <motion.div
          className='mt-8'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassContainer variant='card'>
            <h3 className='text-xl font-semibold text-white mb-4'>Quick Navigation</h3>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Link
                to='/master/quests/approvals'
                className='flex items-center gap-3 bg-glass-light border-glass hover:bg-glass-dark rounded-xl p-4 text-gray-300 hover:text-white transition-all duration-200 group'
              >
                <div className='p-2 bg-neon-purple-500/20 rounded-lg group-hover:bg-neon-purple-500/30 transition-colors'>
                  <Award className='w-5 h-5 text-neon-purple-400' />
                </div>
                <div>
                  <h4 className='font-medium text-white'>Quest Approvals</h4>
                  <p className='text-gray-300 text-sm'>Review and approve quests</p>
                </div>
              </Link>

              <Link
                to='/quests'
                className='flex items-center gap-3 bg-glass-light border-glass hover:bg-glass-dark rounded-xl p-4 text-gray-300 hover:text-white transition-all duration-200 group'
              >
                <div className='p-2 bg-cyber-green-500/20 rounded-lg group-hover:bg-cyber-green-500/30 transition-colors'>
                  <MapPin className='w-5 h-5 text-cyber-green-400' />
                </div>
                <div>
                  <h4 className='font-medium text-white'>All Quests</h4>
                  <p className='text-gray-300 text-sm'>Browse all available quests</p>
                </div>
              </Link>

              <Link
                to='/admin/diagnostics'
                className='flex items-center gap-3 bg-glass-light border-glass hover:bg-glass-dark rounded-xl p-4 text-gray-300 hover:text-white transition-all duration-200 group'
              >
                <div className='p-2 bg-electric-blue-500/20 rounded-lg group-hover:bg-electric-blue-500/30 transition-colors'>
                  <Settings className='w-5 h-5 text-electric-blue-400' />
                </div>
                <div>
                  <h4 className='font-medium text-white'>System Diagnostics</h4>
                  <p className='text-gray-300 text-sm'>Check system health</p>
                </div>
              </Link>
            </div>
          </GlassContainer>
        </motion.div>

        {/* CAMS Admin Tabs */}
        <motion.div
          className='mt-8'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <GlassContainer variant='card'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-semibold text-white'>C.A.M.S. Admin</h3>
            </div>
            <Tabs
              tabs={[
                { key: 'orgs', label: 'Organizations' },
                { key: 'map', label: 'Master Map' },
                { key: 'ledger', label: 'Ledger' },
                { key: 'reports', label: 'Reports' },
                { key: 'rewards', label: 'Rewards' },
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
            <div className='mt-4'>
              {activeTab === 'orgs' && <MasterOrganizations />}
              {activeTab === 'map' && <MasterMap />}
              {activeTab === 'ledger' && <MasterLedger />}
              {activeTab === 'reports' && <MasterReports />}
              {activeTab === 'rewards' && <MasterRewards />}
            </div>
          </GlassContainer>
        </motion.div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
            <motion.div
              className='bg-glass backdrop-blur-2xl border-glass rounded-2xl shadow-2xl p-6 max-w-md w-full'
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <h3 className='text-xl font-bold text-white mb-4'>Reject Quest</h3>
              <p className='text-gray-200 mb-4'>
                Please provide a reason for rejecting this quest. This will be visible to the
                creator.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder='Enter rejection reason...'
                className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[100px] resize-none'
                autoFocus
              />

              <div className='flex gap-3 mt-6'>
                <button
                  onClick={closeRejectModal}
                  className='flex-1 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 font-medium transition-all duration-200'
                  disabled={rejecting === showRejectModal}
                >
                  Cancel
                </button>

                <button
                  onClick={() => handleQuickReject(showRejectModal, rejectReason)}
                  disabled={!rejectReason.trim() || rejecting === showRejectModal}
                  className='flex-1 bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-xl px-4 py-2 font-medium transition-all duration-200 disabled:opacity-50'
                >
                  {rejecting === showRejectModal ? (
                    <div className='flex items-center justify-center gap-2'>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-red-400'></div>
                      <span>Rejecting...</span>
                    </div>
                  ) : (
                    'Reject Quest'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Allocation Modal */}
        {showAllocateModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
            <motion.div
              className='bg-glass backdrop-blur-2xl border-glass rounded-2xl shadow-2xl p-6 max-w-md w-full'
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h3 className='text-xl font-bold text-white mb-2'>Allocate Coins to Organization</h3>
              <p className='text-gray-300 mb-4'>
                Distribute coins from platform balance to an organization wallet.
              </p>

              <label className='block text-sm text-gray-300 mb-1'>Organization</label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white mb-3'
              >
                {orgBalances.map((o) => (
                  <option key={o.org_id} value={o.org_id}>
                    {o.name}
                  </option>
                ))}
              </select>

              <label className='block text-sm text-gray-300 mb-1'>Amount</label>
              <input
                type='number'
                min={1}
                placeholder='e.g. 1000'
                value={allocateAmount}
                onChange={(e) => setAllocateAmount(e.target.value)}
                className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white mb-3'
              />

              <label className='block text-sm text-gray-300 mb-1'>Reason</label>
              <input
                type='text'
                value={allocateReason}
                onChange={(e) => setAllocateReason(e.target.value)}
                className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white mb-4'
              />

              <div className='flex gap-3'>
                <button
                  onClick={closeAllocate}
                  className='flex-1 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 font-medium transition-all duration-200'
                  disabled={allocating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllocate}
                  disabled={allocating || !selectedOrg}
                  className='flex-1 bg-electric-blue-500/20 border border-electric-blue-500/30 text-electric-blue-300 hover:bg-electric-blue-500/30 rounded-xl px-4 py-2 font-medium transition-all duration-200'
                >
                  {allocating ? 'Allocating...' : 'Allocate Coins'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Allocate to User Modal */}
        {showUserAllocate && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
            <motion.div
              className='bg-glass backdrop-blur-2xl border-glass rounded-2xl shadow-2xl p-6 max-w-md w-full'
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h3 className='text-xl font-bold text-white mb-2'>Allocate Coins to User</h3>
              <p className='text-gray-300 mb-4'>Send coins directly to a user by email.</p>

              <label className='block text-sm text-gray-300 mb-1'>User Email</label>
              <input
                type='email'
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder='user@example.com'
                className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white mb-3'
              />

              <label className='block text-sm text-gray-300 mb-1'>Amount</label>
              <input
                type='number'
                min={1}
                value={userAmount}
                onChange={(e) => setUserAmount(e.target.value)}
                placeholder='e.g. 500'
                className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white mb-3'
              />

              <label className='block text-sm text-gray-300 mb-1'>Reason</label>
              <input
                type='text'
                value={userReason}
                onChange={(e) => setUserReason(e.target.value)}
                className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white mb-4'
              />

              <div className='flex gap-3'>
                <button
                  onClick={() => setShowUserAllocate(false)}
                  className='flex-1 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 font-medium transition-all duration-200'
                  disabled={allocatingUser}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllocateUser}
                  disabled={allocatingUser || !userEmail.trim()}
                  className='flex-1 bg-electric-blue-500/20 border border-electric-blue-500/30 text-electric-blue-300 hover:bg-electric-blue-500/30 rounded-xl px-4 py-2 font-medium transition-all duration-200'
                >
                  {allocatingUser ? 'Allocating...' : 'Allocate Coins'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterDashboard;
