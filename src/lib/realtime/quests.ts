/**
 * Quest Realtime Subscriptions
 * 
 * Manages Supabase realtime subscriptions for quest status updates
 * and provides debounced refresh mechanisms for UI updates.
 */

import React from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Quest } from '@/types/backend';

/**
 * Quest change callback interface
 */
export interface QuestChangeCallback {
  (event: 'INSERT' | 'UPDATE' | 'DELETE', quest: Quest): void;
}

/**
 * Subscription management interface
 */
export interface QuestSubscription {
  unsubscribe(): void;
}

/**
 * Debounced refresh callback type
 */
export type RefreshCallback = () => void | Promise<void>;

/**
 * Create debounced function for UI updates
 * 
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
function createDebounced(callback: RefreshCallback, delay: number = 1000): RefreshCallback {
  let timeoutId: NodeJS.Timeout | null = null;
  
    return (..._args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      callback();
      timeoutId = null;
    }, delay);
  };
}

/**
 * Subscribe to quest status changes for realtime updates
 * 
 * @param onQuestChange - Callback function for quest changes
 * @param statusFilter - Optional status to filter by (e.g., 'submitted')
 * @returns Subscription object with unsubscribe method
 */
export function subscribeToQuests(
  onQuestChange: QuestChangeCallback,
  statusFilter?: string
): QuestSubscription {
  const channel = supabase
    .channel('quests_realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'quests',
        ...(statusFilter && { filter: `status=eq.${statusFilter}` })
      },
      (payload: RealtimePostgresChangesPayload<Quest>) => {
        console.log('Quest realtime update:', payload.eventType, payload.new || payload.old);
        
        const quest = (payload.new || payload.old) as Quest;
        if (quest) {
          onQuestChange(payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE', quest);
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to pending quest approvals with debounced refresh
 * 
 * @param refreshCallback - Function to refresh pending quests list
 * @param debounceMs - Debounce delay in milliseconds
 * @returns Subscription object
 */
export function subscribeToApprovals(
  refreshCallback: RefreshCallback,
  debounceMs: number = 1000
): QuestSubscription {
  const debouncedRefresh = createDebounced(refreshCallback, debounceMs);
  
    return subscribeToQuests((event, quest) => {
      // Refresh on any change to submitted quests or status changes from submitted
      if (quest && (quest.status === 'submitted' || event === 'UPDATE')) {
        console.log('Approval queue update detected, refreshing...');
        debouncedRefresh();
      }
    });
}

/**
 * Subscribe to quest creation for dashboard statistics
 * 
 * @param refreshCallback - Function to refresh dashboard stats
 * @param debounceMs - Debounce delay in milliseconds
 * @returns Subscription object
 */
export function subscribeToQuestStats(
  refreshCallback: RefreshCallback,
  debounceMs: number = 2000
): QuestSubscription {
  const debouncedRefresh = createDebounced(refreshCallback, debounceMs);
  
  return subscribeToQuests((_event, _quest) => {
    // Refresh stats on any quest change
    console.log('Quest stats update detected, refreshing...');
    debouncedRefresh();
  });
}

/**
 * Custom hook for quest realtime subscriptions
 * 
 * @param enabled - Whether subscription should be active
 * @param onQuestChange - Callback for quest changes
 * @param statusFilter - Optional status filter
 * @returns Subscription status
 */
export function useQuestSubscription(
  enabled: boolean,
  onQuestChange: QuestChangeCallback,
  statusFilter?: string
) {
  const [isConnected, setIsConnected] = React.useState(false);
  const subscriptionRef = React.useRef<QuestSubscription | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    console.log('Setting up quest realtime subscription...');
    subscriptionRef.current = subscribeToQuests(onQuestChange, statusFilter);
    setIsConnected(true);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, onQuestChange, statusFilter]);

  return { isConnected };
}

// React import for the custom hook (already at top)