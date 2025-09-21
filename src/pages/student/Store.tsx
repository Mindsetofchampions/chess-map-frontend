import { motion } from 'framer-motion';
import React from 'react';
import { useLocation } from 'react-router-dom';

import GlassContainer from '@/components/GlassContainer';

const CATEGORIES = [
  { key: 'hootie', label: 'Character Development' },
  { key: 'brenda', label: 'Health & Wellness' },
  { key: 'gino', label: 'Exploration' },
  { key: 'hammer', label: 'STEM' },
  { key: 'badge', label: 'Stewardship' },
];

const items = Array.from({ length: 8 }).map((_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
  price: (i + 1) * 5,
}));

const Store: React.FC = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const category = params.get('category');

  return (
    <div className='min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary p-6'>
      <div className='container mx-auto max-w-4xl'>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='text-3xl font-bold text-white mb-4'
        >
          CHESS Store
        </motion.h1>

        <div className='grid grid-cols-2 gap-3 mb-6'>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`py-2 px-3 rounded-lg text-sm ${category === c.key ? 'bg-electric-blue-500 text-white' : 'bg-glass-light text-gray-100'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <GlassContainer variant='card'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 p-4'>
            {items.map((it) => (
              <div
                key={it.id}
                className='bg-glass-light border-glass-light rounded-lg p-3 text-center'
              >
                <div className='h-16 mb-2 bg-white/10 rounded-md flex items-center justify-center'>
                  🎁
                </div>
                <div className='text-sm text-white font-medium'>{it.name}</div>
                <div className='text-xs text-yellow-300 mt-2'>{it.price} ✦</div>
                <button className='mt-3 w-full py-2 rounded-md bg-cyber-green-500 text-white text-sm'>
                  Buy
                </button>
              </div>
            ))}
          </div>
        </GlassContainer>
      </div>
    </div>
  );
};

export default Store;
