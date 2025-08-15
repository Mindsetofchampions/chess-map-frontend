/**
 * Ledger Transaction Table
 * 
 * Displays user's coin transaction history with pagination
 * and filtering capabilities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Award
} from 'lucide-react';
import { getMyLedger } from '../../lib/supabase';
import { useToast } from '../ToastProvider';
import type { Ledger } from '../../types/backend';

/**
 * Ledger Table Props
 */
interface LedgerTableProps {
  className?: string;
  pageSize?: number;
  showPagination?: boolean;
}

/**
 * Ledger Table Component
 * 
 * Features:
 * - Paginated transaction history
 * - Real-time updates
 * - Transaction type indicators
 * - Mobile-responsive design
 * - Error handling with retry
 */
const LedgerTable: React.FC<LedgerTableProps> = ({
  className = '',
  pageSize = 20,
  showPagination = true
}) => {
  const { showError } = useToast();
  
  const [transactions, setTransactions] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  /**
   * Fetch ledger data
   */
  const fetchLedger = useCallback(async (page = 0, isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
    }

    try {
      const data = await getMyLedger(pageSize, page * pageSize);
      
      if (page === 0) {
        setTransactions(data || []);
      } else {
        setTransactions(prev => [...prev, ...(data || [])]);
      }
      
      setHasMore((data || []).length === pageSize);
    } catch (error: any) {
      console.error('Failed to fetch ledger:', error);
      showError('Failed to load transactions', error.message);
    } finally {
      setLoading(false);
    }
  }, [pageSize, showError]);

  /**
   * Load more transactions
   */
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchLedger(nextPage);
    }
  }, [loading, hasMore, currentPage, fetchLedger]);

  /**
   * Refresh transactions
   */
  const refresh = useCallback(() => {
    setCurrentPage(0);
    fetchLedger(0, true);
  }, [fetchLedger]);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchLedger(0);
  }, [fetchLedger]);

  /**
   * Format transaction kind for display
   */
  const formatKind = (kind: string): { label: string; color: string; icon: React.ReactNode } => {
    switch (kind) {
      case 'quest_award':
        return {
          label: 'Quest Reward',
          color: 'text-cyber-green-400',
          icon: <Award className="w-4 h-4" />
        };
      case 'quest_budget':
        return {
          label: 'Quest Funding',
          color: 'text-electric-blue-400',
          icon: <User className="w-4 h-4" />
        };
      case 'manual_adjust':
        return {
          label: 'Admin Adjustment',
          color: 'text-neon-purple-400',
          icon: <User className="w-4 h-4" />
        };
      default:
        return {
          label: kind,
          color: 'text-gray-400',
          icon: <Coins className="w-4 h-4" />
        };
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && transactions.length === 0) {
    return (
      <div className={`bg-glass border-glass rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-600 rounded-lg"></div>
                <div className="space-y-1">
                  <div className="w-24 h-4 bg-gray-600 rounded"></div>
                  <div className="w-16 h-3 bg-gray-600 rounded"></div>
                </div>
              </div>
              <div className="w-16 h-4 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-glass border-glass rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-glass">
        <h3 className="text-lg font-semibold text-white">Transaction History</h3>
        
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 bg-glass-dark border-glass hover:bg-glass-light rounded-lg transition-colors disabled:opacity-50"
          aria-label="Refresh transactions"
        >
          <RefreshCw className={`w-4 h-4 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Transactions List */}
      <div className="max-h-80 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-white font-medium mb-2">No Transactions Yet</h4>
            <p className="text-gray-300 text-sm">Complete quests to start earning coins!</p>
          </div>
        ) : (
          <div className="divide-y divide-glass">
            <AnimatePresence>
              {transactions.map((transaction, index) => {
                const kindInfo = formatKind(transaction.kind);
                
                return (
                  <motion.div
                    key={transaction.id}
                    className="p-4 hover:bg-glass-light transition-colors"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-glass-dark border-glass`}>
                          {kindInfo.icon}
                        </div>
                        
                        <div>
                          <h4 className="text-white font-medium text-sm">{kindInfo.label}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(transaction.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`flex items-center gap-1 font-semibold ${
                          transaction.delta > 0 ? 'text-cyber-green-400' : 'text-red-400'
                        }`}>
                          {transaction.delta > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {transaction.delta > 0 ? '+' : ''}{transaction.delta.toLocaleString()}
                          </span>
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

      {/* Pagination */}
      {showPagination && transactions.length > 0 && hasMore && (
        <div className="p-4 border-t border-glass">
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full bg-glass-dark border-glass hover:bg-glass-light text-gray-300 hover:text-white rounded-lg px-4 py-2 font-medium transition-all duration-200 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-300"></div>
                <span>Loading...</span>
              </div>
            ) : (
              'Load More Transactions'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default LedgerTable;