/**
 * CHESS Quest System Type Definitions
 * 
 * Provides comprehensive type safety for the quest creation, approval,
 * and completion workflow. Integrates with existing persona and user systems.
 */

import { PersonaKey } from '../assets/personas';

/**
 * Quest type enumeration
 * Defines the three supported quest interaction types
 */
export type QuestType = 'mcq' | 'text' | 'video';

/**
 * Quest status workflow
 * Tracks the approval lifecycle from creation to completion
 */
type QuestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';

/**
 * Submission status for student answers
 * Differentiates between auto-graded and manually reviewed submissions
 */
type SubmissionStatus = 'pending' | 'accepted' | 'rejected' | 'autograded';

/**
 * MCQ option interface for multiple choice questions
 */
export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

/**
 * Quest configuration by type
 * Type-specific settings for different quest interactions
 */
interface QuestConfig {
  // MCQ configuration
  mcq?: {
    options: MCQOption[];
    shuffle?: boolean;
    explanation?: string;
  };
  
  // Text response configuration
  text?: {
    maxLength: number;
    minLength?: number;
    rubric?: string;
    placeholder?: string;
  };
  
  // Video upload configuration
  video?: {
    maxSizeMB: number;
    acceptedFormats?: string[];
    instructions?: string;
    maxDurationSeconds?: number;
  };
}

/**
 * Reusable map location for quest placement
 */
export interface QuestNode {
  id: string;
  persona_key: PersonaKey;
  lng: number;
  lat: number;
  label?: string;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Quest template created by administrators
 * Serves as a blueprint for creating multiple similar quests
 */
export interface QuestTemplate {
  id: string;
  title: string;
  description?: string;
  qtype: QuestType;
  config: QuestConfig;
  default_reward: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Active quest instance created from a template
 * Requires approval before becoming visible to students
 */
export interface Quest {
  id: string;
  template_id: string;
  title: string;
  description?: string;
  qtype: QuestType;
  config: QuestConfig;
  reward_coins: number;
  status: QuestStatus;
  persona_key: PersonaKey;
  lng: number;
  lat: number;
  node_id?: string | null;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Student submission for a quest
 * Stores answers and tracks review status
 */
export interface QuestSubmission {
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
 * User coin wallet for reward system
 */
export interface CoinWallet {
  user_id: string;
  balance: number;
  updated_at: string;
}

/**
 * Coin transaction ledger entry
 * Provides audit trail for all coin movements
 */
export interface CoinLedgerEntry {
  id: number;
  user_id: string;
  delta: number;
  kind: 'quest_budget' | 'quest_award' | 'manual_adjust';
  quest_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

/**
 * Combined quest data with template information
 * Used for displaying quest details with template context
 */
export interface QuestWithTemplate extends Quest {
  template?: QuestTemplate;
}

/**
 * Quest submission with quest context
 * Used for review interfaces
 */
export interface QuestSubmissionWithQuest extends QuestSubmission {
  quest?: Quest;
  user_email?: string;
}

/**
 * Form data for creating new quests
 */
export interface CreateQuestData {
  template_id: string;
  title: string;
  description?: string;
  reward_coins: number;
  persona_key: PersonaKey;
  lng: number;
  lat: number;
  node_id?: string;
}

/**
 * Form data for creating templates
 */
export interface CreateTemplateData {
  title: string;
  description?: string;
  qtype: QuestType;
  config: QuestConfig;
  default_reward: number;
}

/**
 * Quest statistics for admin dashboards
 */
export interface QuestStats {
  total_templates: number;
  total_quests: number;
  pending_approvals: number;
  active_quests: number;
  total_submissions: number;
  pending_reviews: number;
  completion_rate: number;
}

/**
 * Validation schemas for quest data
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Quest play session state
 * Tracks student progress through quest interaction
 */
interface QuestPlaySession {
  quest: Quest;
  submission?: QuestSubmission;
  startedAt: Date;
  timeSpent: number;
  completed: boolean;
}