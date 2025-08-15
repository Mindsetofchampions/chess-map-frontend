/**
 * Protected Route Component
 * 
 * Provides authentication-based route protection with loading states.
 * For master_admin operations, UI shows actions but server enforces permissions.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Protected Route Props
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMaster?: boolean; // UI hint only - server enforces
}

/**
 * Loading Component
 */
const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-electric-blue-400 mx-auto mb-6"></div>
      <h2 className="text-2xl font-bold text-white mb-2">Checking Authentication</h2>
      <p className="text-gray-300">Please wait while we verify your access...</p>
    </div>
  </div>
);

/**
 * Protected Route Component
 * 
 * Shows loading while checking auth state, redirects to login if not authenticated.
 * For requireMaster routes, renders content but lets server enforce permissions.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireMaster = false
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while determining auth state
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render children - server will enforce master_admin permissions via RLS/RPCs
  return <>{children}</>;
};

export default ProtectedRoute;