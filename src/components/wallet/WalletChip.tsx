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
import { useAuth } from '@/contexts/AuthContext';
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
  const { balance, loading, refreshWallet } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWallet();
    } catch (e: any) {
      showError('Failed to refresh balance', e?.message || 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshWallet, showError]);

  // Optional periodic refresh, in case realtime misses
  useEffect(() => {
    if (!autoRefresh) return;
    const t = window.setInterval(() => {
      void refreshWallet();
    }, 30000);
    return () => window.clearInterval(t);
  }, [autoRefresh, refreshWallet]);

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
            {formatBalance(balance || 0)} coins
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
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshWallet = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const walletData = await getMyWallet();
      setWallet(walletData);
      setBalance(Number(walletData?.balance ?? 0));
    } catch (error) {
      // If wallet row doesn't exist yet, keep current balance (may be fed by ledger events)
      console.warn('useWallet: failed to fetch wallet, falling back to live balance', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch when user available
  useEffect(() => {
    if (user?.id) {
      refreshWallet();
    }
  }, [user?.id, refreshWallet]);

  // Realtime subscriptions: coin_wallets (authoritative) and coin_ledger (optimistic)
  useEffect(() => {
    let channel: any | undefined;
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const uid = user?.id;
        if (!uid) return;

        channel = supabase
          .channel('user_wallet_shared_channel')
          // Authoritative wallet changes
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'coin_wallets',
              filter: `user_id=eq.${uid}`,
            },
            () => {
              // Re-fetch authoritative balance
              void refreshWallet();
            },
          )
          // Optimistic updates from ledger inserts
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'coin_ledger',
              filter: `user_id=eq.${uid}`,
            },
            (payload: any) => {
              const delta = Number(payload?.new?.delta ?? 0);
              if (!isNaN(delta) && delta !== 0) {
                setBalance((b) => Number(b) + delta);
              }
            },
          )
          .subscribe();
      } catch (e) {
        // non-fatal
      }
    })();

    return () => {
      try {
        channel?.unsubscribe?.();
      } catch {}
    };
  }, [user?.id, refreshWallet]);

  return { wallet, balance, loading, refreshWallet };
};
