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
  AlertTriangle,
  RefreshCw,
  Crown
} from 'lucide-react';
import { supabase, rpcApproveQuest } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { useWallet } from '@/components/wallet/WalletChip';
import GlassContainer from '@/components/GlassContainer';
import WalletChip from '@/components/wallet/WalletChip';
import type { Quest } from '@/types/backend';

/**
 * Not Authorized Banner Component
 * Shown when user lacks master_admin privileges
 */
const NotAuthorizedBanner: React.FC = () => (
  <motion.div
    className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
  >
    <div className="flex items-center gap-2 text-red-200">
      <AlertTriangle className="w-5 h-5" />
      <h4 className="font-medium">Not Authorized</h4>
    </div>
    <p className="text-red-100 text-sm mt-2">
      You need master_admin privileges to approve quests. The server will enforce this permission.
    </p>
  </motion.div>
);

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
  const { wallet, refreshWallet } = useWallet();
  
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [showUnauthorized, setShowUnauthorized] = useState(false);

  /**
   * Fetch submitted quests awaiting approval
   */
  const fetchSubmittedQuests = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('id, title, description, reward_coins, status, attribute_id, created_at')
        .eq('status', 'submitted')
        .order('created_at', { ascending: true });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setQuests(data || []);
    } catch (error: any) {
      console.error('Failed to fetch submitted quests:', error);
      showError('Failed to load quests', error.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Handle quest approval
   */
  const handleApprove = useCallback(async (questId: string, rewardCoins: number) => {
    // Check wallet balance before attempting approval
    if (wallet && wallet.balance < rewardCoins) {
      showWarning(
        'Insufficient Balance',
        `You need ${rewardCoins} coins but only have ${wallet.balance}. Quest approval requires funding the reward.`
      );
      return;
    }

    setApproving(questId);
    
    try {
      await rpcApproveQuest(questId);
      
      showSuccess(
        'Quest Approved!',
        `Quest has been approved and ${rewardCoins} coins deducted from your wallet.`
      );
      
      // Refresh data
      await Promise.all([
        fetchSubmittedQuests(),
        refreshWallet()
      ]);
      
    } catch (error: any) {
      console.error('Failed to approve quest:', error);
      
      // Check for permission errors
      if (error.message.includes('permission') || error.message.includes('master_admin')) {
        setShowUnauthorized(true);
        showError('Permission Denied', 'Only master_admin can approve quests.');
      } else {
        showError('Approval Failed', error.message);
      }
    } finally {
      setApproving(null);
    }
  }, [wallet, showSuccess, showError, showWarning, fetchSubmittedQuests, refreshWallet]);

  /**
   * Get persona display info
   */
  const getPersonaInfo = (attributeId: string | null) => {
    // Default persona info when no attribute is linked
    const defaultPersona = { name: 'General Quest', emoji: '📝' };
    
    if (!attributeId) {
      return defaultPersona;
    }
    
    // For now, return default since we don't have direct persona mapping
    // This would need to be enhanced with proper attribute->persona mapping
    const personaMap = {
      hootie: { name: 'Hootie the Owl', emoji: '🦉' },
      kittykat: { name: 'Kitty Kat', emoji: '🐱' },
      gino: { name: 'Gino the Dog', emoji: '🐕' },
      hammer: { name: 'Hammer the Robot', emoji: '🤖' },
      badge: { name: 'MOC Badge', emoji: '🏛️' }
    };
    
    return defaultPersona;
  };

  /**
   * Check if user can afford quest approval
   */
  const canAfford = (cost: number): boolean => {
    return wallet ? wallet.balance >= cost : false;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Initialize data
   */
  useEffect(() => {
    fetchSubmittedQuests();
    refreshWallet();
  }, [fetchSubmittedQuests, refreshWallet]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
      <div className="container mx-auto max-w-7xl p-6">
        
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
            <div className="text-gray-300 text-sm">
              {quests.length} quest{quests.length !== 1 ? 's' : ''} awaiting approval
            </div>
          </div>
        </motion.div>

        {/* Not Authorized Banner */}
        {showUnauthorized && <NotAuthorizedBanner />}

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
                const personaInfo = getPersonaInfo(quest.attribute_id);
                const affordable = canAfford(quest.reward_coins);
                
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
                              <span>{formatDate(quest.created_at!)}</span>
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
                          <div className={`flex items-center gap-1 font-semibold ${
                            affordable ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            <Coins className="w-4 h-4" />
                            <span>{quest.reward_coins} coins</span>
                          </div>
                          {!affordable && (
                            <p className="text-red-400 text-xs mt-1">Insufficient balance</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(quest.id, quest.reward_coins)}
                            disabled={!affordable || approving === quest.id}
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
                            onClick={() => {
                              // For now, just show that reject would work here
                              showWarning('Reject Quest', 'Reject functionality would be implemented here');
                            }}
                            disabled={approving === quest.id}
                            className="bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-lg px-4 py-2 font-medium transition-all duration-200 disabled:opacity-50 min-h-[44px] min-w-[80px]"
                          >
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </div>
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
      </div>
    </div>
  );
};

export default Approvals;