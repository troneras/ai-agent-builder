import React, { useState } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import TestimonialsSection from './components/TestimonialsSection';
import PricingSection from './components/PricingSection';
import Footer from './components/Footer';
import RegistrationForm from './components/RegistrationForm';
import OnboardingChat from './components/OnboardingChat';
import ParticleBackground from './components/ParticleBackground';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<{ email: string; password: string } | null>(null);

  const handleStartBuilding = () => {
    setAuthMode('register');
    setShowAuth(true);
  };

  const handleShowAuth = (mode: 'register' | 'login') => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleAuthComplete = (userData: { email: string; password: string }) => {
    setUser(userData);
    setShowAuth(false);
    setShowOnboarding(true);
  };

  const handleAuthClose = () => {
    setShowAuth(false);
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  return (
    <div className="relative">
      <ParticleBackground />
      
      <Header onStartBuilding={handleStartBuilding} onShowAuth={handleShowAuth} />
      
      <main className="relative z-10">
        <HeroSection onStartBuilding={handleStartBuilding} />
        <FeaturesSection />
        <HowItWorksSection onStartBuilding={handleStartBuilding} />
        <TestimonialsSection />
        <PricingSection onStartBuilding={handleStartBuilding} />
      </main>

      <Footer />

      {showAuth && (
        <RegistrationForm 
          onClose={handleAuthClose}
          onComplete={handleAuthComplete}
          mode={authMode}
          onSwitchMode={setAuthMode}
        />
      )}

      {showOnboarding && user && (
        <OnboardingChat onClose={handleOnboardingClose} />
      )}
    </div>
  );
}

export default App;