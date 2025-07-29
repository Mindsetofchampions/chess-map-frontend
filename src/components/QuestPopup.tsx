import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, MapPin, Clock } from 'lucide-react';

/**
 * Quest data interface
 */
interface Quest {
  id: string;
  title: string;
  description: string;
  coins: number;
  location?: string;
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Props interface for the QuestPopup component
 */
interface QuestPopupProps {
  /** Quest data to display */
  quest: Quest | null;
  /** Whether the popup is visible */
  isOpen: boolean;
  /** Callback to close the popup */
  onClose: () => void;
  /** Callback when user starts the quest */
  onStartQuest?: (questId: string) => void;
  /** Optional position for popup placement */
  position?: { x: number; y: number };
}

/**
 * Interactive glassmorphic quest popup component
 * 
 * Features:
 * - Glassmorphic styling with backdrop blur
 * - Smooth fade and scale entrance/exit animations
 * - Mobile-optimized responsive design
 * - Accessibility support with keyboard navigation
 * - Touch-friendly interactive elements
 * 
 * @param {QuestPopupProps} props - Component props
 * @returns {JSX.Element} Animated quest popup with glassmorphic styling
 */
const QuestPopup: React.FC<QuestPopupProps> = ({
  quest,
  isOpen,
  onClose,
  onStartQuest,
  position
}) => {
  // Handle quest start
  const handleStartQuest = () => {
    if (quest && onStartQuest) {
      onStartQuest(quest.id);
    }
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Add/remove keyboard listener
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when popup is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Get difficulty color
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-cyber-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-electric-blue-400';
    }
  };

  // Position styles for popup placement
  const popupStyles = position ? {
    position: 'fixed' as const,
    left: `${Math.min(position.x, window.innerWidth - 300)}px`,
    top: `${Math.min(position.y, window.innerHeight - 400)}px`,
    transform: 'none',
    zIndex: 1000
  } : {};

  return (
    <AnimatePresence>
      {isOpen && quest && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quest-title"
          aria-describedby="quest-description"
        >
          <motion.div
            className="relative w-full max-w-xs sm:max-w-sm bg-white/30 backdrop-blur-2xl border border-gray-300 rounded-2xl shadow-2xl p-6 mx-auto"
            style={position ? popupStyles : {}}
            initial={{ 
              opacity: 0, 
              scale: 0.8,
              y: 20 
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: 0 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8,
              y: 20 
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <motion.button
              className="absolute top-4 right-4 p-2 rounded-full bg-glass border-glass hover:bg-glass-dark transition-all duration-200 min-w-touch min-h-touch touch-manipulation"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Close quest popup"
            >
              <X className="w-4 h-4 text-gray-300" />
            </motion.button>

            {/* Quest Title */}
            <motion.h2
              id="quest-title"
              className="text-xl font-bold text-white mb-2 pr-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {quest.title}
            </motion.h2>

            {/* Quest Meta Information */}
            <motion.div
              className="flex items-center gap-4 mb-4 text-sm text-gray-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {/* Coins */}
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-semibold text-yellow-400">{quest.coins}</span>
              </div>

              {/* Location */}
              {quest.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-electric-blue-400" />
                  <span className="text-xs">{quest.location}</span>
                </div>
              )}

              {/* Estimated Time */}
              {quest.estimatedTime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-neon-purple-400" />
                  <span className="text-xs">{quest.estimatedTime}</span>
                </div>
              )}
            </motion.div>

            {/* Difficulty Badge */}
            {quest.difficulty && (
              <motion.div
                className="inline-block mb-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-glass border-glass ${getDifficultyColor(quest.difficulty)}`}>
                  {quest.difficulty.charAt(0).toUpperCase() + quest.difficulty.slice(1)}
                </span>
              </motion.div>
            )}

            {/* Quest Description */}
            <motion.p
              id="quest-description"
              className="text-gray-200 text-sm mb-6 leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {quest.description}
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Start Quest Button */}
              <motion.button
                className="flex-1 btn-esports text-center font-semibold"
                onClick={handleStartQuest}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)'
                }}
                whileTap={{ scale: 0.98 }}
                aria-label={`Start quest: ${quest.title}`}
              >
                Start Quest
              </motion.button>

              {/* Cancel Button */}
              <motion.button
                className="px-4 py-2 rounded-xl bg-glass border-glass text-gray-300 hover:bg-glass-dark transition-all duration-200 min-w-touch min-h-touch touch-manipulation"
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label="Cancel and close popup"
              >
                Cancel
              </motion.button>
            </motion.div>

            {/* Decorative glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-electric-blue-600 to-neon-purple-600 rounded-2xl blur opacity-20 -z-10" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuestPopup;