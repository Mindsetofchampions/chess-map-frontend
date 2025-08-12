import supabase from './supabaseClient';
import { QuestEvidence } from '../types';

/**
 * Quest evidence storage configuration
 */
const QUEST_EVIDENCE_BUCKET = 'quest-evidence';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'text/plain',
  'text/markdown'
];

/**
 * File validation result interface
 */
interface FileValidation {
  valid: boolean;
  error?: string;
}

/**
 * Upload evidence result interface
 */
interface UploadResult {
  success: boolean;
  evidence?: QuestEvidence;
  error?: string;
}

/**
 * Upload parameters interface
 */
interface UploadParams {
  file: File;
  userId: string;
  questId?: string;
}

/**
 * Validate uploaded file
 */
export function validateFile(file: File): FileValidation {
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
    };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type ${file.type} is not allowed. Supported types: images, videos, PDFs, and text files.` 
    };
  }

  // Additional filename validation
  if (file.name.length > 100) {
    return {
      valid: false,
      error: 'Filename is too long (maximum 100 characters)'
    };
  }

  return { valid: true };
}

/**
 * Generate safe file path for storage
 */
export function generateFilePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return `user/${userId}/${timestamp}_${sanitizedFileName}`;
}

/**
 * Upload quest evidence with comprehensive error handling
 */
export async function uploadQuestEvidence(params: UploadParams): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(params.file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate secure file path
    const filePath = generateFilePath(params.userId, params.file.name);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(QUEST_EVIDENCE_BUCKET)
      .upload(filePath, params.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: params.file.type
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { 
        success: false, 
        error: uploadError.message || 'Failed to upload file to storage' 
      };
    }

    // Create database record
    const evidenceRecord = {
      user_id: params.userId,
      quest_id: params.questId || null,
      url: filePath // Store the storage path
    };

    const { data: dbData, error: dbError } = await supabase
      .from('quest_evidence')
      .insert(evidenceRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Clean up uploaded file if database insert fails
      try {
        await supabase.storage
          .from(QUEST_EVIDENCE_BUCKET)
          .remove([filePath]);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
      
      return { 
        success: false, 
        error: dbError.message || 'Failed to save evidence record' 
      };
    }

    return { success: true, evidence: dbData as QuestEvidence };
  } catch (error: any) {
    console.error('Unexpected upload error:', error);
    return { 
      success: false, 
      error: error.message || 'Unexpected error during upload' 
    };
  }
}

/**
 * Get signed URL for viewing evidence files
 */
export async function getEvidenceSignedUrl(
  path: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(QUEST_EVIDENCE_BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getEvidenceSignedUrl:', error);
    return null;
  }
}

/**
 * Get all evidence for a user
 */
export async function getUserEvidence(userId: string): Promise<QuestEvidence[]> {
  try {
    const { data, error } = await supabase
      .from('quest_evidence')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user evidence:', error);
      return [];
    }

    return data as QuestEvidence[];
  } catch (error) {
    console.error('Error in getUserEvidence:', error);
    return [];
  }
}

/**
 * Delete evidence file and database record
 */
export async function deleteEvidence(evidenceId: string, userId: string): Promise<boolean> {
  try {
    // First get the evidence record to get the file path
    const { data: evidence, error: fetchError } = await supabase
      .from('quest_evidence')
      .select('url')
      .eq('id', evidenceId)
      .eq('user_id', userId) // Security: ensure user owns this evidence
      .single();

    if (fetchError || !evidence) {
      console.error('Error fetching evidence for deletion:', fetchError);
      return false;
    }

    // Delete from storage (non-blocking if it fails)
    try {
      await supabase.storage
        .from(QUEST_EVIDENCE_BUCKET)
        .remove([evidence.url]);
    } catch (storageError) {
      console.warn('Could not delete file from storage:', storageError);
      // Continue with database deletion even if storage cleanup fails
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from('quest_evidence')
      .delete()
      .eq('id', evidenceId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('Error deleting evidence record:', dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteEvidence:', error);
    return false;
  }
}

/**
 * Get evidence statistics for a user
 */
export async function getEvidenceStats(userId: string): Promise<{
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
}> {
  try {
    const evidence = await getUserEvidence(userId);
    
    const stats = evidence.reduce((acc, item) => {
      acc.totalFiles += 1;
      
      // Note: We don't have file_size in current schema, so we'll estimate
      acc.totalSize += 1024 * 1024; // Placeholder 1MB per file
      
      // Count file types (would need to add mime_type to schema)
      const extension = item.url.split('.').pop()?.toLowerCase() || 'unknown';
      acc.fileTypes[extension] = (acc.fileTypes[extension] || 0) + 1;
      
      return acc;
    }, {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {} as Record<string, number>
    });

    return stats;
  } catch (error) {
    console.error('Error getting evidence stats:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {}
    };
  }
}