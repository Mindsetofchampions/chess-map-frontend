/**
 * Quest Approvals Table for Master Admin
 * 
 * Comprehensive table for managing quest approvals with wallet
 * balance validation and batch operations.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Coins, 
  Calendar,
  User,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useQuests } from '../../hooks/useQuests';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../contexts/AuthContext';
import GlassContainer from '../GlassContainer';
import type { QuestWithTemplate } from '../../types/quest';

/**
 * Props for ApprovalsTable component
 */
interface ApprovalsTableProps {
  /** Callback when quest is approved/rejected */
  onQuestUpdate?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Quest approval action interface
 */
interface ApprovalAction {
  questId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

/**
 * Quest Approvals Table Component
 * 
 * Features:
 * - Real-time pending quest list
 * - Wallet balance validation before approval
 * - Batch approval operations
 * - Quest preview with template details
 * - Rejection reason tracking
 * - Mobile-responsive design
 */
const ApprovalsTable: React.FC<ApprovalsTableProps> = ({
  onQuestUpdate,
  className = ''
}) => {
  const { user } = useAuth();
  const { pendingApprovals, approveQuest, rejectQuest, approving, refreshPendingApprovals } = useQuests();
  const { balance, refreshWallet } = useWallet();

  // Component state
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [previewQuest, setPreviewQuest] = useState<QuestWithTemplate | null>(null);

  /**
   * Calculate total cost for selected quests
   */
  const totalSelectedCost = pendingApprovals
    .filter(quest => selectedQuests.has(quest.id))
    .reduce((sum, quest) => sum + quest.reward_coins, 0);

  /**
   * Check if user can afford quest approval
   */
  const canAffordQuest = useCallback((questCost: number): boolean => {
    return balance >= questCost;
  }, [balance]);

  /**
   * Handle individual quest approval
   */
  const handleApprove = useCallback(async (questId: string) => {
    const quest = pendingApprovals.find(q => q.id === questId);
    if (!quest) return;

    if (!canAffordQuest(quest.reward_coins)) {
      alert(`Insufficient balance. Need ${quest.reward_coins} coins, have ${balance}.`);
      return;
    }

    try {
      await approveQuest(questId);
      onQuestUpdate?.();
      await refreshWallet(); // Update balance display
    } catch (error: any) {
      alert(`Failed to approve quest: ${error.message}`);
    }
  }, [pendingApprovals, approveQuest, canAffordQuest, balance, onQuestUpdate, refreshWallet]);

  /**
   * Handle quest rejection with reason
   */
  const handleReject = useCallback(async (questId: string, reason?: string) => {
    try {
      await rejectQuest(questId, reason);
      setRejectReason(prev => ({ ...prev, [questId]: '' }));
      setShowRejectModal(null);
      onQuestUpdate?.();
    } catch (error: any) {
      alert(`Failed to reject quest: ${error.message}`);
    }
  }, [rejectQuest, onQuestUpdate]);

  /**
   * Toggle quest selection for batch operations
   */
  const toggleQuestSelection = useCallback((questId: string) => {
    setSelectedQuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questId)) {
        newSet.delete(questId);
      } else {
        newSet.add(questId);
      }
      return newSet;
    });
  }, []);

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

  if (pendingApprovals.length === 0) {
    return (
      <GlassContainer variant="card" className={`text-center ${className}`}>
        <div className="py-12">
          <CheckCircle className="w-16 h-16 text-cyber-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Pending Approvals</h3>
          <p className="text-gray-300">All submitted quests have been reviewed.</p>
          
          <motion.button
            onClick={refreshPendingApprovals}
            className="mt-4 btn-esports flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </motion.button>
        </div>
      </GlassContainer>
    );
  }

  return (
    <div className={className}>
      
      {/* Header with Wallet Info */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Quest Approvals</h2>
          <p className="text-gray-300">{pendingApprovals.length} quest{pendingApprovals.length !== 1 ? 's' : ''} awaiting approval</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-glass border-glass rounded-xl px-4 py-2 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-semibold">{balance.toLocaleString()} coins</span>
          </div>
          
          {selectedQuests.size > 0 && (
            <div className="bg-electric-blue-500/20 border border-electric-blue-500/30 rounded-xl px-4 py-2">
              <span className="text-electric-blue-300 text-sm">
                {selectedQuests.size} selected • {totalSelectedCost} coins total
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Approvals Table */}
      <GlassContainer variant="card" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-glass-light border-b border-glass">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedQuests.size === pendingApprovals.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedQuests(new Set(pendingApprovals.map(q => q.id)));
                      } else {
                        setSelectedQuests(new Set());
                      }
                    }}
                    className="text-electric-blue-500 focus:ring-electric-blue-400"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Quest</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Creator</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Reward</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Submitted</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass">
              <AnimatePresence>
                {pendingApprovals.map((quest, index) => (
                  <motion.tr
                    key={quest.id}
                    className="hover:bg-glass-light transition-colors duration-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedQuests.has(quest.id)}
                        onChange={() => toggleQuestSelection(quest.id)}
                        className="text-electric-blue-500 focus:ring-electric-blue-400"
                      />
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <h4 className="font-medium text-white">{quest.title}</h4>
                        <p className="text-gray-300 text-sm truncate max-w-xs">
                          {quest.description || 'No description'}
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-200 text-sm">
                          {(quest as any).creator?.email || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-glass-dark border-glass text-gray-300 capitalize">
                        {quest.qtype}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className={`font-medium ${
                          canAffordQuest(quest.reward_coins) ? 'text-white' : 'text-red-400'
                        }`}>
                          {quest.reward_coins}
                        </span>
                      </div>
                      {!canAffordQuest(quest.reward_coins) && (
                        <p className="text-red-400 text-xs mt-1">Insufficient balance</p>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-300 text-sm">
                        <Calendar className="w-3 h-3" />
                        {formatDate(quest.created_at)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewQuest(quest)}
                          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-glass-dark transition-colors"
                          title="Preview quest"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleApprove(quest.id)}
                          disabled={!canAffordQuest(quest.reward_coins) || approving === quest.id}
                          className="p-2 text-cyber-green-400 hover:text-cyber-green-300 rounded-lg hover:bg-cyber-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Approve quest"
                        >
                          {approving === quest.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyber-green-400"></div>
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => setShowRejectModal(quest.id)}
                          disabled={approving === quest.id}
                          className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/20 transition-colors"
                          title="Reject quest"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </GlassContainer>

      {/* Quest Preview Modal */}
      <AnimatePresence>
        {previewQuest && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewQuest(null)}
          >
            <motion.div
              className="bg-glass backdrop-blur-xl border-glass rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-2xl font-bold text-white mb-4">{previewQuest.title}</h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-gray-300 text-sm">Description</span>
                    <p className="text-white">{previewQuest.description || 'No description provided'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-300 text-sm">Quest Type</span>
                      <p className="text-white capitalize">{previewQuest.qtype}</p>
                    </div>
                    <div>
                      <span className="text-gray-300 text-sm">Reward</span>
                      <p className="text-white">{previewQuest.reward_coins} coins</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-300 text-sm">Persona</span>
                      <p className="text-white capitalize">{previewQuest.persona_key}</p>
                    </div>
                    <div>
                      <span className="text-gray-300 text-sm">Location</span>
                      <p className="text-white">{previewQuest.lat.toFixed(4)}, {previewQuest.lng.toFixed(4)}</p>
                    </div>
                  </div>
                  
                  {/* Template Info */}
                  {previewQuest.template && (
                    <div className="bg-glass-light border-glass-light rounded-xl p-4">
                      <span className="text-gray-300 text-sm">Based on Template</span>
                      <h4 className="text-white font-medium">{previewQuest.template.title}</h4>
                      {previewQuest.template.description && (
                        <p className="text-gray-200 text-sm mt-1">{previewQuest.template.description}</p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      handleApprove(previewQuest.id);
                      setPreviewQuest(null);
                    }}
                    disabled={!canAffordQuest(previewQuest.reward_coins)}
                    className="flex-1 btn-esports disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve ({previewQuest.reward_coins} coins)
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowRejectModal(previewQuest.id);
                      setPreviewQuest(null);
                    }}
                    className="bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-xl px-6 py-3 font-medium transition-all duration-200"
                  >
                    Reject
                  </button>
                  
                  <button
                    onClick={() => setPreviewQuest(null)}
                    className="bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRejectModal(null)}
          >
            <motion.div
              className="bg-glass backdrop-blur-xl border-glass rounded-2xl shadow-2xl max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Reject Quest</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Reason for Rejection (optional)
                    </label>
                    <textarea
                      value={rejectReason[showRejectModal] || ''}
                      onChange={(e) => setRejectReason(prev => ({
                        ...prev,
                        [showRejectModal]: e.target.value
                      }))}
                      rows={3}
                      className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                      placeholder="Explain why this quest was rejected to help the creator improve..."
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleReject(showRejectModal, rejectReason[showRejectModal])}
                    className="flex-1 bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-xl px-6 py-3 font-medium transition-all duration-200"
                  >
                    Confirm Rejection
                  </button>
                  
                  <button
                    onClick={() => setShowRejectModal(null)}
                    className="bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApprovalsTable;