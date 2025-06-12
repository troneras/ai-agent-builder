import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { authHelpers } from '../lib/supabase';
import Logo from './Logo';

interface AuthFormProps {
  onClose: () => void;
  onComplete: () => void;
  initialMode?: 'register' | 'login' | 'forgot-password';
}

type AuthMode = 'register' | 'login' | 'forgot-password' | 'check-email' | 'reset-password';

interface FormData {
  email: string;
  password: string;
  confirmPassword?: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ onClose, onComplete, initialMode = 'register' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors as user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear general message
    if (message) {
      setMessage(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (mode !== 'forgot-password') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if ((mode === 'register' || mode === 'reset-password') && !validatePassword(formData.password)) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      
      if (mode === 'register' && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      switch (mode) {
        case 'register': {
          const { data, error } = await authHelpers.signUp(formData.email, formData.password);
          
          if (error) {
            setMessage({ type: 'error', text: error.message });
          } else if (data.user && !data.session) {
            // Email confirmation required
            setMode('check-email');
            setMessage({ 
              type: 'success', 
              text: 'Please check your email and click the confirmation link to complete your registration.' 
            });
          } else if (data.session) {
            // User is signed in immediately (email confirmation disabled)
            onComplete();
          }
          break;
        }
        
        case 'login': {
          const { data, error } = await authHelpers.signIn(formData.email, formData.password);
          
          if (error) {
            if (error.message.includes('Email not confirmed')) {
              setMessage({ 
                type: 'error', 
                text: 'Please check your email and click the confirmation link before signing in.' 
              });
            } else if (error.message.includes('Invalid login credentials')) {
              setMessage({ type: 'error', text: 'Invalid email or password. Please try again.' });
            } else {
              setMessage({ type: 'error', text: error.message });
            }
          } else if (data.session) {
            onComplete();
          }
          break;
        }
        
        case 'forgot-password': {
          const { error } = await authHelpers.resetPassword(formData.email);
          
          if (error) {
            setMessage({ type: 'error', text: error.message });
          } else {
            setMode('check-email');
            setMessage({ 
              type: 'success', 
              text: 'Password reset instructions have been sent to your email.' 
            });
          }
          break;
        }
        
        case 'reset-password': {
          const { error } = await authHelpers.updatePassword(formData.password);
          
          if (error) {
            setMessage({ type: 'error', text: error.message });
          } else {
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setTimeout(() => {
              onComplete();
            }, 2000);
          }
          break;
        }
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'register': return 'Get Started with Cutcall';
      case 'login': return 'Welcome Back';
      case 'forgot-password': return 'Reset Your Password';
      case 'check-email': return 'Check Your Email';
      case 'reset-password': return 'Set New Password';
      default: return 'Authentication';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'register': return 'Create your account to continue';
      case 'login': return 'Sign in to your account';
      case 'forgot-password': return 'Enter your email to receive reset instructions';
      case 'check-email': return 'We sent you an email';
      case 'reset-password': return 'Enter your new password';
      default: return '';
    }
  };

  const benefits = [
    "Get your phone assistant in minutes",
    "Never miss another customer call",
    "No setup fees or long-term contracts",
    "Cancel anytime"
  ];

  // Check email view
  if (mode === 'check-email') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-labelledby="auth-title" aria-modal="true">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Logo size="md" showText={false} />
              <div>
                <h2 id="auth-title" className="text-xl font-bold text-gray-900">{getTitle()}</h2>
                <p className="text-sm text-gray-500">{getSubtitle()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            
            {message && (
              <div className={`p-4 rounded-xl mb-6 ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            )}

            <p className="text-gray-600 mb-6">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => setMode(mode === 'check-email' && formData.password ? 'register' : 'forgot-password')}
                className="text-purple-600 hover:text-purple-700 font-medium focus:outline-none focus:underline"
              >
                try again
              </button>
            </p>

            <button
              onClick={() => setMode('login')}
              className="text-purple-600 hover:text-purple-700 font-medium focus:outline-none focus:underline"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-labelledby="auth-title" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={false} />
            <div>
              <h2 id="auth-title" className="text-xl font-bold text-gray-900">{getTitle()}</h2>
              <p className="text-sm text-gray-500">{getSubtitle()}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Close authentication form"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error/Success Message */}
          {message && (
            <div className={`p-4 rounded-xl mb-6 ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    errors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
                  }`}
                  placeholder="your@email.com"
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            {mode !== 'forgot-password' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {mode === 'reset-password' ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                      errors.password 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
                    }`}
                    placeholder={mode === 'register' || mode === 'reset-password' ? "Create a secure password" : "Enter your password"}
                    aria-describedby={errors.password ? "password-error" : ((mode === 'register' || mode === 'reset-password') ? "password-help" : undefined)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-r-xl"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.password}
                  </p>
                )}
                {(mode === 'register' || mode === 'reset-password') && !errors.password && (
                  <p id="password-help" className="mt-1 text-sm text-gray-500">
                    Must be at least 6 characters
                  </p>
                )}
              </div>
            )}

            {/* Confirm Password Field */}
            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={formData.confirmPassword || ''}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                      errors.confirmPassword 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
                    }`}
                    placeholder="Confirm your password"
                    aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-r-xl"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Benefits (only show for registration) */}
          {mode === 'register' && (
            <div className="bg-purple-50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-purple-800 mb-3">What you'll get:</h3>
              <ul className="space-y-2" role="list">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-purple-700" role="listitem">
                    <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Forgot Password Link */}
          {mode === 'login' && (
            <div className="text-right mb-6">
              <button
                type="button"
                onClick={() => setMode('forgot-password')}
                className="text-sm text-purple-600 hover:text-purple-700 focus:outline-none focus:underline"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-500/50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></div>
            ) : (
              <>
                {mode === 'register' && 'Create Account & Continue'}
                {mode === 'login' && 'Sign In'}
                {mode === 'forgot-password' && 'Send Reset Instructions'}
                {mode === 'reset-password' && 'Update Password'}
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </>
            )}
          </button>

          {/* Navigation Links */}
          <div className="mt-6 text-center space-y-2">
            {mode === 'forgot-password' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-700 focus:outline-none focus:underline mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            )}
            
            {(mode === 'register' || mode === 'login') && (
              <p className="text-sm text-gray-600">
                {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
                  className="text-purple-600 hover:text-purple-700 font-medium focus:outline-none focus:underline"
                >
                  {mode === 'register' ? 'Sign In' : 'Create Account'}
                </button>
              </p>
            )}
          </div>

          {/* Terms (only show for registration) */}
          {mode === 'register' && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-purple-600 hover:text-purple-700 underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-purple-600 hover:text-purple-700 underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthForm;