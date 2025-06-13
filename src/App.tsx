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
import ParticleBackground from './components/ParticleBackground';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { useOnboarding } from './hooks/useOnboarding';
import { authHelpers } from './lib/supabase';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'forgot-password'>('register');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user);
  const { onboarding, loading: onboardingLoading } = useOnboarding(user);

  // Auto-show onboarding if user is logged in but hasn't completed onboarding
  useEffect(() => {
    if (user && onboarding && !onboardingLoading) {
      if (!onboarding.completed) {
        setShowOnboarding(true);
      }
    }
  }, [user, onboarding, onboardingLoading]);

  const handleStartBuilding = () => {
    if (user) {
      // Check if onboarding is completed
      if (onboarding?.completed) {
        // Show dashboard
        setShowDashboard(true);
      } else {
        // Show onboarding
        setShowOnboarding(true);
      }
    } else {
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
    // Don't automatically show onboarding here - the useEffect will handle it
    // This gives the onboarding time to load and the useEffect will trigger onboarding
  };

  const handleAuthClose = () => {
    setShowAuth(false);
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    // If onboarding was completed, show dashboard
    if (onboarding?.completed) {
      setShowDashboard(true);
    }
  };

  const handleDashboardClose = () => {
    setShowDashboard(false);
  };

  const handleSignOut = async () => {
    await authHelpers.signOut();
    setShowOnboarding(false);
    setShowDashboard(false);
  };

  // Show loading state while checking authentication and profile
  if (loading || (user && (profileLoading || onboardingLoading))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

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

      {showOnboarding && user && (
        <OnboardingChat onClose={handleOnboardingClose} />
      )}

      {showDashboard && user && (
        <Dashboard onClose={handleDashboardClose} />
      )}
    </div>
  );
}

export default App;