import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRandomMCQ, recordMCQAnswer } from '../services/mcqService';
import { MCQQuestion, PersonaKey } from '../types';
import { Target, X, CheckCircle, XCircle, Sparkles } from 'lucide-react';

/**
 * Props for RandomChallengeButton component
 */
interface RandomChallengeButtonProps {
  personaKey?: PersonaKey;
  studentId: string;
  orgId?: string;
  onPointsUpdate?: (points: number) => void;
  className?: string;
}

/**
 * Props for MCQCard component
 */
interface MCQCardProps {
  mcq: MCQQuestion;
  onAnswer: (isCorrect: boolean, selectedChoice: string) => void;
  showResult: boolean;
  selectedChoice?: string;
  correctChoice?: string;
}

/**
 * MCQ Card Component for displaying questions and choices
 */
const MCQCard: React.FC<MCQCardProps> = ({ 
  mcq, 
  onAnswer, 
  showResult, 
  selectedChoice,
  correctChoice 
}) => {
  const [selected, setSelected] = useState<string | null>(selectedChoice || null);

  const handleSubmit = () => {
    if (selected !== null) {
      const isCorrect = selected === mcq.correct_key;
      onAnswer(isCorrect, selected);
    }
  };

  const getChoiceStyle = (choiceKey: string) => {
    if (!showResult) {
      return selected === choiceKey
        ? 'bg-electric-blue-100 border-electric-blue-300 text-electric-blue-800'
        : 'bg-glass-light border-glass hover:bg-glass';
    }

    if (choiceKey === mcq.correct_key) {
      return 'bg-cyber-green-100 border-cyber-green-300 text-cyber-green-800';
    }

    if (selected === choiceKey && choiceKey !== mcq.correct_key) {
      return 'bg-red-100 border-red-300 text-red-800';
    }

    return 'bg-glass-light border-glass-light text-gray-400';
  };

  return (
    <motion.div
      className="bg-glass backdrop-blur-xl border-glass rounded-2xl shadow-2xl max-w-md w-full mx-4"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="p-6">
        <h3 className="font-semibold text-lg text-white mb-4 leading-tight">
          {mcq.question_text}
        </h3>
        
        <div className="space-y-3 mb-6">
          {Object.entries(mcq.choices).map(([choiceKey, choiceText]) => (
            <motion.label
              key={choiceKey}
              className={`
                flex items-start p-3 rounded-xl cursor-pointer transition-all duration-200 border-2
                ${getChoiceStyle(choiceKey)}
                ${!showResult ? 'hover:scale-102' : ''}
              `}
              whileHover={!showResult ? { scale: 1.01 } : {}}
              whileTap={!showResult ? { scale: 0.99 } : {}}
            >
              <input
                type="radio"
                name="mcq-choice"
                value={choiceKey}
                checked={selected === choiceKey}
                onChange={() => !showResult && setSelected(choiceKey)}
                disabled={showResult}
                className="mt-1 mr-3 text-electric-blue-500 focus:ring-electric-blue-400"
              />
              <span className="text-sm font-medium leading-relaxed flex-1">
                {choiceText}
              </span>
              
              {showResult && choiceKey === mcq.correct_key && (
                <CheckCircle className="w-5 h-5 text-cyber-green-500 ml-2 flex-shrink-0" />
              )}
              
              {showResult && selected === choiceKey && choiceKey !== mcq.correct_key && (
                <XCircle className="w-5 h-5 text-red-500 ml-2 flex-shrink-0" />
              )}
            </motion.label>
          ))}
        </div>

        {!showResult ? (
          <motion.button
            onClick={handleSubmit}
            disabled={selected === null}
            className="w-full btn-esports disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
            whileHover={selected ? { scale: 1.02 } : {}}
            whileTap={selected ? { scale: 0.98 } : {}}
          >
            Submit Answer
          </motion.button>
        ) : (
          <div className="space-y-3">
            <div className={`p-3 rounded-xl border-2 ${
              selected === mcq.correct_key 
                ? 'bg-cyber-green-100 border-cyber-green-300 text-cyber-green-800'
                : 'bg-red-100 border-red-300 text-red-800'
            }`}>
              <div className="flex items-center gap-2 font-semibold text-sm">
                {selected === mcq.correct_key ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Correct! Great job!
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    Not quite right
                  </>
                )}
              </div>
              
              {selected !== mcq.correct_key && (
                <p className="text-sm mt-2">
                  The correct answer was: <strong>{mcq.choices[mcq.correct_key]}</strong>
                </p>
              )}
            </div>

            {mcq.explanation && (
              <div className="p-3 bg-glass-light border-glass-light rounded-xl">
                <p className="text-sm text-gray-200 leading-relaxed">
                  <strong className="text-white">Explanation:</strong> {mcq.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Random Challenge Button Component
 * 
 * Features:
 * - Fetches random MCQ questions based on persona and difficulty
 * - Displays questions in glassmorphic modal overlay
 * - Tracks points and provides immediate feedback
 * - Records answers to database for progress tracking
 */
const RandomChallengeButton: React.FC<RandomChallengeButtonProps> = ({
  personaKey,
  studentId,
  orgId,
  onPointsUpdate,
  className = ''
}) => {
  const [currentMCQ, setCurrentMCQ] = useState<MCQQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [points, setPoints] = useState(0);

  /**
   * Fetch random challenge question
   */
  const fetchRandomChallenge = useCallback(async () => {
    setLoading(true);
    setShowResult(false);
    setSelectedChoice(null);

    try {
      const mcq = await getRandomMCQ({
        personaKey,
        orgId,
        studentId,
        difficulty: 'medium',
        excludeAnswered: true
      });

      if (!mcq) {
        // Try without excluding answered questions
        const fallbackMcq = await getRandomMCQ({
          personaKey,
          orgId,
          studentId,
          difficulty: 'easy',
        });
        setCurrentMCQ(fallbackMcq);
      } else {
        setCurrentMCQ(mcq);
      }
    } catch (error) {
      console.error('Error fetching random challenge:', error);
    } finally {
      setLoading(false);
    }
  }, [personaKey, orgId, studentId]);

  /**
   * Handle answer submission
   */
  const handleAnswer = useCallback(async (isCorrect: boolean, selectedChoice: string) => {
    if (!currentMCQ) return;

    setSelectedChoice(selectedChoice);
    setShowResult(true);
    
    // Record the answer
    const recordSuccess = await recordMCQAnswer({
      mcqId: currentMCQ.id,
      studentId,
      isCorrect
    });

    if (!recordSuccess) {
      console.error('Failed to record MCQ answer');
    }

    // Update points for correct answers
    if (isCorrect) {
      const pointsEarned = currentMCQ.difficulty === 'hard' ? 20 : 
                          currentMCQ.difficulty === 'medium' ? 15 : 10;
      const newTotalPoints = points + pointsEarned;
      setPoints(newTotalPoints);
      onPointsUpdate?.(pointsEarned);
    }
  }, [currentMCQ, studentId, points, onPointsUpdate]);

  /**
   * Close MCQ modal
   */
  const closeMCQ = useCallback(() => {
    setCurrentMCQ(null);
    setShowResult(false);
    setSelectedChoice(null);
  }, []);

  return (
    <>
      {/* Challenge Button */}
      <div className={`relative ${className}`}>
        <motion.button
          onClick={fetchRandomChallenge}
          disabled={loading}
          className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-white rounded-xl px-4 py-2 font-medium transition-all duration-200 min-h-touch touch-manipulation hover:scale-105"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Start random challenge"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-sm">Loading...</span>
            </>
          ) : (
            <>
              <Target className="w-4 h-4" />
              <span className="text-sm">Random Challenge</span>
            </>
          )}
        </motion.button>

        {/* Points Badge */}
        <AnimatePresence>
          {points > 0 && (
            <motion.div
              className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Sparkles className="w-3 h-3" />
              {points}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MCQ Modal */}
      <AnimatePresence>
        {currentMCQ && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMCQ}
          >
            <div onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button
                onClick={closeMCQ}
                className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors duration-200 min-w-touch min-h-touch touch-manipulation"
                aria-label="Close challenge"
              >
                <X className="w-4 h-4" />
              </button>

              <MCQCard
                mcq={currentMCQ}
                onAnswer={handleAnswer}
                showResult={showResult}
                selectedChoice={selectedChoice}
                correctChoice={mcq.correct_key}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RandomChallengeButton;