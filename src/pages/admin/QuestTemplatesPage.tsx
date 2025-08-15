/**
 * Quest Templates Management Page
 * 
 * Comprehensive interface for administrators to create, edit, and manage
 * quest templates with real-time updates and validation.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, BookTemplate as FileTemplate, Edit, Trash2, Eye, HelpCircle, FileText, Video, RefreshCw, ArrowLeft } from 'lucide-react';
import { useQuests } from '../../hooks/useQuests';
import { useAuth } from '../../contexts/AuthContext';
import GlassContainer from '../../components/GlassContainer';
import TemplateForm from '../../components/quests/TemplateForm';
import type { QuestTemplate, CreateTemplateData } from '../../types/quest';

/**
 * Quest Templates Page Component
 * 
 * Features:
 * - Template library with search and filtering
 * - Create new templates with guided form
 * - Edit existing templates with validation
 * - Template usage statistics
 * - Role-based access control
 */
const QuestTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { 
    templates, 
    loading, 
    errors, 
    refreshTemplates, 
    createTemplate, 
    updateTemplate 
  } = useQuests();

  // Component state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mcq' | 'text' | 'video'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuestTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<QuestTemplate | null>(null);

  /**
   * Filter templates based on search and type
   */
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || template.qtype === filterType;
    
    return matchesSearch && matchesType;
  });

  /**
   * Handle template creation
   */
  const handleCreateTemplate = useCallback(async (data: CreateTemplateData) => {
    try {
      await createTemplate(data);
      setShowCreateForm(false);
    } catch (error: any) {
      console.error('Failed to create template:', error);
      throw error; // Let form handle the error display
    }
  }, [createTemplate]);

  /**
   * Handle template update
   */
  const handleUpdateTemplate = useCallback(async (data: CreateTemplateData) => {
    if (!editingTemplate) return;
    
    try {
      await updateTemplate(editingTemplate.id, data);
      setEditingTemplate(null);
    } catch (error: any) {
      console.error('Failed to update template:', error);
      throw error;
    }
  }, [editingTemplate, updateTemplate]);

  /**
   * Get quest type icon
   */
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <HelpCircle className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <FileTemplate className="w-4 h-4" />;
    }
  };

  /**
   * Check if user can edit template (owner or master admin)
   */
  const canEditTemplate = useCallback((template: QuestTemplate): boolean => {
    return template.created_by === user?.id || profile?.role === 'master_admin';
  }, [user, profile]);

  // Check access permissions
  if (!profile || (profile.role !== 'org_admin' && profile.role !== 'staff' && profile.role !== 'master_admin')) {
    return (
      <GlassContainer variant="page">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-300">You need admin privileges to manage quest templates.</p>
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
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </motion.button>
        </div>

        {/* Show Create/Edit Form */}
        <AnimatePresence>
          {(showCreateForm || editingTemplate) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <TemplateForm
                initialData={editingTemplate || undefined}
                onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                onCancel={() => {
                  setShowCreateForm(false);
                  setEditingTemplate(null);
                }}
                mode={editingTemplate ? 'edit' : 'create'}
                loading={loading.templates}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Templates Interface */}
        {!showCreateForm && !editingTemplate && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Quest Templates</h1>
                <p className="text-gray-200">Create and manage reusable quest templates</p>
              </div>
              
              <motion.button
                onClick={() => setShowCreateForm(true)}
                className="btn-esports flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-5 h-5" />
                Create Template
              </motion.button>
            </div>

            {/* Filters and Search */}
            <GlassContainer variant="card" className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full px-4 py-2 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400"
                  />
                </div>

                {/* Type Filter */}
                <div className="flex gap-2">
                  {['all', 'mcq', 'text', 'video'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type as any)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        filterType === type
                          ? 'bg-electric-blue-500/30 text-electric-blue-300 border border-electric-blue-500/50'
                          : 'bg-glass border-glass text-gray-300 hover:bg-glass-dark'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Refresh */}
                <motion.button
                  onClick={refreshTemplates}
                  disabled={loading.templates}
                  className="p-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw className={`w-4 h-4 ${loading.templates ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </GlassContainer>

            {/* Error Display */}
            {errors.templates && (
              <motion.div
                className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <p className="text-red-200">{errors.templates}</p>
              </motion.div>
            )}

            {/* Templates Grid */}
            {loading.templates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="bg-glass border-glass rounded-xl p-6 animate-pulse">
                    <div className="h-6 bg-gray-600 rounded mb-4"></div>
                    <div className="h-4 bg-gray-600 rounded mb-2"></div>
                    <div className="h-4 bg-gray-600 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <GlassContainer variant="card" className="text-center py-12">
                <FileTemplate className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {searchTerm || filterType !== 'all' ? 'No Matching Templates' : 'No Templates Yet'}
                </h3>
                <p className="text-gray-300 mb-6">
                  {searchTerm || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first quest template to get started'
                  }
                </p>
                {!searchTerm && filterType === 'all' && (
                  <motion.button
                    onClick={() => setShowCreateForm(true)}
                    className="btn-esports flex items-center gap-2 mx-auto"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-4 h-4" />
                    Create First Template
                  </motion.button>
                )}
              </GlassContainer>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredTemplates.map((template, index) => (
                    <motion.div
                      key={template.id}
                      className="bg-glass border-glass rounded-xl p-6 hover:bg-glass-dark transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(template.qtype)}
                          <span className="text-xs bg-glass-dark border-glass rounded-full px-2 py-1 text-gray-300 capitalize">
                            {template.qtype}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewTemplate(template)}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-glass-dark transition-colors"
                            title="Preview template"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {canEditTemplate(template) && (
                            <button
                              onClick={() => setEditingTemplate(template)}
                              className="p-2 text-electric-blue-400 hover:text-electric-blue-300 rounded-lg hover:bg-electric-blue-500/20 transition-colors"
                              title="Edit template"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="font-semibold text-white text-lg mb-2">{template.title}</h3>
                      
                      <p className="text-gray-200 text-sm mb-4 line-clamp-3">
                        {template.description || 'No description provided'}
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">
                          Default: {template.default_reward} coins
                        </span>
                        <span className="text-gray-400">
                          {new Date(template.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Quick Create Quest Button */}
                      <div className="mt-4 pt-4 border-t border-glass">
                        <motion.button
                          onClick={() => navigate('/admin/quests/create', { 
                            state: { templateId: template.id } 
                          })}
                          className="w-full bg-electric-blue-500/20 border border-electric-blue-500/30 text-electric-blue-300 hover:bg-electric-blue-500/30 rounded-lg px-4 py-2 font-medium transition-all duration-200"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Create Quest from Template
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Template Preview Modal */}
        <AnimatePresence>
          {previewTemplate && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewTemplate(null)}
            >
              <motion.div
                className="bg-glass backdrop-blur-xl border-glass rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">{previewTemplate.title}</h3>
                    <span className="px-3 py-1 bg-glass-dark border-glass rounded-full text-gray-300 text-sm capitalize">
                      {previewTemplate.qtype}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-gray-300 text-sm">Description</span>
                      <p className="text-white">{previewTemplate.description || 'No description provided'}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-300 text-sm">Default Reward</span>
                      <p className="text-white">{previewTemplate.default_reward} coins</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-300 text-sm">Configuration</span>
                      <pre className="bg-glass-dark border-glass rounded-lg p-3 text-gray-200 text-xs overflow-auto">
                        {JSON.stringify(previewTemplate.config, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    {canEditTemplate(previewTemplate) && (
                      <button
                        onClick={() => {
                          setEditingTemplate(previewTemplate);
                          setPreviewTemplate(null);
                        }}
                        className="btn-esports flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Template
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        navigate('/admin/quests/create', { 
                          state: { templateId: previewTemplate.id } 
                        });
                      }}
                      className="bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-200"
                    >
                      Create Quest
                    </button>
                    
                    <button
                      onClick={() => setPreviewTemplate(null)}
                      className="bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassContainer>
  );
};

export default QuestTemplatesPage;