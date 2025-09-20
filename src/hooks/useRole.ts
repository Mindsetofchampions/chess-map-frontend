/**
 * Role Hook
 * 
 * Convenience hook for accessing user role information from AuthContext
 */

import { useContext } from 'react';
import { AuthContext, type AppRole } from '@/contexts/AuthContext';

/**
 * Hook return interface
 */
interface UseRoleReturn {
  role: AppRole;
  roleLoading: boolean;
  refreshRole: () => Promise<AppRole>;
  isMaster: boolean;
  isOrgAdmin: boolean;
  isStaff: boolean;
  isStudent: boolean;
  isUnknown: boolean;
}

/**
 * useRole Hook
 * 
 * Provides convenient access to user role information and role checking utilities.
 */
export const useRole = (): UseRoleReturn => {
  const { role, roleLoading, refreshRole } = useContext(AuthContext);

  return {
    role,
    roleLoading,
    refreshRole,
    isMaster: role === 'master_admin',
    isOrgAdmin: role === 'org_admin',
    isStaff: role === 'staff',
    isStudent: role === 'student',
    isUnknown: role === 'unknown'
  };
};