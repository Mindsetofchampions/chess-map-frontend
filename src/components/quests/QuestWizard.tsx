/**
 * Quest Creation Wizard
 * 
 * Multi-step wizard for creating quests from templates with
 * persona assignment, location selection, and configuration.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, MapPin, Coins, CheckCircle, BookTemplate as FileTemplate, Settings, Send } from 'lucide-react';
import { useQuests } from '../../hooks/useQuests';
import GlassContainer from '../GlassContainer';
import type { QuestTemplate, CreateQuestData } from '../../types/quest';
import { PersonaKey } from '../../assets/personas';

/**
 * Wizard step configuration
 */
interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Props for QuestWizard component
 */
interface QuestWizardProps {
  /** Optional initial template selection */
  initialTemplate?: QuestTemplate;
  /** Callback when quest is created successfully */
  onComplete: (quest: any) => void;
  /** Callback when wizard is cancelled */
  onCancel: () => void;
}

/**
 * Quest Creation Wizard Component
 * 
 * Features:
 * - Multi-step guided quest creation process
 * - Template selection with preview
 * - Interactive map location picker
 * - Persona assignment with visual previews
 * - Real-time validation and preview
 */
const QuestWizard: React.FC<QuestWizardProps> = ({
  initialTemplate,
  onComplete,
  onCancel
}) => {
  const { templates, createQuest, creating } = useQuests();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [questData, setQuestData] = useState<Partial<CreateQuestData>>({
    template_id: initialTemplate?.id || '',
    title: initialTemplate?.title || '',
    description: initialTemplate?.description || '',
    reward_coins: initialTemplate?.default_reward || 10,
    persona_key: 'hootie',
    lng: -75.1652, // Philadelphia default
    lat: 39.9526,
    node_id: undefined
  });

  // Wizard steps configuration
  const steps: WizardStep[] = [
    {
      id: 'template',
      title: 'Select Template',
      description: 'Choose a quest template to build from',
      icon: FileTemplate
    },
    {
      id: 'configure',
      title: 'Configure Quest',
      description: 'Set title, description, and rewards',
      icon: Settings
    },
    {
      id: 'location',
      title: 'Choose Location',
      description: 'Select persona and map location',
      icon: MapPin
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Review and submit for approval',
      icon: CheckCircle
    }
  ];

  /**
   * Validate current step
   */
  const validateStep = useCallback((stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Template selection
        return !!questData.template_id;
      
      case 1: // Configuration
        return !!(questData.title?.trim() && questData.reward_coins && questData.reward_coins > 0);
      
      case 2: // Location
        return !!(questData.persona_key && questData.lng && questData.lat);
      
      case 3: // Review
        return true; // All previous validations passed
      
      default:
        return false;
    }
  }, [questData]);

  /**
   * Navigate to next step
   */
  const nextStep = useCallback(() => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateStep, steps.length]);

  /**
   * Navigate to previous step
   */
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  /**
   * Update quest data
   */
  const updateQuestData = useCallback(<K extends keyof CreateQuestData>(
    field: K,
    value: CreateQuestData[K]
  ) => {
    setQuestData(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Submit quest
   */
  const handleSubmit = useCallback(async () => {
    if (!validateStep(3) || !questData.template_id) return;

    try {
      const quest = await createQuest(questData as CreateQuestData);
      onComplete(quest);
    } catch (error) {
      console.error('Failed to create quest:', error);
    }
  }, [questData, createQuest, onComplete, validateStep]);

  /**
   * Get selected template
   */
  const selectedTemplate = templates.find(t => t.id === questData.template_id);

  return (
    <GlassContainer variant="card" className="max-w-4xl mx-auto">
      
      {/* Wizard Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Create New Quest</h2>
        <p className="text-gray-200">Follow the steps to create an engaging quest for students</p>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-between mb-8 px-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <motion.div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                index < currentStep 
                  ? 'bg-cyber-green-500/20 border-cyber-green-500/50 text-cyber-green-300'
                  : index === currentStep
                  ? 'bg-electric-blue-500/20 border-electric-blue-500/50 text-electric-blue-300'
                  : 'bg-glass border-glass text-gray-500'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {index < currentStep ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </motion.div>
            
            {index < steps.length - 1 && (
              <div className={`w-12 md:w-20 h-0.5 mx-2 transition-colors duration-300 ${
                index < currentStep ? 'bg-cyber-green-400' : 'bg-gray-600'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px] mb-8">
        <AnimatePresence mode="wait">
          
          {/* Step 1: Template Selection */}
          {currentStep === 0 && (
            <motion.div
              key="template-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Choose Quest Template</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <motion.button
                    key={template.id}
                    onClick={() => updateQuestData('template_id', template.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      questData.template_id === template.id
                        ? 'bg-electric-blue-500/20 border-electric-blue-500/50'
                        : 'bg-glass border-glass hover:bg-glass-dark'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">{template.title}</h4>
                      <span className="text-xs bg-glass-dark border-glass-dark rounded-full px-2 py-1 text-gray-300 capitalize">
                        {template.qtype}
                      </span>
                    </div>
                    
                    <p className="text-gray-200 text-sm mb-3 line-clamp-2">
                      {template.description || 'No description provided'}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      <Coins className="w-3 h-3 text-yellow-400" />
                      <span>{template.default_reward} coins default</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Quest Configuration */}
          {currentStep === 1 && (
            <motion.div
              key="config-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Configure Quest Details</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Quest Title *
                  </label>
                  <input
                    type="text"
                    value={questData.title || ''}
                    onChange={(e) => updateQuestData('title', e.target.value)}
                    className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400"
                    placeholder="Enter quest title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Reward Coins *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={questData.reward_coins || 10}
                    onChange={(e) => updateQuestData('reward_coins', parseInt(e.target.value) || 10)}
                    className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Quest Description
                </label>
                <textarea
                  value={questData.description || ''}
                  onChange={(e) => updateQuestData('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-electric-blue-400"
                  placeholder="Describe what students will do in this quest"
                />
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <div className="bg-glass-light border-glass-light rounded-xl p-4">
                  <h4 className="font-medium text-white mb-2">Template: {selectedTemplate.title}</h4>
                  <p className="text-gray-200 text-sm mb-3">{selectedTemplate.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-300">
                    <span className="capitalize">{selectedTemplate.qtype} quest</span>
                    <span>•</span>
                    <span>Default: {selectedTemplate.default_reward} coins</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Location Selection */}
          {currentStep === 2 && (
            <motion.div
              key="location-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Choose Persona & Location</h3>
              
              {/* Persona Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-4">
                  CHESS Persona *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {(['hootie', 'kittykat', 'gino', 'hammer', 'badge'] as PersonaKey[]).map((persona) => (
                    <motion.button
                      key={persona}
                      type="button"
                      onClick={() => updateQuestData('persona_key', persona)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        questData.persona_key === persona
                          ? 'bg-electric-blue-500/20 border-electric-blue-500/50'
                          : 'bg-glass border-glass hover:bg-glass-dark'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">
                          {persona === 'hootie' && '🦉'}
                          {persona === 'kittykat' && '🐱'}
                          {persona === 'gino' && '🐕'}
                          {persona === 'hammer' && '🤖'}
                          {persona === 'badge' && '🏛️'}
                        </div>
                        <span className="text-sm font-medium text-white capitalize">
                          {persona === 'kittykat' ? 'Kitty Kat' : persona}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Location Input */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={questData.lng || -75.1652}
                    onChange={(e) => updateQuestData('lng', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white"
                    placeholder="-75.1652"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={questData.lat || 39.9526}
                    onChange={(e) => updateQuestData('lat', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-glass border-glass rounded-xl text-white"
                    placeholder="39.9526"
                  />
                </div>
              </div>

              {/* Map Preview */}
              <div className="bg-glass-light border-glass-light rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-electric-blue-400" />
                  <h4 className="font-medium text-white">Location Preview</h4>
                </div>
                <p className="text-gray-200 text-sm">
                  Coordinates: {questData.lat?.toFixed(4)}, {questData.lng?.toFixed(4)}
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  Quest will appear as a {questData.persona_key} bubble at this location
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <motion.div
              key="review-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Review Quest Details</h3>
              
              <div className="bg-glass-light border-glass-light rounded-xl p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-white text-lg">{questData.title}</h4>
                  {questData.description && (
                    <p className="text-gray-200 mt-2">{questData.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-glass">
                  <div>
                    <span className="text-gray-300 text-sm">Template</span>
                    <p className="text-white font-medium">{selectedTemplate?.title}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-300 text-sm">Persona</span>
                    <p className="text-white font-medium capitalize">{questData.persona_key}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-300 text-sm">Reward</span>
                    <p className="text-white font-medium">{questData.reward_coins} coins</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-glass">
                  <span className="text-gray-300 text-sm">Location</span>
                  <p className="text-white font-medium">
                    {questData.lat?.toFixed(4)}, {questData.lng?.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Submission Note */}
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-200">
                  <Send className="w-5 h-5" />
                  <h4 className="font-medium">Ready to Submit</h4>
                </div>
                <p className="text-amber-100 text-sm mt-2">
                  This quest will be submitted for master admin approval. Once approved, 
                  {questData.reward_coins} coins will be deducted from the approver's wallet to fund rewards.
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-glass">
        <motion.button
          type="button"
          onClick={currentStep === 0 ? onCancel : prevStep}
          disabled={creating}
          className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="w-4 h-4" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </motion.button>

        <div className="text-center">
          <span className="text-gray-300 text-sm">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        <motion.button
          type="button"
          onClick={currentStep === steps.length - 1 ? handleSubmit : nextStep}
          disabled={!validateStep(currentStep) || creating}
          className="flex items-center gap-2 btn-esports disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={validateStep(currentStep) && !creating ? { scale: 1.02 } : {}}
          whileTap={validateStep(currentStep) && !creating ? { scale: 0.98 } : {}}
        >
          {creating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Creating...
            </>
          ) : currentStep === steps.length - 1 ? (
            <>
              <Send className="w-4 h-4" />
              Submit Quest
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </GlassContainer>
  );
};

export default QuestWizard;