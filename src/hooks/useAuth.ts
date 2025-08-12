import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import supabase, { getCurrentSession, isEnvReady } from '../services/supabaseClient';
import { UserProfile } from '../types';

/**
 * Authentication state interface
 */
interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

/**
 * Enhanced authentication hook return interface
 */
interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

/**
 * Enhanced authentication hook with profile management
 */
export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null
  });

  /**
   * Set error with automatic clearing
   */
  const setError = useCallback((error: string | null) => {
    setAuthState(prev => ({ ...prev, error }));
    
    if (error) {
      // Auto-clear error after 10 seconds
      setTimeout(() => {
        setAuthState(prev => ({ ...prev, error: null }));
      }, 10000);
    }
  }, []);

  /**
   * Clear error manually
   */
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  /**
   * Fetch user profile from database
   */
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          memberships (
            role,
            org_id,
            organizations (
              name,
              slug
            )
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Use membership role if available, otherwise profile role
      const membership = data.memberships?.[0];
      const role = membership?.role || 'student';
      const orgId = membership?.org_id;

      return {
        ...data,
        role,
        org_id: orgId
      } as UserProfile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  /**
   * Refresh user profile data
   */
  const refreshProfile = useCallback(async () => {
    if (!authState.user) return;

    try {
      const profile = await fetchUserProfile(authState.user.id);
      setAuthState(prev => ({ ...prev, profile }));
    } catch (error: any) {
      console.error('Error refreshing profile:', error);
      setError(error.message || 'Failed to refresh profile');
    }
  }, [authState.user, fetchUserProfile, setError]);

  /**
   * Sign in user
   */
  const signIn = useCallback(async (email: string, password: string) => {
    if (!isEnvReady()) {
      const error = 'Supabase environment not configured';
      setError(error);
      return { success: false, error };
    }

    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      // Profile will be loaded via auth state change listener
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Sign in failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, [setError]);

  /**
   * Sign up user
   */
  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    if (!isEnvReady()) {
      const error = 'Supabase environment not configured';
      setError(error);
      return { success: false, error };
    }

    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || { role: 'student' }
        }
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      // Profile will be loaded via auth state change listener
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Sign up failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, [setError]);

  /**
   * Sign out user
   */
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setAuthState({
        user: null,
        session: null,
        profile: null,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Sign out failed');
    }
  }, [setError]);

  /**
   * Initialize auth state and set up listeners
   */
  useEffect(() => {
    if (!isEnvReady()) {
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Supabase environment not configured' 
      }));
      return;
    }

    let mounted = true;

    const initializeAuth = async () => {
      try {
        const session = await getCurrentSession();
        
        if (mounted) {
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            setAuthState({
              user: session.user,
              session,
              profile,
              loading: false,
              error: null
            });
          } else {
            setAuthState({
              user: null,
              session: null,
              profile: null,
              loading: false,
              error: null
            });
          }
        }
      } catch (error: any) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: error.message || 'Failed to initialize authentication'
          });
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setAuthState({
            user: session.user,
            session,
            profile,
            loading: false,
            error: null
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: null
          });
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    clearError
  };
}

/**
 * Hook for role-based access control
 */
export function useRequireAuth(requiredRole?: string) {
  const auth = useAuth();
  
  const hasRequiredRole = useCallback((role: string): boolean => {
    if (!auth.profile) return false;
    
    const roleHierarchy = ['student', 'staff', 'org_admin', 'master_admin'];
    const userRoleIndex = roleHierarchy.indexOf(auth.profile.role);
    const requiredRoleIndex = roleHierarchy.indexOf(role);
    
    return userRoleIndex >= requiredRoleIndex;
  }, [auth.profile]);

  const canAccessOrg = useCallback((orgId: string): boolean => {
    if (!auth.profile) return false;
    if (auth.profile.role === 'master_admin') return true;
    if (auth.profile.role === 'org_admin') return true;
    return auth.profile.org_id === orgId;
  }, [auth.profile]);

  return {
    ...auth,
    hasRequiredRole,
    canAccessOrg,
    isMasterAdmin: auth.profile?.role === 'master_admin',
    isOrgAdmin: auth.profile?.role === 'org_admin',
    isStaff: auth.profile?.role === 'staff' || auth.profile?.role === 'org_admin' || auth.profile?.role === 'master_admin',
    isStudent: auth.profile?.role === 'student'
  };
}