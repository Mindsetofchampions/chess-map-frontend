/**
 * Protected Route Component
 * 
 * Provides role-based route protection with loading states and error handling.
 * Automatically redirects users based on authentication status and role requirements.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AllUserRoles } from '../types/database';
import GlassContainer from './GlassContainer';
import { Shield, Users, ArrowLeft } from 'lucide-react';

/**
 * Protected Route Props Interface
 */
interface ProtectedRouteProps {
  /** Child components to render if authorized */
  children: React.ReactNode;
  /** Required user role to access this route */
  requiredRole?: AllUserRoles;
  /** Custom redirect path for unauthorized users */
  redirectTo?: string;
  /** Show loading spinner while checking authentication */
  showLoading?: boolean;
}

/**
 * Loading Component
 * Displays while authentication state is being determined
 */
const AuthLoadingScreen: React.FC = () => (
  <GlassContainer variant="page">
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-electric-blue-400 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Checking Authentication</h2>
        <p className="text-gray-300">Please wait while we verify your access...</p>
      </div>
    </div>
  </GlassContainer>
);

/**
 * Access Denied Component
 * Shown when user doesn't have required permissions
 */
interface AccessDeniedProps {
  requiredRole: AllUserRoles;
  userRole?: AllUserRoles;
  onGoBack: () => void;
}

const AccessDeniedScreen: React.FC<AccessDeniedProps> = ({ 
  requiredRole, 
  userRole, 
  onGoBack 
}) => (
  <GlassContainer variant="page">
    <div className="min-h-screen flex items-center justify-center">
      <GlassContainer variant="card" className="text-center max-w-md">
        <div className="mb-6">
          {requiredRole === 'admin' ? (
            <Shield className="w-20 h-20 text-red-400 mx-auto mb-4" />
          ) : (
            <Users className="w-20 h-20 text-electric-blue-400 mx-auto mb-4" />
          )}
        </div>

        <h2 className="text-3xl font-bold text-white mb-4">Access Denied</h2>
        
        <p className="text-gray-100 mb-2">
          This area is restricted to <span className="font-semibold text-electric-blue-400">{requiredRole}s</span> only.
        </p>
        
        {userRole && (
          <p className="text-gray-300 text-sm mb-6">
            You are currently signed in as a <span className="font-medium">{userRole}</span>.
          </p>
        )}

        <div className="space-y-3">
          <button
            onClick={onGoBack}
            className="w-full btn-esports flex items-center justify-center gap-2"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <div className="text-xs text-gray-400 mt-4">
            {requiredRole === 'admin' ? (
              <p>If you're an administrator, please sign in with your admin account.</p>
            ) : (
              <p>Students can access this area after signing up for a student account.</p>
            )}
          </div>
        </div>
      </GlassContainer>
    </div>
  </GlassContainer>
);

/**
 * Unauthenticated Component
 * Shown when user is not signed in
 */
interface UnauthenticatedProps {
  requiredRole?: AllUserRoles;
  redirectPath: string;
}

const UnauthenticatedScreen: React.FC<UnauthenticatedProps> = ({ 
  requiredRole, 
  redirectPath 
}) => (
  <GlassContainer variant="page">
    <div className="min-h-screen flex items-center justify-center">
      <GlassContainer variant="card" className="text-center max-w-md">
        <div className="mb-6">
          {requiredRole === 'admin' ? (
            <Shield className="w-20 h-20 text-cyber-green-400 mx-auto mb-4" />
          ) : (
            <Users className="w-20 h-20 text-electric-blue-400 mx-auto mb-4" />
          )}
        </div>

        <h2 className="text-3xl font-bold text-white mb-4">Sign In Required</h2>
        
        <p className="text-gray-100 mb-6">
          Please sign in to access this area of CHESS Quest.
        </p>

        <div className="space-y-3">
          <a
            href={redirectPath}
            className="w-full btn-esports inline-flex items-center justify-center gap-2"
            aria-label={`Sign in as ${requiredRole || 'user'}`}
          >
            <Users className="w-4 h-4" />
            {requiredRole === 'admin' ? 'Admin Sign In' : 'Student Sign In'}
          </a>

          {!requiredRole && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <a
                href="/student-auth"
                className="text-sm bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-lg px-3 py-2 transition-all duration-200"
              >
                Student Portal
              </a>
              <a
                href="/admin-auth"
                className="text-sm bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-lg px-3 py-2 transition-all duration-200"
              >
                Admin Portal
              </a>
            </div>
          )}
        </div>
      </GlassContainer>
    </div>
  </GlassContainer>
);

/**
 * Protected Route Component
 * 
 * Handles authentication and authorization for routes that require specific user roles.
 * Provides appropriate feedback for different authentication states.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo,
  showLoading = true,
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Enhanced debugging for protected routes
  React.useEffect(() => {
    // Production-safe logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🛡️  ProtectedRoute:', {
        path: location.pathname,
        requiredRole,
        userRole: user?.role,
        isAuthenticated
      });
    }
  }, [user, requiredRole, isAuthenticated, loading, location.pathname]);

  /**
   * Navigate back to previous page or default route
   */
  const handleGoBack = () => {
    // Try to go back in history, or fallback to home
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  /**
   * Determine redirect path based on required role
   */
  const getRedirectPath = (): string => {
    if (redirectTo) return redirectTo;
    
    switch (requiredRole) {
      case 'admin':
        return '/admin-auth';
      case 'student':
        return '/student-auth';
      case 'master_admin':
        return '/admin-auth'; // Master admins can use admin auth
      default:
        return '/student-auth'; // Default to student auth
    }
  };

  // Show loading screen while determining authentication state
  if (loading && showLoading) {
    return <AuthLoadingScreen />;
  }

  // Handle unauthenticated users
  if (!isAuthenticated || !user) {
    // For certain routes, redirect immediately
    if (location.pathname === '/admin' || location.pathname === '/master-admin' || location.pathname === '/map') {
      return <Navigate to={getRedirectPath()} state={{ from: location }} replace />;
    }
    
    // For other routes, show sign-in screen
    return (
      <UnauthenticatedScreen 
        requiredRole={requiredRole}
        redirectPath={getRedirectPath()}
      />
    );
  }

  // Handle role-based authorization
  if (requiredRole && user.role !== requiredRole) {
    console.log('🚫 Role mismatch detected:', {
      required: requiredRole,
      actual: user.role,
      redirecting: true
    });
    
    // For role mismatches, show access denied screen
    return (
      <AccessDeniedScreen
        requiredRole={requiredRole}
        userRole={user.role}
        onGoBack={handleGoBack}
      />
    );
  }

  // User is authenticated and authorized - render protected content
  return <>{children}</>;
};

/**
 * Higher-order component wrapper for protected routes
 * Provides a convenient way to wrap components with route protection
 */
const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: AllUserRoles,
  redirectTo?: string
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <ProtectedRoute requiredRole={requiredRole} redirectTo={redirectTo}>
      <Component {...props} ref={ref} />
    </ProtectedRoute>
  ));
};

export default ProtectedRoute;