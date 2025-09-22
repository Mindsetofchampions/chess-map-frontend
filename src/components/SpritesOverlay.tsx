import { motion } from 'framer-motion';
import React, { useState } from 'react';

import { PERSONA_GIF, getPersonaInfo, type PersonaKey } from '@/assets/personas';
import CHESS_COLORS from '@/lib/chessColors';

import SpriteModal from './SpriteModal';

export type SpriteKey = PersonaKey | 'brenda';

const SPRITES: {
  key: SpriteKey;
  src: string;
  label: string;
  category: string;
  colorClass: string;
}[] = Object.keys(PERSONA_GIF).map((k) => {
  const key = k as PersonaKey;
  const info = getPersonaInfo(key);
  const cat = String(info.category || 'character').toLowerCase();
  const colorClass = (CHESS_COLORS as any)[cat] ?? CHESS_COLORS.character;
  return {
    key: key as SpriteKey,
    src: PERSONA_GIF[key],
    label: info.name,
    category: info.category,
    colorClass,
  };
});

interface Props {
  onSpriteClick?: (key: SpriteKey) => void;
  showModal?: boolean;
}

const SpritesOverlay: React.FC<Props> = ({ onSpriteClick, showModal = true }) => {
  const [activeSprite, setActiveSprite] = useState<SpriteKey | null>(null);

  const handleClick = (k: SpriteKey) => {
    if (onSpriteClick) onSpriteClick(k);
    setActiveSprite(k);
  };

  return (
    <div className='absolute inset-0 pointer-events-none z-30'>
      {SPRITES.map((s, i) => {
        const left = `${8 + ((i * 18) % 80)}%`;
        const top = `${12 + ((i * 13) % 70)}%`;
        return (
          <motion.button
            key={s.key}
            className='pointer-events-auto p-0 touch-manipulation'
            style={{ left, top, position: 'absolute', zIndex: 40 }}
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.05, 1], y: [0, -6, 0] }}
            transition={{ delay: i * 0.2, duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            onClick={() => handleClick(s.key)}
            aria-label={`${s.label} sprite`}
          >
            <div
              className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 flex items-center justify-center shadow-xl ${s.colorClass} bg-black/10`}
            >
              <img
                src={s.src}
                alt={s.label}
                className='w-12 h-12 md:w-16 md:h-16 object-contain'
                draggable={false}
              />
            </div>
            <div className='sr-only'>{s.label}</div>
          </motion.button>
        );
      })}
      {showModal && (
        <SpriteModal personaKey={activeSprite} onClose={() => setActiveSprite(null)} />
      )}
    </div>
  );
};

export default SpritesOverlay;
