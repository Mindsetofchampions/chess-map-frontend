/**
 * Wallet Balance Chip
 * 
 * Displays current user's coin balance with real-time updates
 * and loading states.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Coins, RefreshCw } from 'lucide-react';
import { getMyWallet } from '../../lib/supabase';
import { useToast } from '../ToastProvider';
import type { Wallet } from '../../types/backend';

/**
 * Wallet Chip Props
 */
interface WalletChipProps {
  className?: string;
  showRefresh?: boolean;
  autoRefresh?: boolean;
}

/**
 * Wallet Chip Component
 * 
 * Features:
 * - Real-time balance display
 * - Manual refresh capability
 * - Loading states with smooth transitions
 * - Error handling with toast notifications
 * - Responsive design for mobile and desktop
 */
const WalletChip: React.FC<WalletChipProps> = ({
  className = '',
  showRefresh = false,
  autoRefresh = true
}) => {
  const { showError } = useToast();
  
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch wallet data
   */
  const fetchWallet = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getMyWallet();
      setWallet(data);
    } catch (error: any) {
      console.error('Failed to fetch wallet:', error);
      
      // Only show error toast for manual refresh
      if (isRefresh) {
        showError('Failed to refresh balance', error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  /**
   * Manual refresh handler
   */
  const handleRefresh = useCallback(() => {
    fetchWallet(true);
  }, [fetchWallet]);

  /**
   * Initial load and auto-refresh setup
   */
  useEffect(() => {
    fetchWallet();

    // Set up auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchWallet();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [fetchWallet, autoRefresh]);

  /**
   * Format balance for display
   */
  const formatBalance = (balance: number): string => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(1)}M`;
    }
    if (balance >= 1000) {
      return `${(balance / 1000).toFixed(1)}K`;
    }
    return balance.toLocaleString();
  };

  return (
    <motion.div
      className={`bg-glass border-glass rounded-full px-4 py-2 flex items-center gap-2 ${className}`}
      data-testid="chip-wallet"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Coins className="w-4 h-4 text-yellow-400 flex-shrink-0" />
      
      <div className="flex items-center gap-2">
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-300"></div>
            <span className="text-gray-300 text-sm">Loading...</span>
          </div>
        ) : (
          <span className="text-yellow-400 font-semibold text-sm whitespace-nowrap">
            {wallet ? formatBalance(wallet.balance) : '0'} coins
          </span>
        )}

        {showRefresh && !loading && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Refresh balance"
          >
            <RefreshCw className={`w-3 h-3 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default WalletChip;

/**
 * Hook for wallet data management
 * Provides wallet state and refresh functions for other components
 */
export const useWallet = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshWallet = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyWallet();
      setWallet(data);
    } catch (error) {
      console.error('Failed to refresh wallet:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    wallet,
    loading,
    refreshWallet,
    balance: wallet?.balance || 0
  };
};