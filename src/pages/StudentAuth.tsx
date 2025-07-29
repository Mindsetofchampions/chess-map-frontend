/**
 * Student Authentication Page
 * 
 * Provides sign-in and sign-up functionality specifically for students.
 * Features glassmorphic design, form validation, and automatic redirection.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GlassContainer from '../components/GlassContainer';
import { Users, Mail, Lock, Eye, EyeOff, ArrowLeft, BookOpen } from 'lucide-react';

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
 * Student Authentication Component
 * 
 * Handles both sign-in and sign-up flows for students with proper validation,
 * loading states, and error handling.
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

  /**
   * Redirect authenticated users
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to intended destination or default route
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  /**
   * Handle input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific errors when user starts typing
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Validate form data
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
   * Handle form submission
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
        // Redirect will happen automatically via useEffect
        const from = (location.state as any)?.from?.pathname || '/';
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
   * Toggle between sign-in and sign-up modes
   */
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({ email: '', password: '', confirmPassword: '' });
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <GlassContainer variant="page">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          
          {/* Back to Home Link */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200 group"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm">Back to Home</span>
            </button>
          </div>

          <GlassContainer variant="card">
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-electric-blue-400 to-electric-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2">
                {isSignUp ? 'Join CHESS Quest' : 'Student Sign In'}
              </h1>
              
              <p className="text-gray-100">
                {isSignUp 
                  ? 'Create your student account to start exploring quests and earning coins'
                  : 'Welcome back! Sign in to continue your learning journey'
                }
              </p>
            </div>

            {/* Error Display */}
            {(error || formErrors.general) && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-red-200 text-sm text-center">
                  {formErrors.general || error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Field */}
              <div>
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
                {formErrors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-400">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
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
                    placeholder="Enter your password"
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
                {formErrors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-400">
                    {formErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field (Sign-up only) */}
              {isSignUp && (
                <div>
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
                  {formErrors.confirmPassword && (
                    <p id="confirm-password-error" className="mt-1 text-sm text-red-400">
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className={`
                  w-full btn-esports flex items-center justify-center gap-2 py-3
                  transition-all duration-200
                  ${(isSubmitting || loading) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                aria-label={isSignUp ? 'Create student account' : 'Sign in to student account'}
              >
                {(isSubmitting || loading) ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-5 h-5" />
                    <span>{isSignUp ? 'Create Student Account' : 'Sign In'}</span>
                  </>
                )}
              </button>

              {/* Toggle Mode */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={isSubmitting || loading}
                  className="text-electric-blue-400 hover:text-electric-blue-300 text-sm font-medium transition-colors duration-200"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in here'
                    : "Don't have an account? Sign up here"
                  }
                </button>
              </div>

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
            </form>
          </GlassContainer>
        </div>
      </div>
    </GlassContainer>
  );
};

export default StudentAuth;