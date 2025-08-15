/**
 * Enhanced Quest Management Hook
 * 
 * Provides comprehensive quest state management with real-time updates,
 * role-based filtering, and optimistic UI updates. Integrates with the
 * CHESS persona system and coin rewards.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { QuestService } from '../services/quests';
import { useAuth } from '../contexts/AuthContext';
import type { 
  Quest, 
  QuestTemplate, 
  QuestSubmission, 
  QuestWithTemplate,
  QuestStats,
  CreateQuestData,
  CreateTemplateData
} from '../types/quest';

/**
 * Quest hook state interface
 */
interface UseQuestsState {
  // Data collections
  templates: QuestTemplate[];
  quests: QuestWithTemplate[];
  mapQuests: Quest[];
  userSubmissions: QuestSubmission[];
  pendingApprovals: QuestWithTemplate[];
  stats: QuestStats | null;

  // Loading states
  loading: {
    templates: boolean;
    quests: boolean;
    mapQuests: boolean;
    submissions: boolean;
    approvals: boolean;
    stats: boolean;
  };

  // Error states
  errors: {
    templates: string | null;
    quests: string | null;
    mapQuests: string | null;
    submissions: string | null;
    approvals: string | null;
    stats: string | null;
  };

  // Operation states
  creating: boolean;
  submitting: boolean;
  approving: string | null;
}

/**
 * Quest hook return interface
 */
interface UseQuestsReturn extends UseQuestsState {
  // Template operations
  refreshTemplates: () => Promise<void>;
  createTemplate: (data: CreateTemplateData) => Promise<QuestTemplate>;
  updateTemplate: (id: string, data: Partial<CreateTemplateData>) => Promise<QuestTemplate>;

  // Quest operations
  refreshQuests: () => Promise<void>;
  createQuest: (data: CreateQuestData) => Promise<Quest>;
  submitForApproval: (questId: string) => Promise<Quest>;
  approveQuest: (questId: string) => Promise<Quest>;
  rejectQuest: (questId: string, reason?: string) => Promise<Quest>;

  // Map quest operations
  refreshMapQuests: () => Promise<void>;
  getQuestById: (id: string) => Promise<QuestWithTemplate | null>;

  // Submission operations
  submitMCQAnswer: (questId: string, choice: string) => Promise<QuestSubmission>;
  submitTextAnswer: (questId: string, text: string) => Promise<QuestSubmission>;
  submitVideoAnswer: (questId: string, videoUrl: string) => Promise<QuestSubmission>;
  getUserSubmission: (questId: string) => Promise<QuestSubmission | null>;

  // Admin operations
  refreshPendingApprovals: () => Promise<void>;
  refreshStats: () => Promise<void>;

  // Utility functions
  clearError: (section: keyof UseQuestsState['errors']) => void;
  isQuestCompleted: (questId: string) => boolean;
  canUserAccessQuest: (quest: Quest) => boolean;
}

/**
 * Enhanced quest management hook
 * 
 * Provides centralized state management for all quest-related operations
 * with real-time updates, optimistic UI, and comprehensive error handling.
 */
export const useQuests = (): UseQuestsReturn => {
  const { user, profile } = useAuth();
  const mountedRef = useRef(true);

  // State management
  const [state, setState] = useState<UseQuestsState>({
    // Data
    templates: [],
    quests: [],
    mapQuests: [],
    userSubmissions: [],
    pendingApprovals: [],
    stats: null,

    // Loading states
    loading: {
      templates: false,
      quests: false,
      mapQuests: false,
      submissions: false,
      approvals: false,
      stats: false,
    },

    // Error states
    errors: {
      templates: null,
      quests: null,
      mapQuests: null,
      submissions: null,
      approvals: null,
      stats: null,
    },

    // Operation states
    creating: false,
    submitting: false,
    approving: null,
  });

  /**
   * Generic error handler with auto-clear
   */
  const setError = useCallback((section: keyof UseQuestsState['errors'], error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [section]: error }
    }));

    // Auto-clear error after 10 seconds
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, [section]: null }
      }));
    }, 10000);
  }, []);

  /**
   * Clear specific error
   */
  const clearError = useCallback((section: keyof UseQuestsState['errors']) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [section]: null }
    }));
  }, []);

  /**
   * Template operations
   */
  const refreshTemplates = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, templates: true } }));
    
    try {
      const templates = await QuestService.templates.list();
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          templates,
          loading: { ...prev.loading, templates: false },
          errors: { ...prev.errors, templates: null }
        }));
      }
    } catch (error: any) {
      if (mountedRef.current) {
        setError('templates', error.message);
        setState(prev => ({ ...prev, loading: { ...prev.loading, templates: false } }));
      }
    }
  }, [setError]);

  const createTemplate = useCallback(async (data: CreateTemplateData): Promise<QuestTemplate> => {
    setState(prev => ({ ...prev, creating: true }));
    
    try {
      const template = await QuestService.templates.create(data);
      
      // Optimistic update
      setState(prev => ({
        ...prev,
        templates: [template, ...prev.templates],
        creating: false
      }));
      
      return template;
    } catch (error: any) {
      setState(prev => ({ ...prev, creating: false }));
      setError('templates', error.message);
      throw error;
    }
  }, [setError]);

  const updateTemplate = useCallback(async (id: string, data: Partial<CreateTemplateData>): Promise<QuestTemplate> => {
    try {
      const updated = await QuestService.templates.update(id, data);
      
      // Update in state
      setState(prev => ({
        ...prev,
        templates: prev.templates.map(t => t.id === id ? updated : t)
      }));
      
      return updated;
    } catch (error: any) {
      setError('templates', error.message);
      throw error;
    }
  }, [setError]);

  /**
   * Quest operations
   */
  const refreshQuests = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, quests: true } }));
    
    try {
      const quests = await QuestService.quests.list();
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          quests,
          loading: { ...prev.loading, quests: false },
          errors: { ...prev.errors, quests: null }
        }));
      }
    } catch (error: any) {
      if (mountedRef.current) {
        setError('quests', error.message);
        setState(prev => ({ ...prev, loading: { ...prev.loading, quests: false } }));
      }
    }
  }, [setError]);

  const refreshMapQuests = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, mapQuests: true } }));
    
    try {
      const mapQuests = await QuestService.quests.listApprovedForMap();
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          mapQuests,
          loading: { ...prev.loading, mapQuests: false },
          errors: { ...prev.errors, mapQuests: null }
        }));
      }
    } catch (error: any) {
      if (mountedRef.current) {
        setError('mapQuests', error.message);
        setState(prev => ({ ...prev, loading: { ...prev.loading, mapQuests: false } }));
      }
    }
  }, [setError]);

  const createQuest = useCallback(async (data: CreateQuestData): Promise<Quest> => {
    setState(prev => ({ ...prev, creating: true }));
    
    try {
      const quest = await QuestService.quests.createFromTemplate(data);
      
      // Refresh quests to include new one
      await refreshQuests();
      
      setState(prev => ({ ...prev, creating: false }));
      return quest;
    } catch (error: any) {
      setState(prev => ({ ...prev, creating: false }));
      setError('quests', error.message);
      throw error;
    }
  }, [refreshQuests, setError]);

  const submitForApproval = useCallback(async (questId: string): Promise<Quest> => {
    setState(prev => ({ ...prev, submitting: true }));
    
    try {
      const quest = await QuestService.quests.submitForApproval(questId);
      
      // Update quest in state
      setState(prev => ({
        ...prev,
        quests: prev.quests.map(q => q.id === questId ? { ...q, ...quest } : q),
        submitting: false
      }));
      
      return quest;
    } catch (error: any) {
      setState(prev => ({ ...prev, submitting: false }));
      setError('quests', error.message);
      throw error;
    }
  }, [setError]);

  const approveQuest = useCallback(async (questId: string): Promise<Quest> => {
    setState(prev => ({ ...prev, approving: questId }));
    
    try {
      const quest = await QuestService.quests.approve(questId);
      
      // Update quest in state and refresh map quests
      setState(prev => ({
        ...prev,
        quests: prev.quests.map(q => q.id === questId ? { ...q, ...quest } : q),
        pendingApprovals: prev.pendingApprovals.filter(q => q.id !== questId),
        approving: null
      }));
      
      // Refresh map quests to include newly approved quest
      await refreshMapQuests();
      
      return quest;
    } catch (error: any) {
      setState(prev => ({ ...prev, approving: null }));
      setError('approvals', error.message);
      throw error;
    }
  }, [refreshMapQuests, setError]);

  const rejectQuest = useCallback(async (questId: string, reason?: string): Promise<Quest> => {
    setState(prev => ({ ...prev, approving: questId }));
    
    try {
      const quest = await QuestService.quests.reject(questId, reason);
      
      // Update quest in state
      setState(prev => ({
        ...prev,
        quests: prev.quests.map(q => q.id === questId ? { ...q, ...quest } : q),
        pendingApprovals: prev.pendingApprovals.filter(q => q.id !== questId),
        approving: null
      }));
      
      return quest;
    } catch (error: any) {
      setState(prev => ({ ...prev, approving: null }));
      setError('approvals', error.message);
      throw error;
    }
  }, [setError]);

  const getQuestById = useCallback(async (id: string): Promise<QuestWithTemplate | null> => {
    try {
      return await QuestService.quests.getById(id);
    } catch (error: any) {
      setError('quests', error.message);
      return null;
    }
  }, [setError]);

  /**
   * Submission operations
   */
  const submitMCQAnswer = useCallback(async (questId: string, choice: string): Promise<QuestSubmission> => {
    try {
      const submission = await QuestService.submissions.submitMCQ(questId, choice);
      
      // Add to user submissions
      setState(prev => ({
        ...prev,
        userSubmissions: [submission, ...prev.userSubmissions.filter(s => s.quest_id !== questId)]
      }));
      
      return submission;
    } catch (error: any) {
      setError('submissions', error.message);
      throw error;
    }
  }, [setError]);

  const submitTextAnswer = useCallback(async (questId: string, text: string): Promise<QuestSubmission> => {
    try {
      const submission = await QuestService.submissions.submitText(questId, text);
      
      setState(prev => ({
        ...prev,
        userSubmissions: [submission, ...prev.userSubmissions.filter(s => s.quest_id !== questId)]
      }));
      
      return submission;
    } catch (error: any) {
      setError('submissions', error.message);
      throw error;
    }
  }, [setError]);

  const submitVideoAnswer = useCallback(async (questId: string, videoUrl: string): Promise<QuestSubmission> => {
    try {
      const submission = await QuestService.submissions.submitVideo(questId, videoUrl);
      
      setState(prev => ({
        ...prev,
        userSubmissions: [submission, ...prev.userSubmissions.filter(s => s.quest_id !== questId)]
      }));
      
      return submission;
    } catch (error: any) {
      setError('submissions', error.message);
      throw error;
    }
  }, [setError]);

  const getUserSubmission = useCallback(async (questId: string): Promise<QuestSubmission | null> => {
    try {
      return await QuestService.submissions.getUserSubmission(questId);
    } catch (error: any) {
      setError('submissions', error.message);
      return null;
    }
  }, [setError]);

  /**
   * Admin operations
   */
  const refreshPendingApprovals = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, approvals: true } }));
    
    try {
      const pendingApprovals = await QuestService.quests.listPendingApproval();
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          pendingApprovals,
          loading: { ...prev.loading, approvals: false },
          errors: { ...prev.errors, approvals: null }
        }));
      }
    } catch (error: any) {
      if (mountedRef.current) {
        setError('approvals', error.message);
        setState(prev => ({ ...prev, loading: { ...prev.loading, approvals: false } }));
      }
    }
  }, [setError]);

  const refreshStats = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, stats: true } }));
    
    try {
      const stats = await QuestService.stats.getStats();
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          stats,
          loading: { ...prev.loading, stats: false },
          errors: { ...prev.errors, stats: null }
        }));
      }
    } catch (error: any) {
      if (mountedRef.current) {
        setError('stats', error.message);
        setState(prev => ({ ...prev, loading: { ...prev.loading, stats: false } }));
      }
    }
  }, [setError]);

  /**
   * Utility functions
   */
  const isQuestCompleted = useCallback((questId: string): boolean => {
    return state.userSubmissions.some(s => 
      s.quest_id === questId && 
      (s.status === 'accepted' || s.status === 'autograded')
    );
  }, [state.userSubmissions]);

  const canUserAccessQuest = useCallback((quest: Quest): boolean => {
    if (!user) return false;
    
    // Admins can access all quests
    if (profile?.role === 'master_admin' || profile?.role === 'org_admin' || profile?.role === 'staff') {
      return true;
    }
    
    // Students can only access approved and active quests
    return quest.status === 'approved' && quest.active;
  }, [user, profile]);

  /**
   * Set up real-time subscriptions based on user role
   */
  useEffect(() => {
    if (!user) return;

    const subscriptions: any[] = [];

    // Subscribe to quest updates for map display
    const questSubscription = supabase
      .channel('quests_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quests' },
        (payload) => {
          console.log('Quest updated:', payload);
          // Refresh relevant data based on the change
          if (payload.new && (payload.new as any).status === 'approved') {
            refreshMapQuests();
          }
          refreshQuests();
        }
      )
      .subscribe();

    subscriptions.push(questSubscription);

    // Subscribe to submissions for real-time feedback
    if (profile?.role === 'student') {
      const submissionSubscription = supabase
        .channel(`submissions_${user.id}`)
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'quest_submissions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Submission updated:', payload);
            // Refresh user submissions when they're reviewed
            if (payload.new && (payload.new as any).status !== 'pending') {
              // Refresh wallet balance and submissions
              refreshStats();
            }
          }
        )
        .subscribe();

      subscriptions.push(submissionSubscription);
    }

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [user, profile, refreshQuests, refreshMapQuests, refreshStats]);

  /**
   * Initialize data based on user role
   */
  useEffect(() => {
    if (!user || !profile) return;

    // Load different data sets based on user role
    const initializeData = async () => {
      try {
        // Always load templates for quest creation
        await refreshTemplates();

        if (profile.role === 'student') {
          // Students need map quests and their submissions
          await Promise.all([
            refreshMapQuests(),
            // Load user submissions would go here
          ]);
        } else if (profile.role === 'master_admin') {
          // Master admin needs approval queue and stats
          await Promise.all([
            refreshQuests(),
            refreshPendingApprovals(),
            refreshStats(),
            refreshMapQuests()
          ]);
        } else if (profile.role === 'org_admin' || profile.role === 'staff') {
          // Regular admins need their quests and stats
          await Promise.all([
            refreshQuests(),
            refreshStats(),
            refreshMapQuests()
          ]);
        }
      } catch (error) {
        console.error('Failed to initialize quest data:', error);
      }
    };

    initializeData();
  }, [user, profile, refreshTemplates, refreshQuests, refreshMapQuests, refreshPendingApprovals, refreshStats]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    // State
    ...state,

    // Template operations
    refreshTemplates,
    createTemplate,
    updateTemplate,

    // Quest operations
    refreshQuests,
    createQuest,
    submitForApproval,
    approveQuest,
    rejectQuest,

    // Map operations
    refreshMapQuests,
    getQuestById,

    // Submission operations
    submitMCQAnswer,
    submitTextAnswer,
    submitVideoAnswer,
    getUserSubmission,

    // Admin operations
    refreshPendingApprovals,
    refreshStats,

    // Utilities
    clearError,
    isQuestCompleted,
    canUserAccessQuest,
  };
};

