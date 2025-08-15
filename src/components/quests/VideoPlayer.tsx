/**
 * Video Upload Player Component
 * 
 * Interface for students to upload video responses to quests
 * with validation, progress tracking, and preview capabilities.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Video, 
  Play, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Eye,
  Trash2,
  FileVideo,
  Send
} from 'lucide-react';
import { uploadQuestVideo, getVideoSignedUrl } from '../../lib/storage';
import { QuestService } from '../../services/quests';
import { useAuth } from '../../contexts/AuthContext';
import type { Quest, QuestSubmission } from '../../types/quest';

/**
 * Props for VideoPlayer component
 */
interface VideoPlayerProps {
  /** Quest data with video configuration */
  quest: Quest;
  /** Existing submission if user has already answered */
  existingSubmission?: QuestSubmission | null;
  /** Callback when quest is completed */
  onComplete: (submission: QuestSubmission) => void;
  /** Whether player is in review mode (read-only) */
  reviewMode?: boolean;
}

/**
 * Video Player Component
 * 
 * Features:
 * - Drag and drop video upload with validation
 * - Progress tracking during upload
 * - Video preview after upload
 * - File size and format validation
 * - Submission status tracking
 * - Review mode for completed uploads
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  quest,
  existingSubmission,
  onComplete,
  reviewMode = false
}) => {
  const { user } = useAuth();
  
  // Extract video configuration
  const videoConfig = quest.config.video;
  const maxSizeMB = videoConfig?.maxSizeMB || 50;
  const instructions = videoConfig?.instructions;

  // Component state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [startTime] = useState(new Date());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate video file
   */
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
    }

    // Check file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Please upload MP4, WebM, MOV, or AVI files only' };
    }

    return { valid: true };
  }, [maxSizeMB]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateFile(file);
    
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL for video
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [validateFile]);

  /**
   * Handle drag and drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  /**
   * Upload video and submit quest
   */
  const handleSubmit = useCallback(async () => {
    if (!selectedFile || !user || submitting || uploading) return;

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload video file
      const uploadResult = await uploadQuestVideo(user.id, quest.id, selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      setUploading(false);
      setSubmitting(true);

      // Submit quest with video URL
      const submission = await QuestService.submissions.submitVideo(quest.id, uploadResult.path!);
      
      onComplete(submission);
    } catch (error: any) {
      console.error('Failed to upload video:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setSubmitting(false);
      setUploadProgress(0);
    }
  }, [selectedFile, user, submitting, uploading, quest.id, onComplete]);

  /**
   * Remove selected file
   */
  const removeFile = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  /**
   * Calculate time spent
   */
  const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* Quest Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{quest.title}</h2>
        {quest.description && (
          <p className="text-gray-200">{quest.description}</p>
        )}
        
        {/* Quest Info */}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1 text-gray-300">
            <Video className="w-4 h-4" />
            <span>Video Upload</span>
          </div>
          
          <div className="text-gray-400">•</div>
          
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">{quest.reward_coins} coins</span>
          </div>
          
          <div className="text-gray-400">•</div>
          
          <div className="text-gray-300">
            Max {maxSizeMB}MB
          </div>
        </div>
      </div>

      {/* Instructions */}
      {instructions && (
        <div className="bg-glass-light border-glass-light rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileVideo className="w-5 h-5 text-electric-blue-400" />
            <h3 className="font-medium text-white">Video Instructions</h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed">{instructions}</p>
        </div>
      )}

      {/* Existing Submission Display */}
      {existingSubmission && (
        <motion.div
          className="bg-glass-light border-glass-light rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-electric-blue-400" />
            <h3 className="font-medium text-white">Your Submission</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              existingSubmission.status === 'accepted' ? 'bg-cyber-green-500/20 text-cyber-green-300' :
              existingSubmission.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
              'bg-yellow-500/20 text-yellow-300'
            }`}>
              {existingSubmission.status}
            </span>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Submitted:</span>
              <span className="text-white">{new Date(existingSubmission.created_at).toLocaleString()}</span>
            </div>
            
            {existingSubmission.reviewed_at && (
              <div className="flex justify-between">
                <span className="text-gray-300">Reviewed:</span>
                <span className="text-white">{new Date(existingSubmission.reviewed_at).toLocaleString()}</span>
              </div>
            )}
            
            {existingSubmission.score !== null && (
              <div className="flex justify-between">
                <span className="text-gray-300">Score:</span>
                <span className="text-white">{existingSubmission.score}%</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Upload Area - only show if no existing submission */}
      {!existingSubmission && !reviewMode && (
        <div className="space-y-6">
          
          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              dragOver
                ? 'border-electric-blue-400 bg-electric-blue-500/10'
                : uploading
                ? 'border-gray-500 bg-gray-500/10'
                : 'border-glass hover:border-gray-400 bg-glass'
            }`}
          >
            <AnimatePresence mode="wait">
              {uploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-16 h-16 bg-glass-dark rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue-400"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Uploading Video...</h3>
                  <div className="w-64 h-2 bg-gray-600 rounded-full mx-auto mb-2">
                    <div 
                      className="h-2 bg-electric-blue-400 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-300">{uploadProgress}% complete</p>
                </motion.div>
              ) : selectedFile ? (
                <motion.div
                  key="file-selected"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="space-y-4">
                    {/* Video Preview */}
                    {previewUrl && (
                      <video
                        src={previewUrl}
                        controls
                        className="w-full max-w-md mx-auto rounded-lg"
                        style={{ maxHeight: '200px' }}
                      />
                    )}
                    
                    {/* File Info */}
                    <div className="bg-glass-light border-glass-light rounded-lg p-4 max-w-md mx-auto">
                      <h4 className="font-medium text-white mb-2">{selectedFile.name}</h4>
                      <div className="flex justify-between text-sm text-gray-300">
                        <span>Size: {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB</span>
                        <span>Type: {selectedFile.type}</span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                      <motion.button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn-esports disabled:opacity-50"
                        whileHover={!submitting ? { scale: 1.05 } : {}}
                        whileTap={!submitting ? { scale: 0.95 } : {}}
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Submit Video
                          </>
                        )}
                      </motion.button>
                      
                      <button
                        onClick={removeFile}
                        disabled={uploading || submitting}
                        className="bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-xl px-6 py-3 font-medium transition-all duration-200 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="upload-area"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-20 h-20 bg-glass-dark rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-10 h-10 text-electric-blue-400" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Upload Your Video Response
                  </h3>
                  
                  <p className="text-gray-200 mb-6">
                    Drop your video file here or click to browse
                  </p>
                  
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-esports mx-auto"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Choose Video File
                  </motion.button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/avi"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  
                  <div className="mt-4 text-xs text-gray-400 space-y-1">
                    <div>Accepted formats: MP4, WebM, MOV, AVI</div>
                    <div>Maximum size: {maxSizeMB}MB</div>
                    {videoConfig?.maxDurationSeconds && (
                      <div>Maximum duration: {Math.floor(videoConfig.maxDurationSeconds / 60)} minutes</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Time Tracking */}
          {!existingSubmission && (
            <div className="flex items-center justify-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Time: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
              </div>
              
              <div className="text-gray-400">•</div>
              
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">{quest.reward_coins} coins reward</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submission Status */}
      {existingSubmission && (
        <motion.div
          className="bg-glass-light border-glass-light rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-electric-blue-400" />
            <h3 className="font-medium text-white">Video Submission</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                existingSubmission.status === 'accepted' ? 'bg-cyber-green-500/20 text-cyber-green-300' :
                existingSubmission.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                'bg-yellow-500/20 text-yellow-300'
              }`}>
                {existingSubmission.status}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Submitted:</span>
              <span className="text-white">
                {new Date(existingSubmission.created_at).toLocaleDateString()}
              </span>
            </div>
            
            {existingSubmission.reviewed_at && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Reviewed:</span>
                  <span className="text-white">
                    {new Date(existingSubmission.reviewed_at).toLocaleDateString()}
                  </span>
                </div>
                
                {existingSubmission.score !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Score:</span>
                    <span className="text-white">{existingSubmission.score}%</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Video Player for Existing Submission */}
          {existingSubmission.video_url && (
            <div className="mt-4">
              <VideoSubmissionPlayer videoUrl={existingSubmission.video_url} />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

/**
 * Video Submission Player Component
 * Displays submitted videos with signed URL access
 */
const VideoSubmissionPlayer: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const url = await getVideoSignedUrl(videoUrl);
        setSignedUrl(url);
      } catch (err) {
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [videoUrl]);

  if (loading) {
    return (
      <div className="bg-glass-dark rounded-lg p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-electric-blue-400 mx-auto mb-2"></div>
        <p className="text-gray-300 text-sm">Loading video...</p>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-center">
        <p className="text-red-300 text-sm">{error || 'Video unavailable'}</p>
      </div>
    );
  }

  return (
    <video
      src={signedUrl}
      controls
      className="w-full rounded-lg"
      style={{ maxHeight: '300px' }}
    >
      Your browser does not support video playback.
    </video>
  );
};

export default VideoPlayer;