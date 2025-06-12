import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface AuthCallbackProps {
  onComplete: () => void;
}

const AuthCallback: React.FC<AuthCallbackProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setStatus('error');
          setMessage(error.message);
          return;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Email confirmed successfully! Redirecting...');
          setTimeout(() => {
            onComplete();
          }, 2000);
        } else {
          setStatus('error');
          setMessage('No active session found. Please try signing in again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    // Check URL for auth tokens
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      handleAuthCallback();
    } else if (user) {
      // User is already authenticated
      setStatus('success');
      setMessage('Already signed in! Redirecting...');
      setTimeout(() => {
        onComplete();
      }, 1000);
    } else {
      setStatus('error');
      setMessage('Invalid authentication link. Please try again.');
    }
  }, [user, onComplete]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8 text-center">
        <Logo size="lg" className="mx-auto mb-6" />
        
        <div className="mb-6">
          {status === 'loading' && (
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          )}
          
          {status === 'success' && (
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {status === 'loading' && 'Confirming your email...'}
          {status === 'success' && 'Email Confirmed!'}
          {status === 'error' && 'Confirmation Failed'}
        </h2>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        {status === 'error' && (
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
          >
            Return to Home
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;