/**
 * Supabase Client Configuration and RPC Helpers
 *
 * This file provides the single Supabase client instance and helper functions
 * for calling the specific RPCs required by the quest system.
 */

import { createClient } from '@supabase/supabase-js';

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
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Submit MCQ answer via RPC
 * Calls public.submit_mcq_answer which handles auto-grading and coin awards
 */
export async function rpcSubmitMcq(questId: string, choiceId: string): Promise<Submission> {
  try {
    const { data, error } = await supabase.rpc('submit_mcq_answer', {
      p_quest_id: questId,
      p_choice: choiceId,
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
      p_quest_id: questId,
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
      p_reason: reason,
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
      p_offset: offset,
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
      p_role: role,
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
      p_reason: reason,
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
export async function getPlatformBalance(): Promise<{
  id: number;
  coins: number;
  updated_at: string;
}> {
  try {
    // Use the SECURITY DEFINER RPC to fetch platform balance so RLS doesn't block master checks
    const { data, error } = await supabase.rpc('get_platform_balance');

    if (error) {
      const mappedError = mapPgError(error);
      throw new Error(mappedError.message);
    }

    // The RPC may return { balance, updated_at } or { coins, updated_at } depending on migration history.
    // Normalize to a consistent shape: { coins, updated_at }
    const coins = Number(data?.coins ?? data?.balance ?? 0);
    const updated_at = data?.updated_at ?? null;

    return { id: 1, coins, updated_at } as { id: number; coins: number; updated_at: string };
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

export interface OrgBalance {
  org_id: string;
  slug: string;
  name: string;
  balance: number;
}

/**
 * Allocate coins to an organization (master_admin only)
 */
export async function allocateOrgCoins(
  orgId: string,
  amount: number,
  reason: string,
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('allocate_org_coins', {
      p_org_id: orgId,
      p_amount: amount,
      p_reason: reason,
    });

    if (error) {
      throw new Error(mapPgError(error).message);
    }

    // Normalize to include remaining_balance if present
    const obj = data;
    return {
      success: obj?.success ?? true,
      org_id: obj?.org_id,
      amount: Number(obj?.amount ?? amount),
      org_balance: obj?.org_balance ? Number(obj.org_balance) : undefined,
      remaining_balance: obj?.remaining_balance ? Number(obj.remaining_balance) : undefined,
    };
  } catch (error) {
    throw new Error(mapPgError(error).message);
  }
}

/**
 * Get balances for all organizations (master_admin only)
 */
export async function getOrgBalances(): Promise<OrgBalance[]> {
  try {
    const { data, error } = await supabase
      .from('v_org_coin_balance')
      .select('org_id, slug, name, balance')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(mapPgError(error).message);
    }

    return (data as OrgBalance[]) || [];
  } catch (error) {
    throw new Error(mapPgError(error).message);
  }
}

// Allocate coins directly to a user by email (master_admin or org_admin)
export async function allocateUserCoins(
  email: string,
  amount: number,
  reason: string,
): Promise<{ ok: boolean; user_id: string; amount: number }>
{
  try {
    const { data, error } = await supabase.rpc('allocate_user_coins', {
      p_email: email,
      p_amount: amount,
      p_reason: reason,
    });

    if (error) {
      throw new Error(mapPgError(error).message);
    }

    const obj: any = data || {};
    return {
      ok: Boolean(obj.ok ?? true),
      user_id: obj.user_id,
      amount: Number(obj.amount ?? amount),
    };
  } catch (error) {
    throw new Error(mapPgError(error).message);
  }
}

export default supabase;

/**
 * Admin edge function: create user with service role.
 * Returns parsed JSON from the function (may include temporaryPassword)
 */
export async function adminCreateUser(payload: {
  email: string;
  role: string;
  password?: string;
  org_id?: string;
}) {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const resp = await fetch(`${supabaseUrl}/functions/v1/admin_create_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await resp.json();
    if (!resp.ok) {
      throw new Error(body?.error || 'admin_create_user failed');
    }

    return body;
  } catch (error: any) {
    throw new Error(error?.message || String(error));
  }
}

/**
 * Admin edge function: generate magic/login link
 */
export async function adminGenerateLink(email: string, redirectTo?: string) {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const resp = await fetch(`${supabaseUrl}/functions/v1/admin_generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, type: 'magiclink', redirectTo }),
    });

    const body = await resp.json();
    if (!resp.ok) throw new Error(body?.error || 'admin_generate_link failed');
    return body;
  } catch (error: any) {
    throw new Error(error?.message || String(error));
  }
}

/**
 * Admin edge function: set password for a user
 */
export async function adminSetPassword(email: string, password: string) {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const resp = await fetch(`${supabaseUrl}/functions/v1/admin_set_password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password }),
    });

    const body = await resp.json();
    if (!resp.ok) throw new Error(body?.error || 'admin_set_password failed');
    return body;
  } catch (error: any) {
    throw new Error(error?.message || String(error));
  }
}

/**
 * Admin edge function: delete a user by email
 */
export async function adminDeleteUser(email: string) {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const resp = await fetch(`${supabaseUrl}/functions/v1/admin_delete_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });

    const body = await resp.json();
    if (!resp.ok) throw new Error(body?.error || 'admin_delete_user failed');
    return body;
  } catch (error: any) {
    throw new Error(error?.message || String(error));
  }
}

// Org onboarding admin RPCs
export interface OrgOnboardingRow {
  id: string;
  org_name: string;
  org_logo_path: string;
  admin_id_path: string;
  submitted_by: string;
  submitter_email?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  created_at: string;
}

export async function listOrgOnboardings(status?: 'pending' | 'approved' | 'rejected') {
  const { data, error } = await supabase.rpc('list_org_onboardings', { p_status: status ?? null });
  if (error) throw new Error(mapPgError(error).message);
  return (data as OrgOnboardingRow[]) || [];
}

export async function approveOrgOnboarding(id: string, notes?: string) {
  const { data, error } = await supabase.rpc('approve_org_onboarding', {
    p_id: id,
    p_notes: notes ?? null,
  });
  if (error) throw new Error(mapPgError(error).message);
  return data;
}

export async function rejectOrgOnboarding(id: string, notes: string) {
  const { data, error } = await supabase.rpc('reject_org_onboarding', {
    p_id: id,
    p_notes: notes,
  });
  if (error) throw new Error(mapPgError(error).message);
  return data;
}

export async function sendSystemNotification(to: string, subject: string, text: string) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const resp = await fetch(`${supabaseUrl}/functions/v1/send_onboarding_notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ event: 'system_notification', parent_email: to, subject, text }),
  });
  if (!resp.ok) {
    try {
      const body = await resp.text();
      throw new Error(body || 'send_onboarding_notification failed');
    } catch (e) {
      // swallow, best-effort only
    }
  }
}

// Org admin: org and engagement flows
export interface MyOrg { org_id: string; name: string }
export interface OrgEngagement {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  budget_total: number;
  remaining: number;
  status: 'draft' | 'active' | 'closed';
  total_distributed: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function getMyOrg(): Promise<MyOrg | null> {
  const { data, error } = await supabase.rpc('get_my_org');
  if (error) throw new Error(mapPgError(error).message);
  if (!data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { org_id: row.id ?? row.org_id, name: row.name } as MyOrg;
}

export async function listOrgEngagements(): Promise<OrgEngagement[]> {
  const { data, error } = await supabase.rpc('list_org_engagements');
  if (error) throw new Error(mapPgError(error).message);
  return (data as OrgEngagement[]) || [];
}

export async function createOrgEngagement(name: string, description?: string) {
  const { data, error } = await supabase.rpc('create_org_engagement', {
    p_name: name,
    p_description: description ?? null,
  });
  if (error) throw new Error(mapPgError(error).message);
  return data as OrgEngagement;
}

export async function fundOrgEngagement(engagementId: string, amount: number, reason?: string) {
  const { data, error } = await supabase.rpc('fund_org_engagement', {
    p_engagement_id: engagementId,
    p_amount: amount,
    p_reason: reason ?? 'Fund engagement',
  });
  if (error) throw new Error(mapPgError(error).message);
  return data as { ok: boolean; remaining: number };
}

export async function upsertEngagementRecipient(engagementId: string, email: string, amount: number) {
  const { data, error } = await supabase.rpc('upsert_engagement_recipient', {
    p_engagement_id: engagementId,
    p_user_email: email,
    p_amount: amount,
  });
  if (error) throw new Error(mapPgError(error).message);
  return data as { ok: boolean };
}

export async function removeEngagementRecipient(engagementId: string, email: string) {
  const { data, error } = await supabase.rpc('remove_engagement_recipient', {
    p_engagement_id: engagementId,
    p_user_email: email,
  });
  if (error) throw new Error(mapPgError(error).message);
  return data as { ok: boolean };
}

export async function distributeEngagement(engagementId: string) {
  const { data, error } = await supabase.rpc('distribute_engagement', {
    p_engagement_id: engagementId,
  });
  if (error) throw new Error(mapPgError(error).message);
  return data as { ok: boolean; distributed: number };
}

export interface OrgWallet { org_id: string; balance: number }
export interface EngagementRecipient { user_id: string; email: string; planned_amount: number }

export async function getMyOrgWallet(): Promise<OrgWallet> {
  const { data, error } = await supabase.rpc('get_my_org_wallet');
  if (error) throw new Error(mapPgError(error).message);
  const obj: any = data || {};
  return { org_id: obj.org_id, balance: Number(obj.balance ?? 0) };
}

export async function listEngagementRecipients(engagementId: string): Promise<EngagementRecipient[]> {
  const { data, error } = await supabase.rpc('list_engagement_recipients', { p_engagement_id: engagementId });
  if (error) throw new Error(mapPgError(error).message);
  return (data as any[]).map((r: any) => ({ user_id: r.user_id, email: r.email, planned_amount: Number(r.planned_amount ?? 0) }));
}
