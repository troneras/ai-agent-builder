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
import ParticleBackground from './components/ParticleBackground';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { authHelpers } from './lib/supabase';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'forgot-password'>('register');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user);

  const handleStartBuilding = () => {
    if (user) {
      // Check if onboarding is completed
      if (profile?.onboarding_completed) {
        // Redirect to dashboard (for now just show a message)
        alert('Dashboard coming soon! Your phone assistant is ready to use.');
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
    // Don't automatically show onboarding - let the user click "Get Started" again
    // This gives them a chance to see they're logged in
  };

  const handleAuthClose = () => {
    setShowAuth(false);
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  const handleSignOut = async () => {
    await authHelpers.signOut();
    setShowOnboarding(false);
  };

  // Show loading state while checking authentication and profile
  if (loading || (user && profileLoading)) {
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
    </div>
  );
}

export default App;