/**
 * Custom hook for quest management and interactions
 * 
 * Provides a clean interface for quest-related operations including
 * fetching, completing, and tracking quest interactions with caching
 * and real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, analyticsHelpers } from '../lib/supabase';
import { questHelpers, analyticsHelpers, subscriptionHelpers } from '../lib/supabase';
import { Quest, QuestCompletion, CompleteQuestResponse } from '../types/database';
import { useAuth } from './useAuth';

/**
 * Quest hook state interface
 */
interface UseQuestsState {
  // Data state
  quests: Quest[];
  completions: QuestCompletion[];
  userBalance: number;
  
  // Loading states
  loading: boolean;
  completing: string | null; // Quest ID currently being completed
  
  // Error states
  error: string | null;
  
  // Computed properties
  availableQuests: Quest[];
  completedQuestIds: string[];
}

/**
 * Quest hook return interface
 */
interface UseQuestsReturn extends UseQuestsState {
  // Actions
  refreshQuests: () => Promise<void>;
  completeQuest: (questId: string, responseData?: Record<string, any>) => Promise<CompleteQuestResponse | null>;
  markQuestViewed: (questId: string) => Promise<void>;
  
  // Utilities
  isQuestCompleted: (questId: string) => boolean;
  getQuestById: (questId: string) => Quest | undefined;
  clearError: () => void;
}

/**
 * Custom hook for quest management
 * 
 * Provides comprehensive quest functionality including data fetching,
 * completion tracking, real-time updates, and analytics integration.
 * 
 * @returns {UseQuestsReturn} Quest state and management functions
 */
export const useQuests = (): UseQuestsReturn => {
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [state, setState] = useState<UseQuestsState>({
    quests: [],
    completions: [],
    userBalance: 0,
    loading: true,
    completing: null,
    error: null,
    availableQuests: [],
    completedQuestIds: [],
  });

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Set error with automatic clearing
   */
  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error }));
    // Auto-clear error after 10 seconds
    setTimeout(() => {
      setState(prev => ({ ...prev, error: null }));
    }, 10000);
  }, []);

  /**
   * Fetch all quest data
   */
  const fetchQuestData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch quests and user data in parallel
      const [questsResult, completionsResult, balanceResult] = await Promise.all([
        questHelpers.getActiveQuests(),
        questHelpers.getUserCompletions(user.id),
        questHelpers.getUserBalance(user.id),
      ]);

      // Handle quest fetch result
      if (questsResult.error) {
        throw new Error(`Failed to fetch quests: ${questsResult.error}`);
      }

      // Handle completions fetch result
      if (completionsResult.error) {
        throw new Error(`Failed to fetch completions: ${completionsResult.error}`);
      }

      // Handle balance fetch result
      if (balanceResult.error) {
        throw new Error(`Failed to fetch balance: ${balanceResult.error}`);
      }

      const quests = questsResult.data || [];
      const completions = completionsResult.data || [];
      const userBalance = balanceResult.data || 0;
      
      // Compute derived state
      const completedQuestIds = completions.map(c => c.quest_id);
      const availableQuests = quests.filter(q => !completedQuestIds.includes(q.id));

      setState(prev => ({
        ...prev,
        quests,
        completions,
        userBalance,
        availableQuests,
        completedQuestIds,
        loading: false,
        error: null,
      }));

    } catch (error: any) {
      console.error('Failed to fetch quest data:', error);
      setError(error.message || 'Failed to load quest data');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [isAuthenticated, user, setError]);

  /**
   * Refresh quest data
   */
  const refreshQuests = useCallback(async () => {
    await fetchQuestData();
  }, [fetchQuestData]);

  /**
   * Complete a quest
   */
  const completeQuest = useCallback(async (
    questId: string, 
    responseData?: Record<string, any>
  ): Promise<CompleteQuestResponse | null> => {
    if (!user) {
      setError('User must be authenticated to complete quests');
      return null;
    }

    // Prevent multiple completions
    if (state.completing) {
      setError('Another quest is currently being completed');
      return null;
    }

    // Check if quest is already completed
    if (state.completedQuestIds.includes(questId)) {
      setError('Quest has already been completed');
      return null;
    }

    setState(prev => ({ ...prev, completing: questId, error: null }));

    try {
      // Complete quest via RPC
      const result = await questHelpers.completeQuest({
        quest_id: questId,
        user_id: user.id,
        response_data: responseData,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data) {
        throw new Error('No response data received');
      }

      // Log quest completion
      await analyticsHelpers.logQuestInteraction(user.id, questId, 'completed');

      // Refresh quest data to get updated state
      await fetchQuestData();

      setState(prev => ({ ...prev, completing: null }));
      
      return result.data;

    } catch (error: any) {
      console.error('Failed to complete quest:', error);
      setError(error.message || 'Failed to complete quest');
      setState(prev => ({ ...prev, completing: null }));
      return null;
    }
  }, [user, state.completing, state.completedQuestIds, setError, fetchQuestData]);

  /**
   * Mark quest as viewed for analytics
   */
  const markQuestViewed = useCallback(async (questId: string) => {
    if (!user) return;

    try {
      await analyticsHelpers.logQuestInteraction(user.id, questId, 'viewed');
    } catch (error: any) {
      console.error('Failed to log quest view:', error);
      // Don't show error to user for analytics failures
    }
  }, [user]);

  /**
   * Check if a quest is completed
   */
  const isQuestCompleted = useCallback((questId: string): boolean => {
    return state.completedQuestIds.includes(questId);
  }, [state.completedQuestIds]);

  /**
   * Get quest by ID
   */
  const getQuestById = useCallback((questId: string): Quest | undefined => {
    return state.quests.find(q => q.id === questId);
  }, [state.quests]);

  /**
   * Initialize quest data on mount and user change
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchQuestData();
    } else {
      // Reset state when user logs out
      setState({
        quests: [],
        completions: [],
        userBalance: 0,
        loading: false,
        completing: null,
        error: null,
        availableQuests: [],
        completedQuestIds: [],
      });
    }
  }, [isAuthenticated, user, fetchQuestData]);

  /**
   * Set up real-time subscriptions
   */
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Subscribe to quest updates
    const questSubscription = subscriptionHelpers.subscribeToQuests((updatedQuests) => {
      setState(prev => {
        const completedQuestIds = prev.completions.map(c => c.quest_id);
        const availableQuests = updatedQuests.filter(q => !completedQuestIds.includes(q.id));
        
        return {
          ...prev,
          quests: updatedQuests,
          availableQuests,
        };
      });
    });

    // Subscribe to balance updates
    const balanceSubscription = subscriptionHelpers.subscribeToUserBalance(user.id, (newBalance) => {
      setState(prev => ({ ...prev, userBalance: newBalance }));
    });

    // Cleanup subscriptions
    return () => {
      questSubscription.unsubscribe();
      balanceSubscription.unsubscribe();
    };
  }, [isAuthenticated, user]);

  return {
    // State
    ...state,
    
    // Actions
    refreshQuests,
    completeQuest,
    markQuestViewed,
    
    // Utilities
    isQuestCompleted,
    getQuestById,
    clearError,
  };
};

export default useQuests;