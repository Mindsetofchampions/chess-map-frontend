/**
 * Coin Wallet Management Hook
 * 
 * Provides real-time wallet balance tracking, transaction history,
 * and coin operations with automatic updates and error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { QuestService } from '../services/quests';
import type { CoinWallet, CoinLedgerEntry } from '../types/quest';

/**
 * Wallet hook state interface
 */
interface UseWalletState {
  wallet: CoinWallet | null;
  transactions: CoinLedgerEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Wallet hook return interface
 */
interface UseWalletReturn extends UseWalletState {
  balance: number;
  refreshWallet: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  adjustBalance: (userId: string, delta: number, reason: string) => Promise<void>;
  getFormattedBalance: () => string;
  clearError: () => void;
}

/**
 * Coin wallet management hook
 * 
 * Features:
 * - Real-time balance updates via Supabase subscriptions
 * - Transaction history with pagination
 * - Balance adjustment for master admin
 * - Automatic wallet creation on first access
 * - Error handling with retry logic
 */
export const useWallet = (userId?: string): UseWalletReturn => {
  const { user, profile } = useAuth();
  const mountedRef = useRef(true);
  const targetUserId = userId || user?.id;

  // State management
  const [state, setState] = useState<UseWalletState>({
    wallet: null,
    transactions: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  /**
   * Set error with auto-clear
   */
  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error }));
    setTimeout(() => {
      setState(prev => ({ ...prev, error: null }));
    }, 10000);
  }, []);

  /**
   * Clear error manually
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Refresh wallet data
   */
  const refreshWallet = useCallback(async () => {
    if (!targetUserId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const wallet = await QuestService.coins.getWallet(targetUserId);
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          wallet,
          loading: false,
          lastUpdated: new Date()
        }));
      }
    } catch (error: any) {
      if (mountedRef.current) {
        console.error('Failed to refresh wallet:', error);
        setError(error.message || 'Failed to load wallet data');
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [targetUserId, setError]);

  /**
   * Refresh transaction history
   */
  const refreshTransactions = useCallback(async () => {
    if (!targetUserId) return;

    try {
      const transactions = await QuestService.coins.getTransactionHistory(targetUserId);
      
      if (mountedRef.current) {
        setState(prev => ({ ...prev, transactions }));
      }
    } catch (error: any) {
      if (mountedRef.current) {
        console.error('Failed to refresh transactions:', error);
        setError(error.message || 'Failed to load transaction history');
      }
    }
  }, [targetUserId, setError]);

  /**
   * Adjust balance (master admin only)
   */
  const adjustBalance = useCallback(async (userId: string, delta: number, reason: string): Promise<void> => {
    if (profile?.role !== 'master_admin') {
      throw new Error('Only master admin can adjust balances');
    }

    try {
      await QuestService.coins.adjustBalance(userId, delta, reason);
      
      // Refresh data if adjusting current user's wallet
      if (userId === targetUserId) {
        await Promise.all([refreshWallet(), refreshTransactions()]);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to adjust balance');
      throw error;
    }
  }, [profile, targetUserId, refreshWallet, refreshTransactions, setError]);

  /**
   * Format balance for display
   */
  const getFormattedBalance = useCallback((): string => {
    const balance = state.wallet?.balance || 0;
    return balance.toLocaleString();
  }, [state.wallet]);

  /**
   * Initialize wallet data
   */
  useEffect(() => {
    if (targetUserId) {
      refreshWallet();
      refreshTransactions();
    }
  }, [targetUserId, refreshWallet, refreshTransactions]);

  /**
   * Set up real-time wallet updates
   */
  useEffect(() => {
    if (!targetUserId) return;

    // Subscribe to wallet balance changes
    const walletSubscription = supabase
      .channel(`wallet_${targetUserId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coin_wallets',
          filter: `user_id=eq.${targetUserId}`
        },
        (payload) => {
          console.log('Wallet updated:', payload);
          
          if (payload.new && mountedRef.current) {
            setState(prev => ({
              ...prev,
              wallet: payload.new as CoinWallet,
              lastUpdated: new Date()
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to new transactions
    const ledgerSubscription = supabase
      .channel(`ledger_${targetUserId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coin_ledger',
          filter: `user_id=eq.${targetUserId}`
        },
        (payload) => {
          console.log('New transaction:', payload);
          
          if (payload.new && mountedRef.current) {
            setState(prev => ({
              ...prev,
              transactions: [payload.new as CoinLedgerEntry, ...prev.transactions]
            }));
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      walletSubscription.unsubscribe();
      ledgerSubscription.unsubscribe();
    };
  }, [targetUserId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    balance: state.wallet?.balance || 0,
    refreshWallet,
    refreshTransactions,
    adjustBalance,
    getFormattedBalance,
    clearError,
  };
};

export default useWallet;