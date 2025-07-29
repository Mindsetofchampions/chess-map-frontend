import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Home, 
  MapPin, 
  Settings, 
  BarChart3, 
  Users, 
  Shield,
  Compass,
  LogOut,
  Bell
} from 'lucide-react';
import GlassContainer from '../components/GlassContainer';

/**
 * Navigation menu item interface
 */
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  active?: boolean;
}

/**
 * Admin Dashboard component with glassmorphic sidebar and responsive design
 * 
 * Features:
 * - Glassmorphic sidebar with navigation links
 * - Mobile-responsive with collapsible sidebar
 * - Glass-styled topbar with CHESS logo and user menu
 * - Future-ready main content area for data grids/forms
 * - Smooth animations and transitions
 * 
 * @returns {JSX.Element} Complete admin dashboard layout
 */
const AdminDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');

  // Navigation menu items
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, active: true },
    { id: 'quests', label: 'Quests', icon: MapPin },
    { id: 'attributes', label: 'Attributes', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'safe-spaces', label: 'Safe Spaces', icon: Shield },
  ];

  // Handle navigation item click
  const handleNavClick = (itemId: string) => {
    setActiveItem(itemId);
    setSidebarOpen(false); // Close mobile sidebar
  };

  // Toggle sidebar for mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
            h-full w-64 
            bg-glass backdrop-blur-xl 
            border-r border-glass 
            shadow-2xl
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:flex lg:flex-col
          `}
          initial={{ x: -256 }}
          animate={{ x: sidebarOpen || window.innerWidth >= 1024 ? 0 : -256 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-glass">
            <div className="flex items-center space-x-3">
              <Compass className="w-8 h-8 text-electric-blue-400" />
              <h1 className="text-xl font-bold text-neon-blue">CHESS Admin</h1>
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
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item, index) => (
              <motion.button
                key={item.id}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-xl 
                  font-medium transition-all duration-200
                  min-h-touch touch-manipulation
                  ${activeItem === item.id
                    ? 'bg-electric-blue-500/20 text-electric-blue-400 border border-electric-blue-500/30'
                    : 'text-gray-300 hover:bg-glass hover:text-white'
                  }
                `}
                onClick={() => handleNavClick(item.id)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                aria-label={`Navigate to ${item.label}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </motion.button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-glass">
            <motion.button
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-glass hover:text-white transition-all duration-200 min-h-touch touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </motion.button>
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
              
              <h2 className="text-2xl font-bold text-white capitalize">
                {activeItem.replace('-', ' ')}
              </h2>
            </div>

            {/* Top bar actions */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <motion.button
                className="p-2 rounded-lg bg-glass border-glass hover:bg-glass-dark transition-colors min-w-touch min-h-touch touch-manipulation relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5 text-gray-300" />
                {/* Notification badge */}
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
              </motion.button>

              {/* User Menu */}
              <motion.div
                className="flex items-center space-x-3 px-4 py-2 rounded-lg bg-glass border-glass hover:bg-glass-dark transition-colors cursor-pointer min-h-touch"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-electric-blue-400 to-neon-purple-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">A</span>
                </div>
                <span className="text-gray-300 font-medium hidden sm:block">Admin User</span>
              </motion.div>
            </div>
          </GlassContainer>

          {/* Main Content */}
          <main className="flex-1 overflow-auto px-6 pb-6">
            <GlassContainer variant="card" animate delay={0.2}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* Content based on active item */}
                {activeItem === 'dashboard' && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Dashboard Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Stats Cards */}
                      {[
                        { label: 'Active Quests', value: '24', color: 'electric-blue' },
                        { label: 'Completed Today', value: '12', color: 'cyber-green' },
                        { label: 'Total Users', value: '156', color: 'neon-purple' }
                      ].map((stat, index) => (
                        <motion.div
                          key={stat.label}
                          className="bg-glass border-glass rounded-xl p-6"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                        >
                          <h4 className="text-gray-300 text-sm font-medium">{stat.label}</h4>
                          <p className={`text-3xl font-bold mt-2 text-${stat.color}-400`}>{stat.value}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {activeItem === 'quests' && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Quest Management</h3>
                    <p className="text-gray-300">Quest management interface will be implemented here.</p>
                  </div>
                )}

                {activeItem === 'attributes' && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Attribute Configuration</h3>
                    <p className="text-gray-300">Attribute management interface will be implemented here.</p>
                  </div>
                )}

                {activeItem === 'analytics' && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Analytics Dashboard</h3>
                    <p className="text-gray-300">Analytics and reporting interface will be implemented here.</p>
                  </div>
                )}

                {activeItem === 'users' && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">User Management</h3>
                    <p className="text-gray-300">User management interface will be implemented here.</p>
                  </div>
                )}

                {activeItem === 'safe-spaces' && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Safe Spaces</h3>
                    <p className="text-gray-300">Safe spaces management interface will be implemented here.</p>
                  </div>
                )}
              </motion.div>
            </GlassContainer>
          </main>
        </div>
      </div>
    </GlassContainer>
  );
};

export default AdminDashboard;