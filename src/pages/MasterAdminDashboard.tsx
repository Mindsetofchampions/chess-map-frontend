/**
 * Master Admin Dashboard - Comprehensive system management interface
 * 
 * This component provides the main dashboard for master administrators with:
 * - System health metrics and real-time monitoring
 * - Navigation to all management sub-pages
 * - Quick access to critical admin functions
 * - Real-time data updates and notifications
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity,
  Users,
  MapPin,
  Settings,
  BarChart3,
  Shield,
  Bell,
  Coins,
  Gamepad2,
  Map,
  UserCheck,
  Palette,
  Menu,
  X,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import GlassContainer from '../components/GlassContainer';
import { useAuth } from '../contexts/AuthContext';
import { masterAdminHelpers } from '../lib/supabase';
import { SystemMetrics } from '../types/database';

/**
 * Navigation menu item interface
 */
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  href: string;
}

/**
 * System metric card interface
 */
interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

/**
 * Master Admin Dashboard Component
 * 
 * Features:
 * - Real-time system metrics display
 * - Responsive sidebar navigation
 * - Quick action buttons for common tasks
 * - System health monitoring
 * - Mobile-optimized design with touch interactions
 * 
 * @returns {JSX.Element} Complete master admin dashboard
 */
const MasterAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Navigation menu items for all admin functions
   */
  const navItems: NavItem[] = [
    {
      id: 'sprites',
      label: 'Sprite Management',
      icon: Palette,
      description: 'Manage character sprites and animations',
      color: 'neon-purple',
      href: '/master-admin/sprites'
    },
    {
      id: 'safe-spaces',
      label: 'Safe Spaces',
      icon: Shield,
      description: 'Manage safe space locations and settings',
      color: 'cyber-green',
      href: '/master-admin/safe-spaces'
    },
    {
      id: 'quests',
      label: 'Quest Management',
      icon: Map,
      description: 'Review and approve quest submissions',
      color: 'electric-blue',
      href: '/master-admin/quests'
    },
    {
      id: 'challenges',
      label: 'Challenge Management',
      icon: Gamepad2,
      description: 'Create and manage learning challenges',
      color: 'neon-orange',
      href: '/master-admin/challenges'
    },
    {
      id: 'users',
      label: 'User Approval',
      icon: UserCheck,
      description: 'Approve new user registrations',
      color: 'bright-pink',
      href: '/master-admin/users'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Send system-wide notifications',
      color: 'electric-yellow',
      href: '/master-admin/notifications'
    },
    {
      id: 'coin-bank',
      label: 'Coin Bank',
      icon: Coins,
      description: 'Manage user coin balances',
      color: 'electric-blue',
      href: '/master-admin/coin-bank'
    }
  ];

  /**
   * Fetch system metrics on component mount
   */
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const { data, error: metricsError } = await masterAdminHelpers.getSystemMetrics();
        
        if (metricsError) {
          setError(metricsError);
        } else {
          setMetrics(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch system metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  /**
   * Toggle sidebar for mobile
   */
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  /**
   * Format uptime display
   */
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  /**
   * Generate metric cards from system data
   */
  const getMetricCards = (): MetricCard[] => {
    if (!metrics) return [];

    return [
      {
        title: 'System Uptime',
        value: formatUptime(metrics.uptime),
        change: '+99.9%',
        icon: Clock,
        color: 'cyber-green',
        description: 'System availability'
      },
      {
        title: 'Active Users',
        value: metrics.active_users.toLocaleString(),
        change: '+12%',
        icon: Users,
        color: 'electric-blue',
        description: 'Currently online'
      },
      {
        title: 'Map Load Success',
        value: `${metrics.map_load_success_rate}%`,
        change: '+2.1%',
        icon: TrendingUp,
        color: 'neon-purple',
        description: 'Map loading reliability'
      },
      {
        title: 'Quest Completion',
        value: `${Math.round((metrics.completed_quests / metrics.total_quests) * 100)}%`,
        change: '+8.5%',
        icon: CheckCircle,
        color: 'cyber-green',
        description: 'Overall completion rate'
      }
    ];
  };

  return (
    <GlassContainer variant="page" className="relative">
      <div className="flex h-screen max-w-7xl mx-auto">
        
        {/* Mobile Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside
          className={`
            fixed lg:relative lg:translate-x-0 
            top-0 left-0 z-50 
            h-full w-80
            bg-glass backdrop-blur-xl 
            border-r border-glass 
            shadow-2xl
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:flex lg:flex-col
          `}
          initial={{ x: -320 }}
          animate={{ x: sidebarOpen || window.innerWidth >= 1024 ? 0 : -320 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-glass">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-electric-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Master Admin</h1>
                <p className="text-xs text-gray-300">System Control</p>
              </div>
            </div>
            
            {/* Close button for mobile */}
            <button
              className="lg:hidden p-2 rounded-lg bg-glass border-glass hover:bg-glass-dark transition-colors min-w-touch min-h-touch touch-manipulation"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item, index) => (
              <motion.button
                key={item.id}
                className={`
                  w-full flex items-start space-x-4 px-4 py-4 rounded-xl 
                  bg-glass hover:bg-glass-dark border border-glass
                  text-left transition-all duration-200
                  min-h-touch touch-manipulation
                  hover:scale-[1.02] hover:shadow-lg
                `}
                onClick={() => {
                  // TODO: Navigate to specific page
                  console.log(`Navigate to ${item.href}`);
                  setSidebarOpen(false);
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                aria-label={`Navigate to ${item.label}`}
              >
                <div className={`p-2 rounded-lg bg-${item.color}-500/20 border border-${item.color}-500/30`}>
                  <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm">{item.label}</h3>
                  <p className="text-xs text-gray-300 mt-1">{item.description}</p>
                </div>
              </motion.button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-glass">
            <div className="bg-glass-light border-glass-light rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-electric-blue-400 to-neon-purple-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{user?.email}</p>
                  <p className="text-gray-300 text-xs">Master Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top Bar */}
          <GlassContainer variant="overlay" className="flex items-center justify-between p-4 mb-6 mx-6 mt-6">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2 rounded-lg bg-glass border-glass hover:bg-glass-dark transition-colors min-w-touch min-h-touch touch-manipulation"
                onClick={toggleSidebar}
                aria-label="Open sidebar menu"
              >
                <Menu className="w-5 h-5 text-gray-300" />
              </button>
              
              <div>
                <h2 className="text-2xl font-bold text-white">System Overview</h2>
                <p className="text-gray-300 text-sm">Monitor and manage CHESS Quest platform</p>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-glass-dark border-glass-dark rounded-full px-3 py-2">
                <div className="w-2 h-2 bg-cyber-green-400 rounded-full animate-pulse"></div>
                <span className="text-cyber-green-400 text-sm font-medium">System Online</span>
              </div>
            </div>
          </GlassContainer>

          {/* Main Content */}
          <main className="flex-1 overflow-auto px-6 pb-6">
            {/* Error State */}
            {error && (
              <motion.div
                className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="text-red-300 font-semibold">System Error</h3>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            {/* System Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 4 }).map((_, index) => (
                  <motion.div
                    key={index}
                    className="bg-glass border-glass rounded-xl p-6 animate-pulse"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-8 h-8 bg-gray-600 rounded-lg"></div>
                      <div className="w-16 h-4 bg-gray-600 rounded"></div>
                    </div>
                    <div className="w-20 h-8 bg-gray-600 rounded mb-2"></div>
                    <div className="w-full h-3 bg-gray-600 rounded"></div>
                  </motion.div>
                ))
              ) : (
                // Actual metrics
                getMetricCards().map((metric, index) => (
                  <motion.div
                    key={metric.title}
                    className="bg-glass border-glass rounded-xl p-6 hover:bg-glass-dark transition-all duration-300"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 rounded-lg bg-${metric.color}-500/20 border border-${metric.color}-500/30`}>
                        <metric.icon className={`w-6 h-6 text-${metric.color}-400`} />
                      </div>
                      {metric.change && (
                        <span className="text-cyber-green-400 text-sm font-medium">
                          {metric.change}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-white">{metric.value}</h3>
                      <p className="text-gray-300 text-sm font-medium">{metric.title}</p>
                      <p className="text-gray-400 text-xs">{metric.description}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Quick Actions Grid */}
            <GlassContainer variant="card" animate delay={0.3}>
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Quick Actions</h3>
                <p className="text-gray-300 text-sm">Common administrative tasks</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {navItems.slice(0, 6).map((item, index) => (
                  <motion.button
                    key={item.id}
                    className={`
                      flex items-center space-x-3 p-4 rounded-xl
                      bg-glass-light border-glass-light
                      hover:bg-glass-dark hover:border-glass
                      transition-all duration-200
                      min-h-touch touch-manipulation
                      text-left
                    `}
                    onClick={() => {
                      console.log(`Quick action: ${item.href}`);
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`p-2 rounded-lg bg-${item.color}-500/20 border border-${item.color}-500/30`}>
                      <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white text-sm">{item.label}</h4>
                      <p className="text-gray-300 text-xs truncate">{item.description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </GlassContainer>

            {/* Recent Activity Section */}
            <GlassContainer variant="card" animate delay={0.4} className="mt-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">System Activity</h3>
                <p className="text-gray-300 text-sm">Recent administrative actions and system events</p>
              </div>

              <div className="space-y-3">
                {[
                  { action: 'Quest approved', user: 'admin@chess.com', time: '2 minutes ago', status: 'success' },
                  { action: 'New user registered', user: 'student@test.com', time: '5 minutes ago', status: 'info' },
                  { action: 'Safe space created', user: 'admin@chess.com', time: '12 minutes ago', status: 'success' },
                  { action: 'System backup completed', user: 'system', time: '1 hour ago', status: 'success' }
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center justify-between p-3 bg-glass-light border-glass-light rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-cyber-green-400' :
                        activity.status === 'info' ? 'bg-electric-blue-400' :
                        'bg-yellow-400'
                      }`}></div>
                      <div>
                        <p className="text-white text-sm font-medium">{activity.action}</p>
                        <p className="text-gray-300 text-xs">by {activity.user}</p>
                      </div>
                    </div>
                    <span className="text-gray-400 text-xs">{activity.time}</span>
                  </motion.div>
                ))}
              </div>
            </GlassContainer>
          </main>
        </div>
      </div>
    </GlassContainer>
  );
};

export default MasterAdminDashboard;