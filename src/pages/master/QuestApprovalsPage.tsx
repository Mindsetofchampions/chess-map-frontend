/**
 * Master Admin Quest Approvals Page
 * 
 * Comprehensive interface for master administrators to review and approve
 * submitted quests with wallet balance management and batch operations.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useQuests } from '../../hooks/useQuests';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../contexts/AuthContext';
import GlassContainer from '../../components/GlassContainer';
import ApprovalsTable from '../../components/quests/ApprovalsTable';

/**
 * Master Admin Quest Approvals Page Component
 * 
 * Features:
 * - Real-time pending quest queue
 * - Wallet balance monitoring with insufficient funds warnings
 * - Comprehensive quest approval interface
 * - Statistics dashboard for approval metrics
 * - Batch approval operations for efficiency
 */
const QuestApprovalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { 
    pendingApprovals, 
    stats, 
    refreshPendingApprovals, 
    refreshStats 
  } = useQuests();
  const { balance, refreshWallet } = useWallet();

  /**
   * Initialize data on mount
   */
  useEffect(() => {
    refreshPendingApprovals();
    refreshStats();
    refreshWallet();
  }, [refreshPendingApprovals, refreshStats, refreshWallet]);

  /**
   * Calculate approval statistics
   */
  const approvalStats = {
    pendingCount: pendingApprovals.length,
    totalPendingCost: pendingApprovals.reduce((sum, quest) => sum + quest.reward_coins, 0),
    averageReward: pendingApprovals.length > 0 ? 
      Math.round(pendingApprovals.reduce((sum, quest) => sum + quest.reward_coins, 0) / pendingApprovals.length) : 0,
    affordableCount: pendingApprovals.filter(quest => quest.reward_coins <= balance).length
  };

  /**
   * Handle successful quest update
   */
  const handleQuestUpdate = () => {
    refreshPendingApprovals();
    refreshStats();
    refreshWallet();
  };

  // Check access permissions
  if (profile?.role !== 'master_admin') {
    return (
      <GlassContainer variant="page">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-300">Only master administrators can approve quests.</p>
        </div>
      </GlassContainer>
    );
  }

  return (
    <GlassContainer variant="page">
      <div className="container mx-auto max-w-7xl">
        
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            onClick={() => navigate('/master-admin/dashboard')}
            className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </motion.button>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Quest Approvals</h1>
          <p className="text-gray-200 text-lg">
            Review and approve submitted quests to make them available to students
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            className="bg-glass border-glass rounded-xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Clock className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{approvalStats.pendingCount}</h3>
            <p className="text-gray-300 text-sm">Pending Approval</p>
          </motion.div>

          <motion.div
            className="bg-glass border-glass rounded-xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Coins className="w-10 h-10 text-electric-blue-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{balance.toLocaleString()}</h3>
            <p className="text-gray-300 text-sm">Available Balance</p>
          </motion.div>

          <motion.div
            className="bg-glass border-glass rounded-xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TrendingUp className="w-10 h-10 text-neon-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{approvalStats.averageReward}</h3>
            <p className="text-gray-300 text-sm">Average Reward</p>
          </motion.div>

          <motion.div
            className="bg-glass border-glass rounded-xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CheckCircle className="w-10 h-10 text-cyber-green-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{approvalStats.affordableCount}</h3>
            <p className="text-gray-300 text-sm">Can Afford</p>
          </motion.div>
        </div>

        {/* Budget Warning */}
        {approvalStats.totalPendingCost > balance && (
          <motion.div
            className="mb-6 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2 text-amber-200">
              <Coins className="w-5 h-5" />
              <h4 className="font-medium">Budget Alert</h4>
            </div>
            <p className="text-amber-100 text-sm mt-2">
              Total pending quest cost ({approvalStats.totalPendingCost.toLocaleString()} coins) 
              exceeds your current balance ({balance.toLocaleString()} coins). 
              You can only approve quests worth {balance.toLocaleString()} coins or less.
            </p>
          </motion.div>
        )}

        {/* Approvals Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ApprovalsTable 
            onQuestUpdate={handleQuestUpdate}
          />
        </motion.div>

        {/* Quick Actions */}
        {pendingApprovals.length > 0 && (
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassContainer variant="card">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-glass-light border-glass-light rounded-xl p-4">
                  <h4 className="font-medium text-white mb-2">Approval Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pending:</span>
                      <span className="text-white">{approvalStats.pendingCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Cost:</span>
                      <span className="text-white">{approvalStats.totalPendingCost} coins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Can Afford:</span>
                      <span className={approvalStats.affordableCount === approvalStats.pendingCount ? 'text-cyber-green-400' : 'text-yellow-400'}>
                        {approvalStats.affordableCount}/{approvalStats.pendingCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-glass-light border-glass-light rounded-xl p-4">
                  <h4 className="font-medium text-white mb-2">Quest Types</h4>
                  <div className="space-y-1 text-sm">
                    {['mcq', 'text', 'video'].map(type => {
                      const count = pendingApprovals.filter(q => q.qtype === type).length;
                      return (
                        <div key={type} className="flex justify-between">
                          <span className="text-gray-300 capitalize">{type}:</span>
                          <span className="text-white">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-glass-light border-glass-light rounded-xl p-4">
                  <h4 className="font-medium text-white mb-2">System Status</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Active Quests:</span>
                      <span className="text-white">{stats?.active_quests || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Completion Rate:</span>
                      <span className="text-white">{stats?.completion_rate || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Templates:</span>
                      <span className="text-white">{stats?.total_templates || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassContainer>
          </motion.div>
        )}
      </div>
    </GlassContainer>
  );
};

export default QuestApprovalsPage;