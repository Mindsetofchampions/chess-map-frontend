/**
 * Quest Template Creation Form
 * 
 * Comprehensive form for creating and editing quest templates with
 * type-specific configuration builders and validation.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle,
  FileText,
  Video,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import GlassContainer from '../GlassContainer';
import MCQBuilder from './MCQBuilder';
import type { QuestType, CreateTemplateData, MCQOption } from '../../types/quest';

/**
 * Form validation schema using Zod
 */
const templateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  qtype: z.enum(['mcq', 'text', 'video']),
  default_reward: z.number().min(0, 'Reward must be positive').max(1000, 'Reward too high'),
  config: z.object({
    mcq: z.object({
      options: z.array(z.object({
        id: z.string(),
        text: z.string(),
        isCorrect: z.boolean()
      })).min(2, 'MCQ must have at least 2 options').optional(),
      explanation: z.string().optional()
    }).optional(),
    text: z.object({
      maxLength: z.number().min(10).max(10000),
      minLength: z.number().min(0).optional(),
      rubric: z.string().optional(),
      placeholder: z.string().optional()
    }).optional(),
    video: z.object({
      maxSizeMB: z.number().min(1).max(100),
      instructions: z.string().optional(),
      maxDurationSeconds: z.number().min(30).max(1800).optional()
    }).optional()
  })
});

/**
 * Props for TemplateForm component
 */
interface TemplateFormProps {
  /** Initial template data for editing */
  initialData?: Partial<CreateTemplateData>;
  /** Callback when form is submitted successfully */
  onSubmit: (data: CreateTemplateData) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether the form is in loading state */
  loading?: boolean;
  /** Form mode for different UI states */
  mode?: 'create' | 'edit';
}

/**
 * Quest Template Form Component
 * 
 * Features:
 * - Dynamic form fields based on quest type selection
 * - Real-time validation with Zod schema
 * - Type-specific configuration builders (MCQ, Text, Video)
 * - Responsive design with glassmorphic styling
 * - Comprehensive error handling and user feedback
 */
const TemplateForm: React.FC<TemplateFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create'
}) => {
  // Form state
  const [formData, setFormData] = useState<CreateTemplateData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    qtype: initialData?.qtype || 'mcq',
    default_reward: initialData?.default_reward || 10,
    config: initialData?.config || {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  /**
   * Validate form data
   */
  const validateForm = useCallback(() => {
    try {
      templateSchema.parse(formData);
      
      // Additional MCQ validation
      if (formData.qtype === 'mcq') {
        const mcqOptions = formData.config.mcq?.options || [];
        const correctCount = mcqOptions.filter(opt => opt.isCorrect).length;
        
        if (correctCount !== 1) {
          setErrors({ mcq: 'MCQ must have exactly one correct answer' });
          return false;
        }
      }
      
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          formErrors[path] = err.message;
        });
        setErrors(formErrors);
      }
      return false;
    }
  }, [formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [formData, validateForm, onSubmit]);

  /**
   * Update form field
   */
  const updateField = useCallback(<K extends keyof CreateTemplateData>(
    field: K,
    value: CreateTemplateData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear field error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  /**
   * Update quest type and reset config
   */
  const handleTypeChange = useCallback((qtype: QuestType) => {
    setFormData(prev => ({
      ...prev,
      qtype,
      config: {} // Reset config when type changes
    }));
    setIsDirty(true);
  }, []);

  /**
   * Update MCQ configuration
   */
  const updateMCQConfig = useCallback((options: MCQOption[], explanation?: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        mcq: { options, explanation }
      }
    }));
    setIsDirty(true);
  }, []);

  /**
   * Get quest type icon
   */
  const getTypeIcon = (type: QuestType) => {
    switch (type) {
      case 'mcq': return <HelpCircle className="w-5 h-5" />;
      case 'text': return <FileText className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
    }
  };

  return (
    <GlassContainer variant="card" className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Form Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            {mode === 'create' ? 'Create Quest Template' : 'Edit Quest Template'}
          </h2>
          <p className="text-gray-200">
            Templates are reusable blueprints for creating quests with specific personas and interactions.
          </p>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-200 mb-2">
              Template Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={`w-full px-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400 transition-all duration-200 ${
                errors.title ? 'border-red-500' : ''
              }`}
              placeholder="Enter a descriptive template name"
              disabled={loading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Default Reward */}
          <div>
            <label htmlFor="reward" className="block text-sm font-medium text-gray-200 mb-2">
              Default Reward (Coins) *
            </label>
            <input
              id="reward"
              type="number"
              min="0"
              max="1000"
              value={formData.default_reward}
              onChange={(e) => updateField('default_reward', parseInt(e.target.value) || 0)}
              className={`w-full px-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400 transition-all duration-200 ${
                errors.default_reward ? 'border-red-500' : ''
              }`}
              disabled={loading}
            />
            {errors.default_reward && (
              <p className="mt-1 text-sm text-red-400">{errors.default_reward}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            className={`w-full px-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400 transition-all duration-200 resize-none ${
              errors.description ? 'border-red-500' : ''
            }`}
            placeholder="Describe what this template is for and how it should be used"
            disabled={loading}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-400">{errors.description}</p>
          )}
        </div>

        {/* Quest Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-4">
            Quest Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['mcq', 'text', 'video'] as QuestType[]).map((type) => (
              <motion.button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  formData.qtype === type
                    ? 'bg-electric-blue-500/20 border-electric-blue-500/50 text-electric-blue-300'
                    : 'bg-glass border-glass text-gray-300 hover:bg-glass-dark hover:text-white'
                }`}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center space-y-2">
                  {getTypeIcon(type)}
                  <span className="font-medium capitalize">{type === 'mcq' ? 'Multiple Choice' : type}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Type-Specific Configuration */}
        <AnimatePresence mode="wait">
          {formData.qtype === 'mcq' && (
            <motion.div
              key="mcq-config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MCQBuilder
                options={formData.config.mcq?.options || []}
                explanation={formData.config.mcq?.explanation}
                onChange={updateMCQConfig}
                errors={errors.mcq}
              />
            </motion.div>
          )}

          {formData.qtype === 'text' && (
            <motion.div
              key="text-config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-white">Text Response Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Maximum Length (characters)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={formData.config.text?.maxLength || 500}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        text: {
                          ...prev.config.text,
                          maxLength: parseInt(e.target.value) || 500
                        }
                      }
                    }))}
                    className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Minimum Length (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.config.text?.minLength || 0}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        text: {
                          ...prev.config.text,
                          minLength: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Grading Rubric (for reviewers)
                </label>
                <textarea
                  value={formData.config.text?.rubric || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      text: {
                        ...prev.config.text,
                        rubric: e.target.value
                      }
                    }
                  }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 resize-none"
                  placeholder="Guidelines for staff to grade text responses..."
                  disabled={loading}
                />
              </div>
            </motion.div>
          )}

          {formData.qtype === 'video' && (
            <motion.div
              key="video-config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-white">Video Upload Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Maximum File Size (MB)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.config.video?.maxSizeMB || 50}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        video: {
                          ...prev.config.video,
                          maxSizeMB: parseInt(e.target.value) || 50
                        }
                      }
                    }))}
                    className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Max Duration (seconds, optional)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="1800"
                    value={formData.config.video?.maxDurationSeconds || 300}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        video: {
                          ...prev.config.video,
                          maxDurationSeconds: parseInt(e.target.value) || 300
                        }
                      }
                    }))}
                    className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Upload Instructions
                </label>
                <textarea
                  value={formData.config.video?.instructions || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      video: {
                        ...prev.config.video,
                        instructions: e.target.value
                      }
                    }
                  }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 resize-none"
                  placeholder="Instructions for students about what to record and upload..."
                  disabled={loading}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-glass">
          <motion.button
            type="submit"
            disabled={loading || !isDirty}
            className="flex-1 btn-esports disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!loading && isDirty ? { scale: 1.02 } : {}}
            whileTap={!loading && isDirty ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {mode === 'create' ? 'Create Template' : 'Update Template'}
              </>
            )}
          </motion.button>

          {onCancel && (
            <motion.button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
          )}
        </div>

        {/* Validation Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-300" />
              <h4 className="font-medium text-red-200">Please fix the following errors:</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-red-200 space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </GlassContainer>
  );
};

export default TemplateForm;