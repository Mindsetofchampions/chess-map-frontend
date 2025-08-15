/**
 * Supabase Storage Helper for Quest Video Uploads
 * 
 * Handles secure file uploads to the quest-uploads bucket with
 * proper validation, path generation, and error handling.
 */

import { supabase } from './supabase';

/**
 * Video upload configuration
 */
const VIDEO_UPLOAD_CONFIG = {
  bucket: 'quest-uploads',
  maxSizeMB: 50,
  allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'],
  allowedExtensions: ['.mp4', '.webm', '.mov', '.avi']
};

/**
 * File validation result
 */
interface FileValidation {
  valid: boolean;
  error?: string;
}

/**
 * Upload result interface
 */
interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Validate video file before upload
 * Checks file size, type, and extension for security
 */
function validateVideoFile(file: File): FileValidation {
  // Check file size
  const maxBytes = VIDEO_UPLOAD_CONFIG.maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size must be less than ${VIDEO_UPLOAD_CONFIG.maxSizeMB}MB`
    };
  }

  // Check file type
  if (!VIDEO_UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported. Please use: ${VIDEO_UPLOAD_CONFIG.allowedExtensions.join(', ')}`
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!VIDEO_UPLOAD_CONFIG.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`
    };
  }

  // Check filename length
  if (file.name.length > 100) {
    return {
      valid: false,
      error: 'Filename is too long (maximum 100 characters)'
    };
  }

  return { valid: true };
}

/**
 * Generate secure storage path for video files
 * Format: userId/questId/timestamp-filename
 */
function generateVideoPath(userId: string, questId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return `${userId}/${questId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Upload quest video with comprehensive validation
 * Returns storage path on success for database storage
 */
export async function uploadQuestVideo(
  userId: string, 
  questId: string, 
  file: File
): Promise<UploadResult> {
  try {
    // Validate file before upload
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate secure storage path
    const storagePath = generateVideoPath(userId, questId, file.name);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(VIDEO_UPLOAD_CONFIG.bucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { 
        success: false, 
        error: uploadError.message || 'Failed to upload video' 
      };
    }

    return { success: true, path: storagePath };
  } catch (error: any) {
    console.error('Unexpected upload error:', error);
    return { 
      success: false, 
      error: error.message || 'Unexpected error during upload' 
    };
  }
}

/**
 * Get signed URL for video viewing
 * Provides secure, time-limited access to stored videos
 */
export async function getVideoSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(VIDEO_UPLOAD_CONFIG.bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getVideoSignedUrl:', error);
    return null;
  }
}

/**
 * Delete video file from storage
 * Used when submissions are rejected or need cleanup
 */
async function deleteQuestVideo(storagePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(VIDEO_UPLOAD_CONFIG.bucket)
      .remove([storagePath]);

    if (error) {
      console.error('Error deleting video:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteQuestVideo:', error);
    return false;
  }
}

/**
 * Get storage usage statistics for a user
 */
async function getUserStorageStats(userId: string): Promise<{
  totalFiles: number;
  totalSizeBytes: number;
  filesByQuest: Record<string, number>;
}> {
  try {
    const { data, error } = await supabase.storage
      .from(VIDEO_UPLOAD_CONFIG.bucket)
      .list(userId, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error fetching storage stats:', error);
      return { totalFiles: 0, totalSizeBytes: 0, filesByQuest: {} };
    }

    const stats = data.reduce((acc, file) => {
      acc.totalFiles += 1;
      acc.totalSizeBytes += file.metadata?.size || 0;
      
      // Extract quest ID from path structure
      const pathParts = file.name.split('/');
      if (pathParts.length >= 2) {
        const questId = pathParts[1];
        acc.filesByQuest[questId] = (acc.filesByQuest[questId] || 0) + 1;
      }
      
      return acc;
    }, {
      totalFiles: 0,
      totalSizeBytes: 0,
      filesByQuest: {} as Record<string, number>
    });

    return stats;
  } catch (error) {
    console.error('Error in getUserStorageStats:', error);
    return { totalFiles: 0, totalSizeBytes: 0, filesByQuest: {} };
  }
}

