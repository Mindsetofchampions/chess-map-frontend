/**
 * Supabase Client Configuration and RPC Helpers
 * 
 * This file provides the single Supabase client instance and helper functions
 * for calling the specific RPCs required by the quest system.
 */

import { createClient, type PostgrestError } from '@supabase/supabase-js';
import type { Quest, Submission, Wallet, Ledger } from '@/types/backend';

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
  const { data, error } = await supabase.rpc('submit_mcq_answer', {
    p_quest_id: questId,
    p_choice: choiceId
  });
  
  if (error) {
    throw new Error(`Failed to submit MCQ: ${error.message}`);
  }
  
  return data as Submission;
}

/**
 * Approve quest via RPC (master_admin only)
 * Calls public.approve_quest which handles budget deduction and status update
 */
export async function rpcApproveQuest(questId: string): Promise<Quest> {
  const { data, error } = await supabase.rpc('approve_quest', {
    p_quest_id: questId
  });
  
  if (error) {
    throw new Error(`Failed to approve quest: ${error.message}`);
  }
  
  return data as Quest;
}

/**
 * Get current user's wallet balance via RPC
 */
export async function getMyWallet(): Promise<Wallet> {
  const { data, error } = await supabase.rpc('get_my_wallet');
  
  if (error) {
    throw new Error(`Failed to get wallet: ${error.message}`);
  }
  
  return data as Wallet;
}

/**
 * Get current user's transaction ledger via RPC
 */
export async function getMyLedger(limit: number = 50, offset: number = 0): Promise<Ledger[]> {
  const { data, error } = await supabase.rpc('get_my_ledger', {
    p_limit: limit,
    p_offset: offset
  });
  
  if (error) {
    throw new Error(`Failed to get ledger: ${error.message}`);
  }
  
  return data as Ledger[];
}

export default supabase;