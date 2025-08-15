/**
 * Quest Creation Page
 * 
 * Guided quest creation interface using the QuestWizard component
 * with template integration and location selection.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useQuests } from '../../hooks/useQuests';
import { useAuth } from '../../contexts/AuthContext';
import GlassContainer from '../../components/GlassContainer';
import QuestWizard from '../../components/quests/QuestWizard';
import type { QuestTemplate } from '../../types/quest';

/**
 * Quest Creation Page Component
 * 
 * Features:
 * - Integration with QuestWizard for guided creation
 * - Template pre-selection from navigation state
 * - Success confirmation with navigation options
 * - Role-based access control
 * - Mobile-responsive design
 */
const QuestCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { templates } = useQuests();

  // Component state
  const [createdQuest, setCreatedQuest] = useState<any>(null);
  const [initialTemplate, setInitialTemplate] = useState<QuestTemplate | null>(null);

  /**
   * Get initial template from navigation state
   */
  useEffect(() => {
    const state = location.state as any;
    if (state?.templateId) {
      const template = templates.find(t => t.id === state.templateId);
      if (template) {
        setInitialTemplate(template);
      }
    }
  }, [location.state, templates]);

  /**
   * Handle quest creation completion
   */
  const handleQuestComplete = (quest: any) => {
    setCreatedQuest(quest);
  };

  /**
   * Handle wizard cancellation
   */
  const handleCancel = () => {
    navigate('/admin/quests/templates');
  };

  /**
   * Navigate to quest management
   */
  const goToQuestManagement = () => {
    navigate('/admin/dashboard'); // Or wherever quest management is
  };

  /**
   * Create another quest
   */
  const createAnother = () => {
    setCreatedQuest(null);
    setInitialTemplate(null);
  };

  // Check access permissions
  if (!profile || (profile.role !== 'org_admin' && profile.role !== 'staff' && profile.role !== 'master_admin')) {
    return (
      <GlassContainer variant="page">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-300">You need admin privileges to create quests.</p>
        </div>
      </GlassContainer>
    );
  }

  return (
    <GlassContainer variant="page">
      <div className="container mx-auto max-w-7xl">
        
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            onClick={() => navigate('/admin/quests/templates')}
            className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Templates
          </motion.button>
        </div>

        {/* Success State */}
        {createdQuest ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <GlassContainer variant="card" className="text-center max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="w-20 h-20 bg-cyber-green-500/20 border border-cyber-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-cyber-green-400" />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-2">Quest Created Successfully!</h2>
                <p className="text-gray-200">Your quest has been submitted for master admin approval.</p>
              </div>

              <div className="bg-glass-light border-glass-light rounded-xl p-6 mb-6 text-left">
                <h3 className="font-semibold text-white mb-4">Quest Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Title:</span>
                    <span className="text-white">{createdQuest.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Type:</span>
                    <span className="text-white capitalize">{createdQuest.qtype}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Persona:</span>
                    <span className="text-white capitalize">{createdQuest.persona_key}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Reward:</span>
                    <span className="text-white">{createdQuest.reward_coins} coins</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Status:</span>
                    <span className="text-yellow-400 capitalize">{createdQuest.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={createAnother}
                  className="flex-1 btn-esports"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Create Another Quest
                </motion.button>
                
                <motion.button
                  onClick={goToQuestManagement}
                  className="flex-1 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View All Quests
                </motion.button>
              </div>
            </GlassContainer>
          </motion.div>
        ) : (
          /* Quest Creation Wizard */
          <QuestWizard
            initialTemplate={initialTemplate}
            onComplete={handleQuestComplete}
            onCancel={handleCancel}
          />
        )}
      </div>
    </GlassContainer>
  );
};

export default QuestCreatePage;