/**
 * MCQ Player Component
 * 
 * Interactive multiple choice question interface for students
 * with real-time feedback and auto-grading capabilities.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send,
  RotateCcw,
  Lightbulb
} from 'lucide-react';
import { QuestService } from '../../services/quests';
import type { Quest, QuestSubmission, MCQOption } from '../../types/quest';

/**
 * Props for MCQPlayer component
 */
interface MCQPlayerProps {
  /** Quest data with MCQ configuration */
  quest: Quest;
  /** Existing submission if user has already answered */
  existingSubmission?: QuestSubmission | null;
  /** Callback when quest is completed */
  onComplete: (submission: QuestSubmission) => void;
  /** Whether player is in review mode (read-only) */
  reviewMode?: boolean;
}

/**
 * MCQ Player Component
 * 
 * Features:
 * - Interactive option selection with visual feedback
 * - Auto-grading with immediate results
 * - Timer tracking for completion metrics
 * - Explanation display after submission
 * - Responsive design with touch optimization
 * - Progress saving for interrupted sessions
 */
const MCQPlayer: React.FC<MCQPlayerProps> = ({
  quest,
  existingSubmission,
  onComplete,
  reviewMode = false
}) => {
  // Component state
  const [selectedOption, setSelectedOption] = useState<string | null>(
    existingSubmission?.mcq_choice || null
  );
  const [submitted, setSubmitted] = useState(!!existingSubmission);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(new Date());
  const [showExplanation, setShowExplanation] = useState(!!existingSubmission);

  // Extract MCQ configuration
  const mcqConfig = quest.config.mcq;
  if (!mcqConfig?.options) {
    return (
      <div className="text-center p-8">
        <div className="text-red-400 mb-2">⚠️ Configuration Error</div>
        <p className="text-gray-300">This MCQ quest is not properly configured.</p>
      </div>
    );
  }

  /**
   * Handle option selection
   */
  const handleOptionSelect = useCallback((optionId: string) => {
    if (submitted || reviewMode) return;
    setSelectedOption(optionId);
  }, [submitted, reviewMode]);

  /**
   * Submit MCQ answer
   */
  const handleSubmit = useCallback(async () => {
    if (!selectedOption || submitted || submitting) return;

    setSubmitting(true);
    
    try {
      const submission = await QuestService.submissions.submitMCQ(quest.id, selectedOption);
      setSubmitted(true);
      setShowExplanation(true);
      onComplete(submission);
    } catch (error: any) {
      console.error('Failed to submit MCQ:', error);
      alert(`Failed to submit answer: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }, [selectedOption, submitted, submitting, quest.id, onComplete]);

  /**
   * Get option styling based on state
   */
  const getOptionStyle = useCallback((option: MCQOption) => {
    if (!submitted) {
      return selectedOption === option.id
        ? 'bg-electric-blue-500/20 border-electric-blue-500/50 text-electric-blue-300'
        : 'bg-glass-light border-glass-light text-gray-200 hover:bg-glass';
    }

    // After submission - show correct/incorrect
    if (option.isCorrect) {
      return 'bg-cyber-green-500/20 border-cyber-green-500/50 text-cyber-green-300';
    }

    if (selectedOption === option.id && !option.isCorrect) {
      return 'bg-red-500/20 border-red-500/50 text-red-300';
    }

    return 'bg-glass-light border-glass-light text-gray-400';
  }, [submitted, selectedOption]);

  /**
   * Get result status
   */
  const isCorrect = submitted && mcqConfig.options.some(opt => 
    opt.id === selectedOption && opt.isCorrect
  );

  /**
   * Calculate time spent
   */
  const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

  return (
    <div className="max-w-2xl mx-auto">
      
      {/* Quest Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{quest.title}</h2>
        {quest.description && (
          <p className="text-gray-200">{quest.description}</p>
        )}
        
        {/* Progress Indicators */}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1 text-gray-300">
            <Clock className="w-4 h-4" />
            <span>{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
          </div>
          
          <div className="text-gray-400">•</div>
          
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">{quest.reward_coins} coins</span>
          </div>
        </div>
      </div>

      {/* MCQ Options */}
      <div className="space-y-3 mb-8">
        <AnimatePresence>
          {mcqConfig.options.map((option, index) => (
            <motion.button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              disabled={submitted || reviewMode}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                getOptionStyle(option)
              } ${!submitted && !reviewMode ? 'hover:scale-[1.01] cursor-pointer' : 'cursor-default'}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={!submitted && !reviewMode ? { scale: 1.01 } : {}}
              whileTap={!submitted && !reviewMode ? { scale: 0.99 } : {}}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selectedOption === option.id 
                    ? 'border-current' 
                    : 'border-gray-500'
                }`}>
                  {selectedOption === option.id && (
                    <div className="w-3 h-3 rounded-full bg-current"></div>
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium leading-relaxed">{option.text}</p>
                </div>
                
                {/* Result Icons */}
                {submitted && (
                  <div className="flex-shrink-0">
                    {option.isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-cyber-green-400" />
                    ) : selectedOption === option.id ? (
                      <XCircle className="w-6 h-6 text-red-400" />
                    ) : null}
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Submit Button */}
      {!submitted && !reviewMode && (
        <motion.button
          onClick={handleSubmit}
          disabled={!selectedOption || submitting}
          className="w-full btn-esports disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={selectedOption && !submitting ? { scale: 1.02 } : {}}
          whileTap={selectedOption && !submitting ? { scale: 0.98 } : {}}
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting Answer...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Submit Answer
            </>
          )}
        </motion.button>
      )}

      {/* Results Display */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Result Summary */}
            <div className={`p-6 rounded-xl border-2 ${
              isCorrect 
                ? 'bg-cyber-green-500/20 border-cyber-green-500/50'
                : 'bg-red-500/20 border-red-500/50'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {isCorrect ? (
                  <CheckCircle className="w-8 h-8 text-cyber-green-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-400" />
                )}
                <div>
                  <h3 className={`text-xl font-bold ${
                    isCorrect ? 'text-cyber-green-300' : 'text-red-300'
                  }`}>
                    {isCorrect ? 'Correct!' : 'Not Quite Right'}
                  </h3>
                  <p className={`text-sm ${
                    isCorrect ? 'text-cyber-green-200' : 'text-red-200'
                  }`}>
                    {isCorrect 
                      ? `Great job! You earned ${quest.reward_coins} coins.`
                      : 'Review the explanation below and try again next time.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Explanation */}
            {mcqConfig.explanation && showExplanation && (
              <motion.div
                className="bg-glass-light border-glass-light rounded-xl p-6"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h4 className="font-medium text-white">Explanation</h4>
                </div>
                <p className="text-gray-200 leading-relaxed">{mcqConfig.explanation}</p>
              </motion.div>
            )}

            {/* Performance Stats */}
            <div className="bg-glass-light border-glass-light rounded-xl p-4">
              <h4 className="font-medium text-white mb-3">Your Performance</h4>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <span className="text-gray-300">Time Taken</span>
                  <p className="text-white font-medium">
                    {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-300">Score</span>
                  <p className="text-white font-medium">
                    {existingSubmission?.score || (isCorrect ? 100 : 0)}%
                  </p>
                </div>
                <div>
                  <span className="text-gray-300">Coins Earned</span>
                  <p className="text-yellow-400 font-medium">
                    {isCorrect ? quest.reward_coins : 0}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MCQPlayer;