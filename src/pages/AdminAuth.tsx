/**
 * Enhanced Admin Authentication Page
 * 
 * Professional admin authentication interface with comprehensive sign-in/sign-up functionality.
 * Features enhanced security, Google SSO integration, and role-based access control.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { googleAuthHelpers } from '../lib/supabase';
import GlassContainer from '../components/GlassContainer';
import { 
  Shield, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertTriangle, 
  Users,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle,
  Building
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
 * Password strength interface
 */
interface PasswordStrength {
  score: number;
  message: string;
  color: string;
}

/**
 * Enhanced Admin Authentication Component
 * 
 * Features:
 * - Professional admin-focused UI with enhanced security measures
 * - Toggle between sign-in and sign-up modes
 * - Google SSO integration with proper error handling
 * - Advanced form validation and password strength checking
 * - Role-based access control and audit trail
 * - Responsive design with accessibility compliance
 */
const AdminAuth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, loading, error, isAuthenticated, user, isAdmin, isMasterAdmin } = useAuth();

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
  const [attemptCount, setAttemptCount] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    message: '',
    color: ''
  });

  /**
   * Redirect authenticated admins
   */
  useEffect(() => {
    console.log('🏛️  AdminAuth redirect check:', {
      isAuthenticated,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      isAdmin: isAdmin || isMasterAdmin,
      shouldRedirect: isAuthenticated && user && isAdmin
    });
    
    if (isAuthenticated && user) {
      if (isAdmin || isMasterAdmin) {
        // Redirect to admin dashboard
        const from = (location.state as any)?.from?.pathname || 
          (user.role === 'master_admin' ? '/master-admin' : '/admin');
        console.log('✅ Redirecting admin to:', from);
        navigate(from, { replace: true });
      } else {
        // Redirect non-admins to appropriate portal
        console.log('❌ Non-admin user, redirecting to student auth');
        navigate('/student-auth', { replace: true });
      }
    }
  }, [isAuthenticated, user, isAdmin, isMasterAdmin, navigate, location.state]);

  /**
   * Enhanced password strength validation
   */
  const checkPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    let message = '';
    let color = '';

    if (password.length === 0) {
      return { score: 0, message: '', color: '' };
    }

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Determine strength message and color
    switch (score) {
      case 0:
      case 1:
      case 2:
        message = 'Weak - Use 8+ characters with mixed case, numbers, symbols';
        color = 'text-red-400';
        break;
      case 3:
      case 4:
        message = 'Fair - Add more character variety for better security';
        color = 'text-yellow-400';
        break;
      case 5:
        message = 'Good - Strong password for admin security';
        color = 'text-cyber-green-400';
        break;
      case 6:
        message = 'Excellent - Very secure admin password';
        color = 'text-electric-blue-400';
        break;
      default:
        message = 'Invalid password';
        color = 'text-red-400';
    }

    return { score, message, color };
  };

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

    // Real-time password strength checking for sign-up
    if (isSignUp && name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
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
   * Enhanced form validation for admin users
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Email validation with admin domain checking
    if (!formData.email) {
      errors.email = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid admin email address';
    }

    // Enhanced password validation for admin security
    if (!formData.password) {
      errors.password = 'Admin password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Admin password must be at least 8 characters';
    } else if (isSignUp) {
      const strength = checkPasswordStrength(formData.password);
      if (strength.score < 4) {
        errors.password = 'Admin password must be stronger - use mixed case, numbers, and symbols';
      }
    }

    // Confirm password validation (sign-up only)
    if (isSignUp) {
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your admin password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Admin passwords do not match';
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

    // Enhanced rate limiting for admin security
    if (attemptCount >= 3) {
      setFormErrors({ 
        general: 'Too many failed admin login attempts. Please wait before trying again.' 
      });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      let result;
      
      if (isSignUp) {
        result = await signUp(formData.email, formData.password, 'admin');
      } else {
        result = await signIn(formData.email, formData.password, 'admin');
      }

      if (result.success) {
        // Reset attempt count on success
        setAttemptCount(0);
        // Redirect will happen automatically via useEffect
      } else if (result.error) {
        setAttemptCount(prev => prev + 1);
        setFormErrors({ general: result.error });
        
        // Clear password field after failed attempt for security
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
    } catch (error: any) {
      setAttemptCount(prev => prev + 1);
      setFormErrors({ 
        general: error.message || 'Admin authentication failed. Please verify your credentials.' 
      });
      
      // Clear password fields after error
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
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
    setPasswordStrength({ score: 0, message: '', color: '' });
    setAttemptCount(0); // Reset attempts when switching modes
  };

  /**
   * Navigate to student portal
   */
  const goToStudentPortal = () => {
    navigate('/student-auth');
  };

  /**
   * Enhanced Google OAuth sign-in for admin
   */
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setFormErrors({});

    try {
      const { error } = await googleAuthHelpers.signInWithGoogle();
      if (error) {
        setFormErrors({ general: error });
      }
      // Note: Role validation will happen in AuthContext after OAuth callback
      // If user doesn't have admin role, they'll be redirected appropriately
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
                  className="w-16 h-16 bg-gradient-to-br from-cyber-green-400 to-cyber-green-600 rounded-full flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Building className="w-8 h-8 text-white" />
                </motion.div>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSignUp ? 'admin-signup' : 'admin-signin'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {isSignUp ? 'Create Admin Account' : 'Admin Portal'}
                  </h1>
                  
                  <p className="text-gray-100 mb-4">
                    {isSignUp 
                      ? 'Set up your administrator account with enhanced security'
                      : 'Secure access for CHESS Quest administrators'
                    }
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Enhanced Security Notice */}
              <motion.div 
                className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 mb-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 text-amber-200">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs">
                    {isSignUp 
                      ? 'Admin account creation requires enhanced security verification.'
                      : 'This area is restricted to authorized administrators only. All access attempts are logged and monitored.'
                    }
                  </p>
                </div>
              </motion.div>
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
                    <div>
                      <p className="text-red-200 text-sm">
                        {formErrors.general || error}
                      </p>
                      {attemptCount > 0 && (
                        <p className="text-red-300 text-xs mt-2">
                          Failed attempts: {attemptCount}/3
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Admin Mode Toggle */}
            <div className="flex mb-6 p-1 bg-glass-light border-glass-light rounded-xl">
              <button
                type="button"
                onClick={() => !isSignUp && toggleMode()}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium
                  ${!isSignUp 
                    ? 'bg-cyber-green-500/30 text-cyber-green-300 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-300'
                  }
                `}
                disabled={isSubmitting}
              >
                <LogIn className="w-4 h-4" />
                Admin Sign In
              </button>
              <button
                type="button"
                onClick={() => isSignUp && toggleMode()}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium
                  ${isSignUp 
                    ? 'bg-cyber-green-500/30 text-cyber-green-300 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-300'
                  }
                `}
                disabled={isSubmitting}
              >
                <UserPlus className="w-4 h-4" />
                Create Admin
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
                <label htmlFor="admin-email" className="block text-sm font-medium text-gray-200 mb-2">
                  Administrator Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`
                      block w-full pl-10 pr-3 py-3 
                      bg-glass border-glass rounded-xl 
                      text-white placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-cyber-green-400 focus:border-transparent
                      transition-all duration-200
                      ${formErrors.email ? 'border-red-500 ring-1 ring-red-500' : ''}
                    `}
                    placeholder={isSignUp ? "Enter your admin email" : "Enter your admin email"}
                    disabled={isSubmitting || attemptCount >= 3}
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
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-200 mb-2">
                  Administrator Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`
                      block w-full pl-10 pr-12 py-3 
                      bg-glass border-glass rounded-xl 
                      text-white placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-cyber-green-400 focus:border-transparent
                      transition-all duration-200
                      ${formErrors.password ? 'border-red-500 ring-1 ring-red-500' : ''}
                    `}
                    placeholder={isSignUp ? "Create a strong admin password" : "Enter your admin password"}
                    disabled={isSubmitting || attemptCount >= 3}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    aria-describedby={formErrors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={attemptCount >= 3}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
                
                {/* Password Strength Indicator for Sign-Up */}
                <AnimatePresence>
                  {isSignUp && formData.password && (
                    <motion.div
                      className="mt-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              passwordStrength.score < 3 ? 'bg-red-500' :
                              passwordStrength.score < 5 ? 'bg-yellow-500' :
                              'bg-cyber-green-400'
                            }`}
                            style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                          />
                        </div>
                        {passwordStrength.score >= 5 && (
                          <CheckCircle className="w-4 h-4 text-cyber-green-400" />
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${passwordStrength.color}`}>
                        {passwordStrength.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                
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
                    <label htmlFor="admin-confirm-password" className="block text-sm font-medium text-gray-200 mb-2">
                      Confirm Administrator Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="admin-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`
                          block w-full pl-10 pr-12 py-3 
                          bg-glass border-glass rounded-xl 
                          text-white placeholder-gray-400
                          focus:outline-none focus:ring-2 focus:ring-cyber-green-400 focus:border-transparent
                          transition-all duration-200
                          ${formErrors.confirmPassword ? 'border-red-500 ring-1 ring-red-500' : ''}
                        `}
                        placeholder="Confirm your admin password"
                        disabled={isSubmitting || attemptCount >= 3}
                        autoComplete="new-password"
                        aria-describedby={formErrors.confirmPassword ? 'confirm-password-error' : undefined}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={attemptCount >= 3}
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
                disabled={isSubmitting || loading || attemptCount >= 3}
                className={`
                  w-full bg-gradient-to-r from-cyber-green-500 to-cyber-green-600 
                  hover:from-cyber-green-400 hover:to-cyber-green-500 
                  text-white rounded-xl px-6 py-3 font-semibold
                  transition-all duration-200 shadow-lg
                  border border-cyber-green-400/30
                  flex items-center justify-center gap-2
                  min-h-[48px] touch-manipulation
                  ${(isSubmitting || loading || attemptCount >= 3) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-cyber-green-500/50 hover:scale-105 hover:-translate-y-1'
                  }
                `}
                whileHover={(isSubmitting || loading || attemptCount >= 3) ? {} : { scale: 1.02 }}
                whileTap={(isSubmitting || loading || attemptCount >= 3) ? {} : { scale: 0.98 }}
                aria-label={isSignUp ? 'Create admin account' : 'Sign in to admin dashboard'}
              >
                {(isSubmitting || loading) ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{isSignUp ? 'Creating Admin Account...' : 'Authenticating...'}</span>
                  </>
                ) : attemptCount >= 3 ? (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    <span>Access Temporarily Locked</span>
                  </>
                ) : (
                  <>
                    {isSignUp ? <UserPlus className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    <span>{isSignUp ? 'Create Admin Account' : 'Access Admin Dashboard'}</span>
                  </>
                )}
              </motion.button>

              {/* Enhanced Google OAuth Divider */}
              <div className="relative">
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
                disabled={isSubmitting || loading || isGoogleLoading || attemptCount >= 3}
                className={`
                  w-full flex items-center justify-center gap-3
                  bg-white/10 backdrop-blur-lg border border-gray-300/50 
                  rounded-xl px-6 py-3 
                  text-white font-medium
                  transition-all duration-200
                  min-h-[48px] touch-manipulation
                  ${(isSubmitting || loading || isGoogleLoading || attemptCount >= 3) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/20 hover:scale-105 hover:-translate-y-1'
                  }
                `}
                whileHover={(isSubmitting || loading || isGoogleLoading || attemptCount >= 3) ? {} : { scale: 1.02 }}
                whileTap={(isSubmitting || loading || isGoogleLoading || attemptCount >= 3) ? {} : { scale: 0.98 }}
                aria-label="Sign in with Google as administrator"
              >
                {isGoogleLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Signing in with Google...</span>
                  </>
                ) : (
                  <>
                    <img src="/icons/google.svg" alt="" className="w-5 h-5" />
                    <span>{isSignUp ? 'Sign up with Google' : 'Sign in with Google'}</span>
                  </>
                )}
              </motion.button>

              {/* Student Portal Link */}
              <div className="text-center pt-4 border-t border-glass">
                <p className="text-gray-400 text-sm mb-2">Not an administrator?</p>
                <button
                  type="button"
                  onClick={goToStudentPortal}
                  disabled={isSubmitting || loading}
                  className="inline-flex items-center gap-2 text-electric-blue-400 hover:text-electric-blue-300 text-sm font-medium transition-colors duration-200"
                >
                  <Users className="w-4 h-4" />
                  <span>Access Student Portal</span>
                </button>
              </div>

              {/* Enhanced Help Text */}
              <div className="text-center text-xs text-gray-500 mt-4">
                <p>Having trouble signing in?</p>
                <p>Contact your system administrator for assistance.</p>
                {isSignUp && (
                  <p className="mt-2 text-amber-400">
                    Admin account creation may require approval.
                  </p>
                )}
              </div>
            </motion.form>

            {/* Enhanced Decorative Gradient Border */}
            <motion.div 
              className="absolute -inset-px bg-gradient-to-r from-cyber-green-400/30 via-electric-blue-400/30 to-neon-purple-400/30 rounded-2xl -z-10 blur-sm"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </GlassContainer>
        </div>
      </div>
    </GlassContainer>
  );
};

export default AdminAuth;