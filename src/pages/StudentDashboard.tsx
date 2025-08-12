// src/pages/StudentDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useQuests } from '../hooks/useQuests';
import MapView from '../components/MapView';
import GlassContainer from '../components/GlassContainer';
import EvidenceUploadDemo from '../components/EvidenceUploadDemo';
import RandomChallengeButton from '../components/RandomChallengeButton';
import WatchAndReflectTask from '../components/WatchAndReflectTask';
import EventDiscovery from '../components/EventDiscovery';
import {
  MapPin,
  Coins,
  Trophy,
  Star,
  Target,
  TrendingUp,
  Award,
  Home,
  ArrowLeft,
  Settings,
  Play,
  Brain,
  Calendar,
  Sparkles,
  X,
} from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    availableQuests,
    completedQuestIds,
    userBalance,
    loading,
    error,
    completeQuest,
  } = useQuests();

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎓 StudentDashboard role check:', user?.role);
    }
    if (user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    } else if (user?.role === 'master_admin') {
      navigate('/master-admin/dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  const handleQuestComplete = async (questId: string) => {
    const result = await completeQuest(questId);
    if (result) {
      console.log('Quest completed successfully:', result);
    }
  };

  const handleGoHome = () => navigate('/', { replace: true });
  const handleSettings = () => console.log('Navigate to settings');

  const total = completedQuestIds.length + availableQuests.length;
  const progressPct = total ? Math.floor((completedQuestIds.length / total) * 100) : 0;

  const [showVideoTask, setShowVideoTask] = React.useState(false);
  const [showEventDiscovery, setShowEventDiscovery] = React.useState(false);
  const [sessionPoints, setSessionPoints] = React.useState(0);

  const handleVideoComplete = (reflection: string, videoId: string) => {
    console.log('Video reflection completed:', { reflection, videoId });
    setSessionPoints(prev => prev + 25);
    setShowVideoTask(false);
  };

  const handleChallengePoints = (points: number) => {
    setSessionPoints(prev => prev + points);
  };

  return (
    <GlassContainer variant="page">
      <div className="container mx-auto max-w-7xl">
        {/* Navigation Header */}
        <motion.div
          className="flex items-center justify-between p-4 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleGoHome}
              className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200 text-sm font-medium min-h-touch touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Return to home page"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </motion.button>

            <motion.button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200 text-sm font-medium min-h-touch touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleSettings}
              className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200 text-sm font-medium min-h-touch touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Student Header */}
        <motion.div
          className="flex items-center justify-between p-6 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {user?.email?.split('@')[0] || 'Student'}!
            </h1>
            <p className="text-gray-300">
              Continue your CHESS Quest journey
              {user?.role && user.role !== 'student' && (
                <span className="ml-2 px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-300 text-xs">
                  Role: {user.role}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <motion.div
              className="bg-glass border-glass rounded-full px-4 py-2 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">
                {loading ? '...' : userBalance} Coins
              </span>
            </motion.div>

            {sessionPoints > 0 && (
              <motion.div
                className="bg-cyber-green-500/20 border border-cyber-green-500/30 rounded-full px-4 py-2 flex items-center gap-2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Sparkles className="w-5 h-5 text-cyber-green-400" />
                <span className="text-cyber-green-400 font-semibold">
                  +{sessionPoints} Session
                </span>
              </motion.div>
            )}

            <motion.button
              onClick={signOut}
              className="bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200 text-sm font-medium min-h-touch touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Sign out of account"
            >
              Sign Out
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6 px-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassContainer variant="card" className="text-center">
            <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{completedQuestIds.length}</h3>
            <p className="text-gray-300 text-sm">Quests Completed</p>
          </GlassContainer>

          <GlassContainer variant="card" className="text-center">
            <Target className="w-10 h-10 text-electric-blue-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{availableQuests.length}</h3>
            <p className="text-gray-300 text-sm">Available Quests</p>
          </GlassContainer>

          <GlassContainer variant="card" className="text-center">
            <Star className="w-10 h-10 text-neon-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{progressPct}%</h3>
            <p className="text-gray-300 text-sm">Progress</p>
          </GlassContainer>

          <GlassContainer variant="card" className="text-center">
            <TrendingUp className="w-10 h-10 text-cyber-green-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">Rising</h3>
            <p className="text-gray-300 text-sm">Rank Status</p>
          </GlassContainer>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            className="mx-6 mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-red-300 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Quest Map */}
        <motion.div
          className="px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Interactive Quest Map</h2>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="w-4 h-4" />
              <span>Explore quests in your area</span>
            </div>
          </div>

          <GlassContainer variant="card" className="p-0 overflow-hidden">
            <div className="relative h-[600px] w-full">
              <MapView onQuestComplete={handleQuestComplete} />
            </div>
          </GlassContainer>
        </motion.div>

        {/* Learning Activities */}
        <motion.div
          className="px-6 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Learning Activities</h2>
            <div className="flex items-center gap-3">
              <RandomChallengeButton
                studentId={user?.id || ''}
                orgId={user?.metadata?.org_id}
                onPointsUpdate={handleChallengePoints}
              />
            </div>
          </div>

          {/* Activity Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              className="bg-glass border-glass rounded-xl p-4 hover:bg-glass-dark transition-all duration-300 cursor-pointer"
              onClick={() => setShowVideoTask(true)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-neon-purple-500/20 border border-neon-purple-500/30 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-neon-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Watch & Reflect</h3>
                  <p className="text-gray-300 text-sm">Educational videos</p>
                </div>
              </div>
              <p className="text-gray-200 text-xs">Watch curated content and share your thoughts</p>
            </motion.div>

            <motion.div
              className="bg-glass border-glass rounded-xl p-4 hover:bg-glass-dark transition-all duration-300 cursor-pointer"
              onClick={() => setShowEventDiscovery(true)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-electric-blue-500/20 border border-electric-blue-500/30 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-electric-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Local Events</h3>
                  <p className="text-gray-300 text-sm">Community activities</p>
                </div>
              </div>
              <p className="text-gray-200 text-xs">Discover events and activities near you</p>
            </motion.div>

            <motion.div
              className="bg-glass border-glass rounded-xl p-4 hover:bg-glass-dark transition-all duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-cyber-green-500/20 border border-cyber-green-500/30 rounded-full flex items-center justify-center">
                  <Brain className="w-6 h-6 text-cyber-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Upload Evidence</h3>
                  <p className="text-gray-300 text-sm">Document progress</p>
                </div>
              </div>
              <p className="text-gray-200 text-xs">Share photos and files of your learning</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Quests */}
            <GlassContainer variant="card">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-electric-blue-400" />
                Available Quests
              </h3>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-glass-light rounded-lg p-3">
                      <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : availableQuests.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {availableQuests.slice(0, 5).map((quest) => (
                    <div key={quest.id} className="bg-glass-light border-glass-light rounded-lg p-3">
                      <h4 className="text-white font-medium">{quest.title}</h4>
                      <p className="text-gray-300 text-sm mt-1">{quest.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <Coins className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-400">{quest.coin_reward} coins</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-300 text-center py-8">No available quests at this time</p>
              )}
            </GlassContainer>

            {/* Recent Achievements */}
            <GlassContainer variant="card">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-400" />
                Achievements & Evidence
              </h3>

              <div className="space-y-4">
                {completedQuestIds.length > 0 ? (
                  completedQuestIds.slice(0, 5).map((questId) => (
                    <div key={questId} className="bg-glass-light border-glass-light rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyber-green-500/20 border border-cyber-green-500/30 rounded-full flex items-center justify-center">
                          <Star className="w-4 h-4 text-cyber-green-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-sm">Quest Completed</h4>
                          <p className="text-gray-300 text-xs">Achievement unlocked</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-300">Complete your first quest to earn achievements!</p>
                )}

                {/* Evidence Upload Demo */}
                <div className="mt-4 pt-4 border-t border-glass">
                  <EvidenceUploadDemo userId={user?.id} />
                </div>
              </div>
            </GlassContainer>
          </div>
        </motion.div>

        {/* Modal Overlays */}
        <AnimatePresence>
          {showVideoTask && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVideoTask(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowVideoTask(false)}
                  className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg min-w-touch min-h-touch touch-manipulation"
                >
                  <X className="w-4 h-4" />
                </button>
                <WatchAndReflectTask
                  personaKey="hootie"
                  orgId={user?.metadata?.org_id}
                  onComplete={handleVideoComplete}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEventDiscovery && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEventDiscovery(false)}
            >
              <div 
                className="bg-glass backdrop-blur-xl border-glass rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-glass">
                  <h2 className="text-2xl font-bold text-white">Local Events Discovery</h2>
                  <button
                    onClick={() => setShowEventDiscovery(false)}
                    className="p-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-lg transition-colors min-w-touch min-h-touch touch-manipulation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  <EventDiscovery
                    personaKey="hootie"
                    userLocation={{ lat: 39.9526, lng: -75.1652 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassContainer>
  );
};

export default StudentDashboard;