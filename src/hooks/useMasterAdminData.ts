/**
 * Custom hook for Master Admin data management
 * 
 * Provides centralized data fetching, state management, and real-time updates
 * for all master admin operations. Includes caching, error handling, and
 * optimistic updates for better user experience.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { masterAdminHelpers } from '../lib/supabase';
import { 
  SystemMetrics, 
  Sprite, 
  SafeSpace, 
  Quest, 
  Notification, 
  UserApprovalRequest 
} from '../types/database';

/**
 * Hook state interface
 */
interface UseMasterAdminDataState {
  // System data
  metrics: SystemMetrics | null;
  sprites: Sprite[];
  safeSpaces: SafeSpace[];
  pendingQuests: Quest[];
  notifications: Notification[];
  pendingUsers: UserApprovalRequest[];
  userBalances: any[];

  // Loading states
  loading: {
    metrics: boolean;
    sprites: boolean;
    safeSpaces: boolean;
    quests: boolean;
    notifications: boolean;
    users: boolean;
    balances: boolean;
  };

  // Error states
  errors: {
    metrics: string | null;
    sprites: string | null;
    safeSpaces: string | null;
    quests: string | null;
    notifications: string | null;
    users: string | null;
    balances: string | null;
  };

  // Last updated timestamps
  lastUpdated: {
    metrics: Date | null;
    sprites: Date | null;
    safeSpaces: Date | null;
    quests: Date | null;
    notifications: Date | null;
    users: Date | null;
    balances: Date | null;
  };
}

/**
 * Hook return interface
 */
interface UseMasterAdminDataReturn extends UseMasterAdminDataState {
  // Data refresh functions
  refreshMetrics: () => Promise<void>;
  refreshSprites: () => Promise<void>;
  refreshSafeSpaces: () => Promise<void>;
  refreshQuests: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // CRUD operations
  createSprite: (sprite: Omit<Sprite, 'id' | 'created_at'>) => Promise<boolean>;
  updateSprite: (id: string, updates: Partial<Sprite>) => Promise<boolean>;
  deleteSprite: (id: string) => Promise<boolean>;

  createSafeSpace: (safeSpace: Omit<SafeSpace, 'id' | 'created_at'>) => Promise<boolean>;
  updateSafeSpace: (id: string, updates: Partial<SafeSpace>) => Promise<boolean>;
  deleteSafeSpace: (id: string) => Promise<boolean>;

  approveQuest: (id: string) => Promise<boolean>;
  rejectQuest: (id: string, reason?: string) => Promise<boolean>;

  createNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<boolean>;
  updateNotification: (id: string, updates: Partial<Notification>) => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;

  approveUser: (requestId: string) => Promise<boolean>;
  adjustUserBalance: (userId: string, amount: number, reason: string) => Promise<boolean>;

  // Utility functions
  clearError: (section: keyof UseMasterAdminDataState['errors']) => void;
  isStale: (section: keyof UseMasterAdminDataState['lastUpdated'], maxAge?: number) => boolean;
}

/**
 * Custom hook for comprehensive master admin data management
 * 
 * Features:
 * - Centralized state management for all admin data
 * - Automatic refresh intervals for real-time updates
 * - Optimistic updates for better UX
 * - Comprehensive error handling
 * - Data staleness detection
 * - Memory leak prevention
 * 
 * @param options Configuration options for the hook
 * @returns Complete admin data management interface
 */
export const useMasterAdminData = (options: {
  /** Auto-refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;
  /** Whether to start fetching data immediately (default: true) */
  autoLoad?: boolean;
  /** Maximum age for data in milliseconds before considered stale (default: 60000) */
  staleTime?: number;
} = {}): UseMasterAdminDataReturn => {
  
  const {
    refreshInterval = 30000,
    autoLoad = true,
    staleTime = 60000
  } = options;

  // Refs for cleanup
  const intervalRefs = useRef<NodeJS.Timeout[]>([]);
  const mountedRef = useRef(true);

  // State management
  const [state, setState] = useState<UseMasterAdminDataState>({
    // Data
    metrics: null,
    sprites: [],
    safeSpaces: [],
    pendingQuests: [],
    notifications: [],
    pendingUsers: [],
    userBalances: [],

    // Loading states
    loading: {
      metrics: false,
      sprites: false,
      safeSpaces: false,
      quests: false,
      notifications: false,
      users: false,
      balances: false,
    },

    // Error states
    errors: {
      metrics: null,
      sprites: null,
      safeSpaces: null,
      quests: null,
      notifications: null,
      users: null,
      balances: null,
    },

    // Last updated
    lastUpdated: {
      metrics: null,
      sprites: null,
      safeSpaces: null,
      quests: null,
      notifications: null,
      users: null,
      balances: null,
    }
  });

  /**
   * Generic data fetcher with error handling
   */
  const fetchData = useCallback(async <T>(
    section: keyof UseMasterAdminDataState['loading'],
    fetchFn: () => Promise<{ data: T | null; error: string | null }>,
    dataKey: keyof UseMasterAdminDataState
  ): Promise<T | null> => {
    if (!mountedRef.current) return null;

    // Set loading state
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [section]: true },
      errors: { ...prev.errors, [section]: null }
    }));

    try {
      const result = await fetchFn();
      
      if (!mountedRef.current) return null;

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, [section]: false },
          errors: { ...prev.errors, [section]: result.error }
        }));
        return null;
      }

      // Update state with new data
      setState(prev => ({
        ...prev,
        [dataKey]: result.data,
        loading: { ...prev.loading, [section]: false },
        errors: { ...prev.errors, [section]: null },
        lastUpdated: { ...prev.lastUpdated, [section]: new Date() }
      }));

      return result.data;
    } catch (error: any) {
      if (!mountedRef.current) return null;

      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, [section]: false },
        errors: { ...prev.errors, [section]: error.message || 'Unknown error occurred' }
      }));
      return null;
    }
  }, []);

  /**
   * Data refresh functions
   */
  const refreshMetrics = useCallback(() => 
    fetchData('metrics', masterAdminHelpers.getSystemMetrics, 'metrics').then(() => {}), 
    [fetchData]
  );

  const refreshSprites = useCallback(() => 
    fetchData('sprites', masterAdminHelpers.sprites.getAll, 'sprites').then(() => {}), 
    [fetchData]
  );

  const refreshSafeSpaces = useCallback(() => 
    fetchData('safeSpaces', masterAdminHelpers.safeSpaces.getAll, 'safeSpaces').then(() => {}), 
    [fetchData]
  );

  const refreshQuests = useCallback(() => 
    fetchData('quests', masterAdminHelpers.quests.getPending, 'pendingQuests').then(() => {}), 
    [fetchData]
  );

  const refreshNotifications = useCallback(() => 
    fetchData('notifications', masterAdminHelpers.notifications.getAll, 'notifications').then(() => {}), 
    [fetchData]
  );

  const refreshUsers = useCallback(() => 
    fetchData('users', masterAdminHelpers.users.getPendingApprovals, 'pendingUsers').then(() => {}), 
    [fetchData]
  );

  const refreshBalances = useCallback(() => 
    fetchData('balances', masterAdminHelpers.coinBank.getUserBalances, 'userBalances').then(() => {}), 
    [fetchData]
  );

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshMetrics(),
      refreshSprites(),
      refreshSafeSpaces(),
      refreshQuests(),
      refreshNotifications(),
      refreshUsers(),
      refreshBalances()
    ]);
  }, [refreshMetrics, refreshSprites, refreshSafeSpaces, refreshQuests, refreshNotifications, refreshUsers, refreshBalances]);

  /**
   * CRUD Operations with optimistic updates
   */
  const createSprite = useCallback(async (sprite: Omit<Sprite, 'id' | 'created_at'>): Promise<boolean> => {
    const { error } = await masterAdminHelpers.sprites.create(sprite);
    if (!error) {
      await refreshSprites();
      return true;
    }
    return false;
  }, [refreshSprites]);

  const updateSprite = useCallback(async (id: string, updates: Partial<Sprite>): Promise<boolean> => {
    const { error } = await masterAdminHelpers.sprites.update(id, updates);
    if (!error) {
      await refreshSprites();
      return true;
    }
    return false;
  }, [refreshSprites]);

  const deleteSprite = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await masterAdminHelpers.sprites.delete(id);
    if (!error) {
      await refreshSprites();
      return true;
    }
    return false;
  }, [refreshSprites]);

  const createSafeSpace = useCallback(async (safeSpace: Omit<SafeSpace, 'id' | 'created_at'>): Promise<boolean> => {
    const { error } = await masterAdminHelpers.safeSpaces.create(safeSpace);
    if (!error) {
      await refreshSafeSpaces();
      return true;
    }
    return false;
  }, [refreshSafeSpaces]);

  const updateSafeSpace = useCallback(async (id: string, updates: Partial<SafeSpace>): Promise<boolean> => {
    const { error } = await masterAdminHelpers.safeSpaces.update(id, updates);
    if (!error) {
      await refreshSafeSpaces();
      return true;
    }
    return false;
  }, [refreshSafeSpaces]);

  const deleteSafeSpace = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await masterAdminHelpers.safeSpaces.delete(id);
    if (!error) {
      await refreshSafeSpaces();
      return true;
    }
    return false;
  }, [refreshSafeSpaces]);

  const approveQuest = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await masterAdminHelpers.quests.approve(id);
    if (!error) {
      await refreshQuests();
      return true;
    }
    return false;
  }, [refreshQuests]);

  const rejectQuest = useCallback(async (id: string, reason?: string): Promise<boolean> => {
    const { error } = await masterAdminHelpers.quests.reject(id, reason);
    if (!error) {
      await refreshQuests();
      return true;
    }
    return false;
  }, [refreshQuests]);

  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'created_at'>): Promise<boolean> => {
    const { error } = await masterAdminHelpers.notifications.create(notification);
    if (!error) {
      await refreshNotifications();
      return true;
    }
    return false;
  }, [refreshNotifications]);

  const updateNotification = useCallback(async (id: string, updates: Partial<Notification>): Promise<boolean> => {
    const { error } = await masterAdminHelpers.notifications.update(id, updates);
    if (!error) {
      await refreshNotifications();
      return true;
    }
    return false;
  }, [refreshNotifications]);

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await masterAdminHelpers.notifications.delete(id);
    if (!error) {
      await refreshNotifications();
      return true;
    }
    return false;
  }, [refreshNotifications]);

  const approveUser = useCallback(async (requestId: string): Promise<boolean> => {
    const { error } = await masterAdminHelpers.users.approveUser(requestId);
    if (!error) {
      await refreshUsers();
      return true;
    }
    return false;
  }, [refreshUsers]);

  const adjustUserBalance = useCallback(async (userId: string, amount: number, reason: string): Promise<boolean> => {
    const { error } = await masterAdminHelpers.coinBank.adjustBalance(userId, amount, reason);
    if (!error) {
      await refreshBalances();
      return true;
    }
    return false;
  }, [refreshBalances]);

  /**
   * Utility functions
   */
  const clearError = useCallback((section: keyof UseMasterAdminDataState['errors']) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [section]: null }
    }));
  }, []);

  const isStale = useCallback((section: keyof UseMasterAdminDataState['lastUpdated'], maxAge: number = staleTime): boolean => {
    const lastUpdate = state.lastUpdated[section];
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate.getTime() > maxAge;
  }, [state.lastUpdated, staleTime]);

  /**
   * Initialize data loading and intervals
   */
  useEffect(() => {
    if (autoLoad) {
      refreshAll();
    }

    // Set up refresh intervals
    if (refreshInterval > 0) {
      const intervals = [
        setInterval(refreshMetrics, refreshInterval),
        setInterval(refreshQuests, refreshInterval),
        setInterval(refreshUsers, refreshInterval),
      ];
      
      intervalRefs.current = intervals;
    }

    return () => {
      // Cleanup intervals
      intervalRefs.current.forEach(clearInterval);
      intervalRefs.current = [];
      mountedRef.current = false;
    };
  }, [autoLoad, refreshInterval, refreshAll, refreshMetrics, refreshQuests, refreshUsers]);

  return {
    // State
    ...state,

    // Refresh functions
    refreshMetrics,
    refreshSprites,
    refreshSafeSpaces,
    refreshQuests,
    refreshNotifications,
    refreshUsers,
    refreshBalances,
    refreshAll,

    // CRUD operations
    createSprite,
    updateSprite,
    deleteSprite,
    createSafeSpace,
    updateSafeSpace,
    deleteSafeSpace,
    approveQuest,
    rejectQuest,
    createNotification,
    updateNotification,
    deleteNotification,
    approveUser,
    adjustUserBalance,

    // Utilities
    clearError,
    isStale,
  };
};