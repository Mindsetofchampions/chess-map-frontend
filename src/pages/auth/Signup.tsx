/**
 * Signup Page
 *
 * User registration interface with email/password form,
 * validation, and account creation.
 */

import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import GlassContainer from '@/components/GlassContainer';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/contexts/AuthContext';
import { routeForRole } from '@/lib/routes';
import SEO from '@/components/SEO';

/**
 * Signup form data interface
 */
interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Form validation errors
 */
interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * Signup Page Component
 *
 * Features:
 * - Email/password registration
 * - Password confirmation validation
 * - Form validation with real-time feedback
 * - Show/hide password toggles
 * - Success handling with redirect
 */
const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, loading, refreshRole } = useAuth();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState<SignupForm>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
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
      const result = await signUp(formData.email, formData.password);

      if (result.success) {
        // Refresh role to determine redirect destination and use returned role immediately
        const resolvedRole = await refreshRole();

        showSuccess(
          'Account created!',
          'Welcome to CHESS Quest. Please check your email to verify your account.',
        );

        // Role-aware redirect using the freshly resolved role
        const next = routeForRole(resolvedRole);
        navigate(next, { replace: true });
      } else {
        showError('Sign up failed', result.error);
      }
    } catch (error: any) {
      showError('Sign up failed', error.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary flex items-center justify-center py-12 px-4'>
      <SEO title="Create your CHESS Quest account" description="Sign up to start exploring quests, earning coins, and joining the CHESS Quest community." image="/icons/google.svg" />
      <div className='max-w-md w-full'>
        {/* Back to Home Link */}
        <motion.div
          className='mb-8'
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            to='/'
            className='flex items-center gap-2 text-gray-300 hover:text-white transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
            <span className='text-sm'>Back to Home</span>
          </Link>
        </motion.div>

        <GlassContainer variant='card'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className='text-center mb-8'>
              <div className='w-16 h-16 bg-gradient-to-br from-cyber-green-400 to-cyber-green-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                <UserPlus className='w-8 h-8 text-white' />
              </div>

              <h1 className='text-3xl font-bold text-white mb-2'>Join CHESS Quest</h1>
              <p className='text-gray-200'>Create your account to start learning and earning</p>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className='space-y-6'>
              {/* Email Field */}
              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-200 mb-2'>
                  Email Address
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <Mail className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    id='email'
                    name='email'
                    type='email'
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyber-green-400 transition-all duration-200 ${
                      errors.email ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                    placeholder='Enter your email'
                    disabled={submitting}
                    autoComplete='email'
                  />
                </div>
                {errors.email && <p className='mt-1 text-sm text-red-400'>{errors.email}</p>}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor='password' className='block text-sm font-medium text-gray-200 mb-2'>
                  Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <Lock className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    id='password'
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-12 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyber-green-400 transition-all duration-200 ${
                      errors.password ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                    placeholder='Create a password'
                    disabled={submitting}
                    autoComplete='new-password'
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className='h-5 w-5 text-gray-400 hover:text-gray-300' />
                    ) : (
                      <Eye className='h-5 w-5 text-gray-400 hover:text-gray-300' />
                    )}
                  </button>
                </div>
                {errors.password && <p className='mt-1 text-sm text-red-400'>{errors.password}</p>}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor='confirmPassword'
                  className='block text-sm font-medium text-gray-200 mb-2'
                >
                  Confirm Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <Lock className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    id='confirmPassword'
                    name='confirmPassword'
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-12 py-3 bg-glass border-glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyber-green-400 transition-all duration-200 ${
                      errors.confirmPassword ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                    placeholder='Confirm your password'
                    disabled={submitting}
                    autoComplete='new-password'
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='h-5 w-5 text-gray-400 hover:text-gray-300' />
                    ) : (
                      <Eye className='h-5 w-5 text-gray-400 hover:text-gray-300' />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className='mt-1 text-sm text-red-400'>{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type='submit'
                disabled={submitting || loading}
                className='w-full bg-gradient-to-r from-cyber-green-500 to-cyber-green-600 hover:from-cyber-green-400 hover:to-cyber-green-500 text-white rounded-xl px-6 py-3 font-semibold shadow-lg border border-cyber-green-400/30 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] transition-all duration-200'
                data-testid='btn-signup'
                whileHover={!submitting && !loading ? { scale: 1.02 } : {}}
                whileTap={!submitting && !loading ? { scale: 0.98 } : {}}
              >
                {submitting || loading ? (
                  <div className='flex items-center justify-center gap-2'>
                    <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className='flex items-center justify-center gap-2'>
                    <UserPlus className='w-5 h-5' />
                    <span>Create Account</span>
                  </div>
                )}
              </motion.button>

              {/* Sign In Link */}
              <div className='text-center pt-4 border-t border-glass'>
                <p className='text-gray-400 text-sm mb-2'>Already have an account?</p>
                <Link
                  to='/login'
                  className='text-electric-blue-400 hover:text-electric-blue-300 font-medium transition-colors'
                >
                  Sign In
                </Link>
              </div>
            </form>
          </motion.div>
        </GlassContainer>
      </div>
    </div>
  );
};

export default Signup;
