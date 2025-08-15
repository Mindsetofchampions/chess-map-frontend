/**
 * Supabase Client Configuration and Helper Functions
 * 
 * This file initializes the Supabase client and provides helper functions
 * for authentication, database operations, and real-time subscriptions.
 */

import { createClient } from '@supabase/supabase-js';
import { AuthUser, AllUserRoles, Quest, SystemMetrics, Sprite, SafeSpace, Notification, UserApprovalRequest } from '../types/database';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Transform Supabase user to AuthUser type
 */
export const transformUser = (user: any): AuthUser | null => {
  if (!user) return null;
  
  const role = user.user_metadata?.role || user.app_metadata?.role || 'student';
  
  // Production-safe role transformation logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔬 User role transformation:', {
      hasUser: !!user,
      extractedRole: role
    });
  }
  
  return {
    id: user.id,
    email: user.email || '',
    role: role as AllUserRoles,
    created_at: user.created_at,
    updated_at: user.updated_at,
    user_metadata: {
      role: role as AllUserRoles,
      full_name: user.user_metadata?.full_name
    }
  };
};

/**
 * Authentication Helper Functions
 */
export const authHelpers = {
  async signIn(email: string, password: string, expectedRole?: AllUserRoles) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { data: null, error: error.message };
      }

      const user = transformUser(data.user);
      
      if (expectedRole && user?.role !== expectedRole) {
        return { data: null, error: `Access denied. Expected ${expectedRole} role.` };
      }

      return { data: user, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error?.message || null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return { data: null, error: error.message };
      }

      return { data: transformUser(session?.user), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error: error?.message || null };
    } catch (error: any) {
      return { error: error.message };
    }
  }
};

/**
 * Google OAuth Helper Functions
 */
export const googleAuthHelpers = {
  async signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/student`
        }
      });
      
      return { error: error?.message || null };
    } catch (error: any) {
      return { error: error.message };
    }
  }
};

/**
 * Quest Helper Functions
 */
const questHelpers = {
  async getActiveQuests() {
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('*');

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getUserCompletions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('completions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getUserBalance(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_coin_balance')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {  // Not found is ok
        return { data: null, error: error.message };
      }

      return { data: data?.balance || 0, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async completeQuest(params: { quest_id: string; user_id: string; response_data?: any }) {
    try {
      const { data, error } = await supabase.rpc('complete_quest', params);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
};

/**
 * Analytics Helper Functions
 */
export const analyticsHelpers = {
  async logAction(userId: string, action: string, questId?: string, metadata?: any) {
    try {
      const { error } = await supabase
        .from('analytics_logs')
        .insert({
          user_id: userId,
          event_type: action,
          data: {
            quest_id: questId,
            ...metadata
          }
        });

      if (error) {
        console.error('Analytics logging failed:', error);
      }
    } catch (error) {
      console.error('Analytics logging error:', error);
    }
  },

  async logQuestInteraction(userId: string, questId: string, interaction: string) {
    return this.logAction(userId, `quest_${interaction}`, questId);
  },

  async logMapInteraction(userId: string, interaction: string, metadata?: any) {
    return this.logAction(userId, `map_${interaction}`, undefined, metadata);
  }
};

/**
 * Subscription Helper Functions
 */
const subscriptionHelpers = {
  subscribeToQuests(callback: (quests: Quest[]) => void) {
    const subscription = supabase
      .channel('quests_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quests' },
        async () => {
          const { data } = await questHelpers.getActiveQuests();
          if (data) callback(data);
        }
      )
      .subscribe();

    return subscription;
  },

  subscribeToUserBalance(userId: string, callback: (balance: number) => void) {
    const subscription = supabase
      .channel(`balance_${userId}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_coin_balance',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          if (payload.new && 'balance' in payload.new) {
            callback(payload.new.balance as number);
          }
        }
      )
      .subscribe();

    return subscription;
  }
};

/**
 * Master Admin Helper Functions
 */
export const masterAdminHelpers = {
  async getSystemMetrics() {
    try {
      const { data, error } = await supabase.rpc('get_system_metrics');
      
      if (error) {
        return { 
          data: {
            uptime: 86400,
            active_users: 0,
            map_load_success_rate: 100,
            total_quests: 0,
            completed_quests: 0
          } as SystemMetrics, 
          error: null 
        };
      }

      return { data: data as SystemMetrics, error: null };
    } catch (error: any) {
      return { 
        data: {
          uptime: 86400,
          active_users: 0,
          map_load_success_rate: 100,
          total_quests: 0,
          completed_quests: 0
        } as SystemMetrics, 
        error: null 
      };
    }
  },

  sprites: {
    async getAll() {
      try {
        const { data, error } = await supabase
          .from('sprites')
          .select('*')
          .order('created_at', { ascending: false });

        return { data: data || [], error: error?.message || null };
      } catch (error: any) {
        return { data: [], error: error.message };
      }
    },

    async create(sprite: Omit<Sprite, 'id' | 'created_at'>) {
      try {
        const { data, error } = await supabase
          .from('sprites')
          .insert(sprite)
          .select()
          .single();

        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    },

    async update(id: string, updates: Partial<Sprite>) {
      try {
        const { data, error } = await supabase
          .from('sprites')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    },

    async delete(id: string) {
      try {
        const { error } = await supabase
          .from('sprites')
          .delete()
          .eq('id', id);

        return { error: error?.message || null };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },

  safeSpaces: {
    async getAll() {
      try {
        const { data, error } = await supabase
          .from('safe_spaces')
          .select('*')
          .order('created_at', { ascending: false });

        return { data: data || [], error: error?.message || null };
      } catch (error: any) {
        return { data: [], error: error.message };
      }
    },

    async create(safeSpace: Omit<SafeSpace, 'id' | 'created_at'>) {
      try {
        const { data, error } = await supabase
          .from('safe_spaces')
          .insert(safeSpace)
          .select()
          .single();

        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    },

    async update(id: string, updates: Partial<SafeSpace>) {
      try {
        const { data, error } = await supabase
          .from('safe_spaces')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    },

    async delete(id: string) {
      try {
        const { error } = await supabase
          .from('safe_spaces')
          .delete()
          .eq('id', id);

        return { error: error?.message || null };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },

  quests: {
    async getPending() {
      try {
        const { data, error } = await supabase
          .from('quests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        return { data: data || [], error: error?.message || null };
      } catch (error: any) {
        return { data: [], error: error.message };
      }
    },

    async approve(id: string) {
      try {
        const { data, error } = await supabase.rpc('approve_quest', { quest_id: id });
        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    },

    async reject(id: string, reason?: string) {
      try {
        const { data, error } = await supabase.rpc('reject_quest', { 
          quest_id: id, 
          rejection_reason: reason 
        });
        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    }
  },

  notifications: {
    async getAll() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        return { data: data || [], error: error?.message || null };
      } catch (error: any) {
        return { data: [], error: error.message };
      }
    },

    async create(notification: Omit<Notification, 'id' | 'created_at'>) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .insert(notification)
          .select()
          .single();

        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    },

    async update(id: string, updates: Partial<Notification>) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    },

    async delete(id: string) {
      try {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', id);

        return { error: error?.message || null };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },

  users: {
    async getPendingApprovals() {
      try {
        const { data, error } = await supabase
          .from('user_approval_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        return { data: data || [], error: error?.message || null };
      } catch (error: any) {
        return { data: [], error: error.message };
      }
    },

    async approveUser(requestId: string) {
      try {
        const { data, error } = await supabase.rpc('approve_user_request', { 
          request_id: requestId 
        });
        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    }
  },

  coinBank: {
    async getUserBalances() {
      try {
        const { data, error } = await supabase
          .from('user_coin_balance')
          .select(`
            *,
            users:user_id (
              email
            )
          `)
          .order('balance', { ascending: false });

        return { data: data || [], error: error?.message || null };
      } catch (error: any) {
        return { data: [], error: error.message };
      }
    },

    async adjustBalance(userId: string, amount: number, reason: string) {
      try {
        const { data, error } = await supabase.rpc('adjust_user_balance', {
          user_id: userId,
          adjustment_amount: amount,
          adjustment_reason: reason
        });
        return { data, error: error?.message || null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    }
  }
};