/* prettier-ignore-start */
import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import useStudentProgress from '@/hooks/useStudentProgress';
import CHESS_COLORS from '@/lib/chessColors';
import { getMyWallet } from '@/lib/supabase';
import { useWallet } from '@/components/wallet/WalletChip';

const categories = [
  { key: 'character', label: 'Character', color: CHESS_COLORS.character },
  { key: 'health', label: 'Health', color: CHESS_COLORS.health },
  { key: 'exploration', label: 'Exploration', color: CHESS_COLORS.exploration },
  { key: 'stem', label: 'STEM', color: CHESS_COLORS.stem },
  { key: 'stewardship', label: 'Stewardship', color: CHESS_COLORS.stewardship },
] as const;

const StudentProfileCard: React.FC = () => {
  const { user } = useAuth();
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.displayName ||
    user?.email?.split('@')[0];
  const { balance, loading: walletLoading, refreshWallet } = useWallet();
  const [walletError, setWalletError] = useState<string | null>(null);
  const { progress, loading } = useStudentProgress();

  // Keep local error message synced on failures of manual refresh
  useEffect(() => {
    (async () => {
      try {
        await getMyWallet();
        setWalletError(null);
      } catch (err: any) {
        setWalletError(err?.message || 'Failed to fetch wallet');
      }
    })();
  }, []);

  return (
    <motion.div
      className='bg-glass border-glass rounded-xl p-4 flex items-center gap-4'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className='w-16 h-16 rounded-full bg-gradient-to-br from-electric-blue-400 to-neon-purple-400 flex items-center justify-center text-white font-bold text-xl'>
        {displayName?.charAt(0)?.toUpperCase() || 'S'}
      </div>

      <div className='flex-1'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-white font-bold'>{displayName}</div>
            <div className='text-xs text-gray-300'>Student</div>
          </div>
          <div className='text-right'>
            <div className='flex items-center gap-2 justify-end'>
              <div className='text-lg font-semibold text-yellow-300'>
                {walletLoading ? '...' : `${balance} ✦`}
              </div>
              <button
                title='Refresh wallet'
                onClick={refreshWallet}
                className='text-gray-300 hover:text-white text-xs'
              >
                Refresh
              </button>
            </div>
            <div className='text-xs text-gray-300'>Coins</div>
            {walletError ? (
              <div className='text-[10px] text-rose-400 mt-1'>{walletError}</div>
            ) : null}
          </div>
        </div>

        <div className='mt-3 grid grid-cols-5 gap-2'>
          {categories.map((c) => {
            // @ts-ignore
            const pct = progress?.[c.key]?.percent ?? 0;
            // @ts-ignore
            const completed = progress?.[c.key]?.completed ?? 0;
            // @ts-ignore
            const total = progress?.[c.key]?.total ?? 0;
            return (
              <div key={c.key} className='text-center'>
                <div className='w-full h-2 bg-white/10 rounded-full overflow-hidden'>
                  <div className={`${c.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <div className='text-xs text-gray-200 mt-1'>{c.label}</div>
                <div className='text-[10px] text-gray-400'>
                  {loading ? '...' : `${completed}/${total}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default StudentProfileCard;
/* prettier-ignore-end */
