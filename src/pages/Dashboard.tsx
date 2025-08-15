/**
 * Student Dashboard
 * 
 * Main landing page for authenticated students showing wallet balance,
 * transaction history, and quick access to quests.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Award, TrendingUp, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlassContainer from '../components/GlassContainer';
import WalletChip from '../components/wallet/WalletChip';
import LedgerTable from '../components/wallet/LedgerTable';

/**
 * Dashboard Stats Card Props
 */
interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

/**
 * Reusable stats card component
 */
const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, delay = 0 }) => (
  <motion.div
    className="bg-glass border-glass rounded-xl p-6 text-center"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02, y: -2 }}
  >
    <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center mx-auto mb-3`}>
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
    <p className="text-gray-300 text-sm">{title}</p>
  </motion.div>
);

/**
 * Student Dashboard Component
 * 
 * Features:
 * - Wallet balance display with auto-refresh
 * - Recent transaction history
 * - Quick navigation to quests
 * - Responsive design with mobile optimization
 * - Real-time data updates
 */
const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
      <div className="container mx-auto max-w-7xl p-6">
        
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
            <p className="text-gray-300">Continue your CHESS Quest learning journey</p>
          </div>
          
          <WalletChip showRefresh autoRefresh />
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Available Quests"
            value="--"
            icon={<MapPin className="w-6 h-6 text-white" />}
            color="bg-electric-blue-500/20"
            delay={0.1}
          />
          
          <StatsCard
            title="Completed Today"
            value="--"
            icon={<Award className="w-6 h-6 text-white" />}
            color="bg-cyber-green-500/20"
            delay={0.2}
          />
          
          <StatsCard
            title="Current Streak"
            value="--"
            icon={<TrendingUp className="w-6 h-6 text-white" />}
            color="bg-neon-purple-500/20"
            delay={0.3}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Actions */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassContainer variant="card">
              <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
              
              <div className="space-y-3">
                <Link
                  to="/quests"
                  className="w-full bg-glass-light border-glass-light hover:bg-glass-dark rounded-xl p-4 flex items-center gap-3 transition-all duration-200 group"
                >
                  <div className="p-2 bg-electric-blue-500/20 rounded-lg group-hover:bg-electric-blue-500/30 transition-colors">
                    <Play className="w-5 h-5 text-electric-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Explore Quests</h3>
                    <p className="text-gray-300 text-sm">Find new learning challenges</p>
                  </div>
                </Link>
                
                <Link
                  to="/map"
                  className="w-full bg-glass-light border-glass-light hover:bg-glass-dark rounded-xl p-4 flex items-center gap-3 transition-all duration-200 group"
                >
                  <div className="p-2 bg-cyber-green-500/20 rounded-lg group-hover:bg-cyber-green-500/30 transition-colors">
                    <MapPin className="w-5 h-5 text-cyber-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">View Map</h3>
                    <p className="text-gray-300 text-sm">Interactive quest locations</p>
                  </div>
                </Link>
              </div>
            </GlassContainer>
          </motion.div>

          {/* Transaction History */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <LedgerTable />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;