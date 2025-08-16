/**
 * Authentication Context with Role Resolution
 * 
 * Manages Supabase authentication state with role-based permissions
 * from the public.profiles table.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Application role types
 */
export type AppRole = 'master_admin' | 'org_admin' | 'staff' | 'student' | 'unknown';

/**
 * Authentication context interface
 */
interface AuthContextType {
  user: User | null;
  role: AppRole;
  loading: boolean;
  roleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

/**
 * Create authentication context
 */
export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'unknown',
  loading: true,
  roleLoading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  refreshRole: async () => {},
});

/**
 * Hook to use authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication Provider Component
 * 
 * Wraps the application and provides authentication state management
 * with role resolution from the database.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>('unknown');
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  /**
   * Refresh user role from database
   * Tries to query public.profiles, falls back to 'student' if denied
   */
  const refreshRole = useCallback(async () => {
    setRoleLoading(true);
    
    try {
      if (!user) {
        setRole('unknown');
        return;
      }

      // Try to get role from public.profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If 401/permission error or no profile found, default to student
        if (error.code === 'PGRST301' || error.message.includes('permission') || error.message.includes('denied')) {
          console.log('Profile access denied or not found, defaulting to student role');
          setRole('student');
        } else {
          console.error('Role fetch error:', error);
          setRole('student'); // Fallback
        }
      } else if (data?.role) {
        // Cast database role to AppRole
        const dbRole = data.role as AppRole;
        setRole(dbRole);
      } else {
        // No role found, default to student
        setRole('student');
      }
    } catch (error) {
      console.error('Failed to refresh role:', error);
      setRole('student'); // Safe fallback
    } finally {
      setRoleLoading(false);
    }
  }, [user]);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign in failed' };
    }
  }, []);

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign up failed' };
    }
  }, []);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  /**
   * Initialize auth state and set up listeners
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
          
          // Refresh role when auth state changes
          if (session?.user) {
            // Small delay to ensure user state is set
            setTimeout(() => {
              refreshRole();
            }, 100);
          } else {
            setRole('unknown');
            setRoleLoading(false);
          }
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshRole]);

  // Refresh role when user changes
  useEffect(() => {
    if (user) {
      refreshRole();
    } else {
      setRole('unknown');
      setRoleLoading(false);
    }
  }, [user, refreshRole]);

  const contextValue: AuthContextType = {
    user,
    role,
    loading,
    roleLoading,
    signIn,
    signUp,
    signOut,
    refreshRole
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};