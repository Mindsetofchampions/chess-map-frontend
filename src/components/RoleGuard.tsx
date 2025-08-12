import React from 'react';
import { motion } from 'framer-motion';
import { useRequireAuth } from '../hooks/useAuth';
import { Shield, Users, AlertTriangle } from 'lucide-react';
import GlassContainer from './GlassContainer';

/**
 * Props for RoleGuard component
 */
interface RoleGuardProps {
  /** Required role to access content */
  requiredRole?: 'student' | 'staff' | 'org_admin' | 'master_admin';
  /** Required organization ID */
  orgId?: string;
  /** Custom fallback component for unauthorized access */
  fallback?: React.ReactNode;
  /** Whether to show loading spinner */
  showLoading?: boolean;
  /** Children to render if authorized */
  children: React.ReactNode;
}

/**
 * Access denied component
 */
interface AccessDeniedProps {
  requiredRole?: string;
  userRole?: string;
  orgRequired?: boolean;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  requiredRole, 
  userRole, 
  orgRequired 
}) => (
  <GlassContainer variant="card" className="text-center max-w-md mx-auto">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <Shield className="w-10 h-10 text-red-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-4">Access Restricted</h2>
      
      <div className="space-y-3 text-gray-200">
        {requiredRole && (
          <p>
            This content requires <span className="font-semibold text-electric-blue-400">{requiredRole}</span> access.
          </p>
        )}
        
        {userRole && (
          <p>
            You are currently signed in as a <span className="font-medium text-neon-purple-400">{userRole}</span>.
          </p>
        )}
        
        {orgRequired && (
          <p>
            This content is restricted to specific organization members.
          </p>
        )}
      </div>

      <div className="mt-6 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl">
        <div className="flex items-center gap-2 text-amber-200">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">
            Contact your administrator if you believe you should have access to this content.
          </p>
        </div>
      </div>
    </motion.div>
  </GlassContainer>
);

/**
 * Unauthenticated component
 */
const Unauthenticated: React.FC = () => (
  <GlassContainer variant="card" className="text-center max-w-md mx-auto">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-20 h-20 bg-electric-blue-500/20 border border-electric-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <Users className="w-10 h-10 text-electric-blue-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
      
      <p className="text-gray-200 mb-6">
        Please sign in to access this content and continue your CHESS Quest journey.
      </p>

      <motion.a
        href="/student-auth"
        className="btn-esports inline-flex items-center gap-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Users className="w-4 h-4" />
        Sign In to Continue
      </motion.a>
    </motion.div>
  </GlassContainer>
);

/**
 * Loading component
 */
const AuthLoading: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
      <p className="text-gray-300">Checking permissions...</p>
    </div>
  </div>
);

/**
 * Role Guard Component
 * 
 * Provides role-based access control for components and pages.
 * Handles authentication state, loading, and permission checking.
 */
const RoleGuard: React.FC<RoleGuardProps> = ({
  requiredRole,
  orgId,
  fallback,
  showLoading = true,
  children
}) => {
  const auth = useRequireAuth();

  // Show loading state
  if (auth.loading && showLoading) {
    return <AuthLoading />;
  }

  // Handle unauthenticated users
  if (!auth.user || !auth.session) {
    return fallback || <Unauthenticated />;
  }

  // Check role requirements
  if (requiredRole && !auth.hasRequiredRole(requiredRole)) {
    return fallback || (
      <AccessDenied 
        requiredRole={requiredRole}
        userRole={auth.profile?.role}
      />
    );
  }

  // Check organization requirements
  if (orgId && !auth.canAccessOrg(orgId)) {
    return fallback || (
      <AccessDenied 
        orgRequired={true}
        userRole={auth.profile?.role}
      />
    );
  }

  // User is authorized - render children
  return <>{children}</>;
};

/**
 * Higher-order component for role-based protection
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'student' | 'staff' | 'org_admin' | 'master_admin',
  orgId?: string
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard requiredRole={requiredRole} orgId={orgId}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

/**
 * Hook for checking specific permissions
 */
export function usePermissions() {
  const auth = useRequireAuth();

  return {
    canManageUsers: auth.isMasterAdmin || auth.isOrgAdmin,
    canManageContent: auth.isStaff,
    canViewAnalytics: auth.isStaff,
    canAccessOrg: (orgId: string) => auth.canAccessOrg(orgId),
    canEditProfile: !!auth.user,
    canUploadEvidence: !!auth.user,
    canTakeChallenges: !!auth.user,
    canWatchVideos: !!auth.user
  };
}

export default RoleGuard;