import React, { useState } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import TestimonialsSection from './components/TestimonialsSection';
import PricingSection from './components/PricingSection';
import Footer from './components/Footer';
import OnboardingChat from './components/OnboardingChat';
import ParticleBackground from './components/ParticleBackground';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleStartBuilding = () => {
    setShowOnboarding(true);
  };

  return (
    <div className="relative">
      <ParticleBackground />
      
      <Header onStartBuilding={handleStartBuilding} />
      
      <main className="relative z-10">
        <HeroSection onStartBuilding={handleStartBuilding} />
        <FeaturesSection />
        <HowItWorksSection onStartBuilding={handleStartBuilding} />
        <TestimonialsSection />
        <PricingSection onStartBuilding={handleStartBuilding} />
      </main>

      <Footer />

      {showOnboarding && (
        <OnboardingChat onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}

export default App;