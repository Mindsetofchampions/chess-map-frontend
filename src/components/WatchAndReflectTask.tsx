import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getRandomVideoResource, 
  getVideoEmbedUrl, 
  isVideoUrlSafe 
} from '../services/videoResourceService';
import { VideoResource, PersonaKey } from '../types';
import { 
  Play, 
  ExternalLink, 
  RefreshCw, 
  Send, 
  Clock, 
  User,
  Shield,
  CheckCircle
} from 'lucide-react';

/**
 * Props for WatchAndReflectTask component
 */
interface WatchAndReflectTaskProps {
  personaKey: PersonaKey;
  orgId?: string;
  onComplete?: (reflection: string, videoId: string) => void;
  className?: string;
}

/**
 * Watch and Reflect Task Component
 * 
 * Features:
 * - Safe video content from verified sources
 * - Reflection questions to deepen learning
 * - Progress tracking and completion rewards
 * - Responsive design with accessibility support
 */
const WatchAndReflectTask: React.FC<WatchAndReflectTaskProps> = ({
  personaKey,
  orgId,
  onComplete,
  className = ''
}) => {
  const [video, setVideo] = useState<VideoResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [reflection, setReflection] = useState('');
  const [showReflection, setShowReflection] = useState(false);
  const [completed, setCompleted] = useState(false);

  /**
   * Load random video for the persona
   */
  const loadRandomVideo = useCallback(async () => {
    setLoading(true);
    setShowReflection(false);
    setReflection('');
    setCompleted(false);

    try {
      const randomVideo = await getRandomVideoResource(personaKey, orgId);
      setVideo(randomVideo);
    } catch (error) {
      console.error('Error loading video:', error);
    } finally {
      setLoading(false);
    }
  }, [personaKey, orgId]);

  /**
   * Initialize with random video
   */
  useEffect(() => {
    loadRandomVideo();
  }, [loadRandomVideo]);

  /**
   * Handle marking video as watched
   */
  const handleWatchComplete = useCallback(() => {
    setShowReflection(true);
  }, []);

  /**
   * Handle reflection submission
   */
  const handleReflectionSubmit = useCallback(() => {
    if (reflection.trim() && video) {
      onComplete?.(reflection.trim(), video.id);
      setCompleted(true);
      
      // Clear form after completion
      setTimeout(() => {
        setReflection('');
        setShowReflection(false);
        setCompleted(false);
      }, 2000);
    }
  }, [reflection, video, onComplete]);

  /**
   * Get embed URL for the video
   */
  const embedUrl = video ? getVideoEmbedUrl(video.video_url) : null;
  const isEmbeddable = embedUrl && embedUrl !== video?.video_url;

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading video content...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <div className="bg-glass border-glass rounded-xl p-6">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Videos Available</h3>
          <p className="text-gray-300 mb-4">
            No video content found for this persona. Try again later or contact an administrator.
          </p>
          <motion.button
            onClick={loadRandomVideo}
            className="btn-esports flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <motion.div
        className="bg-glass border-glass rounded-2xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Video Header */}
        <div className="p-6 border-b border-glass">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{video.title}</h2>
              {video.description && (
                <p className="text-gray-200 text-sm leading-relaxed">{video.description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-300 flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{personaKey}</span>
              </div>
              
              <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-300 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative">
          <div className="aspect-video bg-dark-secondary">
            {isEmbeddable ? (
              <iframe
                src={embedUrl}
                title={video.title}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : isVideoUrlSafe(video.video_url) ? (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-electric-blue-900/50 to-neon-purple-900/50">
                <div className="text-center">
                  <div className="w-20 h-20 bg-glass border-glass rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExternalLink className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">External Video</h3>
                  <p className="text-gray-200 mb-4">This video opens in a new tab for your safety.</p>
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-esports inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Watch Video
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-red-900/20">
                <div className="text-center text-red-300">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
                  <p className="font-medium">Video URL not allowed for security reasons</p>
                </div>
              </div>
            )}
          </div>

          {/* Video Source Info */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-cyber-green-400 rounded-full"></div>
              <span>Source: {video.source}</span>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {!showReflection ? (
              <motion.div
                key="watch-complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <motion.button
                  onClick={handleWatchComplete}
                  className="btn-esports flex items-center gap-2 mx-auto text-lg px-8 py-4"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Mark video as watched and proceed to reflection"
                >
                  <CheckCircle className="w-5 h-5" />
                  I've Watched the Video - Time to Reflect!
                </motion.button>
                
                <p className="text-gray-300 text-sm mt-3">
                  Click when you've finished watching to unlock the reflection questions
                </p>
              </motion.div>
            ) : completed ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-cyber-green-500/20 border border-cyber-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-cyber-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Task Completed!</h3>
                <p className="text-gray-200">Great reflection! You've earned points for engaging with this content.</p>
              </motion.div>
            ) : (
              <motion.div
                key="reflection"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Reflection Time</h3>
                  <div className="w-12 h-1 bg-gradient-to-r from-electric-blue-400 to-neon-purple-400 rounded-full mx-auto"></div>
                </div>

                <div className="bg-glass-light border-glass-light rounded-xl p-4">
                  <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neon-purple-400" />
                    Reflection Question:
                  </h4>
                  <p className="text-gray-200 leading-relaxed">
                    {video.reflection_question || 
                     "What was the most interesting thing you learned from this video? How might you apply this knowledge in your own life or share it with others?"}
                  </p>
                </div>
                
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Share your thoughts and insights here..."
                  rows={4}
                  className="w-full p-4 bg-glass border-glass rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-electric-blue-400 focus:border-transparent transition-all duration-200"
                />
                
                <div className="flex gap-3">
                  <motion.button
                    onClick={handleReflectionSubmit}
                    disabled={!reflection.trim()}
                    className="flex-1 btn-esports disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                    whileHover={reflection.trim() ? { scale: 1.02 } : {}}
                    whileTap={reflection.trim() ? { scale: 0.98 } : {}}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Reflection
                  </motion.button>
                  
                  <motion.button
                    onClick={loadRandomVideo}
                    className="bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-200 min-h-touch touch-manipulation"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Video
                  </motion.button>
                </div>

                {/* Character Count */}
                <div className="text-right">
                  <span className={`text-xs ${
                    reflection.length < 50 ? 'text-gray-400' :
                    reflection.length < 100 ? 'text-yellow-400' :
                    'text-cyber-green-400'
                  }`}>
                    {reflection.length} characters
                    {reflection.length < 50 && ' (minimum 50 recommended)'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default WatchAndReflectTask;