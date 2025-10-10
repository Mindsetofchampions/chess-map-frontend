/**
 * useQuests Hook
 *
 * Custom hook for managing quest data from Supabase with real-time updates
 * and user submission tracking.
 */

import { useState, useEffect, useCallback } from 'react';

import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import type { Quest, Submission } from '@/types/backend';

/**
 * Hook return interface
 */
interface UseQuestsReturn {
  mapQuests: Quest[];
  loading: boolean;
  error: string | null;
  refreshMapQuests: () => Promise<void>;
  getUserSubmission: (questId: string) => Promise<Submission | null>;
}

/**
 * useQuests Hook
 *
 * Provides quest data management with Supabase integration.
 * Handles approved quest fetching and submission tracking.
 */
export const useQuests = (gradeFilter?: 'ES' | 'MS' | 'HS'): UseQuestsReturn => {
  const { showError: _showError } = useToast();

  const [mapQuests, setMapQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch approved quests for map display
   * RLS automatically filters to approved & active for students
   */
  const fetchMapQuests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('quests')
        .select(
          'id, title, description, status, active, reward_coins, qtype, config, attribute_id, created_at, grade_level, grade_bands, lat, lng',
        );

      query = query.eq('active', true).eq('status', 'approved');

      // If gradeFilter provided:
      // - include quests explicitly matching grade_level
      // - include quests where grade_bands (text[]) contains the grade
      // - include quests with no grade restriction (grade_level IS NULL OR grade_bands IS NULL)
      if (gradeFilter) {
        // Single OR expression combining all relevant conditions
        // Note: PostgREST allows using operators like cs (contains) within or()
        query = query.or(
          `grade_level.eq.${gradeFilter},grade_bands.cs.{${gradeFilter}},grade_level.is.null,grade_bands.is.null`,
        );
      }

      query = query.order('created_at', { ascending: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      setMapQuests(data || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load quests';
      setError(errorMessage);
      console.error('Failed to fetch map quests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get user's submission for a specific quest
   * RLS automatically filters to user's own submissions
   */
  const getUserSubmission = useCallback(async (questId: string): Promise<Submission | null> => {
    try {
      const { data, error: queryError } = await supabase
        .from('quest_submissions')
        .select(
          'id, quest_id, user_id, status, mcq_choice, text_answer, video_url, score, created_at',
        )
        .eq('quest_id', questId)
        .single();

      if (queryError) {
        // If no submission exists, return null (not an error)
        if (queryError.code === 'PGRST116') {
          return null;
        }
        throw new Error(queryError.message);
      }

      return data;
    } catch (err: any) {
      console.error('Failed to get user submission:', err);
      return null;
    }
  }, []);

  /**
   * Refresh map quests data
   */
  const refreshMapQuests = useCallback(async () => {
    await fetchMapQuests();
  }, [fetchMapQuests]);

  /**
   * Set up real-time subscriptions for quest updates
   */
  useEffect(() => {
    // Initial fetch
    fetchMapQuests();

    // Debounce to avoid rapid repeated refreshes
    let t: number | null = null;
    const debouncedRefresh = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        fetchMapQuests();
      }, 500) as unknown as number;
    };

    // Set up real-time subscription for quest changes - only approved/active matter for students
    const subscription = supabase
      .channel('quests_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quests', filter: 'status=eq.approved' },
        () => {
          debouncedRefresh();
        },
      )
      .subscribe();

    return () => {
      if (t) window.clearTimeout(t);
      subscription.unsubscribe();
    };
  }, [fetchMapQuests]);

  return {
    mapQuests,
    loading,
    error,
    refreshMapQuests,
    getUserSubmission,
  };
};
