/**
 * Master Admin Dashboard
 * 
 * Main interface for master_admin users with wallet management,
 * quest approval queue, and navigation shortcuts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Crown, 
  Award, 
  CheckCircle, 
  Settings, 
  TrendingUp,
  MapPin,
  Shield,
  RefreshCw,
  Calendar,
  Coins
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { supabase, rpcApproveQuest } from '@/lib/supabase';
import GlassContainer from '@/components/GlassContainer';
import WalletChip from '@/components/wallet/WalletChip';
import LedgerTable from '@/components/wallet/LedgerTable';
import LogoutButton from '@/components/LogoutButton';
import type { Quest } from '@/types/backend';

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
      <div className="w-12 h-12 bg-glass-dark rounded-full flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <p className="text-gray-300 text-sm">{title}</p>
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
  const { user, role } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [pendingQuests, setPendingQuests] = useState<Quest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  /**
   * Fetch pending quests for approval
   */
  const fetchPendingQuests = useCallback(async () => {
    setLoadingQuests(true);
    
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('id, title, reward_coins, status, created_at')
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(5); // Show only recent 5 for dashboard overview

      if (error) {
        throw new Error(error.message);
      }

      setPendingQuests(data || []);
    } catch (error: any) {
      console.error('Failed to fetch pending quests:', error);
      // Don't show error toast for dashboard - just log it
    } finally {
      setLoadingQuests(false);
    }
  }, []);

  /**
   * Handle quest approval from dashboard
   */
  const handleQuickApprove = useCallback(async (questId: string, rewardCoins: number) => {
    setApproving(questId);
    
    try {
      await rpcApproveQuest(questId);
      
      showSuccess(
        'Quest Approved!',
        `Quest approved and ${rewardCoins} coins deducted from wallet.`
      );
      
      // Refresh pending quests
      await fetchPendingQuests();
      
    } catch (error: any) {
      console.error('Failed to approve quest:', error);
      
      if (error.message.includes('permission') || error.message.includes('master_admin')) {
        showError('Permission Denied', 'Only master_admin can approve quests.');
      } else {
        showError('Approval Failed', error.message);
      }
    } finally {
      setApproving(null);
    }
  }, [showSuccess, showError, fetchPendingQuests]);

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
    fetchPendingQuests();
  }, [fetchPendingQuests]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
      <div className="container mx-auto max-w-7xl p-6">
        
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Master Admin Dashboard</h1>
              <p className="text-gray-300">System overview and quest management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <WalletChip showRefresh autoRefresh data-testid="chip-wallet" />
            <LogoutButton />
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Pending Approvals"
            value={pendingQuests.length.toString()}
            icon={<Award className="w-6 h-6 text-white" />}
            color="bg-neon-purple-500/20 border border-neon-purple-500/30"
            href="/master/quests/approvals"
            delay={0.1}
          />
          
          <StatsCard
            title="System Diagnostics"
            value="Check"
            icon={<Settings className="w-6 h-6 text-white" />}
            color="bg-electric-blue-500/20 border border-electric-blue-500/30"
            href="/admin/diagnostics"
            delay={0.2}
          />
          
          <StatsCard
            title="All Quests"
            value="View"
            icon={<MapPin className="w-6 h-6 text-white" />}
            color="bg-cyber-green-500/20 border border-cyber-green-500/30"
            href="/quests"
            delay={0.3}
          />
          
          <StatsCard
            title="Current Role"
            value={role}
            icon={<Shield className="w-6 h-6 text-white" />}
            color="bg-yellow-500/20 border border-yellow-500/30"
            delay={0.4}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Quick Approvals Queue */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassContainer variant="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Approval Queue</h2>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchPendingQuests}
                    disabled={loadingQuests}
                    className="p-2 bg-glass-dark border-glass hover:bg-glass-light rounded-lg transition-colors disabled:opacity-50"
                    aria-label="Refresh pending quests"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-300 ${loadingQuests ? 'animate-spin' : ''}`} />
                  </button>
                  
                  <Link
                    to="/master/quests/approvals"
                    className="text-electric-blue-400 hover:text-electric-blue-300 text-sm font-medium"
                  >
                    View All
                  </Link>
                </div>
              </div>

              {loadingQuests ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-glass-light rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-gray-600 rounded"></div>
                          <div className="w-20 h-3 bg-gray-600 rounded"></div>
                        </div>
                        <div className="w-16 h-8 bg-gray-600 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingQuests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-cyber-green-400 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">All Clear!</h3>
                  <p className="text-gray-300 text-sm">No quests pending approval</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingQuests.map((quest) => (
                    <div
                      key={quest.id}
                      className="bg-glass-light border-glass-light rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm mb-1">{quest.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-300">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(quest.created_at!)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            <span>{quest.reward_coins} coins</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleQuickApprove(quest.id, quest.reward_coins)}
                        disabled={approving === quest.id}
                        data-testid={`btn-approve-${quest.id}`}
                        className="bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded-lg px-3 py-1 font-medium transition-all duration-200 disabled:opacity-50 text-sm min-h-[36px] min-w-[70px]"
                      >
                        {approving === quest.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-cyber-green-400 mx-auto"></div>
                        ) : (
                          'Approve'
                        )}
                      </button>
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
            <LedgerTable data-testid="table-ledger" pageSize={10} />
          </motion.div>
        </div>

        {/* Navigation Shortcuts */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassContainer variant="card">
            <h3 className="text-xl font-semibold text-white mb-4">Quick Navigation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/master/quests/approvals"
                className="flex items-center gap-3 bg-glass-light border-glass hover:bg-glass-dark rounded-xl p-4 text-gray-300 hover:text-white transition-all duration-200 group"
              >
                <div className="p-2 bg-neon-purple-500/20 rounded-lg group-hover:bg-neon-purple-500/30 transition-colors">
                  <Award className="w-5 h-5 text-neon-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">Quest Approvals</h4>
                  <p className="text-gray-300 text-sm">Review and approve quests</p>
                </div>
              </Link>
              
              <Link
                to="/quests"
                className="flex items-center gap-3 bg-glass-light border-glass hover:bg-glass-dark rounded-xl p-4 text-gray-300 hover:text-white transition-all duration-200 group"
              >
                <div className="p-2 bg-cyber-green-500/20 rounded-lg group-hover:bg-cyber-green-500/30 transition-colors">
                  <MapPin className="w-5 h-5 text-cyber-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">All Quests</h4>
                  <p className="text-gray-300 text-sm">Browse all available quests</p>
                </div>
              </Link>
              
              <Link
                to="/admin/diagnostics"
                className="flex items-center gap-3 bg-glass-light border-glass hover:bg-glass-dark rounded-xl p-4 text-gray-300 hover:text-white transition-all duration-200 group"
              >
                <div className="p-2 bg-electric-blue-500/20 rounded-lg group-hover:bg-electric-blue-500/30 transition-colors">
                  <Settings className="w-5 h-5 text-electric-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">System Diagnostics</h4>
                  <p className="text-gray-300 text-sm">Check system health</p>
                </div>
              </Link>
            </div>
          </GlassContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default MasterDashboard;