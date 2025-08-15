/**
 * Text Response Player Component
 * 
 * Interface for students to submit text-based quest responses
 * with character limits, validation, and submission tracking.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  FileText, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Eye
} from 'lucide-react';
import { QuestService } from '../../services/quests';
import type { Quest, QuestSubmission } from '../../types/quest';

/**
 * Props for TextPlayer component
 */
interface TextPlayerProps {
  /** Quest data with text configuration */
  quest: Quest;
  /** Existing submission if user has already answered */
  existingSubmission?: QuestSubmission | null;
  /** Callback when quest is completed */
  onComplete: (submission: QuestSubmission) => void;
  /** Whether player is in review mode (read-only) */
  reviewMode?: boolean;
}

/**
 * Text Player Component
 * 
 * Features:
 * - Real-time character count with validation
 * - Auto-save draft functionality
 * - Rich text formatting helpers
 * - Submission status tracking
 * - Review mode for completed responses
 */
const TextPlayer: React.FC<TextPlayerProps> = ({
  quest,
  existingSubmission,
  onComplete,
  reviewMode = false
}) => {
  // Extract text configuration
  const textConfig = quest.config.text;
  const maxLength = textConfig?.maxLength || 500;
  const minLength = textConfig?.minLength || 0;

  // Component state
  const [textAnswer, setTextAnswer] = useState(existingSubmission?.text_answer || '');
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(new Date());
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | null>(null);

  /**
   * Validation state
   */
  const validation = {
    tooShort: textAnswer.length < minLength,
    tooLong: textAnswer.length > maxLength,
    isEmpty: textAnswer.trim().length === 0,
    isValid: textAnswer.length >= minLength && textAnswer.length <= maxLength && textAnswer.trim().length > 0
  };

  /**
   * Auto-save draft functionality
   */
  const autoSaveDraft = useCallback(async () => {
    if (!textAnswer.trim() || validation.tooLong || submitting || reviewMode) return;

    setAutoSaveStatus('saving');
    
    try {
      // Save as draft in localStorage for now
      localStorage.setItem(`quest_draft_${quest.id}`, JSON.stringify({
        text: textAnswer,
        timestamp: new Date().toISOString()
      }));
      
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [textAnswer, validation.tooLong, submitting, reviewMode, quest.id]);

  /**
   * Auto-save on text change (debounced)
   */
  useEffect(() => {
    const timeoutId = setTimeout(autoSaveDraft, 2000);
    return () => clearTimeout(timeoutId);
  }, [textAnswer, autoSaveDraft]);

  /**
   * Load draft on mount
   */
  useEffect(() => {
    if (!existingSubmission && !reviewMode) {
      try {
        const draftData = localStorage.getItem(`quest_draft_${quest.id}`);
        if (draftData) {
          const draft = JSON.parse(draftData);
          setTextAnswer(draft.text || '');
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [quest.id, existingSubmission, reviewMode]);

  /**
   * Submit text response
   */
  const handleSubmit = useCallback(async () => {
    if (!validation.isValid || submitting) return;

    setSubmitting(true);
    
    try {
      const submission = await QuestService.submissions.submitText(quest.id, textAnswer.trim());
      
      // Clear draft
      localStorage.removeItem(`quest_draft_${quest.id}`);
      
      onComplete(submission);
    } catch (error: any) {
      console.error('Failed to submit text:', error);
      alert(`Failed to submit response: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }, [validation.isValid, submitting, quest.id, textAnswer, onComplete]);

  /**
   * Calculate time spent
   */
  const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* Quest Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{quest.title}</h2>
        {quest.description && (
          <p className="text-gray-200">{quest.description}</p>
        )}
        
        {/* Quest Info */}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1 text-gray-300">
            <FileText className="w-4 h-4" />
            <span>Text Response</span>
          </div>
          
          <div className="text-gray-400">•</div>
          
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">{quest.reward_coins} coins</span>
          </div>
          
          {!reviewMode && !existingSubmission && (
            <>
              <div className="text-gray-400">•</div>
              <div className="flex items-center gap-1 text-gray-300">
                <Clock className="w-4 h-4" />
                <span>{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      {textConfig?.rubric && (
        <div className="bg-glass-light border-glass-light rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-electric-blue-400" />
            <h3 className="font-medium text-white">Instructions</h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed">{textConfig.rubric}</p>
        </div>
      )}

      {/* Text Input Area */}
      <div className="bg-glass border-glass rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="font-medium text-white">Your Response</label>
          
          <div className="flex items-center gap-3 text-sm">
            {/* Auto-save status */}
            <AnimatePresence>
              {autoSaveStatus && (
                <motion.div
                  className="flex items-center gap-1 text-gray-300"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {autoSaveStatus === 'saving' ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-300"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 text-cyber-green-400" />
                      <span>Draft saved</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Character count */}
            <span className={`${
              validation.tooLong ? 'text-red-400' : 
              validation.tooShort ? 'text-yellow-400' : 
              'text-gray-300'
            }`}>
              {textAnswer.length}/{maxLength}
            </span>
          </div>
        </div>

        <textarea
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          placeholder={textConfig?.placeholder || "Enter your response here..."}
          rows={8}
          maxLength={maxLength}
          disabled={reviewMode || !!existingSubmission}
          className="w-full bg-glass-light border-glass-light rounded-xl p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-electric-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        />

        {/* Validation Messages */}
        <div className="mt-3 space-y-2">
          {validation.tooShort && minLength > 0 && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Response should be at least {minLength} characters</span>
            </div>
          )}
          
          {validation.tooLong && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Response exceeds maximum length by {textAnswer.length - maxLength} characters</span>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      {!existingSubmission && !reviewMode && (
        <motion.button
          onClick={handleSubmit}
          disabled={!validation.isValid || submitting}
          className="w-full btn-esports disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-lg"
          whileHover={validation.isValid && !submitting ? { scale: 1.02 } : {}}
          whileTap={validation.isValid && !submitting ? { scale: 0.98 } : {}}
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting Response...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Submit for Review
            </>
          )}
        </motion.button>
      )}

      {/* Submission Status */}
      {existingSubmission && (
        <motion.div
          className="bg-glass-light border-glass-light rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-electric-blue-400" />
            <h3 className="font-medium text-white">Submission Status</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                existingSubmission.status === 'accepted' ? 'bg-cyber-green-500/20 text-cyber-green-300' :
                existingSubmission.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                'bg-yellow-500/20 text-yellow-300'
              }`}>
                {existingSubmission.status}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Submitted:</span>
              <span className="text-white">
                {new Date(existingSubmission.created_at).toLocaleDateString()}
              </span>
            </div>
            
            {existingSubmission.reviewed_at && (
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Reviewed:</span>
                <span className="text-white">
                  {new Date(existingSubmission.reviewed_at).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {existingSubmission.score !== null && (
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Score:</span>
                <span className="text-white">{existingSubmission.score}%</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TextPlayer;