import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import TestimonialsSection from './components/TestimonialsSection';
import PricingSection from './components/PricingSection';
import Footer from './components/Footer';
import AuthForm from './components/AuthForm';
import OnboardingChat from './components/OnboardingChat';
import Dashboard from './components/Dashboard';
import SquareConnectionPage from './components/SquareConnectionPage';
import ParticleBackground from './components/ParticleBackground';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { useOnboarding } from './hooks/useOnboarding';
import { authHelpers } from './lib/supabase';

type AppView = 'landing' | 'dashboard' | 'square-connection' | 'onboarding';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'forgot-password'>('register');
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const { user, loading } = useAuth();
  const { loading: profileLoading } = useUserProfile(user);
  const { onboarding, loading: onboardingLoading } = useOnboarding(user);

  // Auto-redirect logic when user state changes
  useEffect(() => {
    if (loading || profileLoading || onboardingLoading) return;

    if (user) {
      // User is logged in
      if (onboarding?.completed) {
        // Onboarding completed - go to dashboard
        setCurrentView('dashboard');
      } else {
        // Check if user has started onboarding (has any data filled)
        const hasStartedOnboarding = onboarding && (
          onboarding.user_name || 
          onboarding.business_name || 
          onboarding.business_type ||
          onboarding.current_step > 1
        );

        if (hasStartedOnboarding) {
          // User has started onboarding - go to chat
          setCurrentView('onboarding');
        } else {
          // New user - start with Square connection
          setCurrentView('square-connection');
        }
      }
    } else {
      // User not logged in - go to landing
      setCurrentView('landing');
    }
  }, [user, onboarding, loading, profileLoading, onboardingLoading]);

  const handleStartBuilding = () => {
    if (user) {
      // User is logged in, check onboarding status
      if (onboarding?.completed) {
        setCurrentView('dashboard');
      } else {
        // Check if user should go to Square connection or onboarding chat
        const hasStartedOnboarding = onboarding && (
          onboarding.user_name || 
          onboarding.business_name || 
          onboarding.business_type ||
          onboarding.current_step > 1
        );

        if (hasStartedOnboarding) {
          setCurrentView('onboarding');
        } else {
          setCurrentView('square-connection');
        }
      }
    } else {
      // User not logged in, show registration
      setAuthMode('register');
      setShowAuth(true);
    }
  };

  const handleShowAuth = (mode: 'register' | 'login') => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleAuthComplete = () => {
    setShowAuth(false);
    // The useEffect will handle the redirect based on onboarding status
  };

  const handleAuthClose = () => {
    setShowAuth(false);
  };

  const handleSquareConnected = () => {
    // When Square is connected, move to onboarding chat
    setCurrentView('onboarding');
  };

  const handleSquareSkipped = () => {
    // When Square is skipped, move to onboarding chat
    setCurrentView('onboarding');
  };

  const handleOnboardingComplete = () => {
    // When onboarding is completed, redirect to dashboard
    setCurrentView('dashboard');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  const handleSignOut = async () => {
    await authHelpers.signOut();
    setCurrentView('landing');
  };

  // Show loading state while checking authentication and profile
  if (loading || (user && (profileLoading || onboardingLoading))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render based on current view
  if (currentView === 'dashboard') {
    return <Dashboard onBackToLanding={handleBackToLanding} onSignOut={handleSignOut} />;
  }

  if (currentView === 'square-connection') {
    return (
      <SquareConnectionPage 
        onConnected={handleSquareConnected}
        onSkipped={handleSquareSkipped}
        onSignOut={handleSignOut}
      />
    );
  }

  if (currentView === 'onboarding') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
        <OnboardingChat onComplete={handleOnboardingComplete} onSignOut={handleSignOut} />
      </div>
    );
  }

  // Landing page view
  return (
    <div className="relative">
      <ParticleBackground />

      <Header
        onStartBuilding={handleStartBuilding}
        onShowAuth={handleShowAuth}
        user={user}
        onSignOut={handleSignOut}
      />

      <main className="relative z-10">
        <HeroSection onStartBuilding={handleStartBuilding} />
        <FeaturesSection />
        <HowItWorksSection onStartBuilding={handleStartBuilding} />
        <TestimonialsSection />
        <PricingSection onStartBuilding={handleStartBuilding} />
      </main>

      <Footer />

      {showAuth && (
        <AuthForm
          onClose={handleAuthClose}
          onComplete={handleAuthComplete}
          initialMode={authMode}
        />
      )}
    </div>
  );
}

export default App;