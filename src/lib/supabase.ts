/**
 * Supabase Client Configuration and RPC Helpers
 * 
 * This file provides the single Supabase client instance and helper functions
 * for calling the specific RPCs required by the quest system.
 */

import { createClient, type PostgrestError } from '@supabase/supabase-js';
import type { Quest, Submission, Wallet, Ledger } from '@/types/backend';
import { mapPgError } from '@/utils/mapPgError';

// Environment validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    flowType: 'pkce',
    autoRefreshToken: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * Submit MCQ answer via RPC
 * Calls public.submit_mcq_answer which handles auto-grading and coin awards
 */
export async function rpcSubmitMcq(questId: string, choiceId: string): Promise<Submission> {
  try {
    const { data, error } = await supabase.rpc('submit_mcq_answer', {
      p_quest_id: questId,
      p_choice: choiceId
    });
    
    if (error) {
      const mappedError = mapPgError(error);
      throw new Error(mappedError.message);
    }
    
    return data as Submission;
  } catch (error) {
    const mappedError = mapPgError(error);
    throw new Error(mappedError.message);
  }
}

/**
 * Approve quest via RPC (master_admin only)
 * Calls public.approve_quest which handles budget deduction and status update
 */
export async function rpcApproveQuest(questId: string): Promise<Quest> {
  try {
    const { data, error } = await supabase.rpc('approve_quest', {
      p_quest_id: questId
    });
    
    if (error) {
      const mappedError = mapPgError(error);
      throw new Error(mappedError.message);
    }
    
    return data;
  } catch (error) {
    const mappedError = mapPgError(error);
    throw new Error(mappedError.message);
  }
}

/**
 * Reject quest via RPC (master_admin only)
 * Calls public.reject_quest which handles status update and reason tracking
 */
export async function rpcRejectQuest(questId: string, reason: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('reject_quest', {
      p_quest_id: questId,
      p_reason: reason
    });
    
    if (error) {
      const mappedError = mapPgError(error);
      throw new Error(mappedError.message);
    }
    
    return data;
  } catch (error) {
    const mappedError = mapPgError(error);
    throw new Error(mappedError.message);
  }
}

/**
 * Get current user's wallet balance via RPC
 */
export async function getMyWallet(): Promise<Wallet> {
  try {
    const { data, error } = await supabase.rpc('get_my_wallet');
    
    if (error) {
      const mappedError = mapPgError(error);
      throw new Error(mappedError.message);
    }
    
    return data as Wallet;
  } catch (error) {
    const mappedError = mapPgError(error);
    throw new Error(mappedError.message);
  }
}

/**
 * Get current user's transaction ledger via RPC
 */
export async function getMyLedger(limit: number = 50, offset: number = 0): Promise<Ledger[]> {
  try {
    const { data, error } = await supabase.rpc('get_my_ledger', {
      p_limit: limit,
      p_offset: offset
    });
    
    if (error) {
      const mappedError = mapPgError(error);
      throw new Error(mappedError.message);
    }
    
    return data as Ledger[];
  } catch (error) {
    const mappedError = mapPgError(error);
    throw new Error(mappedError.message);
  }
}

/**
 * Set user role via RPC (master_admin only)
 */
export async function setUserRole(email: string, role: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('set_user_role', {
      p_email: email,
      p_role: role
    });
    
    if (error) {
      throw new Error(mapPgError(error).message);
    }
    
    return data;
  } catch (error) {
    throw new Error(mapPgError(error).message);
  }
}

/**
 * Top up platform balance via RPC (master_admin only)
 */
export async function topUpPlatformBalance(amount: number, reason: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('top_up_platform_balance', {
      p_amount: amount,
      p_reason: reason
    });
    
    if (error) {
      throw new Error(mapPgError(error).message);
    }
    
    return data;
  } catch (error) {
    throw new Error(mapPgError(error).message);
  }
}

/**
 * Get platform balance (master_admin only)
 */
export async function getPlatformBalance(): Promise<{ id: number; coins: number; updated_at: string }> {
  try {
    const { data, error } = await supabase
      .from('platform_balance')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) {
      const mappedError = mapPgError(error);
      throw new Error(mappedError.message);
    }
    
    return data;
  } catch (error) {
    const mappedError = mapPgError(error);
    throw new Error(mappedError.message);
  }
}

/**
 * Get platform ledger (master_admin only)
 */
export async function getPlatformLedger(limit: number = 50, offset: number = 0): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('platform_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      const mappedError = mapPgError(error);
      throw new Error(mappedError.message);
    }
    
    return data || [];
  } catch (error) {
    const mappedError = mapPgError(error);
    throw new Error(mappedError.message);
  }
}

export default supabase;