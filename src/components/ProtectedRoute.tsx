/**
 * Protected Route Component
 * 
 * Provides authentication and role-based route protection with proper loading states.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Crown } from 'lucide-react';
import GlassContainer from '@/components/GlassContainer';

/**
 * Protected Route Props
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMaster?: boolean;
}

/**
 * Loading Component
 */
const AuthLoadingScreen: React.FC<{ message?: string }> = ({ message = "Checking Authentication" }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-electric-blue-400 mx-auto mb-6"></div>
      <h2 className="text-2xl font-bold text-white mb-2">{message}</h2>
      <p className="text-gray-300">Please wait while we verify your access...</p>
    </div>
  </div>
);

/**
 * Not Authorized Component
 */
const NotAuthorizedPanel: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary flex items-center justify-center">
    <GlassContainer variant="card" className="text-center max-w-md">
      <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">Access Restricted</h2>
      <p className="text-gray-300 mb-6">
        You don't have permission to access this area. Master admin privileges are required.
      </p>
      
      <div className="space-y-3">
        <a
          href="/dashboard"
          className="w-full btn-esports flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4" />
          Go to Dashboard
        </a>
        
        <p className="text-gray-400 text-sm">
          Contact your administrator if you believe this is an error.
        </p>
      </div>
    </GlassContainer>
  </div>
);

/**
 * Protected Route Component
 * 
 * Handles authentication and role-based access control with proper loading states.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireMaster = false
}) => {
  const { user, role, loading, roleLoading } = useAuth();
  const location = useLocation();

  // Show loading while determining auth state
  if (loading) {
    return <AuthLoadingScreen message="Checking Authentication" />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show loading while determining role for master-required routes
  if (requireMaster && roleLoading) {
    return <AuthLoadingScreen message="Verifying Permissions" />;
  }

  // Show not authorized panel for master routes without proper role
  if (requireMaster && role !== 'master_admin') {
    return <NotAuthorizedPanel />;
  }

  // Render children - user is authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;