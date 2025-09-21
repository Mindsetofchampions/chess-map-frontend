/**
 * Diagnostics Widget Component
 *
 * Compact dashboard widget showing current role, platform balance, and pending quest count
 */

import { motion } from 'framer-motion';
import { Shield, Coins, Award, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase, getPlatformBalance } from '@/lib/supabase';
import { formatNumber } from '@/utils/format';

/**
 * Diagnostics data interface
 */
interface DiagnosticsData {
  role: string;
  platformBalance: number;
  pendingCount: number;
  lastUpdated: Date;
}

/**
 * Diagnostics Widget Component
 *
 * Features:
 * - Live role display
 * - Platform balance monitoring
 * - Pending quest count
 * - Auto-refresh every 30 seconds
 */
const DiagnosticsWidget: React.FC = () => {
  const { role } = useAuth();
  const [data, setData] = useState<DiagnosticsData>({
    role: role || 'unknown',
    platformBalance: 0,
    pendingCount: 0,
    lastUpdated: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch diagnostics data
   */
  const fetchDiagnostics = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        // Fetch platform balance via canonical helper (normalizes RPC output)
        const balance = await getPlatformBalance();

        // Fetch pending quest count
        const { count: pendingCount, error: countError } = await supabase
          .from('admin_approval_queue_vw')
          .select('*', { count: 'exact', head: true });

        const newData: DiagnosticsData = {
          role: role || 'unknown',
          platformBalance: Number(balance.coins || 0),
          pendingCount: pendingCount || 0,
          lastUpdated: new Date(),
        };

        setData(newData);

        if (countError) {
          console.warn('Failed to fetch pending count:', countError);
        }
      } catch (error: any) {
        console.error('Failed to fetch diagnostics:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [role],
  );

  /**
   * Manual refresh handler
   */
  const handleRefresh = useCallback(() => {
    fetchDiagnostics(true);
  }, [fetchDiagnostics]);

  /**
   * Setup auto-refresh and realtime subscriptions
   */
  useEffect(() => {
    fetchDiagnostics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDiagnostics();
    }, 30000);

    // Setup realtime subscription for quest changes
    const channel = supabase
      .channel('diagnostics_quests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quests' }, () => {
        console.log('Quest change detected, refreshing diagnostics...');
        fetchDiagnostics();
      })
      .subscribe();

    // Watch platform_balance for realtime updates so diagnostics reflect changes immediately
    const channel2 = supabase
      .channel('diagnostics_platform_balance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_balance' }, () => {
        console.log('Platform balance change detected, refreshing diagnostics...');
        fetchDiagnostics();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      supabase.removeChannel(channel2);
    };
  }, [fetchDiagnostics]);

  /**
   * Get role display info
   */
  const getRoleInfo = (userRole: string) => {
    switch (userRole) {
      case 'master_admin':
        return { label: 'Master Admin', color: 'text-yellow-400' };
      case 'org_admin':
        return { label: 'Org Admin', color: 'text-purple-400' };
      case 'staff':
        return { label: 'Staff', color: 'text-blue-400' };
      case 'student':
        return { label: 'Student', color: 'text-green-400' };
      default:
        return { label: 'Unknown', color: 'text-gray-400' };
    }
  };

  const roleInfo = getRoleInfo(data.role);

  return (
    <div className='bg-glass border-glass rounded-xl p-4'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-white'>System Status</h3>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className='p-1 rounded-lg hover:bg-glass-dark transition-colors disabled:opacity-50'
          aria-label='Refresh diagnostics'
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className='grid grid-cols-3 gap-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='text-center animate-pulse'>
              <div className='w-8 h-8 bg-gray-600 rounded-full mx-auto mb-2'></div>
              <div className='w-16 h-4 bg-gray-600 rounded mx-auto mb-1'></div>
              <div className='w-12 h-3 bg-gray-600 rounded mx-auto'></div>
            </div>
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-3 gap-4'>
          {/* Role Status */}
          <motion.div
            className='text-center'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className='w-8 h-8 bg-glass-dark rounded-full flex items-center justify-center mx-auto mb-2'>
              <Shield className='w-4 h-4 text-electric-blue-400' />
            </div>
            <h4 className={`font-semibold text-sm ${roleInfo.color}`}>{roleInfo.label}</h4>
            <p className='text-gray-400 text-xs'>Current Role</p>
          </motion.div>

          {/* Platform Balance */}
          <motion.div
            className='text-center'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className='w-8 h-8 bg-glass-dark rounded-full flex items-center justify-center mx-auto mb-2'>
              <Coins className='w-4 h-4 text-yellow-400' />
            </div>
            <h4 className='font-semibold text-sm text-yellow-400'>
              {formatNumber(data.platformBalance)}
            </h4>
            <p className='text-gray-400 text-xs'>Platform Coins</p>
          </motion.div>

          {/* Pending Quests */}
          <motion.div
            className='text-center'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className='w-8 h-8 bg-glass-dark rounded-full flex items-center justify-center mx-auto mb-2'>
              <Award className='w-4 h-4 text-neon-purple-400' />
            </div>
            <h4 className='font-semibold text-sm text-neon-purple-400'>{data.pendingCount}</h4>
            <p className='text-gray-400 text-xs'>Pending</p>
          </motion.div>
        </div>
      )}

      {/* Last Updated */}
      <div className='mt-4 pt-3 border-t border-glass-light'>
        <p className='text-gray-400 text-xs text-center'>
          Updated: {data.lastUpdated.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default DiagnosticsWidget;
