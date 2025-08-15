/**
 * Quest Play Modal
 * 
 * Central modal for quest interaction that routes to appropriate
 * player component based on quest type (MCQ, Text, Video).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Clock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { QuestService } from '../services/quests';
import MCQPlayer from '../components/quests/MCQPlayer';
import TextPlayer from '../components/quests/TextPlayer';
import VideoPlayer from '../components/quests/VideoPlayer';
import type { Quest, QuestSubmission } from '../types/quest';

/**
 * Props for QuestPlayModal component
 */
interface QuestPlayModalProps {
  /** Quest to display and interact with */
  quest: Quest | null;
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback when quest is completed */
  onQuestComplete?: (questId: string, submission: QuestSubmission) => void;
}

/**
 * Quest completion result interface
 */
interface CompletionResult {
  submission: QuestSubmission;
  earnedCoins: number;
  isFirstCompletion: boolean;
}

/**
 * Quest Play Modal Component
 * 
 * Features:
 * - Dynamic content based on quest type
 * - Progress tracking and analytics
 * - Submission state management
 * - Responsive design with mobile optimization
 * - Error handling for network issues
 * - Real-time feedback and celebrations
 */
const QuestPlayModal: React.FC<QuestPlayModalProps> = ({
  quest,
  isOpen,
  onClose,
  onQuestComplete
}) => {
  const { user } = useAuth();
  
  // Component state
  const [loading, setLoading] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<QuestSubmission | null>(null);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load existing submission when quest changes
   */
  useEffect(() => {
    if (!quest || !user || !isOpen) return;

    const loadSubmission = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const submission = await QuestService.submissions.getUserSubmission(quest.id);
        setExistingSubmission(submission);
      } catch (err: any) {
        console.error('Failed to load submission:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, [quest, user, isOpen]);

  /**
   * Handle quest completion
   */
  const handleComplete = useCallback((submission: QuestSubmission) => {
    const earnedCoins = submission.status === 'autograded' || submission.status === 'accepted' 
      ? quest?.reward_coins || 0 
      : 0;
    
    const result: CompletionResult = {
      submission,
      earnedCoins,
      isFirstCompletion: !existingSubmission
    };
    
    setCompletionResult(result);
    setExistingSubmission(submission);
    
    // Notify parent component
    if (onQuestComplete && quest) {
      onQuestComplete(quest.id, submission);
    }
  }, [quest, existingSubmission, onQuestComplete]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    setCompletionResult(null);
    setError(null);
    onClose();
  }, [onClose]);

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  /**
   * Get persona display info
   */
  const getPersonaInfo = (personaKey: string) => {
    const personaMap = {
      hootie: { name: 'Hootie the Owl', emoji: '🦉', color: 'text-purple-400' },
      kittykat: { name: 'Kitty Kat', emoji: '🐱', color: 'text-green-400' },
      gino: { name: 'Gino the Dog', emoji: '🐕', color: 'text-orange-400' },
      hammer: { name: 'Hammer the Robot', emoji: '🤖', color: 'text-blue-400' },
      badge: { name: 'MOC Badge', emoji: '🏛️', color: 'text-red-400' }
    };
    
    return personaMap[personaKey as keyof typeof personaMap] || 
           { name: personaKey, emoji: '❓', color: 'text-gray-400' };
  };

  if (!quest) return null;

  const personaInfo = getPersonaInfo(quest.persona_key);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="bg-glass backdrop-blur-2xl border-glass rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-glass">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{personaInfo.emoji}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">{quest.title}</h2>
                    <p className={`text-sm ${personaInfo.color}`}>{personaInfo.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-300 flex items-center gap-1">
                    <Award className="w-3 h-3 text-yellow-400" />
                    <span>{quest.reward_coins} coins</span>
                  </div>
                  
                  <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-300 capitalize">
                    {quest.qtype} quest
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="p-2 rounded-full bg-glass-dark border-glass hover:bg-glass-light transition-colors"
                aria-label="Close quest"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
                  <p className="text-gray-300">Loading quest...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Error Loading Quest</h3>
                  <p className="text-red-300 mb-4">{error}</p>
                  <button
                    onClick={handleClose}
                    className="btn-esports"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Quest Player */}
              {!loading && !error && (
                <AnimatePresence mode="wait">
                  {completionResult ? (
                    /* Completion Celebration */
                    <motion.div
                      key="completion"
                      className="text-center py-12"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="w-20 h-20 bg-cyber-green-500/20 border border-cyber-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Award className="w-10 h-10 text-cyber-green-400" />
                      </div>
                      
                      <h3 className="text-3xl font-bold text-white mb-2">
                        {completionResult.earnedCoins > 0 ? 'Quest Completed!' : 'Response Submitted!'}
                      </h3>
                      
                      <p className="text-gray-200 mb-6">
                        {completionResult.earnedCoins > 0 
                          ? `Congratulations! You earned ${completionResult.earnedCoins} coins.`
                          : 'Your response has been submitted for review by our staff.'
                        }
                      </p>
                      
                      <div className="space-y-3">
                        <div className="bg-glass-light border-glass-light rounded-xl p-4 max-w-md mx-auto">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-300">Status</span>
                              <p className="text-white font-medium capitalize">{completionResult.submission.status}</p>
                            </div>
                            <div>
                              <span className="text-gray-300">Coins Earned</span>
                              <p className="text-yellow-400 font-medium">{completionResult.earnedCoins}</p>
                            </div>
                          </div>
                        </div>
                        
                        <motion.button
                          onClick={handleClose}
                          className="btn-esports mx-auto"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Continue Exploring
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Quest Player */
                    <motion.div
                      key="player"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {quest.qtype === 'mcq' && (
                        <MCQPlayer
                          quest={quest}
                          existingSubmission={existingSubmission}
                          onComplete={handleComplete}
                        />
                      )}
                      
                      {quest.qtype === 'text' && (
                        <TextPlayer
                          quest={quest}
                          existingSubmission={existingSubmission}
                          onComplete={handleComplete}
                        />
                      )}
                      
                      {quest.qtype === 'video' && (
                        <VideoPlayer
                          quest={quest}
                          existingSubmission={existingSubmission}
                          onComplete={handleComplete}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuestPlayModal;