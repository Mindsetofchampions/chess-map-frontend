import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

const categories = [
  { key: 'character', label: 'Character' },
  { key: 'health', label: 'Health' },
  { key: 'exploration', label: 'Exploration' },
  { key: 'stem', label: 'STEM' },
  { key: 'stewardship', label: 'Stewardship' },
];

const StudentProfileCard: React.FC = () => {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.displayName || user?.email?.split('@')[0];
  const coins = (user && (user as any).app_metadata?.coins) || 0;

  return (
    <motion.div className="bg-glass border-glass rounded-xl p-4 flex items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-electric-blue-400 to-neon-purple-400 flex items-center justify-center text-white font-bold text-xl">
        {displayName?.charAt(0)?.toUpperCase() || 'S'}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold">{displayName}</div>
            <div className="text-xs text-gray-300">Student</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-yellow-300">{coins} ✦</div>
            <div className="text-xs text-gray-300">Coins</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2">
          {categories.map((c) => (
            <div key={c.key} className="text-center">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-2 bg-cyber-green-400 rounded-full" style={{ width: `${Math.floor(Math.random()*60)+20}%` }} />
              </div>
              <div className="text-xs text-gray-200 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default StudentProfileCard;
