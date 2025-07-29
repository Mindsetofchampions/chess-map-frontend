/**
 * Admin Authentication Page
 * 
 * Provides secure sign-in functionality specifically for administrators.
 * Features enhanced security validation and role-based access control.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GlassContainer from '../components/GlassContainer';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertTriangle, Users } from 'lucide-react';

/**
 * Form validation interface
 */
interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

/**
 * Admin Authentication Component
 * 
 * Handles secure administrator sign-in with role validation,
 * enhanced security measures, and proper error handling.
 */
const AdminAuth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loading, error, isAuthenticated, user, isAdmin } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  /**
   * Redirect authenticated admins
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      if (isAdmin) {
        // Redirect to admin dashboard
        const from = (location.state as any)?.from?.pathname || '/admin';
        navigate(from, { replace: true });
      } else {
        // Redirect non-admins to appropriate portal
        navigate('/student-auth', { replace: true });
      }
    }
  }, [isAuthenticated, user, isAdmin, navigate, location]);

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
    } else if (formData.password.length < 8) {
      errors.password = 'Admin password must be at least 8 characters';
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

    // Rate limiting - prevent too many attempts
    if (attemptCount >= 3) {
      setFormErrors({ 
        general: 'Too many failed attempts. Please wait before trying again.' 
      });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const result = await signIn(formData.email, formData.password, 'admin');

      if (result.success) {
        // Reset attempt count on success
        setAttemptCount(0);
        // Redirect will happen automatically via useEffect
      } else if (result.error) {
        setAttemptCount(prev => prev + 1);
        setFormErrors({ general: result.error });
        
        // Clear password field after failed attempt
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (error: any) {
      setAttemptCount(prev => prev + 1);
      setFormErrors({ 
        general: error.message || 'Authentication failed. Please check your credentials.' 
      });
      
      // Clear password field after error
      setFormData(prev => ({ ...prev, password: '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Navigate to student portal
   */
  const goToStudentPortal = () => {
    navigate('/student-auth');
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
                <div className="w-16 h-16 bg-gradient-to-br from-cyber-green-400 to-cyber-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2">
                Admin Portal
              </h1>
              
              <p className="text-gray-100 mb-4">
                Secure access for CHESS Quest administrators
              </p>

              {/* Security Notice */}
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-amber-200">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs">
                    This area is restricted to authorized administrators only.
                    All access attempts are logged and monitored.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {(error || formErrors.general) && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-red-200 text-sm text-center">
                  {formErrors.general || error}
                </p>
                {attemptCount > 0 && (
                  <p className="text-red-300 text-xs text-center mt-2">
                    Failed attempts: {attemptCount}/3
                  </p>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Field */}
              <div>
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
                    placeholder="Enter your admin email"
                    disabled={isSubmitting || attemptCount >= 3}
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
                    placeholder="Enter your admin password"
                    disabled={isSubmitting || attemptCount >= 3}
                    autoComplete="current-password"
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
                {formErrors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-400">
                    {formErrors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
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
                  ${(isSubmitting || loading || attemptCount >= 3) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-cyber-green-500/50 hover:scale-105 hover:-translate-y-1'}
                `}
                aria-label="Sign in to admin dashboard"
              >
                {(isSubmitting || loading) ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Authenticating...</span>
                  </>
                ) : attemptCount >= 3 ? (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    <span>Access Temporarily Locked</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Access Admin Dashboard</span>
                  </>
                )}
              </button>

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

              {/* Help Text */}
              <div className="text-center text-xs text-gray-500 mt-4">
                <p>Having trouble signing in?</p>
                <p>Contact your system administrator for assistance.</p>
              </div>
            </form>
          </GlassContainer>
        </div>
      </div>
    </GlassContainer>
  );
};

export default AdminAuth;