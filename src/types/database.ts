/**
 * TypeScript interfaces for database entities
 * 
 * This file defines all the data structures used throughout the application
 * to ensure type safety when interacting with Supabase.
 */

/**
 * User role type definition
 * Restricts roles to specific allowed values
 */
export type UserRole = 'student' | 'admin';

/**
 * Master admin role type for enhanced permissions
 */
export type MasterAdminRole = 'master_admin';

/**
 * Combined user roles including master admin
 */
export type AllUserRoles = UserRole | MasterAdminRole;

/**
 * Authentication user interface
 * Extends Supabase User with our custom metadata
 */
export interface AuthUser {
  id: string;
  email: string;
  role: AllUserRoles;
  created_at: string;
  user_metadata: {
    role: AllUserRoles;
    full_name?: string;
  };
}

/**
 * Quest entity interface
 * Represents learning challenges available to students
 */
export interface Quest {
  id: string;
  title: string;
  description: string;
  coin_reward: number;
  created_at: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  estimated_duration?: number; // in minutes
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * User coins balance interface
 * Tracks student coin accumulation
 */
export interface UserCoins {
  user_id: string;
  balance: number;
  updated_at: string;
}

/**
 * Quest completion record interface
 * Tracks when students complete quests
 */
export interface QuestCompletion {
  id: string;
  user_id: string;
  quest_id: string;
  completed_at: string;
  coins_earned: number;
  response_data?: Record<string, any>; // For quest answers/responses
}

/**
 * Analytics log entry interface
 * Tracks user interactions for insights
 */
export interface AnalyticsLog {
  id: string;
  user_id: string;
  action: string;
  quest_id?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Authentication state interface
 * Defines the shape of our auth context
 */
export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Quest completion request interface
 * Data structure for completing quests
 */
export interface CompleteQuestRequest {
  quest_id: string;
  user_id: string;
  response_data?: Record<string, any>;
}

/**
 * Quest completion response interface
 * Server response after quest completion
 */
export interface CompleteQuestResponse {
  success: boolean;
  coins_earned: number;
  new_balance: number;
  message: string;
}

/**
 * Supabase RPC function types
 * Type definitions for custom database functions
 */
export interface SupabaseRPC {
  complete_quest: {
    args: CompleteQuestRequest;
    returns: CompleteQuestResponse;
  };
  get_user_stats: {
    args: { user_id: string };
    returns: {
      total_coins: number;
      quests_completed: number;
      current_streak: number;
    };
  };
}

/**
 * API response wrapper interface
 * Standardizes all API responses
 */
export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Map marker interface
 * Represents interactive elements on the map
 */
export interface MapMarker {
  id: string;
  type: 'quest' | 'safe_space' | 'community_hub';
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  description?: string;
  quest?: Quest;
  is_completed?: boolean;
}

/**
 * Sprite entity interface for character management
 */
export interface Sprite {
  id: string;
  name: string;
  character: string;
  sprite_url: string;
  attribute_id: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Safe space entity interface
 */
export interface SafeSpace {
  id: string;
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  color?: string;
  capacity?: number;
  amenities?: string[];
  created_at: string;
  updated_at?: string;
}

/**
 * Notification entity interface
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  target_role?: AllUserRoles;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}

/**
 * System metrics interface
 */
export interface SystemMetrics {
  uptime: number;
  active_users: number;
  map_load_success_rate: number;
  total_quests: number;
  completed_quests: number;
  active_safe_spaces: number;
}

/**
 * User approval interface
 */
export interface UserApprovalRequest {
  id: string;
  user_id: string;
  email: string;
  requested_role: AllUserRoles;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
}