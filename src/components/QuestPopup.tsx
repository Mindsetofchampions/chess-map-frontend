import React, { useEffect } from 'react';

type Difficulty = 'easy' | 'medium' | 'hard';

export interface Quest {
  id: string;
  title: string;
  description: string;
  coins: number;
  location?: string;
  estimatedTime?: string;
  difficulty?: Difficulty;
}

export interface QuestPopupProps {
  quest: Quest | null;
  isOpen: boolean;
  onClose: () => void;
  onStartQuest: (id: string) => void;
  position?: { x: number; y: number };
}

const difficultyLabel: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const difficultyClass: Record<Difficulty, string> = {
  easy: 'text-cyber-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
};

const QuestPopup: React.FC<QuestPopupProps> = ({
  quest,
  isOpen,
  onClose,
  onStartQuest,
  position,
}) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !quest) return null;

  const difficulty = quest.difficulty ?? 'medium';

  const style: React.CSSProperties | undefined = position
    ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px` }
    : undefined;

  const handleStart = () => {
    onStartQuest(quest.id);
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='quest-title'
        aria-describedby='quest-description'
        className='bg-white/10 backdrop-blur-xl border rounded-2xl shadow-xl p-4 max-w-md w-full text-white relative'
        // Close only via explicit buttons to satisfy a11y rules
        style={style}
      >
        <button
          aria-label='Close quest popup'
          className='absolute right-2 top-2 p-1 rounded-full'
          onClick={onClose}
        >
          ×
        </button>

        <h2 id='quest-title' className='text-xl font-bold mb-2'>
          {quest.title}
        </h2>

        <p id='quest-description' className='text-sm mb-3'>
          {quest.description}
        </p>

        <div className='grid grid-cols-3 gap-2 text-sm mb-4'>
          <div>
            <div className='opacity-80'>Coins</div>
            <div>{quest.coins}</div>
          </div>
          {quest.location && (
            <div>
              <div className='opacity-80'>Location</div>
              <div>{quest.location}</div>
            </div>
          )}
          {quest.estimatedTime && (
            <div>
              <div className='opacity-80'>Time</div>
              <div>{quest.estimatedTime}</div>
            </div>
          )}
          <div>
            <div className='opacity-80'>Difficulty</div>
            <div className={difficultyClass[difficulty]}>{difficultyLabel[difficulty]}</div>
          </div>
        </div>

        <div className='flex gap-2'>
          <button className='border rounded-xl px-4 py-2' onClick={handleStart}>
            Start Quest
          </button>
          <button className='border rounded-xl px-4 py-2' onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestPopup;
