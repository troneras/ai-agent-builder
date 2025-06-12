import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import Logo from './Logo';

interface RegistrationFormProps {
  onClose: () => void;
  onComplete: (userData: { email: string; password: string }) => void;
  mode: 'register' | 'login';
  onSwitchMode: (mode: 'register' | 'login') => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onClose, onComplete, mode, onSwitchMode }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors as user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { email?: string; password?: string } = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (mode === 'register' && !validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      onComplete(formData);
    }, 1000);
  };

  const benefits = [
    "Get your phone assistant in minutes",
    "Never miss another customer call",
    "No setup fees or long-term contracts",
    "Cancel anytime"
  ];

  const isRegister = mode === 'register';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-labelledby="auth-title" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={false} />
            <div>
              <h2 id="auth-title" className="text-xl font-bold text-gray-900">
                {isRegister ? 'Get Started with Cutcall' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-gray-500">
                {isRegister ? 'Create your account to continue' : 'Sign in to your account'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label={`Close ${isRegister ? 'registration' : 'login'} form`}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
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
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
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
                  placeholder={isRegister ? "Create a secure password" : "Enter your password"}
                  aria-describedby={errors.password ? "password-error" : (isRegister ? "password-help" : undefined)}
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
              {isRegister && !errors.password && (
                <p id="password-help" className="mt-1 text-sm text-gray-500">
                  Must be at least 6 characters
                </p>
              )}
            </div>
          </div>

          {/* Benefits (only show for registration) */}
          {isRegister && (
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-500/50 flex items-center justify-center gap-2"
            aria-label={isRegister ? "Create account and continue" : "Sign in to account"}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></div>
            ) : (
              <>
                {isRegister ? 'Create Account & Continue' : 'Sign In'}
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </>
            )}
          </button>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => onSwitchMode(isRegister ? 'login' : 'register')}
                className="text-purple-600 hover:text-purple-700 font-medium focus:outline-none focus:underline"
              >
                {isRegister ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>

          {/* Terms (only show for registration) */}
          {isRegister && (
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

export default RegistrationForm;