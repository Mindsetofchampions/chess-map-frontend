/**
 * Quest Play Page
 * 
 * Individual quest interface for MCQ interaction with
 * answer submission and real-time feedback.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Award, 
  Clock, 
  CheckCircle, 
  XCircle,
  HelpCircle,
  Send,
  RefreshCw
} from 'lucide-react';
import { supabase, rpcSubmitMcq } from '../../lib/supabase';
import { useToast } from '../../components/ToastProvider';
import { useWallet } from '../../components/wallet/WalletChip';
import GlassContainer from '../../components/GlassContainer';
import type { Quest, MCQConfig, MCQOption } from '../../types/backend';

/**
 * Quest Play Component
 * 
 * Features:
 * - MCQ option display and selection
 * - Server-side answer submission via RPC
 * - Auto-grading with immediate feedback
 * - Coin reward on correct answers
 * - Timer tracking and progress indicators
 */
const QuestPlay: React.FC = () => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { refreshWallet } = useWallet();
  
  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [startTime] = useState(new Date());

  /**
   * Load quest data
   */
  const loadQuest = useCallback(async () => {
    if (!questId) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('id, title, description, status, active, reward_coins, qtype, config, attribute_id, created_at')
        .eq('id', questId)
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data) {
        throw new Error('Quest not found');
      }
      
      // Validate quest type
      if (data.qtype !== 'mcq') {
        throw new Error('Unsupported quest type');
      }
      
      setQuest(data);
    } catch (error: any) {
      console.error('Failed to load quest:', error);
      showError('Failed to load quest', error.message);
      navigate('/quests');
    } finally {
      setLoading(false);
    }
  }, [questId, showError, navigate]);

  /**
   * Submit MCQ answer
   */
  const handleSubmit = useCallback(async () => {
    if (!quest || !selectedOption || submitting) return;

    setSubmitting(true);
    
    try {
      // Call RPC which handles auto-grading and coin awards
      const submission = await rpcSubmitMcq(quest.id, selectedOption);
      
      setSubmitted(true);
      
      // Determine result from submission status
      if (submission.status === 'autograded') {
        setResult('correct');
        showSuccess(
          `Correct! +${quest.reward_coins} coins`, 
          'Great job! Your answer was correct and coins have been added to your wallet.'
        );
        
        // Refresh wallet to show new balance
        setTimeout(() => {
          refreshWallet();
        }, 500);
      } else {
        setResult('incorrect');
        showError('Incorrect answer', 'That\'s not quite right. Try reviewing the question and try again next time!');
      }
      
    } catch (error: any) {
      console.error('Failed to submit answer:', error);
      showError('Submission failed', error.message);
    } finally {
      setSubmitting(false);
    }
  }, [quest, selectedOption, submitting, showSuccess, showError, refreshWallet]);

  /**
   * Get persona display info from attribute ID
   */
  const getPersonaInfo = (attributeId: string | null) => {
    // Map attribute IDs to persona keys
    const attributeToPersona: Record<string, string> = {
      'f47ac10b-58cc-4372-a567-0e02b2c3d479': 'hootie',     // Critical Thinking
      'f47ac10b-58cc-4372-a567-0e02b2c3d480': 'kittykat',   // Creativity  
      'f47ac10b-58cc-4372-a567-0e02b2c3d481': 'gino',       // Leadership
      'f47ac10b-58cc-4372-a567-0e02b2c3d482': 'hammer',     // Innovation
      'f47ac10b-58cc-4372-a567-0e02b2c3d483': 'badge'       // Civic Engagement
    };
    
    const personaKey = attributeId ? attributeToPersona[attributeId] || 'hootie' : 'hootie';
    
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

  /**
   * Calculate time spent
   */
  const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

  /**
   * Initialize quest loading
   */
  useEffect(() => {
    loadQuest();
  }, [loadQuest]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-electric-blue-400 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Quest</h2>
          <p className="text-gray-300">Preparing your learning adventure...</p>
        </div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary flex items-center justify-center">
        <GlassContainer variant="card" className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Quest Not Found</h2>
          <p className="text-gray-300 mb-6">The quest you're looking for doesn't exist or isn't available.</p>
          <button
            onClick={() => navigate('/quests')}
            className="btn-esports"
          >
            Back to Quests
          </button>
        </GlassContainer>
      </div>
    );
  }

  const mcqConfig = quest.config as MCQConfig;
  const personaInfo = getPersonaInfo(quest.attribute_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
      <div className="container mx-auto max-w-4xl p-6">
        
        {/* Navigation */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            onClick={() => navigate('/quests')}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quests</span>
          </button>
        </motion.div>

        <GlassContainer variant="card">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            
            {/* Quest Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-4xl">{personaInfo.emoji}</span>
                <div>
                  <h1 className="text-3xl font-bold text-white">{quest.title}</h1>
                  <p className={`text-lg ${personaInfo.color}`}>{personaInfo.name}</p>
                </div>
              </div>
              
              {quest.description && (
                <p className="text-gray-200 text-lg max-w-2xl mx-auto">
                  {quest.description}
                </p>
              )}
              
              {/* Quest Info */}
              <div className="flex items-center justify-center gap-6 mt-6">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Award className="w-5 h-5" />
                  <span className="font-semibold">{quest.reward_coins} coins</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-5 h-5" />
                  <span>{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-300">
                  <HelpCircle className="w-5 h-5" />
                  <span>Multiple Choice</span>
                </div>
              </div>
            </div>

            {/* MCQ Options */}
            {mcqConfig?.options && (
              <div className="space-y-4 mb-8">
                <AnimatePresence>
                  {mcqConfig.options.map((option: MCQOption, index: number) => (
                    <motion.button
                      key={option.id}
                      onClick={() => !submitted && setSelectedOption(option.id)}
                      disabled={submitted}
                      data-testid={`btn-choice-${option.id}`}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        submitted 
                          ? 'cursor-default opacity-75'
                          : selectedOption === option.id
                          ? 'bg-electric-blue-500/20 border-electric-blue-500/50 text-electric-blue-300'
                          : 'bg-glass-light border-glass-light text-gray-200 hover:bg-glass'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={!submitted ? { scale: 1.01 } : {}}
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
                        
                        <p className="font-medium leading-relaxed flex-1">
                          {option.text}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Submit Button */}
            {!submitted && (
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
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Submitting Answer...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    <span>Submit Answer</span>
                  </div>
                )}
              </motion.button>
            )}

            {/* Result Display */}
            <AnimatePresence>
              {submitted && result && (
                <motion.div
                  className={`mt-8 p-6 rounded-xl border-2 ${
                    result === 'correct'
                      ? 'bg-cyber-green-500/20 border-cyber-green-500/50'
                      : 'bg-red-500/20 border-red-500/50'
                  }`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {result === 'correct' ? (
                      <CheckCircle className="w-8 h-8 text-cyber-green-400" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-400" />
                    )}
                    <div>
                      <h3 className={`text-xl font-bold ${
                        result === 'correct' ? 'text-cyber-green-300' : 'text-red-300'
                      }`}>
                        {result === 'correct' ? 'Correct!' : 'Not Quite Right'}
                      </h3>
                      <p className={`text-sm ${
                        result === 'correct' ? 'text-cyber-green-200' : 'text-red-200'
                      }`}>
                        {result === 'correct' 
                          ? `Excellent work! You earned ${quest.reward_coins} coins.`
                          : 'Keep learning and try again next time!'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => navigate('/quests')}
                      className="flex-1 btn-esports"
                    >
                      Back to Quests
                    </button>
                    
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="flex-1 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-200"
                    >
                      Dashboard
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </GlassContainer>
      </div>
    </div>
  );
};

export default QuestPlay;