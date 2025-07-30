import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useQuests } from '../hooks/useQuests';
import MapView from '../components/MapView';
import GlassContainer from '../components/GlassContainer';
import { 
  MapPin, 
  Coins, 
  Trophy, 
  Clock,
  Star,
  Target,
  TrendingUp,
  Award,
  Home,
  ArrowLeft,
  Settings
} from 'lucide-react';

/**
 * Student Dashboard Component
 * Protected route for authenticated students with quest management and progress tracking
 */
const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { 
    availableQuests, 
    completedQuestIds, 
    userBalance, 
    loading, 
    error,
    completeQuest 
  } = useQuests();

  // Additional role verification for debugging
  React.useEffect(() => {
    console.log('🎓 StudentDashboard mounted with user:', {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      isAdmin: user?.role === 'admin',
      isStudent: user?.role === 'student'
    });
    
    // If admin user somehow got here, redirect them
    if (user?.role === 'admin') {
      console.warn('⚠️  Admin user detected in StudentDashboard, redirecting...');
      navigate('/admin/dashboard', { replace: true });
      return;
    } else if (user?.role === 'master_admin') {
      console.warn('⚠️  Master admin user detected in StudentDashboard, redirecting...');
      navigate('/master-admin/dashboard', { replace: true });
      return;
    }
  }, [user]);

  /**
   * Handle quest completion
   */
  const handleQuestComplete = async (questId: string) => {
    const result = await completeQuest(questId);
    if (result) {
      console.log('Quest completed successfully:', result);
    }
  };

  /**
   * Navigate to home page
   */
  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  /**
   * Navigate to profile/settings
   */
  const handleSettings = () => {
    // TODO: Implement settings page
    console.log('Navigate to settings');
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
          {/* Left Navigation */}
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

          {/* Right Navigation */}
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
            {/* Coin Balance */}
            <motion.div 
              className="bg-glass border-glass rounded-full px-4 py-2 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">
                {loading ? '...' : userBalance} Coins
              </span>
            </motion.div>

            {/* Sign Out Button */}
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
            <h3 className="text-2xl font-bold text-white">
              {Math.floor((completedQuestIds.length / (completedQuestIds.length + availableQuests.length)) * 100) || 0}%
            </h3>
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

        {/* Recent Activity */}
        <motion.div 
          className="px-6 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
          
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

            {/* Achievements */}
            <GlassContainer variant="card">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-400" />
                Recent Achievements
              </h3>
              
              <div className="space-y-3">
                {completedQuestIds.length > 0 ? (
                  completedQuestIds.slice(0, 5).map((questId, index) => (
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
                  <p className="text-gray-300 text-center py-8">
                    Complete your first quest to earn achievements!
                  </p>
                )}
              </div>
            </GlassContainer>
          </div>
        </motion.div>
      </div>
    </GlassContainer>
  );
};

export default StudentDashboard;