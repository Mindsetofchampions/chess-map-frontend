/**
 * Login Page
 * 
 * User authentication interface with email/password form,
 * validation, and error handling.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ToastProvider';
import GlassContainer from '@/components/GlassContainer';

/**
 * Login form data interface
 */
interface LoginForm {
  email: string;
  password: string;
}

/**
 * Form validation errors
 */
interface FormErrors {
  email?: string;
  password?: string;
}

/**
 * Login Page Component
 * 
 * Features:
 * - Email/password authentication
 * - Form validation with real-time feedback
 * - Show/hide password toggle
 * - Redirect after successful login
 * - Error handling with toast notifications
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loading, refreshRole, role, roleLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const result = await signIn(formData.email, formData.password);
      
      if (result.success) {
        showSuccess('Welcome back!', 'Successfully signed in to CHESS Quest');

        // Ensure auth context has settled and role is resolved before navigating.
        // Call refreshRole to kick a fetch, then wait for roleLoading to become false.
        void refreshRole();

        // Wait up to ~3s for roleResolution; this prevents navigating to a protected admin URL
        // before the user's role is loaded (which caused "Access Restricted" flashes).
        const start = Date.now();
        while (roleLoading && Date.now() - start < 3000) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 150));
        }

        const resolvedRole = role;

        // Determine role-aware default next path
        const next = (resolvedRole === 'master_admin' || resolvedRole === 'org_admin' || resolvedRole === 'staff')
          ? '/master/dashboard'
          : '/dashboard';

        // If the user originally attempted to visit a protected admin route, only honor it
        // when the resolved role is an admin-level role. Otherwise fall back to next.
        const attempted = (location.state as any)?.from?.pathname;

        // If the resolved role is org_admin, check whether the org is approved.
        // If not approved, send them to the org onboarding page. Otherwise
        // send them to the main org dashboard (not specific sub-pages) to avoid
        // surprising routing like going directly to approvals.
        if (resolvedRole === 'org_admin') {
          await refreshRole();
          // read from user metadata via auth client; if not approved, route to onboarding
          const session = await (await import('@/lib/supabase')).supabase.auth.getSession();
          const currentUser = session.data.session?.user;
          const orgApproved = currentUser?.user_metadata?.org_approved;
          if (!orgApproved) {
            navigate('/onboarding/org', { replace: true });
          } else {
            navigate('/master/dashboard', { replace: true });
          }
        } else {
          const from = attempted && attempted.startsWith('/master') && !(resolvedRole === 'master_admin' || resolvedRole === 'staff')
            ? next
            : (attempted || next);
          navigate(from, { replace: true });
  }
      } else {
        showError('Sign in failed', result.error);
      }
    } catch (error: any) {
      showError('Sign in failed', error.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        
        {/* Back to Home Link */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
        </motion.div>

        <GlassContainer variant="card">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-electric-blue-400 to-electric-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-gray-200">Sign in to continue your CHESS Quest journey</p>
            </div>

            {/* Login Form */}
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
                    className={`block w-full pl-10 pr-3 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400 transition-all duration-200 ${
                      errors.email ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                    placeholder="Enter your email"
                    disabled={submitting}
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
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
                    className={`block w-full pl-10 pr-12 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400 transition-all duration-200 ${
                      errors.password ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                    placeholder="Enter your password"
                    disabled={submitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={submitting || loading}
                className="w-full btn-esports disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                data-testid="btn-login"
                whileHover={!submitting && !loading ? { scale: 1.02 } : {}}
                whileTap={!submitting && !loading ? { scale: 0.98 } : {}}
              >
                {submitting || loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </div>
                )}
              </motion.button>

              {/* Sign Up Link */}
              <div className="text-center pt-4 border-t border-glass">
                <p className="text-gray-400 text-sm mb-2">Don't have an account?</p>
                <Link
                  to="/signup"
                  className="text-electric-blue-400 hover:text-electric-blue-300 font-medium transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </form>
          </motion.div>
        </GlassContainer>
      </div>
    </div>
  );
};

export default Login;