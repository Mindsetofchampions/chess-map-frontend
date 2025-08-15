/**
 * MCQ Builder Component
 * 
 * Interactive editor for creating multiple choice questions with
 * dynamic option management and validation.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle, Circle, AlertTriangle } from 'lucide-react';
import type { MCQOption } from '../../types/quest';

/**
 * Props for MCQBuilder component
 */
interface MCQBuilderProps {
  /** Current MCQ options */
  options: MCQOption[];
  /** Optional explanation text */
  explanation?: string;
  /** Callback when options change */
  onChange: (options: MCQOption[], explanation?: string) => void;
  /** Error message for validation */
  errors?: string;
  /** Whether the builder is disabled */
  disabled?: boolean;
}

/**
 * MCQ Builder Component
 * 
 * Features:
 * - Dynamic option addition/removal
 * - Single correct answer enforcement
 * - Real-time validation feedback
 * - Drag-and-drop reordering (future enhancement)
 * - Responsive design with touch optimization
 */
const MCQBuilder: React.FC<MCQBuilderProps> = ({
  options,
  explanation,
  onChange,
  errors,
  disabled = false
}) => {
  const [localExplanation, setLocalExplanation] = useState(explanation || '');

  /**
   * Generate unique option ID
   */
  const generateOptionId = useCallback(() => {
    return `option_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }, []);

  /**
   * Add new option
   */
  const addOption = useCallback(() => {
    const newOption: MCQOption = {
      id: generateOptionId(),
      text: '',
      isCorrect: options.length === 0 // First option is correct by default
    };
    
    onChange([...options, newOption], localExplanation);
  }, [options, onChange, localExplanation, generateOptionId]);

  /**
   * Remove option by ID
   */
  const removeOption = useCallback((optionId: string) => {
    const updatedOptions = options.filter(opt => opt.id !== optionId);
    
    // If we removed the correct option and there are still options, make the first one correct
    const hasCorrect = updatedOptions.some(opt => opt.isCorrect);
    if (!hasCorrect && updatedOptions.length > 0) {
      updatedOptions[0].isCorrect = true;
    }
    
    onChange(updatedOptions, localExplanation);
  }, [options, onChange, localExplanation]);

  /**
   * Update option text
   */
  const updateOptionText = useCallback((optionId: string, text: string) => {
    const updatedOptions = options.map(opt =>
      opt.id === optionId ? { ...opt, text } : opt
    );
    onChange(updatedOptions, localExplanation);
  }, [options, onChange, localExplanation]);

  /**
   * Set correct option (only one can be correct)
   */
  const setCorrectOption = useCallback((optionId: string) => {
    const updatedOptions = options.map(opt => ({
      ...opt,
      isCorrect: opt.id === optionId
    }));
    onChange(updatedOptions, localExplanation);
  }, [options, onChange, localExplanation]);

  /**
   * Update explanation
   */
  const updateExplanation = useCallback((value: string) => {
    setLocalExplanation(value);
    onChange(options, value);
  }, [options, onChange]);

  /**
   * Validation state
   */
  const validationState = {
    hasCorrectAnswer: options.some(opt => opt.isCorrect),
    hasEnoughOptions: options.length >= 2,
    allOptionsHaveText: options.every(opt => opt.text.trim().length > 0)
  };

  const isValid = validationState.hasCorrectAnswer && 
                 validationState.hasEnoughOptions && 
                 validationState.allOptionsHaveText;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Multiple Choice Configuration</h3>
        <span className={`text-sm px-3 py-1 rounded-full ${
          isValid 
            ? 'bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300'
            : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300'
        }`}>
          {options.length} option{options.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error Display */}
      {errors && (
        <motion.div
          className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AlertTriangle className="w-5 h-5 text-red-300 flex-shrink-0" />
          <p className="text-red-200 text-sm">{errors}</p>
        </motion.div>
      )}

      {/* Options List */}
      <div className="space-y-3">
        <AnimatePresence>
          {options.map((option, index) => (
            <motion.div
              key={option.id}
              className="bg-glass-light border-glass-light rounded-xl p-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="flex items-start gap-3">
                {/* Correct Answer Toggle */}
                <button
                  type="button"
                  onClick={() => setCorrectOption(option.id)}
                  disabled={disabled}
                  className={`mt-1 p-1 rounded-full transition-colors duration-200 ${
                    option.isCorrect
                      ? 'text-cyber-green-400 hover:text-cyber-green-300'
                      : 'text-gray-500 hover:text-gray-400'
                  }`}
                  title={option.isCorrect ? 'Correct answer' : 'Click to mark as correct'}
                >
                  {option.isCorrect ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                {/* Option Text Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOptionText(option.id, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="w-full px-3 py-2 bg-glass border-glass rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400 transition-all duration-200"
                    disabled={disabled}
                  />
                </div>

                {/* Delete Option */}
                <button
                  type="button"
                  onClick={() => removeOption(option.id)}
                  disabled={disabled || options.length <= 2}
                  className="mt-1 p-2 text-gray-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg hover:bg-red-500/20"
                  title="Delete option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Option Status Indicators */}
              <div className="mt-2 flex items-center gap-4 text-xs">
                {option.isCorrect && (
                  <span className="text-cyber-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Correct Answer
                  </span>
                )}
                {!option.text.trim() && (
                  <span className="text-yellow-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Text required
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Option Button */}
      <motion.button
        type="button"
        onClick={addOption}
        disabled={disabled || options.length >= 8}
        className="w-full p-4 border-2 border-dashed border-glass hover:border-electric-blue-400 rounded-xl text-gray-300 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={!disabled && options.length < 8 ? { scale: 1.01 } : {}}
        whileTap={!disabled && options.length < 8 ? { scale: 0.99 } : {}}
      >
        <div className="flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          <span>Add Option {options.length < 8 ? `(${8 - options.length} remaining)` : '(Maximum reached)'}</span>
        </div>
      </motion.button>

      {/* Explanation Section */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Explanation (shown after answer)
        </label>
        <textarea
          value={localExplanation}
          onChange={(e) => updateExplanation(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-electric-blue-400 transition-all duration-200"
          placeholder="Explain why the correct answer is right and provide additional context..."
          disabled={disabled}
        />
      </div>

      {/* Validation Status */}
      <div className="bg-glass-light border-glass-light rounded-xl p-4">
        <h4 className="font-medium text-white mb-3">Validation Checklist</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {validationState.hasEnoughOptions ? (
              <CheckCircle className="w-4 h-4 text-cyber-green-400" />
            ) : (
              <Circle className="w-4 h-4 text-gray-500" />
            )}
            <span className={validationState.hasEnoughOptions ? 'text-cyber-green-300' : 'text-gray-400'}>
              At least 2 options ({options.length}/2)
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            {validationState.hasCorrectAnswer ? (
              <CheckCircle className="w-4 h-4 text-cyber-green-400" />
            ) : (
              <Circle className="w-4 h-4 text-gray-500" />
            )}
            <span className={validationState.hasCorrectAnswer ? 'text-cyber-green-300' : 'text-gray-400'}>
              Exactly one correct answer marked
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            {validationState.allOptionsHaveText ? (
              <CheckCircle className="w-4 h-4 text-cyber-green-400" />
            ) : (
              <Circle className="w-4 h-4 text-gray-500" />
            )}
            <span className={validationState.allOptionsHaveText ? 'text-cyber-green-300' : 'text-gray-400'}>
              All options have text
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCQBuilder;