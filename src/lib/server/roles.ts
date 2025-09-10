/**
 * Server-Side Role Management
 * 
 * Provides utilities for role checking and access control on the server side.
 * Used for route protection and server-side authorization.
 */

import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Application role types
 */
export type AppRole = 'master_admin' | 'org_admin' | 'staff' | 'student' | 'unknown';

/**
 * Get user role from server-side Supabase client
 * 
 * @param supabaseServerClient - Server-side Supabase client instance
 * @returns User's role or 'unknown' if not found/authenticated
 */
export async function getUserRole(supabaseServerClient: any): Promise<AppRole> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabaseServerClient.auth.getUser();
    
    if (userError || !user) {
      return 'unknown';
    }

    // Query user role from user_roles table
    const { data, error } = await supabaseServerClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch user role:', error);
      // Fallback to profiles table for backward compatibility
      const { data: profileData, error: profileError } = await supabaseServerClient
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        return 'student'; // Default fallback
      }

      return profileData.role as AppRole;
    }

    if (!data) {
      return 'student'; // Default for users without explicit role assignment
    }

    return data.role as AppRole;
  } catch (error) {
    console.error('getUserRole error:', error);
    return 'unknown';
  }
}

/**
 * Check if user has at least the specified role level
 * 
 * @param userRole - Current user's role
 * @param requiredRole - Minimum required role
 * @returns True if user meets the role requirement
 */
export function hasRoleLevel(userRole: AppRole, requiredRole: AppRole): boolean {
  const roleHierarchy: Record<AppRole, number> = {
    'master_admin': 4,
    'org_admin': 3,
    'staff': 2,
    'student': 1,
    'unknown': 0
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Server-side route guard utility
 * 
 * @param supabaseServerClient - Server-side Supabase client
 * @param requiredRole - Minimum required role for access
 * @returns Object with access status and user role
 */
export async function requireRole(
  supabaseServerClient: any,
  requiredRole: AppRole
): Promise<{ hasAccess: boolean; userRole: AppRole; shouldRedirect: boolean }> {
  const userRole = await getUserRole(supabaseServerClient);
  const hasAccess = hasRoleLevel(userRole, requiredRole);

  return {
    hasAccess,
    userRole,
    shouldRedirect: !hasAccess && userRole !== 'unknown'
  };
}

/**
 * Create master admin check function
 * 
 * @param supabaseServerClient - Server-side Supabase client
 * @returns True if user is master admin
 */
export async function isMasterAdmin(supabaseServerClient: any): Promise<boolean> {
  const role = await getUserRole(supabaseServerClient);
  return role === 'master_admin';
}

/**
 * Validate role assignment permissions
 * 
 * @param assignerRole - Role of the user attempting to assign roles
 * @param targetRole - Role being assigned
 * @returns True if the assignment is valid
 */
export function canAssignRole(assignerRole: AppRole, targetRole: AppRole): boolean {
  // Only master_admin can assign any role
  if (assignerRole === 'master_admin') {
    return true;
  }

  // org_admin can assign staff and student roles
  if (assignerRole === 'org_admin' && ['staff', 'student'].includes(targetRole)) {
    return true;
  }

  // staff can assign student role
  if (assignerRole === 'staff' && targetRole === 'student') {
    return true;
  }

  return false;
}