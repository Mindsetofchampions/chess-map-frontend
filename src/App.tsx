// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, BrowserRouter, Link, Navigate } from 'react-router-dom';
import { MapPin, Shield, Compass, Users, Award, Zap, X, Star, Trophy, Heart, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { googleAuthHelpers } from './lib/supabase';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import StudentAuth from './pages/StudentAuth';
import AdminAuth from './pages/AdminAuth';
import MapView from './components/MapView';
import GlassContainer from './components/GlassContainer';
import FloatingBubbles from './components/FloatingBubbles';
import DraggableBubbles from './components/DraggableBubbles';
import AdminDashboard from './pages/AdminDashboard';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import MapPage from './pages/MapPage';

// NEW: env guard + auth gate
import EnvMissing from './components/EnvMissing';
import supabase, { envStatus, awaitReadySession } from './services/supabaseClient';

/** Small wrapper that waits for Supabase auth session to resolve before rendering the app */
function AppAuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // why: prevent “session missing” race conditions on first load
    awaitReadySession(supabase).finally(() => setReady(true));
  }, []);
  if (!ready) return <div className="p-4">Loading…</div>;
  return <>{children}</>;
}

/**
 * Student Dashboard Component
 * Protected route for authenticated students
 */
const StudentDashboard: React.FC = () => {
  const { user } = useAuth();

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
      window.location.href = '/admin';
    }
  }, [user]);

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
  const [activeModal, setActiveModal] = React.useState<string | null>(null);

  // Enhanced debugging for landing page redirects
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🏠 Landing page redirect check:', {
        isAuthenticated,
        userRole: user?.role,
        shouldRedirect: isAuthenticated && user
      });
    }
  }, [isAuthenticated, user]);

  /**
   * Handle Google OAuth sign-in from home page
   */
  const handleGoogleSignIn = async () => {
    const { error } = await googleAuthHelpers.signInWithGoogle();
    if (error) {
      console.error('Google sign-in failed:', error);
      // Error handling is managed by AuthContext
    }
  };

  // Redirect authenticated users to their appropriate dashboard
  if (isAuthenticated && user) {
    console.log('🔄 Processing redirect for role:', user.role);

    if (user.role === 'master_admin') {
      console.log('✅ Redirecting master_admin to /master-admin/dashboard');
      return <Navigate to="/master-admin/dashboard" replace />;
    } else if (user.role === 'admin') {
      console.log('✅ Redirecting admin to /admin/dashboard');
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'student') {
      console.log('✅ Redirecting student to /student/dashboard');
      return <Navigate to="/student/dashboard" replace />;
    } else {
      console.warn('⚠️ Invalid or undefined role, redirecting to student dashboard:', user.role);
      return <Navigate to="/student/dashboard" replace />;
    }
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
                    <span className="text-sm text-gray-100 font-semibold">Live System</span>
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
            <GlassContainer
              variant="card"
              className="flex flex-col items-center space-y-4 text-center hover:bg-glass-dark transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer"
              onClick={() => setActiveModal('quests')}
            >
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
            <GlassContainer
              variant="card"
              className="flex flex-col items-center space-y-4 text-center hover:bg-glass-dark transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer"
              onClick={() => setActiveModal('safety')}
            >
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
            <GlassContainer
              variant="card"
              className="flex flex-col items-center space-y-4 text-center hover:bg-glass-dark transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer"
              onClick={() => setActiveModal('navigation')}
            >
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
            <div className="relative h-[350px] md:h-[600px] w-full">
              <MapView />

              {/* Map Overlay Info */}
              <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 z-10">
                <div className="flex flex-wrap gap-1 md:gap-2 justify-center">
                  <div className="bg-glass-dark border-glass-dark rounded-full px-2 md:px-3 py-1 text-xs text-gray-100 backdrop-blur-xl font-medium">
                    <span className="w-2 h-2 bg-electric-blue-400 rounded-full inline-block mr-2"></span>
                    <span className="hidden md:inline">Active Quests</span>
                    <span className="md:hidden">Quests</span>
                  </div>
                  <div className="bg-glass-dark border-glass-dark rounded-full px-2 md:px-3 py-1 text-xs text-gray-100 backdrop-blur-xl font-medium">
                    <span className="w-2 h-2 bg-cyber-green-400 rounded-full inline-block mr-2"></span>
                    <span className="hidden md:inline">Safe Spaces</span>
                    <span className="md:hidden">Safe</span>
                  </div>
                  <div className="bg-glass-dark border-glass-dark rounded-full px-2 md:px-3 py-1 text-xs text-gray-100 backdrop-blur-xl font-medium">
                    <span className="w-2 h-2 bg-neon-purple-400 rounded-full inline-block mr-2"></span>
                    <span className="hidden md:inline">Community Hubs</span>
                    <span className="md:hidden">Events</span>
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

              {/* Google SSO Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-white/20 backdrop-blur-lg border border-gray-300 rounded-full px-6 py-3 hover:bg-white/30 transition-all duration-300 font-medium min-h-[44px] touch-manipulation hover:scale-105 hover:-translate-y-1"
                  aria-label="Sign in with Google"
                >
                  <img src="/icons/google.svg" alt="" className="w-5 h-5" />
                  <span className="text-white font-medium">Sign in with Google</span>
                </button>
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

      {/* Feature Explanation Modals */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              className="relative w-full max-w-2xl bg-glass backdrop-blur-2xl border-glass rounded-3xl shadow-2xl p-8 mx-auto overflow-y-auto max-h-[80vh]"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                className="absolute top-6 right-6 p-2 rounded-full bg-glass-dark border-glass hover:bg-glass-light transition-all duration-200 group"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                <X className="w-6 h-6 text-gray-300 group-hover:text-white" />
              </button>

              {/* Dynamic Quests Modal */}
              {activeModal === 'quests' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-electric-blue-400 to-electric-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <MapPin className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4">Dynamic Quests</h2>
                    <p className="text-xl text-electric-blue-300 font-semibold">Learning Adventures That Level Up With You! 🎮</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-glass-light border-glass-light rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Star className="w-8 h-8 text-yellow-400" />
                        <h3 className="text-xl font-bold text-white">Gaming Meets Learning</h3>
                      </div>
                      <p className="text-gray-100 leading-relaxed">
                        Forget boring textbooks! Our quests turn every lesson into an epic adventure. Solve puzzles, complete challenges, and unlock achievements just like your favorite video games - but you're actually learning real skills!
                      </p>
                    </div>

                    <div className="bg-glass-light border-glass-light rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Trophy className="w-8 h-8 text-cyber-green-400" />
                        <h3 className="text-xl font-bold text-white">Unlock & Earn Rewards</h3>
                      </div>
                      <p className="text-gray-100 leading-relaxed">
                        Complete quests to earn coins, badges, and unlock new content areas. The more you learn, the more epic rewards you get! Plus, your achievements carry over to unlock exclusive features and content.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-electric-blue-500/20 to-neon-purple-500/20 border border-electric-blue-400/30 rounded-2xl p-6">
                    <h3 className="text-2xl font-bold text-white mb-4 text-center">How Dynamic Quests Work:</h3>
                    <div className="grid md:grid-cols-3 gap-4 text-center">
                      <div className="space-y-2">
                        <div className="text-3xl">📍</div>
                        <h4 className="font-semibold text-white">Find Quests</h4>
                        <p className="text-sm text-gray-100">Discover challenges on your map based on your location and interests</p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-3xl">🎯</div>
                        <h4 className="font-semibold text-white">Complete Challenges</h4>
                        <p className="text-sm text-gray-100">Solve problems, answer questions, and complete interactive activities</p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-3xl">💎</div>
                        <h4 className="font-semibold text-white">Level Up!</h4>
                        <p className="text-sm text-gray-100">Earn rewards and unlock new areas as you progress and master skills</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Link
                      to="/student-auth"
                      className="inline-flex items-center gap-2 btn-esports text-lg px-8 py-4"
                      onClick={() => setActiveModal(null)}
                    >
                      <Sparkles className="w-6 h-6" />
                      Start Your Quest Adventure!
                    </Link>
                  </div>
                </div>
              )}

              {/* Safe Spaces Modal */}
              {activeModal === 'safety' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-cyber-green-400 to-cyber-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <Shield className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4">Safe Spaces</h2>
                    <p className="text-xl text-cyber-green-300 font-semibold">Your Free, Welcoming Learning Community! 🏛️</p>
                  </div>

                  {/* content omitted for brevity in this section since visuals only */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-glass-light border-glass-light rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Heart className="w-8 h-8 text-red-400" />
                        <h3 className="text-xl font-bold text-white">Always Free & Accessible</h3>
                      </div>
                      <p className="text-gray-100 leading-relaxed">
                        Every Safe Space is completely free to access! No fees, no barriers - just welcoming places in your community where you can learn, study, and connect with educational resources whenever you need them.
                      </p>
                    </div>
                    <div className="bg-glass-light border-glass-light rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Users className="w-8 h-8 text-electric-blue-400" />
                        <h3 className="text-xl font-bold text-white">Community Support</h3>
                      </div>
                      <p className="text-gray-100 leading-relaxed">
                        Meet other learners, get help with your studies, and join group activities. Our Safe Spaces are designed to foster positive connections and collaborative learning in a supportive environment.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Navigation Modal */}
              {activeModal === 'navigation' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-neon-purple-400 to-neon-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <Compass className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4">Live Navigation</h2>
                    <p className="text-xl text-neon-purple-300 font-semibold">Meet Your Digital Learning Companions! 🤖✨</p>
                  </div>

                  {/* content omitted for brevity in this visual section */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-glass-light border-glass-light rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="text-3xl">🦉</div>
                        <h3 className="text-xl font-bold text-white">Your Sprite Guides</h3>
                      </div>
                      <p className="text-gray-100 leading-relaxed">
                        Meet Hootie, Brenda, Gino, Hammer, and the MOC Badge - your friendly AI companions! These adorable characters guide you through your learning journey, offering hints, encouragement, and celebrating your wins!
                      </p>
                    </div>

                    <div className="bg-glass-light border-glass-light rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="w-8 h-8 text-yellow-400" />
                        <h3 className="text-xl font-bold text-white">Interactive Help</h3>
                      </div>
                      <p className="text-gray-100 leading-relaxed">
                        Stuck on a problem? Your Sprites are here to help! They provide smart hints, explain concepts in fun ways, and adapt their teaching style to match how you learn best.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Decorative gradient border */}
              <div className="absolute -inset-px bg-gradient-to-r from-electric-blue-400/30 via-neon-purple-400/30 to-cyber-green-400/30 rounded-3xl -z-10 blur-sm" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassContainer>
  );
};

/**
 * Main Application Router Component
 */
const AppRouter: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Landing Page - Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication Routes - Public */}
          <Route path="/student-auth" element={<StudentAuth />} />
          <Route path="/admin-auth" element={<AdminAuth />} />

          {/* Protected Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ErrorBoundary>
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ErrorBoundary>
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Protected Master Admin Routes */}
          <Route
            path="/master-admin/dashboard"
            element={
              <ErrorBoundary>
                <ProtectedRoute requiredRole="master_admin">
                  <MasterAdminDashboard />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          />
          <Route path="/master-admin" element={<Navigate to="/master-admin/dashboard" replace />} />

          {/* Map Page Route */}
          <Route
            path="/map"
            element={
              <ErrorBoundary>
                <MapPage />
              </ErrorBoundary>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

/**
 * Main App Component with Authentication Provider
 */
function App(): JSX.Element {
  // env guard (why: show friendly message if Vite env not set)
  if (!envStatus.ok) {
    return <EnvMissing />;
  }

  return (
    <AuthProvider>
      <AppAuthGate>
        <AppRouter />
      </AppAuthGate>
    </AuthProvider>
  );
}

export default App;
