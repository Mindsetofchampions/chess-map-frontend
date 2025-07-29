/**
 * Enhanced Student Authentication Page
 * 
 * Provides comprehensive sign-in and sign-up functionality with Google OAuth integration.
 * Features improved UI/UX, proper routing, and enhanced error handling.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import GlassContainer from '../components/GlassContainer';
import { 
  Users, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  BookOpen, 
  UserPlus,
  LogIn,
  AlertCircle 
} from 'lucide-react';

/**
 * Form validation interface
 */
interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

/**
 * Enhanced Student Authentication Component
 * 
 * Features:
 * - Animated transitions between sign-in and sign-up modes
 * - Google OAuth integration with proper error handling
 * - Enhanced form validation and user feedback
 * - Responsive glassmorphic design
 * - Proper accessibility and keyboard navigation
 */
const StudentAuth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, loading, error, isAuthenticated, user } = useAuth();

  // Form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  /**
   * Redirect authenticated users
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to intended destination or default route
      const from = (location.state as any)?.from?.pathname || '/student';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  /**
   * Handle input changes with real-time validation
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific errors when user starts typing
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Real-time password matching validation for sign-up
    if (isSignUp && name === 'confirmPassword' && formData.password) {
      if (value !== formData.password) {
        setFormErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setFormErrors(prev => ({ ...prev, confirmPassword: undefined }));
      }
    }
  };

  /**
   * Enhanced form validation
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (isSignUp && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation (sign-up only)
    if (isSignUp) {
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission with enhanced error handling
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      let result;
      
      if (isSignUp) {
        result = await signUp(formData.email, formData.password, 'student');
      } else {
        result = await signIn(formData.email, formData.password, 'student');
      }

      if (result.success) {
        // Success feedback
        const from = (location.state as any)?.from?.pathname || '/student';
        navigate(from, { replace: true });
      } else if (result.error) {
        setFormErrors({ general: result.error });
      }
    } catch (error: any) {
      setFormErrors({ 
        general: error.message || 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Enhanced mode toggle with animations
   */
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({ email: formData.email, password: '', confirmPassword: '' });
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  /**
   * Enhanced Google OAuth sign-in
   */
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setFormErrors({});

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/student`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setFormErrors({ general: error.message });
      }
      // Success handling will be done by AuthContext onAuthStateChange
    } catch (error: any) {
      setFormErrors({ 
        general: error.message || 'Failed to sign in with Google. Please try again.' 
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <GlassContainer variant="page">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          
          {/* Enhanced Back to Home Link */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200 group"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm">Back to Home</span>
            </button>
          </motion.div>

          <GlassContainer variant="card">
            
            {/* Enhanced Header with Animation */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-center mb-4">
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-electric-blue-400 to-electric-blue-600 rounded-full flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Users className="w-8 h-8 text-white" />
                </motion.div>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSignUp ? 'signup' : 'signin'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {isSignUp ? 'Join CHESS Quest' : 'Welcome Back'}
                  </h1>
                  
                  <p className="text-gray-100">
                    {isSignUp 
                      ? 'Create your student account to start exploring quests and earning coins'
                      : 'Sign in to continue your learning journey'
                    }
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Enhanced Error Display */}
            <AnimatePresence>
              {(error || formErrors.general) && (
                <motion.div 
                  className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
                    <p className="text-red-200 text-sm">
                      {formErrors.general || error}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auth Mode Toggle */}
            <div className="flex mb-6 p-1 bg-glass-light border-glass-light rounded-xl">
              <button
                type="button"
                onClick={() => !isSignUp && toggleMode()}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium
                  ${!isSignUp 
                    ? 'bg-electric-blue-500/30 text-electric-blue-300 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-300'
                  }
                `}
                disabled={isSubmitting}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => isSignUp && toggleMode()}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium
                  ${isSignUp 
                    ? 'bg-electric-blue-500/30 text-electric-blue-300 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-300'
                  }
                `}
                disabled={isSubmitting}
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </button>
            </div>

            {/* Enhanced Form */}
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-6"
              layout
            >
              
              {/* Email Field */}
              <motion.div layout>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`
                      block w-full pl-10 pr-3 py-3 
                      bg-glass border-glass rounded-xl 
                      text-white placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-electric-blue-400 focus:border-transparent
                      transition-all duration-200
                      ${formErrors.email ? 'border-red-500 ring-1 ring-red-500' : ''}
                    `}
                    placeholder="Enter your email"
                    disabled={isSubmitting}
                    autoComplete="email"
                    aria-describedby={formErrors.email ? 'email-error' : undefined}
                  />
                </div>
                <AnimatePresence>
                  {formErrors.email && (
                    <motion.p 
                      id="email-error" 
                      className="mt-1 text-sm text-red-400"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {formErrors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Password Field */}
              <motion.div layout>
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`
                      block w-full pl-10 pr-12 py-3 
                      bg-glass border-glass rounded-xl 
                      text-white placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-electric-blue-400 focus:border-transparent
                      transition-all duration-200
                      ${formErrors.password ? 'border-red-500 ring-1 ring-red-500' : ''}
                    `}
                    placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                    disabled={isSubmitting}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    aria-describedby={formErrors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {formErrors.password && (
                    <motion.p 
                      id="password-error" 
                      className="mt-1 text-sm text-red-400"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {formErrors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Confirm Password Field (Sign-up only) */}
              <AnimatePresence>
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`
                          block w-full pl-10 pr-12 py-3 
                          bg-glass border-glass rounded-xl 
                          text-white placeholder-gray-400
                          focus:outline-none focus:ring-2 focus:ring-electric-blue-400 focus:border-transparent
                          transition-all duration-200
                          ${formErrors.confirmPassword ? 'border-red-500 ring-1 ring-red-500' : ''}
                        `}
                        placeholder="Confirm your password"
                        disabled={isSubmitting}
                        autoComplete="new-password"
                        aria-describedby={formErrors.confirmPassword ? 'confirm-password-error' : undefined}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                        )}
                      </button>
                    </div>
                    <AnimatePresence>
                      {formErrors.confirmPassword && (
                        <motion.p 
                          id="confirm-password-error" 
                          className="mt-1 text-sm text-red-400"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          {formErrors.confirmPassword}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enhanced Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting || loading}
                className={`
                  w-full btn-esports flex items-center justify-center gap-2 py-3
                  transition-all duration-200
                  ${(isSubmitting || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:-translate-y-1'}
                `}
                whileHover={(isSubmitting || loading) ? {} : { scale: 1.02 }}
                whileTap={(isSubmitting || loading) ? {} : { scale: 0.98 }}
                aria-label={isSignUp ? 'Create student account' : 'Sign in to student account'}
              >
                {(isSubmitting || loading) ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                  </>
                ) : (
                  <>
                    {isSignUp ? <UserPlus className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    <span>{isSignUp ? 'Create Student Account' : 'Sign In'}</span>
                  </>
                )}
              </motion.button>

              {/* Enhanced Google OAuth Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-glass"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-glass text-gray-300 rounded-full">Or continue with</span>
                </div>
              </div>

              {/* Enhanced Google Sign-in Button */}
              <motion.button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || loading || isGoogleLoading}
                className={`
                  w-full flex items-center justify-center gap-3
                  bg-white/10 backdrop-blur-lg border border-gray-300/50 
                  rounded-xl px-6 py-3 
                  text-white font-medium
                  transition-all duration-200
                  min-h-[48px] touch-manipulation
                  ${(isSubmitting || loading || isGoogleLoading) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/20 hover:scale-105 hover:-translate-y-1'
                  }
                `}
                whileHover={(isSubmitting || loading || isGoogleLoading) ? {} : { scale: 1.02 }}
                whileTap={(isSubmitting || loading || isGoogleLoading) ? {} : { scale: 0.98 }}
                aria-label="Sign in with Google"
              >
                {isGoogleLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Signing in with Google...</span>
                  </>
                ) : (
                  <>
                    <img src="/icons/google.svg" alt="" className="w-5 h-5" />
                    <span>Sign in with Google</span>
                  </>
                )}
              </motion.button>

              {/* Admin Link */}
              <div className="text-center pt-4 border-t border-glass">
                <p className="text-gray-400 text-sm mb-2">Are you an administrator?</p>
                <button
                  type="button"
                  onClick={() => navigate('/admin-auth')}
                  disabled={isSubmitting || loading}
                  className="text-cyber-green-400 hover:text-cyber-green-300 text-sm font-medium transition-colors duration-200"
                >
                  Access Admin Portal
                </button>
              </div>
            </motion.form>

            {/* Enhanced Decorative Gradient Border */}
            <div className="absolute -inset-px bg-gradient-to-r from-electric-blue-400/30 via-neon-purple-400/30 to-cyber-green-400/30 rounded-2xl -z-10 blur-sm animate-pulse" />
          </GlassContainer>
        </div>
      </div>
    </GlassContainer>
  );
};

export default StudentAuth;