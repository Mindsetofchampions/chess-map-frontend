/**
 * Custom hook for Philadelphia-specific quest and location data
 * 
 * Provides real-time data management for Philadelphia bubbles with
 * Supabase integration and automatic updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { BubbleData, BubbleCategory } from '../components/Map/BubbleSystem';

/**
 * Hook return interface
 */
interface UsePhiladelphiaDataReturn {
  bubbles: BubbleData[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addNewBubble: (bubble: Omit<BubbleData, 'id'>) => Promise<boolean>;
  removeBubble: (bubbleId: string) => Promise<boolean>;
}

/**
 * Transform Supabase data to bubble format
 */
const transformSupabaseData = (organizations: any[], events: any[]): BubbleData[] => {
  const bubbles: BubbleData[] = [];

  // Transform organizations (safe_spaces) to bubbles
  organizations.forEach(org => {
    if (org.location && org.location.coordinates) {
      const [lng, lat] = org.location.coordinates;
      bubbles.push({
        id: `org-${org.id}`,
        category: 'safe_space' as BubbleCategory,
        title: org.name,
        description: org.description || 'Safe learning and collaboration space',
        coordinates: [lng, lat],
        organization: 'Philadelphia Safe Spaces Network',
        participants: Math.floor(Math.random() * 50) + 10,
        isActive: true
      });
    }
  });

  // Transform events to bubbles
  events.forEach(event => {
    if (event.location && event.location.coordinates) {
      const [lng, lat] = event.location.coordinates;
      
      // Determine category based on event attributes
      let category: BubbleCategory = 'community_hub';
      if (event.attribute_id && event.attribute_id.includes('quest')) {
        category = 'active_quest';
      }

      bubbles.push({
        id: `event-${event.id}`,
        category,
        title: event.title,
        description: event.description || 'Community learning event',
        coordinates: [lng, lat],
        organization: 'Philadelphia Learning Network',
        reward: category === 'active_quest' ? Math.floor(Math.random() * 200) + 50 : undefined,
        difficulty: category === 'active_quest' ? 
          ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as 'easy' | 'medium' | 'hard' : 
          undefined,
        participants: Math.floor(Math.random() * 100) + 20,
        isActive: new Date(event.start_time || Date.now()) <= new Date()
      });
    }
  });

  return bubbles;
};

/**
 * Custom hook for Philadelphia bubble data management
 */
export const usePhiladelphiaData = (): UsePhiladelphiaDataReturn => {
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch data from Supabase
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch organizations and events from Supabase
      const [orgsResult, eventsResult] = await Promise.all([
        supabase
          .from('safe_spaces')
          .select('*')
          .not('location', 'is', null),
        supabase
          .from('events')
          .select('*')
          .not('location', 'is', null)
      ]);

      if (orgsResult.error) {
        throw new Error(`Failed to fetch organizations: ${orgsResult.error.message}`);
      }

      if (eventsResult.error) {
        throw new Error(`Failed to fetch events: ${eventsResult.error.message}`);
      }

      // Transform and combine data
      const transformedBubbles = transformSupabaseData(
        orgsResult.data || [],
        eventsResult.data || []
      );

      setBubbles(transformedBubbles);
    } catch (err: any) {
      console.error('Failed to fetch Philadelphia data:', err);
      setError(err.message || 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add new bubble (for quest creation)
   */
  const addNewBubble = useCallback(async (newBubble: Omit<BubbleData, 'id'>): Promise<boolean> => {
    try {
      // Create bubble with generated ID
      const bubble: BubbleData = {
        ...newBubble,
        id: `${newBubble.category}-${Date.now()}`
      };

      // Add to Supabase based on category
      if (newBubble.category === 'safe_space') {
        const { error } = await supabase
          .from('safe_spaces')
          .insert({
            name: newBubble.title,
            description: newBubble.description,
            location: {
              type: 'Point',
              coordinates: newBubble.coordinates
            }
          });

        if (error) throw error;
      } else if (newBubble.category === 'active_quest') {
        const { error } = await supabase
          .from('events')
          .insert({
            title: newBubble.title,
            description: newBubble.description,
            location: {
              type: 'Point',
              coordinates: newBubble.coordinates
            },
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
          });

        if (error) throw error;
      }

      // Refresh data to get updated bubbles
      await fetchData();
      return true;
    } catch (err: any) {
      console.error('Failed to add bubble:', err);
      setError(err.message || 'Failed to add new bubble');
      return false;
    }
  }, [fetchData]);

  /**
   * Remove bubble
   */
  const removeBubble = useCallback(async (bubbleId: string): Promise<boolean> => {
    try {
      // Determine table based on bubble ID prefix
      if (bubbleId.startsWith('org-')) {
        const orgId = bubbleId.replace('org-', '');
        const { error } = await supabase
          .from('safe_spaces')
          .delete()
          .eq('id', orgId);

        if (error) throw error;
      } else if (bubbleId.startsWith('event-')) {
        const eventId = bubbleId.replace('event-', '');
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId);

        if (error) throw error;
      }

      // Refresh data
      await fetchData();
      return true;
    } catch (err: any) {
      console.error('Failed to remove bubble:', err);
      setError(err.message || 'Failed to remove bubble');
      return false;
    }
  }, [fetchData]);

  /**
   * Set up real-time subscriptions
   */
  useEffect(() => {
    // Set up subscriptions for real-time updates
    const orgSubscription = supabase
      .channel('safe_spaces_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'safe_spaces' },
        () => {
          console.log('Organizations updated, refreshing bubbles...');
          fetchData();
        }
      )
      .subscribe();

    const eventSubscription = supabase
      .channel('events_channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          console.log('Events updated, refreshing bubbles...');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      orgSubscription.unsubscribe();
      eventSubscription.unsubscribe();
    };
  }, [fetchData]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    bubbles,
    loading,
    error,
    refreshData: fetchData,
    addNewBubble,
    removeBubble
  };
};

export default usePhiladelphiaData;