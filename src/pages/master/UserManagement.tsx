/**
 * User Management Page
 * 
 * Master admin interface for user creation and role management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Crown,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { mapPgError } from '@/utils/mapPgError';
import { formatDateTime } from '@/utils/format';
import GlassContainer from '@/components/GlassContainer';

/**
 * User with role information
 */
interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: string;
  assigned_at?: string;
  assigned_by?: string;
}

/**
 * User creation form data
 */
interface CreateUserForm {
  email: string;
  role: 'student' | 'admin' | 'org_admin' | 'staff';
  displayName: string;
}

/**
 * User Management Component
 * 
 * Features:
 * - User creation with role assignment
 * - User list with role management
 * - Real-time updates on role changes
 */
const UserManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    role: 'student',
    displayName: ''
  });

  /**
   * Fetch all users with their roles
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          role,
          created_at,
          users:user_id (
            email,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Transform data for display
      const usersWithRoles = (data || []).map(profile => ({
        id: profile.user_id,
        email: profile.users?.email || 'Unknown',
        created_at: profile.users?.created_at || profile.created_at,
        role: profile.role || 'student',
        displayName: profile.display_name
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      showError('Failed to load users', mapPgError(error).message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Create new user
   */
  const handleCreateUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.email || !createForm.role) {
      showError('Validation Error', 'Email and role are required');
      return;
    }

    setCreating(true);
    
    try {
      // Call admin create user API
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          email: createForm.email,
          role: createForm.role,
          display_name: createForm.displayName || undefined
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      // Set role using RPC
      const { error: roleError } = await supabase.rpc('set_user_role', {
        p_email: createForm.email,
        p_role: createForm.role
      });

      if (roleError) {
        console.warn('Role setting failed:', roleError.message);
      }

      showSuccess(
        'User Created',
        `Successfully created user ${createForm.email} with role ${createForm.role}`
      );

      // Reset form and refresh list
      setCreateForm({ email: '', role: 'student', displayName: '' });
      await fetchUsers();

    } catch (error: any) {
      console.error('Failed to create user:', error);
      showError('User Creation Failed', mapPgError(error).message);
    } finally {
      setCreating(false);
    }
  }, [createForm, showSuccess, showError, fetchUsers]);

  /**
   * Update user role
   */
  const handleUpdateRole = useCallback(async (email: string, newRole: string) => {
    setUpdatingRole(email);
    
    try {
      const { data, error } = await supabase.rpc('set_user_role', {
        p_email: email,
        p_role: newRole
      });

      if (error) {
        const mappedError = mapPgError(error);
        throw new Error(mappedError.message);
      }

      showSuccess(
        'Role Updated',
        `Successfully updated ${email} to ${newRole}`
      );

      await fetchUsers();

    } catch (error: any) {
      console.error('Failed to update role:', error);
      showError('Role Update Failed', mapPgError(error).message);
    } finally {
      setUpdatingRole(null);
    }
  }, [showSuccess, showError, fetchUsers]);

  /**
   * Get role badge color
   */
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'master_admin':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'org_admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'staff':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'student':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  /**
   * Initialize data
   */
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
      <div className="container mx-auto max-w-7xl p-6">
        <button
          className="mb-4 inline-flex items-center gap-2 text-cyber-green-300 hover:text-cyber-green-200 text-sm font-medium"
          onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/master/dashboard')}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back to Dashboard
        </button>
        
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-8 h-8 text-electric-blue-400" />
            <h1 className="text-4xl font-bold text-white">User Management</h1>
          </div>
          <p className="text-gray-200 text-lg">Create and manage user accounts and roles</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User Creation Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassContainer variant="card">
              <div className="flex items-center gap-3 mb-6">
                <UserPlus className="w-6 h-6 text-cyber-green-400" />
                <h2 className="text-xl font-semibold text-white">Create New User</h2>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-3 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyber-green-400"
                      required
                      disabled={creating}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Role
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full bg-glass border-glass rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyber-green-400"
                    required
                    disabled={creating}
                  >
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                    <option value="org_admin">Organization Admin</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={createForm.displayName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-3 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyber-green-400"
                    disabled={creating}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating || !createForm.email}
                  className="w-full btn-esports disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                >
                  {creating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating User...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      <span>Create User</span>
                    </div>
                  )}
                </button>
              </form>
            </GlassContainer>
          </motion.div>

          {/* Users List */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassContainer variant="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">System Users</h2>
                
                <button
                  onClick={fetchUsers}
                  disabled={loading}
                  className="p-2 bg-glass-dark border-glass hover:bg-glass-light rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Refresh users list"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-glass-light rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="w-48 h-4 bg-gray-600 rounded"></div>
                          <div className="w-32 h-3 bg-gray-600 rounded"></div>
                        </div>
                        <div className="w-20 h-8 bg-gray-600 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No Users Found</h3>
                  <p className="text-gray-300 text-sm">Create your first user to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="bg-glass-light border-glass-light rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-white">{user.email}</h4>
                          <span 
                            className={`px-2 py-1 text-xs rounded-full border ${getRoleBadgeColor(user.role)}`}
                          >
                            {user.role}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-300 space-y-1">
                          <div>Created: {formatDateTime(user.created_at)}</div>
                          {user.assigned_at && (
                            <div>Role set: {formatDateTime(user.assigned_at)}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Role Change Buttons */}
                        {['student', 'staff', 'org_admin', 'admin'].map((role) => (
                          <button
                            key={role}
                            onClick={() => handleUpdateRole(user.email, role)}
                            disabled={
                              user.role === 'master_admin' || 
                              user.role === role || 
                              updatingRole === user.email
                            }
                            className={`
                              px-3 py-1 text-xs rounded-lg font-medium transition-all duration-200 
                              disabled:opacity-50 disabled:cursor-not-allowed
                              ${user.role === role 
                                ? 'bg-electric-blue-500/20 text-electric-blue-400 border border-electric-blue-500/30' 
                                : 'bg-glass-dark border-glass hover:bg-glass-light text-gray-300 hover:text-white'
                              }
                            `}
                          >
                            {updatingRole === user.email ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                            ) : (
                              role
                            )}
                          </button>
                        ))}

                        {user.role === 'master_admin' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs">
                            <Crown className="w-3 h-3" />
                            <span>Protected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;