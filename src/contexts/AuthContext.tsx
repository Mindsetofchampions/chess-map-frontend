/**
 * Authentication Context
 * 
 * Provides global authentication state management using React Context.
 * Handles user session persistence, automatic token refresh, and role-based access.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, authHelpers, transformUser, analyticsHelpers } from '../lib/supabase';
import { AuthUser, UserRole, AuthState } from '../types/database';

/**
 * Authentication context interface
 * Defines all methods and state available to consuming components
 */
interface AuthContextType extends AuthState {
  // Authentication methods
  signUp: (email: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string, expectedRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  
  // User state methods
  refreshUser: () => Promise<void>;
  updateUserRole: (role: UserRole) => Promise<{ success: boolean; error?: string }>;
  
  // Utility methods
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
}

/**
 * Create the authentication context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Custom hook to use authentication context
 * Provides type-safe access to auth state and methods
 */
export const useAuth = (): AuthContextType => {
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
 * Wraps the application and provides authentication state to all children.
 * Handles session management, automatic token refresh, and auth state persistence.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Authentication state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear any existing error messages
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Set error message with automatic clearing
   */
  const setAuthError = useCallback((message: string) => {
    setError(message);
    // Auto-clear error after 10 seconds
    setTimeout(clearError, 10000);
  }, [clearError]);

  /**
   * Refresh current user session
   * Useful for updating user data after changes
   */
  const refreshUser = useCallback(async () => {
    try {
      const { data, error } = await authHelpers.getSession();
      if (error) {
        setAuthError(error);
        setUser(null);
      } else {
        setUser(data);
        clearError();
      }
    } catch (error: any) {
      console.error('Refresh user error:', error);
      setAuthError('Failed to refresh user session');
      setUser(null);
    }
  }, [setAuthError, clearError]);

  /**
   * Sign up new user
   */
  const signUp = useCallback(async (email: string, password: string, role: UserRole = 'student') => {
    setLoading(true);
    clearError();

    try {
      console.log(`🔐 Attempting sign up for: ${email} with role: ${role}`);
      const { data, error } = await authHelpers.signUp(email, password, role);
      
      if (error) {
        setAuthError(error);
        return { success: false, error };
      }

      // Log successful signup
      if (data) {
        console.log('✅ Sign up successful, user role:', data.role);
        await analyticsHelpers.logAction(data.id, 'user_signup', undefined, { role });
      }

      setUser(data);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create account';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setAuthError, clearError]);

  /**
   * Sign in existing user
   */
  const signIn = useCallback(async (email: string, password: string, expectedRole?: UserRole) => {
    setLoading(true);
    clearError();

    try {
      console.log(`🔐 Attempting sign in for: ${email}${expectedRole ? ` (expected role: ${expectedRole})` : ''}`);
      const { data, error } = await authHelpers.signIn(email, password, expectedRole);
      
      if (error) {
        setAuthError(error);
        return { success: false, error };
      }

      // Log successful signin
      if (data) {
        console.log('✅ Sign in successful, user role:', data.role);
        await analyticsHelpers.logAction(data.id, 'user_signin', undefined, { 
          role: data.role,
          expected_role: expectedRole 
        });
      }

      setUser(data);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setAuthError, clearError]);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async () => {
    setLoading(true);

    try {
      // Log signout before clearing user state
      if (user) {
        await analyticsHelpers.logAction(user.id, 'user_signout');
      }

      const { error } = await authHelpers.signOut();
      
      if (error) {
        setAuthError(error);
      } else {
        setUser(null);
        clearError();
      }
    } catch (error: any) {
      console.error('Sign out error:', error);
      setAuthError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  }, [user, setAuthError, clearError]);

  /**
   * Reset user password
   */
  const resetPassword = useCallback(async (email: string) => {
    clearError();

    try {
      const { error } = await authHelpers.resetPassword(email);
      
      if (error) {
        setAuthError(error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset email';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [setAuthError, clearError]);

  /**
   * Update user role (admin only operation)
   */
  const updateUserRole = useCallback(async (role: UserRole) => {
    if (!user || user.role !== 'admin') {
      const error = 'Only administrators can update user roles';
      setAuthError(error);
      return { success: false, error };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { role }
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      // Update local user state
      if (data.user) {
        setUser(transformUser(data.user));
        await analyticsHelpers.logAction(user.id, 'role_updated', undefined, { 
          old_role: user.role, 
          new_role: role 
        });
      }

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update role';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [user, setAuthError]);

  /**
   * Initialize authentication state on mount
   * Sets up session listener for real-time auth changes
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          setUser(transformUser(session?.user || null));
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Initialize auth error:', error);
        if (isMounted) {
          setAuthError('Failed to initialize authentication');
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', {
          event,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          userRole: session?.user?.user_metadata?.role || session?.user?.app_metadata?.role
        });
        
        if (isMounted) {
          const transformedUser = transformUser(session?.user || null);
          console.log('👤 Transformed user:', transformedUser);
          setUser(transformedUser);
          setLoading(false);
          
          // Log auth state changes
          if (session?.user) {
            await analyticsHelpers.logAction(
              session.user.id, 
              `auth_${event}`, 
              undefined, 
              { event }
            );
          }
        }
      }
    );

    initializeAuth();

    // Cleanup function
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setAuthError]);

  /**
   * Derived state for convenience
   */
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  /**
   * Context value object
   */
  const contextValue: AuthContextType = {
    // State
    user,
    loading,
    error,
    
    // Methods
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshUser,
    updateUserRole,
    
    // Derived state
    isAuthenticated,
    isAdmin,
    isStudent,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Higher-order component for authentication requirements
 * Wraps components that require specific authentication states
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const { user, loading, isAuthenticated } = useAuth();

    // Show loading spinner while checking authentication
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Checking authentication...</p>
          </div>
        </div>
      );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-6">Please sign in to access this area.</p>
            <a 
              href="/student-auth" 
              className="btn-esports inline-flex items-center gap-2"
            >
              Sign In
            </a>
          </div>
        </div>
      );
    }

    // Check role requirements
    if (requiredRole && user.role !== requiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-300 mb-6">
              This area is restricted to {requiredRole}s only.
            </p>
            <a 
              href="/" 
              className="btn-esports inline-flex items-center gap-2"
            >
              Go Home
            </a>
          </div>
        </div>
      );
    }

    return <Component {...props} ref={ref} />;
  });
};

export default AuthContext;