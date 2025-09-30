/**
 * Wallet Balance Chip
 *
 * Displays current user's coin balance with real-time updates
 * and loading states.
 */

import { motion } from 'framer-motion';
import { Coins, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { useToast } from '@/components/ToastProvider';
import { getMyWallet } from '@/lib/supabase';
import type { Wallet } from '@/types/backend';

/**
 * Wallet Chip Props
 */
interface WalletChipProps {
  className?: string;
  showRefresh?: boolean;
  autoRefresh?: boolean;
  [key: string]: any; // Allow additional props like data-testid
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
  autoRefresh = true,
  ...props
}) => {
  const { showError } = useToast();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch wallet data
   */
  const fetchWallet = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const walletData = await getMyWallet();
        setWallet(walletData);
        setLoading(false);
        setRefreshing(false);
      } catch (error: any) {
        console.error('Failed to fetch wallet:', error);
        // Only show error toast for manual refresh
        if (isRefresh) {
          showError('Failed to refresh balance', error.message);
        }
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showError],
  );

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
    let alive = true;
    let timer: number | undefined;
    let backoff = 30000; // 30s default

    const tick = async () => {
      let next = backoff;
      try {
        await fetchWallet();
        next = 15000; // faster after success
      } catch (e: any) {
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('no wallet'))
          next = 30000; // slow down if none
        else next = Math.min(60000, backoff * 1.5); // mild exponential backoff
      }
      // schedule next run if still active
      if (alive && autoRefresh) {
        window.clearTimeout(timer);
        timer = window.setTimeout(tick, next) as unknown as number;
      }
      backoff = next;
    };

    // initial request
    tick();

    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [fetchWallet, autoRefresh]);

  /**
   * Format balance for display
   */
  const formatBalance = (balance: number): string => {
    // Handle undefined, null, or non-numeric values
    if (typeof balance !== 'number' || balance == null || isNaN(balance)) {
      return '0';
    }

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
      {...props}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Coins className='w-4 h-4 text-yellow-400 flex-shrink-0' />

      <div className='flex items-center gap-2'>
        {loading ? (
          <div className='flex items-center gap-2'>
            <div className='animate-spin rounded-full h-4 w-4 border-b border-gray-300'></div>
            <span className='text-gray-300 text-sm'>Loading...</span>
          </div>
        ) : (
          <span className='text-yellow-400 font-semibold text-sm whitespace-nowrap'>
            {formatBalance(wallet?.balance || 0)} coins
          </span>
        )}

        {showRefresh && !loading && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className='p-1 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50'
            aria-label='Refresh balance'
          >
            <RefreshCw className={`w-3 h-3 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* subtle helper badge: coin award visibility */}
        {!loading && (
          <span
            title='Admin coin awards on approval are deposited here. See Ledger for details.'
            className='hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10'
          >
            awards auto-credited
          </span>
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
      const walletData = await getMyWallet();
      setWallet(walletData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to refresh wallet:', error);
      setLoading(false);
    }
  }, []);

  return {
    wallet,
    loading,
    refreshWallet,
    balance: wallet?.balance || 0,
  };
};
