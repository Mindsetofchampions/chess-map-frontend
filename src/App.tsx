import React from 'react';
import { Routes, Route, BrowserRouter, Link, Navigate } from 'react-router-dom';
import { MapPin, Shield, Compass, Users, Award, Zap } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import StudentAuth from './pages/StudentAuth';
import AdminAuth from './pages/AdminAuth';
import MapView from './components/MapView';
import GlassContainer from './components/GlassContainer';
import FloatingBubbles from './components/FloatingBubbles';
import DraggableBubbles from './components/DraggableBubbles';
import AdminDashboard from './pages/AdminDashboard';

/**
 * Student Dashboard Component
 * Protected route for authenticated students
 */
const StudentDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <GlassContainer variant="page">
      <div className="container mx-auto max-w-7xl">
        {/* Student Header */}
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back, {user?.email}!</h1>
            <p className="text-gray-300">Continue your CHESS Quest journey</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-glass border-glass rounded-full px-4 py-2">
              <span className="text-yellow-400 font-semibold">🪙 0 Coins</span>
            </div>
          </div>
        </div>

        {/* Quest Map */}
        <div className="px-6">
          <GlassContainer variant="card" className="p-0 overflow-hidden">
            <div className="relative h-[600px] w-full">
              <MapView />
            </div>
          </GlassContainer>
        </div>
      </div>
    </GlassContainer>
  );
};

/**
 * Landing Page Component
 * Public landing page with marketing content
 */
const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const currentYear = new Date().getFullYear();

  // Redirect authenticated users to their appropriate dashboard
  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/student" replace />;
  }

  return (
    <GlassContainer variant="page">
      {/* Floating Bubbles Animation Layer */}
      <FloatingBubbles />
      
      {/* Draggable Decorative Bubbles */}
      <DraggableBubbles />
      
      <div className="container mx-auto max-w-7xl">
        
        {/* Hero Section */}
        <section className="text-center lg:text-left py-12 lg:py-20 px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            
            {/* Hero Content */}
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-center lg:justify-start mb-6">
                <Compass className="w-12 h-12 text-electric-blue-400 mr-4 drop-shadow-lg" />
                <div className="h-12 w-px bg-gradient-to-b from-transparent via-electric-blue-400 to-transparent drop-shadow-sm"></div>
                <Zap className="w-8 h-8 text-neon-purple-400 ml-4 drop-shadow-lg" />
              </div>
              
              <h1 className="text-4xl md:text-6xl font-extrabold text-neon-purple leading-tight">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-electric-blue-400 via-neon-purple-400 to-cyber-green-400 bg-clip-text text-transparent drop-shadow-lg">
                  CHESS Quest
                </span>
              </h1>
              
              <p className="text-lg text-gray-100 max-w-2xl leading-relaxed drop-shadow-sm font-medium">
                Find safe spaces, complete quests, earn coins, redeem for rewards. 
                Join the ultimate gamified learning experience designed for the digital generation.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Link
                  to="/student-auth"
                  className="btn-esports flex items-center justify-center gap-2 hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                  aria-label="Student sign up or sign in"
                >
                  <Users className="w-5 h-5" />
                  Student Sign Up/Sign In
                </Link>
                
                <Link
                  to="/admin-auth"
                  className="bg-gradient-to-r from-cyber-green-500 to-cyber-green-600 hover:from-cyber-green-400 hover:to-cyber-green-500 text-white rounded-full px-8 py-4 shadow-2xl transition-all duration-300 font-semibold text-center min-h-[44px] touch-manipulation hover:shadow-cyber-green-500/50 hover:scale-105 hover:-translate-y-1 flex items-center justify-center gap-2 border border-cyber-green-400/30"
                  aria-label="Admin login"
                >
                  <Shield className="w-5 h-5" />
                  Admin Login
                </Link>
              </div>
            </div>
            
            {/* Hero Visual */}
            <div className="flex-1 lg:max-w-md">
              <GlassContainer variant="card" className="text-center shadow-2xl">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-glass-light border-glass-light rounded-xl p-4 hover:bg-glass-dark transition-all duration-300 hover:scale-105">
                    <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-100 font-semibold drop-shadow-sm">Earn Rewards</p>
                  </div>
                  <div className="bg-glass-light border-glass-light rounded-xl p-4 hover:bg-glass-dark transition-all duration-300 hover:scale-105">
                    <MapPin className="w-8 h-8 text-electric-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-100 font-semibold drop-shadow-sm">Explore Quests</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-glass-light border-glass-light rounded-full px-4 py-2">
                    <div className="w-3 h-3 bg-cyber-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-100 font-semibold drop-shadow-sm">Live System</span>
                  </div>
                </div>
              </GlassContainer>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="py-16 px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Power Up Your Learning
            </h2>
            <p className="text-gray-100 text-lg max-w-2xl mx-auto font-medium drop-shadow-sm">
              Experience education through gamification with cutting-edge features designed for engagement and growth.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dynamic Quests Card */}
            <GlassContainer variant="card" className="flex flex-col items-center space-y-4 text-center hover:bg-glass-dark transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer">
              <div className="w-16 h-16 bg-gradient-to-br from-electric-blue-400 to-electric-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Dynamic Quests</h3>
              <p className="text-gray-100 text-sm leading-relaxed font-medium">
                Discover location-based challenges that adapt to your learning pace and preferences. Complete quests to unlock new areas and earn valuable rewards.
              </p>
              <div className="flex items-center gap-2 text-electric-blue-400 text-sm font-medium">
                <span>Explore Quests</span>
                <Compass className="w-4 h-4" />
              </div>
            </GlassContainer>

            {/* Safe Spaces Card */}
            <GlassContainer variant="card" className="flex flex-col items-center space-y-4 text-center hover:bg-glass-dark transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer">
              <div className="w-16 h-16 bg-gradient-to-br from-cyber-green-400 to-cyber-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Safe Spaces</h3>
              <p className="text-gray-100 text-sm leading-relaxed font-medium">
                Find secure environments where you can learn, collaborate, and grow. Our protected zones ensure a positive and supportive experience for everyone.
              </p>
              <div className="flex items-center gap-2 text-cyber-green-400 text-sm font-medium">
                <span>Find Safety</span>
                <Shield className="w-4 h-4" />
              </div>
            </GlassContainer>

            {/* Live Navigation Card */}
            <GlassContainer variant="card" className="flex flex-col items-center space-y-4 text-center hover:bg-glass-dark transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer">
              <div className="w-16 h-16 bg-gradient-to-br from-neon-purple-400 to-neon-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Compass className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Live Navigation</h3>
              <p className="text-gray-100 text-sm leading-relaxed font-medium">
                Navigate through your learning journey with real-time guidance. Interactive maps and smart routing help you discover the most engaging pathways.
              </p>
              <div className="flex items-center gap-2 text-neon-purple-400 text-sm font-medium">
                <span>Start Journey</span>
                <Compass className="w-4 h-4" />
              </div>
            </GlassContainer>
          </div>
        </section>

        {/* Interactive Map Section */}
        <section className="py-16 px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Explore the CHESS Universe
            </h2>
            <p className="text-gray-100 text-lg max-w-2xl mx-auto font-medium drop-shadow-sm">
              Dive into an interactive world where learning meets adventure. Discover quests, locate safe spaces, and connect with your community.
            </p>
          </div>
          
          <GlassContainer variant="card" className="mt-8 p-0 overflow-hidden">
            <div className="relative h-[400px] md:h-[600px] w-full">
              <MapView />
              
              {/* Map Overlay Info */}
              <div className="absolute top-4 left-4 right-4 z-10">
                <div className="flex flex-wrap gap-2 justify-center">
                  <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-100 backdrop-blur-xl font-medium">
                    <span className="w-2 h-2 bg-electric-blue-400 rounded-full inline-block mr-2"></span>
                    Active Quests
                  </div>
                  <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-100 backdrop-blur-xl font-medium">
                    <span className="w-2 h-2 bg-cyber-green-400 rounded-full inline-block mr-2"></span>
                    Safe Spaces
                  </div>
                  <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-100 backdrop-blur-xl font-medium">
                    <span className="w-2 h-2 bg-neon-purple-400 rounded-full inline-block mr-2"></span>
                    Community Hubs
                  </div>
                </div>
              </div>
            </div>
          </GlassContainer>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 text-center px-6">
          <GlassContainer variant="card" className="max-w-4xl mx-auto">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Ready to Begin Your Quest?
              </h2>
              <p className="text-gray-100 text-lg max-w-2xl mx-auto font-medium drop-shadow-sm">
                Join thousands of learners who are already exploring, earning, and achieving through the CHESS Quest platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Link
                  to="/student-auth"
                  className="btn-esports flex items-center justify-center gap-2 hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                  aria-label="Get started as a student"
                >
                  <Users className="w-5 h-5" />
                  Get Started Now
                </Link>
                
                <Link
                  to="/admin-auth"
                  className="bg-glass border-glass hover:bg-glass-dark text-white rounded-full px-8 py-4 shadow-xl transition-all duration-300 font-semibold min-h-[44px] touch-manipulation hover:shadow-2xl hover:scale-105 hover:-translate-y-1 flex items-center justify-center gap-2 font-medium"
                  aria-label="View admin dashboard"
                >
                  <Compass className="w-5 h-5" />
                  Explore Dashboard
                </Link>
              </div>
            </div>
          </GlassContainer>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-glass-light px-6">
          <GlassContainer variant="overlay" className="text-center">
            <p className="text-gray-200 text-sm font-medium drop-shadow-sm">
              © {currentYear} CHESS Quest • Built with 💜 and ⚔️ • 
              <span className="text-electric-blue-400 ml-2">Powering the Future of Learning</span>
            </p>
            
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-300 font-medium">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-cyber-green-400 rounded-full animate-pulse"></div>
                System Online
              </span>
              <span>•</span>
              <span>All Systems Operational</span>
              <span>•</span>
              <span>Secure Connection</span>
            </div>
          </GlassContainer>
        </footer>
      </div>
    </GlassContainer>
  );
};

/**
 * Main Application Router Component
 * 
 * Features:
 * - Authentication provider wrapping
 * - Role-based routing with protection
 * - Automatic redirects based on user role
 * - Landing page for unauthenticated users
 * 
 * @returns {JSX.Element} Complete application with authentication and routing
 */
const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication Routes - Public */}
        <Route path="/student-auth" element={<StudentAuth />} />
        <Route path="/admin-auth" element={<AdminAuth />} />

        {/* Protected Student Routes */}
        <Route 
          path="/student" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/map" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Protected Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Main App Component with Authentication Provider
 * 
 * Wraps the entire application with authentication context
 * and provides global auth state management.
 */
function App(): JSX.Element {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;