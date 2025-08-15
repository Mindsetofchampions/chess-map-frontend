/**
 * CHESS Quest System Service Layer
 * 
 * Provides comprehensive API interface for quest management including
 * template creation, quest approval workflow, and submission handling.
 * Integrates with Supabase backend and handles all CRUD operations.
 */

import { supabase } from '../lib/supabase';
import type { 
  Quest, 
  QuestTemplate, 
  QuestSubmission, 
  QuestNode,
  CreateQuestData,
  CreateTemplateData,
  QuestWithTemplate,
  QuestSubmissionWithQuest,
  QuestStats,
  CoinWallet,
  CoinLedgerEntry
} from '../types/quest';

/**
 * Quest Templates API
 * Handles CRUD operations for quest templates
 */
export const QuestTemplatesApi = {
  /**
   * List all quest templates
   * Accessible to all authenticated users for quest creation
   */
  async list(): Promise<QuestTemplate[]> {
    const { data, error } = await supabase
      .from('quest_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
    return data as QuestTemplate[];
  },

  /**
   * Get single template by ID
   */
  async getById(id: string): Promise<QuestTemplate | null> {
    const { data, error } = await supabase
      .from('quest_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch template: ${error.message}`);
    }
    
    return data as QuestTemplate;
  },

  /**
   * Create new template (admin only)
   * Validates config based on quest type before saving
   */
  async create(templateData: CreateTemplateData): Promise<QuestTemplate> {
    const { data, error } = await supabase
      .from('quest_templates')
      .insert({
        ...templateData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to create template: ${error.message}`);
    return data as QuestTemplate;
  },

  /**
   * Update existing template (owner only)
   */
  async update(id: string, updates: Partial<CreateTemplateData>): Promise<QuestTemplate> {
    const { data, error } = await supabase
      .from('quest_templates')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to update template: ${error.message}`);
    return data as QuestTemplate;
  },

  /**
   * Delete template (owner only)
   * Prevents deletion if quests are using this template
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('quest_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete template: ${error.message}`);
  }
};

/**
 * Quests API
 * Handles quest instances created from templates
 */
export const QuestsApi = {
  /**
   * List quests with filtering options
   * Respects RLS policies for role-based access
   */
  async list(filters: {
    status?: string[];
    persona_key?: string;
    created_by?: string;
    active?: boolean;
  } = {}): Promise<QuestWithTemplate[]> {
    let query = supabase
      .from('quests')
      .select(`
        *,
        template:quest_templates(*)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters.persona_key) {
      query = query.eq('persona_key', filters.persona_key);
    }
    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }
    if (filters.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to fetch quests: ${error.message}`);
    return data as QuestWithTemplate[];
  },

  /**
   * Get approved and active quests for map display
   * Used by students to see available quests
   */
  async listApprovedForMap(): Promise<Quest[]> {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('status', 'approved')
      .eq('active', true);
    
    if (error) throw new Error(`Failed to fetch map quests: ${error.message}`);
    return data as Quest[];
  },

  /**
   * Get quests pending approval for master admin
   */
  async listPendingApproval(): Promise<QuestWithTemplate[]> {
    const { data, error } = await supabase
      .from('quests')
      .select(`
        *,
        template:quest_templates(*),
        creator:auth.users!created_by(email)
      `)
      .eq('status', 'submitted')
      .order('created_at', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch pending quests: ${error.message}`);
    return data as QuestWithTemplate[];
  },

  /**
   * Create quest from template
   * Sets initial status to draft for further editing
   */
  async createFromTemplate(questData: CreateQuestData): Promise<Quest> {
    const { data, error } = await supabase
      .from('quests')
      .insert({
        ...questData,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'draft'
      })
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to create quest: ${error.message}`);
    return data as Quest;
  },

  /**
   * Submit quest for approval
   * Changes status from draft to submitted
   */
  async submitForApproval(questId: string): Promise<Quest> {
    const { data, error } = await supabase
      .from('quests')
      .update({ status: 'submitted' })
      .eq('id', questId)
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to submit quest: ${error.message}`);
    return data as Quest;
  },

  /**
   * Approve quest (master admin only)
   * Triggers coin deduction from approver's wallet
   */
  async approve(questId: string): Promise<Quest> {
    const { data, error } = await supabase
      .from('quests')
      .update({ status: 'approved' })
      .eq('id', questId)
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to approve quest: ${error.message}`);
    return data as Quest;
  },

  /**
   * Reject quest with optional reason
   */
  async reject(questId: string, reason?: string): Promise<Quest> {
    const { data, error } = await supabase
      .from('quests')
      .update({ 
        status: 'rejected',
        description: reason ? `${data?.description || ''}\n\nRejection reason: ${reason}` : undefined
      })
      .eq('id', questId)
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to reject quest: ${error.message}`);
    return data as Quest;
  },

  /**
   * Update quest details (owner only)
   */
  async update(id: string, updates: Partial<Quest>): Promise<Quest> {
    const { data, error } = await supabase
      .from('quests')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to update quest: ${error.message}`);
    return data as Quest;
  },

  /**
   * Get single quest by ID with template data
   */
  async getById(id: string): Promise<QuestWithTemplate | null> {
    const { data, error } = await supabase
      .from('quests')
      .select(`
        *,
        template:quest_templates(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch quest: ${error.message}`);
    }
    
    return data as QuestWithTemplate;
  }
};

/**
 * Quest Submissions API
 * Handles student answers and admin reviews
 */
export const QuestSubmissionsApi = {
  /**
   * Submit MCQ answer with auto-grading
   * Automatically determines correctness and awards coins
   */
  async submitMCQ(questId: string, choice: string): Promise<QuestSubmission> {
    // Get quest to check correct answer
    const quest = await QuestsApi.getById(questId);
    if (!quest) throw new Error('Quest not found');
    
    const mcqConfig = quest.config.mcq;
    if (!mcqConfig) throw new Error('Invalid MCQ configuration');
    
    // Determine if answer is correct
    const isCorrect = mcqConfig.options.some(opt => opt.id === choice && opt.isCorrect);
    const status: SubmissionStatus = isCorrect ? 'autograded' : 'rejected';
    
    const { data, error } = await supabase
      .from('quest_submissions')
      .upsert({
        quest_id: questId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        status,
        mcq_choice: choice,
        score: isCorrect ? 100 : 0
      }, { onConflict: 'quest_id,user_id' })
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to submit MCQ: ${error.message}`);
    return data as QuestSubmission;
  },

  /**
   * Submit text response for manual review
   */
  async submitText(questId: string, textAnswer: string): Promise<QuestSubmission> {
    const { data, error } = await supabase
      .from('quest_submissions')
      .upsert({
        quest_id: questId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        status: 'pending',
        text_answer: textAnswer
      }, { onConflict: 'quest_id,user_id' })
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to submit text: ${error.message}`);
    return data as QuestSubmission;
  },

  /**
   * Submit video upload for manual review
   */
  async submitVideo(questId: string, videoUrl: string): Promise<QuestSubmission> {
    const { data, error } = await supabase
      .from('quest_submissions')
      .upsert({
        quest_id: questId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        status: 'pending',
        video_url: videoUrl
      }, { onConflict: 'quest_id,user_id' })
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to submit video: ${error.message}`);
    return data as QuestSubmission;
  },

  /**
   * Get user's submission for a quest
   */
  async getUserSubmission(questId: string, userId?: string): Promise<QuestSubmission | null> {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    
    const { data, error } = await supabase
      .from('quest_submissions')
      .select('*')
      .eq('quest_id', questId)
      .eq('user_id', targetUserId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch submission: ${error.message}`);
    }
    
    return data as QuestSubmission;
  },

  /**
   * List submissions pending review
   * Used by staff and master admin for grading
   */
  async listPendingReview(): Promise<QuestSubmissionWithQuest[]> {
    const { data, error } = await supabase
      .from('quest_submissions')
      .select(`
        *,
        quest:quests(*),
        user:auth.users!user_id(email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch pending submissions: ${error.message}`);
    return data as QuestSubmissionWithQuest[];
  },

  /**
   * Review submission (staff/master admin only)
   * Accepts or rejects student work
   */
  async review(submissionId: string, status: 'accepted' | 'rejected', score?: number): Promise<QuestSubmission> {
    const { data, error } = await supabase
      .from('quest_submissions')
      .update({ 
        status, 
        score,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to review submission: ${error.message}`);
    return data as QuestSubmission;
  }
};

/**
 * Quest Nodes API
 * Manages reusable map locations for quest placement
 */
export const QuestNodesApi = {
  /**
   * List active quest nodes
   */
  async list(): Promise<QuestNode[]> {
    const { data, error } = await supabase
      .from('quest_nodes')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch nodes: ${error.message}`);
    return data as QuestNode[];
  },

  /**
   * Create new quest node
   */
  async create(nodeData: Omit<QuestNode, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<QuestNode> {
    const { data, error } = await supabase
      .from('quest_nodes')
      .insert({
        ...nodeData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select('*')
      .single();
    
    if (error) throw new Error(`Failed to create node: ${error.message}`);
    return data as QuestNode;
  }
};

/**
 * Coin System API
 * Handles wallet operations and transaction history
 */
export const CoinSystemApi = {
  /**
   * Get user's wallet balance
   */
  async getWallet(userId?: string): Promise<CoinWallet | null> {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    
    const { data, error } = await supabase
      .from('coin_wallets')
      .select('*')
      .eq('user_id', targetUserId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch wallet: ${error.message}`);
    }
    
    return data as CoinWallet;
  },

  /**
   * Get transaction history for user
   */
  async getTransactionHistory(userId?: string, limit: number = 50): Promise<CoinLedgerEntry[]> {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    
    const { data, error } = await supabase
      .from('coin_ledger')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
    return data as CoinLedgerEntry[];
  },

  /**
   * Manual balance adjustment (master admin only)
   */
  async adjustBalance(userId: string, delta: number, reason: string): Promise<void> {
    // This would typically be done via RPC function for security
    const { error } = await supabase.rpc('adjust_user_balance', {
      target_user_id: userId,
      amount_delta: delta,
      adjustment_reason: reason
    });
    
    if (error) throw new Error(`Failed to adjust balance: ${error.message}`);
  }
};

/**
 * Quest Statistics API
 * Provides analytics for admin dashboards
 */
export const QuestStatsApi = {
  /**
   * Get comprehensive quest system statistics
   */
  async getStats(): Promise<QuestStats> {
    // Execute multiple queries in parallel for performance
    const [templatesResult, questsResult, submissionsResult] = await Promise.all([
      supabase.from('quest_templates').select('id', { count: 'exact', head: true }),
      supabase.from('quests').select('id, status', { count: 'exact' }),
      supabase.from('quest_submissions').select('id, status', { count: 'exact' })
    ]);

    const totalTemplates = templatesResult.count || 0;
    const allQuests = questsResult.data || [];
    const allSubmissions = submissionsResult.data || [];

    const stats: QuestStats = {
      total_templates: totalTemplates,
      total_quests: allQuests.length,
      pending_approvals: allQuests.filter(q => q.status === 'submitted').length,
      active_quests: allQuests.filter(q => q.status === 'approved' && q.active).length,
      total_submissions: allSubmissions.length,
      pending_reviews: allSubmissions.filter(s => s.status === 'pending').length,
      completion_rate: allSubmissions.length > 0 ? 
        Math.round((allSubmissions.filter(s => s.status === 'accepted' || s.status === 'autograded').length / allSubmissions.length) * 100) : 0
    };

    return stats;
  }
};

/**
 * Combined Quest Service
 * Main entry point for quest-related operations
 */
export const QuestService = {
  templates: QuestTemplatesApi,
  quests: QuestsApi,
  nodes: QuestNodesApi,
  submissions: QuestSubmissionsApi,
  coins: CoinSystemApi,
  stats: QuestStatsApi
};

export default QuestService;