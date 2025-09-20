/**
 * Authentication Context with Role Resolution
 * 
 * Manages Supabase authentication state with role-based permissions
 * from the public.profiles table.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
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
  refreshRole: () => Promise<AppRole>;
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
  refreshRole: async () => 'unknown',
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
  const refreshRole = useCallback(async (): Promise<AppRole> => {
    // Start role fetch
    setRoleLoading(true);
    
    try {
      if (!user) {
        setRole('unknown');
        setRoleLoading(false);
        return 'unknown';
      }

      // Try to get role from public.user_roles table first (new system)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!roleError && roleData) {
        const userRole = roleData.role as AppRole;
        setRole(userRole);
        setRoleLoading(false);
        return userRole;
      }

      // Fallback to public.profiles table (backward compatibility)
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.log('Role access denied or not found, checking user metadata...');
        // Check user metadata as fallback before defaulting to student
        const metadataRole = user.user_metadata?.role as AppRole;
        if (metadataRole && ['master_admin', 'org_admin', 'staff', 'student'].includes(metadataRole)) {
          console.log(`Using role from user metadata: ${metadataRole}`);
          setRole(metadataRole);
          setRoleLoading(false);
          return metadataRole;
        } else {
          setRole('student');
          setRoleLoading(false);
          return 'student';
        }
      } else if (data && data.role) {
        // Cast database role to AppRole
        const dbRole = data.role as AppRole;
        setRole(dbRole);
        setRoleLoading(false);
        return dbRole;
      } else {
        // No profile or user_roles entry found, check user metadata before defaulting to student
        const metadataRole = user.user_metadata?.role as AppRole;
        if (metadataRole && ['master_admin', 'org_admin', 'staff', 'student'].includes(metadataRole)) {
          console.log(`No profile found, using role from user metadata: ${metadataRole}`);
          setRole(metadataRole);
          setRoleLoading(false);
          return metadataRole;
        } else {
          console.log('No profile and no valid metadata role, defaulting to student');
          setRole('student');
          setRoleLoading(false);
          return 'student';
        }
      }
    } catch (error) {
      console.error('Failed to refresh role:', error);
      setRole('unknown');
      setRoleLoading(false);
      return 'unknown';
    }
  }, [user, roleLoading]);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
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
      const { error } = await supabase.auth.signUp({
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
            // Trigger initial role refresh if there's an active session
            if (session?.user) {
              setTimeout(() => {
                refreshRole();
              }, 50);
            }
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
      async (_event, session) => {
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
          // Only refresh role if user changes and not already loading
          if (session?.user) {
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
  }, []); // Remove refreshRole from dependency array

  // Refresh role when user changes
  useEffect(() => {
    if (user) {
      refreshRole();
    } else {
      setRole('unknown');
      setRoleLoading(false);
    }
  }, [user]); // Only depend on user

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