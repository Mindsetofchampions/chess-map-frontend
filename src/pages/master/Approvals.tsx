/**
 * Master Admin Approvals Page
 * 
 * Interface for master_admin to approve/reject submitted quests
 * with wallet balance validation and batch operations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Coins, 
  Calendar,
  User,
  RefreshCw,
  Crown,
  Shield
} from 'lucide-react';
import { supabase, rpcApproveQuest, rpcRejectQuest, getPlatformBalance } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToApprovals } from '@/lib/realtime/quests';
import { formatDateTime } from '@/utils/format';
import { mapPgError } from '@/utils/mapPgError';
import { useToast } from '@/components/ToastProvider';
import GlassContainer from '@/components/GlassContainer';
import WalletChip from '@/components/wallet/WalletChip';
// Remove strict Quest import and define a minimal type for approvals list
// import type { Quest } from '@/types/backend'

type ApprovalQuest = {
  id: string;
  title: string;
  description?: string; // not provided by view; left optional for UI fallback
  reward_coins: number;
  status: string;
  created_at?: string;
  created_by?: string;
  creator_email?: string;
};

/**
 * Master Admin Approvals Component
 * 
 * Features:
 * - Lists all submitted quests awaiting approval
 * - Wallet balance validation before approval
 * - Approve/reject actions via RPC calls
 * - Real-time updates and error handling
 * - Authorization banner for non-master users
 */
const Approvals: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const { role, user, roleLoading } = useAuth();
  
  const [quests, setQuests] = useState<ApprovalQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [platformBalance, setPlatformBalance] = useState<number>(0);

  /**
   * Fetch submitted quests awaiting approval
   */
  const fetchSubmittedQuests = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('admin_approval_queue_vw')
        .select('id, title, reward_coins, status, created_at, created_by, creator_email')
        .order('created_at', { ascending: false });
      
      if (error) {
        const mappedError = mapPgError(error);
        throw new Error(mappedError.message);
      }
      
      setQuests((data as unknown as ApprovalQuest[]) || []);
    } catch (error: any) {
      console.error('Failed to fetch submitted quests:', error);
      const mappedError = mapPgError(error);
      showError('Failed to load quests', mappedError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch platform balance
   */
  const fetchPlatformBalance = useCallback(async () => {
    try {
      const balance = await getPlatformBalance();
      setPlatformBalance(Number(balance.coins ?? 0));
    } catch (error: any) {
      console.error('Failed to fetch platform balance:', error);
      setPlatformBalance(0);
    }
  }, []);

  /**
   * Handle quest approval
   */
  const handleApprove = useCallback(async (questId: string, rewardCoins: number) => {
    // Check platform balance before attempting approval
    if (platformBalance < rewardCoins) {
      showWarning(
        'Insufficient Balance',
        `Platform needs ${rewardCoins} coins but only has ${platformBalance}. Quest approval requires funding the reward.`
      );
      return;
    }

    setApproving(questId);
    
    try {
      await rpcApproveQuest(questId);
      
      showSuccess(
        'Quest Approved!',
        `Quest has been approved and ${rewardCoins} coins deducted from platform balance.`
      );
      
      // Refresh data
      await Promise.all([
        fetchSubmittedQuests(),
        fetchPlatformBalance()
      ]);
      
    } catch (error: any) {
      console.error('Failed to approve quest:', error);
      const mappedError = mapPgError(error);
      showError('Approval Failed', mappedError.message);
    } finally {
      setApproving(null);
    }
  }, [platformBalance, showSuccess, showError, showWarning, fetchSubmittedQuests, fetchPlatformBalance]);

  /**
   * Handle quest rejection
   */
  const handleReject = useCallback(async (questId: string, reason: string) => {
    if (!reason.trim()) {
      showWarning('Rejection Reason Required', 'Please provide a reason for rejecting this quest.');
      return;
    }

    setRejecting(questId);
    
    try {
      await rpcRejectQuest(questId, reason);
      
      showSuccess(
        'Quest Rejected',
        'Quest has been rejected and the creator will be notified.'
      );
      
      // Refresh data and close modal
      await fetchSubmittedQuests();
      setShowRejectModal(null);
      setRejectReason('');
      
    } catch (error: any) {
      console.error('Failed to reject quest:', error);
      showError('Rejection Failed', mapPgError(error).message);
    } finally {
      setRejecting(null);
    }
  }, [showSuccess, showError, showWarning, fetchSubmittedQuests]);

  /**
   * Get persona display info
   */
  const getPersonaInfo = (attributeId?: string | null) => {
    // Default persona info when no attribute is linked
    const defaultPersona = { name: 'General Quest', emoji: '📝' };
    if (!attributeId) return defaultPersona;
    // Placeholder mapping until attribute->persona mapping is implemented
    return defaultPersona;
  };

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
    fetchSubmittedQuests();
    fetchPlatformBalance();

    // Set up realtime subscription
    const subscription = subscribeToApprovals(() => {
      console.log('Realtime update: refreshing submitted quests...');
      fetchSubmittedQuests();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSubmittedQuests, fetchPlatformBalance]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
      <div className="container mx-auto max-w-7xl p-6">
        <button
          className="mb-4 inline-flex items-center gap-2 text-cyber-green-300 hover:text-cyber-green-200 text-sm font-medium"
          onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/master/dashboard')}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back to Dashboard
        </button>
        
  {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-8 h-8 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white">Quest Approvals</h1>
          </div>
          <p className="text-gray-200 text-lg">Review and approve quests to make them available to students</p>
          
          <div className="flex items-center justify-center gap-4 mt-4">
            <WalletChip showRefresh />
            <div className="bg-glass border-glass rounded-full px-4 py-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-electric-blue-400" />
              <span className="text-white text-sm font-medium">
                Platform: {platformBalance.toLocaleString()} coins
              </span>
            </div>
            <div className="text-gray-300 text-sm">
              {quests.length} quest{quests.length !== 1 ? 's' : ''} awaiting approval
            </div>
          </div>
          {/* Debug badge */}
          <div className="flex justify-center mt-3">
            <div className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 px-2 py-1 rounded-md">
              {roleLoading ? 'role: loading...' : `role: ${role}`}
              {user ? ` • id: ${user.id}` : ''}
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-glass border-glass rounded-xl p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="w-48 h-4 bg-gray-600 rounded"></div>
                      <div className="w-32 h-3 bg-gray-600 rounded"></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-20 h-8 bg-gray-600 rounded"></div>
                    <div className="w-20 h-8 bg-gray-600 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : quests.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <GlassContainer variant="card" className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-cyber-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Pending Approvals</h3>
              <p className="text-gray-300 mb-6">All submitted quests have been reviewed.</p>
              
              <button
                onClick={fetchSubmittedQuests}
                className="btn-esports flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </GlassContainer>
          </motion.div>
        ) : (
          /* Approvals List */
          <div className="space-y-4">
            <AnimatePresence>
              {quests.map((quest, index) => {
                const personaInfo = getPersonaInfo(undefined);
                
                return (
                  <motion.div
                    key={quest.id}
                    className="bg-glass border-glass rounded-xl p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between">
                      
                      {/* Quest Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="text-3xl flex-shrink-0">{personaInfo.emoji}</div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-lg mb-1">{quest.title}</h3>
                          <p className="text-gray-200 text-sm mb-2 line-clamp-2">
                            {quest.description || 'No description provided'}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-300">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDateTime(quest.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{personaInfo.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reward and Actions */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1 font-semibold text-yellow-400">
                            <Coins className="w-4 h-4" />
                            <span>{quest.reward_coins} coins</span>
                          </div>
                          {platformBalance < quest.reward_coins && (
                            <p className="text-red-400 text-xs mt-1">Insufficient platform balance</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(quest.id, quest.reward_coins)}
                            disabled={platformBalance < quest.reward_coins || approving === quest.id || rejecting === quest.id}
                            data-testid={`btn-approve-${quest.id}`}
                            className="bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded-lg px-4 py-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[80px]"
                          >
                            {approving === quest.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyber-green-400 mx-auto"></div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                <span>Approve</span>
                              </div>
                            )}
                          </button>
                          
                          <button
                            onClick={() => openRejectModal(quest.id)}
                            disabled={rejecting === quest.id || approving === quest.id}
                            className="bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-lg px-4 py-2 font-medium transition-all duration-200 disabled:opacity-50 min-h-[44px] min-w-[80px]"
                          >
                            {rejecting === quest.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mx-auto"></div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                <span>Reject</span>
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              className="bg-glass backdrop-blur-2xl border-glass rounded-2xl shadow-2xl p-6 max-w-md w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Reject Quest</h3>
              <p className="text-gray-200 mb-4">
                Please provide a reason for rejecting this quest. This will be visible to the creator.
              </p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full bg-glass border-glass rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[100px] resize-none"
                autoFocus
              />
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeRejectModal}
                  className="flex-1 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 font-medium transition-all duration-200"
                  disabled={rejecting === showRejectModal}
                >
                  Cancel
                </button>
                
                <button
                  onClick={() => handleReject(showRejectModal, rejectReason)}
                  disabled={!rejectReason.trim() || rejecting === showRejectModal}
                  className="flex-1 bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-xl px-4 py-2 font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {rejecting === showRejectModal ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
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
      </div>
    </div>
  );
};

export default Approvals;