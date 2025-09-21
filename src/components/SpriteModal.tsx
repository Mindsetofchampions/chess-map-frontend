import { motion } from 'framer-motion';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { getPersonaInfo } from '@/assets/personas';

interface Props {
  personaKey: string | null;
  onClose: () => void;
}

const SpriteModal: React.FC<Props> = ({ personaKey, onClose }) => {
  const navigate = useNavigate();
  if (!personaKey) return null;

  const info = getPersonaInfo(personaKey as any);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
      <motion.div
        className='bg-glass-dark border-glass-dark rounded-2xl p-6 max-w-sm w-full'
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className='flex items-start gap-4'>
          <div className='w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl'>
            {info.emoji}
          </div>
          <div className='flex-1'>
            <h3 className='text-xl font-bold text-white'>{info.name}</h3>
            <p className='text-gray-200 text-sm'>
              {info.category} • {personaKey}
            </p>
            <p className='text-gray-300 text-sm mt-3'>
              Explore quests, fulfill challenges, and grow your skills with {info.name}. Complete
              activities to earn coins you can spend in the CHESS Store.
            </p>
          </div>
        </div>

        <div className='mt-6 grid grid-cols-1 gap-3'>
          <button
            onClick={() => {
              onClose();
              navigate('/quests?persona=' + personaKey);
            }}
            className='w-full py-3 rounded-lg bg-electric-blue-500 text-white'
          >
            See Quests
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/store?category=' + personaKey);
            }}
            className='w-full py-3 rounded-lg bg-neon-purple-500 text-white'
          >
            Open Store
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/dashboard#profile');
            }}
            className='w-full py-3 rounded-lg bg-glass-light text-white'
          >
            Profile & Onboarding
          </button>
        </div>

        <div className='mt-4 text-xs text-gray-400'>
          <strong>How to earn coins:</strong> Complete quests, attend events, and submit evidence
          for challenges. Your progress meter grows with each completed engagement in this category.
        </div>

        <div className='mt-4 flex justify-end'>
          <button onClick={onClose} className='py-2 px-3 rounded-lg bg-glass text-white'>
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SpriteModal;
