/**
 * Production-ready Supabase client configuration and helper functions
 * 
 * This file provides a robust Supabase integration with comprehensive error handling,
 * environment variable fallbacks, and up-to-date authentication methods using Supabase v2 API.
 * 
 * Features:
 * - Dual environment variable support (VITE_ and NEXT_PUBLIC_ prefixes)
 * - Hardcoded fallbacks for immediate functionality
 * - Comprehensive error handling with clear user-facing messages
 * - Modern Supabase v2 authentication patterns
 * - Type-safe operations with proper TypeScript integration
 * - Production-ready configuration with detailed logging
 */

import { createClient, SupabaseClient, User, AuthError } from '@supabase/supabase-js';
import { AuthUser, UserRole, Quest, QuestCompletion, CompleteQuestRequest, CompleteQuestResponse, AnalyticsLog } from '../types/database';

/**
 * Supabase configuration with fallback values
 * 
 * We use hardcoded fallbacks to ensure the application works out-of-the-box
 * while still allowing environment variable overrides for different deployments.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL
  ?? 'https://cpfcnauiuceialwdbzms.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZmNuYXVpdWNlaWFsd2Riem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTc5NDAsImV4cCI6MjA2OTIzMzk0MH0.NnE8X9Din3b-ZQMSDvap_r9FJdhn2q7sgQAhc93-vwQ';

/**
 * Validate Supabase configuration and log the source
 * 
 * This function ensures that all required Supabase configuration is present
 * and logs where the values are coming from for debugging purposes.
 */
const validateSupabaseConfig = () => {
  // Log configuration source for debugging
  if (import.meta.env.VITE_SUPABASE_URL) {
    console.log('🔧 Using VITE_SUPABASE_URL from environment');
  } else if (import.meta.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log('🔧 Using NEXT_PUBLIC_SUPABASE_URL from environment');
  } else {
    console.log('🔧 Using hardcoded fallback SUPABASE_URL');
  }

  if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.log('🔧 Using VITE_SUPABASE_ANON_KEY from environment');
  } else if (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('🔧 Using NEXT_PUBLIC_SUPABASE_ANON_KEY from environment');
  } else {
    console.log('🔧 Using hardcoded fallback SUPABASE_ANON_KEY');
  }

  // Validate URL format
  try {
    new URL(SUPABASE_URL);
  } catch (error) {
    const errorMessage = `
❌ Invalid Supabase URL format: ${SUPABASE_URL}

Please ensure your Supabase URL follows this format:
  https://your-project-id.supabase.co

Check your configuration at: https://app.supabase.com/project/your-project/settings/api
    `.trim();
    
    console.error(errorMessage);
    throw new Error('Invalid Supabase URL format');
  }

  // Basic validation for anonymous key (should be a JWT starting with 'eyJ')
  if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
    console.warn(`
⚠️  Supabase key may be invalid: Expected JWT format starting with 'eyJ'

Current key: ${SUPABASE_ANON_KEY.substring(0, 20)}...

Please verify your anonymous key at: https://app.supabase.com/project/your-project/settings/api
    `.trim());
  }

  console.log(`✅ Supabase configuration validated successfully`);
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
};

/**
 * Initialize Supabase client with production-ready configuration
 * 
 * The client is configured with:
 * - Automatic token refresh for long-running sessions
 * - Persistent session storage for seamless user experience
 * - URL session detection for email confirmation and password reset flows
 * - Comprehensive error handling and logging
 */
let supabaseClient: SupabaseClient | null = null;

const initializeSupabase = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  try {
    // Validate configuration before initializing
    validateSupabaseConfig();
    
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Enable automatic token refresh to maintain user sessions
        autoRefreshToken: true,
        
        // Persist session in localStorage for seamless user experience
        persistSession: true,
        
        // Detect session from URL parameters (for email confirmation, password reset)
        detectSessionInUrl: true,
        
        // Set token refresh threshold (refresh when 60 seconds remain)
        refreshThreshold: 60,
      },
      
      // Enable real-time subscriptions
      realtime: {
        enabled: true,
      },
      
      // Global configuration
      global: {
        headers: {
          'X-Client-Info': 'chess-quest-frontend@1.0.0',
        },
      },
    });
    
    console.log('✅ Supabase client initialized successfully');
    return supabaseClient;
    
  } catch (error: any) {
    console.error('❌ Failed to initialize Supabase client:', error);
    throw new Error(`Supabase initialization failed: ${error.message}`);
  }
};

/**
 * Supabase client instance with lazy initialization
 * This ensures the client is only created when needed and with proper error handling
 */
export const supabase: SupabaseClient = initializeSupabase();

/**
 * Transform Supabase User to our custom AuthUser interface
 * 
 * This function provides type safety and extracts role information from user metadata.
 * It handles cases where user metadata might be missing or malformed.
 * 
 * @param user - Supabase User object or null
 * @returns Transformed AuthUser object or null
 */
export const transformUser = (user: User | null): AuthUser | null => {
  if (!user) {
    return null;
  }

  // Extract role from user metadata with fallback to 'student'
  const role = user.user_metadata?.role as UserRole || 'student';
  
  // Validate role is one of the allowed values
  const validRoles: UserRole[] = ['student', 'admin'];
  const validatedRole = validRoles.includes(role) ? role : 'student';
  
  if (role !== validatedRole) {
    console.warn(`⚠️  Invalid user role '${role}' found in metadata, defaulting to 'student'`);
  }

  return {
    id: user.id,
    email: user.email || '',
    role: validatedRole,
    created_at: user.created_at,
    user_metadata: {
      role: validatedRole,
      full_name: user.user_metadata?.full_name || null,
    },
  };
};

/**
 * Enhanced error handling for authentication operations
 * 
 * Provides user-friendly error messages for common authentication issues
 * while maintaining technical details for debugging. This function surfaces
 * the actual error messages from Supabase for direct display in the UI.
 * 
 * @param error - Supabase AuthError or generic Error
 * @returns User-friendly error message that can be displayed directly
 */
const getAuthErrorMessage = (error: AuthError | Error): string => {
  if ('message' in error) {
    const message = error.message.toLowerCase();
    
    // Map common Supabase errors to user-friendly messages
    // We keep these specific to provide actionable feedback to users
    if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (message.includes('email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.';
    }
    
    if (message.includes('user not found')) {
      return 'No account found with this email address. Please sign up first.';
    }
    
    if (message.includes('too many requests')) {
      return 'Too many login attempts. Please wait a few minutes before trying again.';
    }
    
    if (message.includes('signup disabled')) {
      return 'New user registration is currently disabled. Please contact an administrator.';
    }
    
    if (message.includes('weak password')) {
      return 'Password is too weak. Please choose a stronger password with at least 8 characters.';
    }
    
    if (message.includes('user already registered')) {
      return 'An account with this email address already exists. Please sign in instead.';
    }
  }
  
  // Return original error message if no specific mapping found
  // This ensures we don't lose important error information
  return error.message || 'An unexpected authentication error occurred.';
};

/**
 * Authentication helper functions using Supabase v2 API
 * 
 * These functions provide a clean interface for authentication operations
 * with comprehensive error handling and user role validation. All methods
 * return both data and error objects for proper UI integration.
 */
export const authHelpers = {
  /**
   * Sign up a new user with email and password using Supabase v2 API
   * 
   * Uses the modern signUp method and automatically assigns user roles
   * through user metadata. Returns both data and error for UI handling.
   * 
   * @param email - User's email address
   * @param password - User's password
   * @param role - User role (defaults to 'student')
   * @returns Promise with transformed user data or error message
   */
  signUp: async (email: string, password: string, role: UserRole = 'student') => {
    try {
      console.log(`🔐 Attempting sign up for: ${email} (role: ${role})`);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            role,
            full_name: '', // Can be updated later
          },
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user data returned from sign up');
      }

      console.log('✅ Sign up successful:', data.user.id);
      return { data: transformUser(data.user), error: null };
      
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      console.error('❌ Sign up failed:', errorMessage);
      return { data: null, error: errorMessage };
    }
  },

  /**
   * Sign in with email and password using modern Supabase v2 API
   * 
   * Uses signInWithPassword method (replaces deprecated signIn).
   * Includes role validation to ensure users access appropriate areas.
   * Returns both data and error objects for proper UI error handling.
   * 
   * @param email - User's email address
   * @param password - User's password
   * @param expectedRole - Optional role validation
   * @returns Promise with transformed user data or error message
   */
  signIn: async (email: string, password: string, expectedRole?: UserRole) => {
    try {
      console.log(`🔐 Attempting sign in for: ${email}${expectedRole ? ` (expected role: ${expectedRole})` : ''}`);
      
      // Use the modern signInWithPassword method (Supabase v2)
      // This replaces the deprecated signIn method
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user data returned from sign in');
      }

      const authUser = transformUser(data.user);
      
      if (!authUser) {
        throw new Error('Failed to transform user data');
      }

      // Validate role if specified
      // This ensures users only access areas appropriate for their role
      if (expectedRole && authUser.role !== expectedRole) {
        console.warn(`⚠️  Role validation failed: expected '${expectedRole}', got '${authUser.role}'`);
        
        // Sign out the user since they don't have the expected role
        await supabase.auth.signOut();
        
        throw new Error(`Access denied. This area is restricted to ${expectedRole}s only.`);
      }

      console.log(`✅ Sign in successful: ${authUser.id} (role: ${authUser.role})`);
      return { data: authUser, error: null };
      
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      console.error('❌ Sign in failed:', errorMessage);
      return { data: null, error: errorMessage };
    }
  },

  /**
   * Sign out current user
   * 
   * Properly clears session data and handles errors gracefully.
   * Returns error object for UI integration.
   * 
   * @returns Promise with error message if operation fails
   */
  signOut: async () => {
    try {
      console.log('🔐 Attempting sign out');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }
      
      console.log('✅ Sign out successful');
      return { error: null };
      
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      console.error('❌ Sign out failed:', errorMessage);
      return { error: errorMessage };
    }
  },

  /**
   * Get current session with error handling
   * 
   * Retrieves the current user session and transforms user data.
   * Returns both data and error for consistent API.
   * 
   * @returns Promise with transformed user data or error message
   */
  getSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Get session error:', error);
        throw error;
      }
      
      const authUser = transformUser(session?.user || null);
      
      if (authUser) {
        console.log(`✅ Session retrieved: ${authUser.id} (role: ${authUser.role})`);
      } else {
        console.log('ℹ️  No active session found');
      }
      
      return { data: authUser, error: null };
      
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      console.error('❌ Get session failed:', errorMessage);
      return { data: null, error: errorMessage };
    }
  },

  /**
   * Reset password for email
   * 
   * Sends a password reset email to the user with a secure redirect URL.
   * Returns error object for UI integration.
   * 
   * @param email - User's email address
   * @returns Promise with error message if operation fails
   */
  resetPassword: async (email: string) => {
    try {
      console.log(`🔐 Attempting password reset for: ${email}`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );
      
      if (error) {
        console.error('❌ Password reset error:', error);
        throw error;
      }
      
      console.log('✅ Password reset email sent');
      return { error: null };
      
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      console.error('❌ Password reset failed:', errorMessage);
      return { error: errorMessage };
    }
  },
};

/**
 * Google OAuth authentication helper
 * 
 * Initiates Google OAuth sign-in flow using Supabase Auth.
 * The OAuth callback will be handled by the existing AuthContext onAuthStateChange listener.
 * 
 * @param redirectTo - Optional redirect URL after successful authentication
 * @returns Promise with error if operation fails
 */
export const googleAuthHelpers = {
  /**
   * Sign in with Google OAuth
   * 
   * @param redirectTo - URL to redirect to after authentication (defaults to current origin)
   * @returns Promise with error message if operation fails
   */
  signInWithGoogle: async (redirectTo?: string) => {
    try {
      console.log('🔐 Initiating Google OAuth sign-in');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || window.location.origin,
        },
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        throw error;
      }

      console.log('✅ Google OAuth initiated successfully');
      return { error: null };
      
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      console.error('❌ Google sign-in failed:', errorMessage);
      return { error: errorMessage };
    }
  },
};

/**
 * Quest-related database operations with error handling
 * 
 * These functions provide a clean interface for quest management
 * with proper error handling and data transformation.
 */
export const questHelpers = {
  /**
   * Fetch all quests from the database
   * 
   * @returns Promise with quest array or error message
   */
  getQuests: async (): Promise<{ data: Quest[] | null; error: string | null }> => {
    try {
      console.log('📋 Fetching quests from database');
      
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Fetch quests error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`✅ Fetched ${data?.length || 0} quests`);
      return { data: data as Quest[], error: null };
      
    } catch (error: any) {
      console.error('❌ Quest fetch failed:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Get active quests (alias for getQuests since no active status column exists)
   * 
   * @returns Promise with quest array or error message
   */
  getActiveQuests: async (): Promise<{ data: Quest[] | null; error: string | null }> => {
    return questHelpers.getQuests();
  },

  /**
   * Complete a quest and award coins
   * 
   * Uses Supabase RPC function for atomic transaction handling.
   * 
   * @param request - Quest completion request data
   * @returns Promise with completion response or error message
   */
  completeQuest: async (request: CompleteQuestRequest): Promise<{ data: CompleteQuestResponse | null; error: string | null }> => {
    try {
      console.log(`🎯 Completing quest: ${request.quest_id} for user: ${request.user_id}`);
      
      const { data, error } = await supabase.rpc('complete_quest', request);

      if (error) {
        console.error('❌ Complete quest error:', error);
        throw new Error(`Quest completion failed: ${error.message}`);
      }

      console.log('✅ Quest completed successfully');
      return { data: data as CompleteQuestResponse, error: null };
      
    } catch (error: any) {
      console.error('❌ Quest completion failed:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Get user's quest completions
   * 
   * @param userId - User ID to fetch completions for
   * @returns Promise with completion array or error message
   */
  getUserCompletions: async (userId: string): Promise<{ data: QuestCompletion[] | null; error: string | null }> => {
    try {
      console.log(`📋 Fetching completions for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('completions')
        .select(`
          *,
          quest:quests(title, description, coins)
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('❌ Fetch completions error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`✅ Fetched ${data?.length || 0} completions`);
      return { data: data as QuestCompletion[], error: null };
      
    } catch (error: any) {
      console.error('❌ Completions fetch failed:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Get user's current coin balance
   * 
   * @param userId - User ID to fetch balance for
   * @returns Promise with balance number or error message
   */
  getUserBalance: async (userId: string): Promise<{ data: number | null; error: string | null }> => {
    try {
      console.log(`💰 Fetching balance for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('user_coin_balance')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Fetch balance error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const balance = data?.balance || 0;
      console.log(`✅ User balance: ${balance} coins`);
      return { data: balance, error: null };
      
    } catch (error: any) {
      console.error('❌ Balance fetch failed:', error);
      return { data: null, error: error.message };
    }
  },
};

/**
 * Analytics logging functions for user behavior tracking
 * 
 * These functions help track user interactions for insights and improvements.
 * All analytics operations are non-blocking and fail gracefully.
 */
export const analyticsHelpers = {
  /**
   * Log user action for analytics
   * 
   * @param userId - User ID performing the action
   * @param action - Action identifier
   * @param questId - Optional quest ID if action is quest-related
   * @param metadata - Optional additional data
   * @returns Promise with error message if operation fails
   */
  logAction: async (userId: string, action: string, questId?: string, metadata?: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('analytics_logs')
        .insert({
          user_id: userId,
          event_type: action,
          quest_id: questId,
          data: metadata,
        });

      if (error) {
        // Don't throw for analytics errors, just log them
        console.warn('⚠️  Analytics logging failed:', error.message);
        return { error: error.message };
      }

      return { error: null };
      
    } catch (error: any) {
      console.warn('⚠️  Analytics logging error:', error);
      return { error: error.message };
    }
  },

  /**
   * Log quest interaction
   * 
   * @param userId - User ID
   * @param questId - Quest ID
   * @param action - Type of interaction
   * @returns Promise with error message if operation fails
   */
  logQuestInteraction: async (userId: string, questId: string, action: 'viewed' | 'started' | 'completed' | 'abandoned') => {
    return analyticsHelpers.logAction(userId, `quest_${action}`, questId, {
      quest_id: questId,
      timestamp: Date.now(),
    });
  },

  /**
   * Log map interaction
   * 
   * @param userId - User ID
   * @param action - Type of map interaction
   * @param location - Optional location data
   * @returns Promise with error message if operation fails
   */
  logMapInteraction: async (userId: string, action: string, location?: { lat: number; lng: number }) => {
    return analyticsHelpers.logAction(userId, `map_${action}`, undefined, {
      location,
      timestamp: Date.now(),
    });
  },
};

/**
 * Real-time subscription helpers for live data updates
 * 
 * These functions set up real-time subscriptions to database changes
 * to keep the UI synchronized with the latest data.
 */
export const subscriptionHelpers = {
  /**
   * Subscribe to quest updates
   * 
   * @param callback - Function to call when quests are updated
   * @returns Subscription object that can be unsubscribed
   */
  subscribeToQuests: (callback: (quests: Quest[]) => void) => {
    console.log('📡 Setting up quest subscription');
    
    return supabase
      .channel('quests')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'quests' 
        }, 
        (payload) => {
          console.log('📡 Quest update received:', payload);
          // Refetch quests when changes occur
          questHelpers.getActiveQuests().then(({ data }) => {
            if (data) callback(data);
          });
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to user coin balance updates
   * 
   * @param userId - User ID to monitor
   * @param callback - Function to call when balance changes
   * @returns Subscription object that can be unsubscribed
   */
  subscribeToUserBalance: (userId: string, callback: (balance: number) => void) => {
    console.log(`📡 Setting up balance subscription for user: ${userId}`);
    
    return supabase
      .channel(`user_coins:${userId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_coin_balance',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📡 Balance update received:', payload);
          if (payload.new && 'balance' in payload.new) {
            callback(payload.new.balance as number);
          }
        }
      )
      .subscribe();
  },
};

// Export the client instance for direct access when needed
export default supabase;

// Log successful initialization
console.log('🚀 Supabase library loaded successfully');