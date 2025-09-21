/**
 * Backend Interface Types
 *
 * Minimal types mirroring the exact columns we read from Supabase tables.
 * These match the schema without adding client-side assumptions.
 */

/**
 * Quest status from database enum
 */
export type QuestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';

/**
 * Quest type from database enum
 */
export type QuestType = 'mcq' | 'text' | 'video';

/**
 * Submission status from database enum
 */
export type SubmissionStatus = 'pending' | 'accepted' | 'rejected' | 'autograded';

/**
 * Ledger entry kind from database constraint
 */
export type LedgerKind = 'quest_award' | 'quest_budget' | 'manual_adjust';

/**
 * Quest entity as read from public.quests table
 * Only includes columns we actually query
 */
export interface Quest {
  id: string;
  title: string;
  description?: string;
  status: QuestStatus;
  active: boolean;
  reward_coins: number;
  qtype: QuestType;
  config: any; // JSONB - structure depends on qtype
  attribute_id?: string;
  created_at?: string;
  approved_at?: string;
  created_by?: string;
  approved_by?: string;
  lng?: number | null;
  lat?: number | null;
}

/**
 * Wallet entity as returned from get_my_wallet() RPC
 */
export interface Wallet {
  user_id: string;
  balance: number;
  updated_at: string;
}

/**
 * Ledger entry as returned from get_my_ledger() RPC
 */
export interface Ledger {
  id: number;
  user_id: string;
  delta: number;
  kind: LedgerKind;
  quest_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

/**
 * Quest submission entity as read from public.quest_submissions table
 */
export interface Submission {
  id: string;
  quest_id: string;
  user_id: string;
  status: SubmissionStatus;
  mcq_choice?: string | null;
  text_answer?: string | null;
  video_url?: string | null;
  score?: number | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

/**
 * MCQ option structure from quest.config
 * Note: isCorrect is not exposed to client for security
 */
export interface MCQOption {
  id: string;
  text: string;
  // isCorrect is server-only for security
}

/**
 * MCQ configuration structure
 */
export interface MCQConfig {
  options: MCQOption[];
  explanation?: string;
}
