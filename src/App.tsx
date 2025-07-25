import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import TestimonialsSection from './components/TestimonialsSection';
import PricingSection from './components/PricingSection';
import Footer from './components/Footer';
import AuthForm from './components/AuthForm';

import Dashboard from './components/Dashboard';
import SquareConnectionPage from './components/SquareConnectionPage';
import BusinessImportScreen from './components/BusinessImportScreen';
import BusinessInfoScreen from './components/BusinessInfoScreen';
import AgentTestScreen from './components/AgentTestScreen';
import ParticleBackground from './components/ParticleBackground';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { useOnboarding } from './hooks/useOnboarding';
import { authHelpers, supabase } from './lib/supabase';

type AppView = 'landing' | 'dashboard' | 'square-connection' | 'business-import' | 'business-info' | 'agent-test';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'forgot-password'>('register');
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [squareConnectionId, setSquareConnectionId] = useState<string | null>(null);
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
        // Check if user has an active Square connection
        checkSquareConnection();
      }
    } else {
      // User not logged in - go to landing
      setCurrentView('landing');
    }
  }, [user, onboarding, loading, profileLoading, onboardingLoading]);

  const checkSquareConnection = async () => {
    if (!user) return;

    try {
      // Check for active Square connection
      const { data: connection } = await supabase
        .from('connections')
        .select('connection_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (connection) {
        setSquareConnectionId(connection.connection_id);

        // Check if import tasks exist and if any are still pending/processing
        const { data: importTasks } = await supabase
          .from('import_tasks')
          .select('status')
          .eq('user_id', user.id)
          .eq('connection_id', connection.connection_id);

        if (importTasks && importTasks.length > 0) {
          const hasIncompleteImports = importTasks.some(task =>
            task.status === 'pending' || task.status === 'processing' || task.status === 'retrying'
          );
          const allCompleted = importTasks.every(task => task.status === 'completed');

          if (hasIncompleteImports) {
            // Still importing - show import screen
            setCurrentView('business-import');
          } else if (allCompleted) {
            // Import completed - check if onboarding has started
            const hasStartedOnboarding = onboarding && (
              onboarding.merchant_id ||
              onboarding.business_name ||
              onboarding.business_type ||
              onboarding.current_step > 1 ||
              onboarding.catalog_data
            );

            if (hasStartedOnboarding && !onboarding.completed) {
              // Import done and onboarding started but not completed - go to business info
              setCurrentView('business-info');
            } else if (hasStartedOnboarding && onboarding.completed) {
              // Everything completed - go to dashboard
              setCurrentView('dashboard');
            } else {
              // Import completed but onboarding not started - show business info
              setCurrentView('business-info');
            }
          } else {
            // Some imports failed or mixed states - show import screen
            setCurrentView('business-import');
          }
        } else {
          // No import tasks yet - this will be handled by the business import screen
          setCurrentView('business-import');
        }
      } else {
        // No Square connection - go to connection page
        setCurrentView('square-connection');
      }
    } catch (error) {
      console.error('Error checking Square connection:', error);
      // Default to Square connection if we can't determine status
      setCurrentView('square-connection');
    }
  };

  const handleStartBuilding = () => {
    if (user) {
      // User is logged in, check current state
      if (onboarding?.completed) {
        setCurrentView('dashboard');
      } else {
        checkSquareConnection();
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
    // The useEffect will handle the redirect based on connection and onboarding status
  };

  const handleAuthClose = () => {
    setShowAuth(false);
  };

  const handleSquareConnected = async () => {
    // When Square is connected, get the connection ID and go directly to import screen
    if (!user) return;

    try {
      // Get the newly created Square connection
      const { data: connection } = await supabase
        .from('connections')
        .select('connection_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (connection) {
        setSquareConnectionId(connection.connection_id);
        setCurrentView('business-import');
      } else {
        // If connection not found, fall back to checking connection status
        checkSquareConnection();
      }
    } catch (error) {
      console.error('Error getting Square connection:', error);
      // Fall back to checking connection status
      checkSquareConnection();
    }
  };

  const handleBusinessImportComplete = () => {
    // When business import is completed, show business info screen
    setCurrentView('business-info');
  };

  const handleBusinessInfoContinue = async () => {
    // When user continues from business info, complete onboarding by storing data in merchant service format
    if (!user) return;

    try {
      console.log('Starting onboarding completion process...');

      // Call the complete-onboarding function to transform and store data
      const { error } = await supabase.functions.invoke('complete-onboarding', {
        body: {
          userId: user.id
        }
      });

      if (error) {
        console.error('Error calling complete-onboarding function:', error);
        throw error;
      }

      console.log('Onboarding completed successfully');

      // Go to agent test screen instead of dashboard
      setCurrentView('agent-test');
    } catch (error) {
      console.error('Error during onboarding completion:', error);
      alert('Failed to complete setup. Please try again.');
    }
  };

  const handleBusinessInfoReimport = async () => {
    // When user wants to reimport, ensure we have the connection ID and go back to import screen
    if (!user) return;

    try {
      // Ensure we have the connection ID for the import screen
      if (!squareConnectionId) {
        const { data: connection } = await supabase
          .from('connections')
          .select('connection_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (connection) {
          setSquareConnectionId(connection.connection_id);
        } else {
          console.error('No active Square connection found');
          // If no connection found, redirect to connection page
          setCurrentView('square-connection');
          return;
        }
      }

      setCurrentView('business-import');
    } catch (error) {
      console.error('Error during reimport setup:', error);
      // Fall back to connection page if we can't get connection
      setCurrentView('square-connection');
    }
  };



  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  const handleGoToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleGoToAgentTest = () => {
    setCurrentView('agent-test');
  };

  const handleSignOut = async () => {
    await authHelpers.signOut();
    setSquareConnectionId(null);
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
    return <Dashboard onBackToLanding={handleBackToLanding} onSignOut={handleSignOut} onGoToAgentTest={handleGoToAgentTest} />;
  }

  if (currentView === 'agent-test') {
    return <AgentTestScreen onGoToDashboard={handleGoToDashboard} onSignOut={handleSignOut} />;
  }

  if (currentView === 'square-connection') {
    return (
      <SquareConnectionPage
        onConnected={handleSquareConnected}
        onSignOut={handleSignOut}
      />
    );
  }

  if (currentView === 'business-import') {
    return (
      <BusinessImportScreen
        connectionId={squareConnectionId || ''}
        onComplete={handleBusinessImportComplete}
        onSignOut={handleSignOut}
      />
    );
  }

  if (currentView === 'business-info') {
    return (
      <BusinessInfoScreen
        onContinue={handleBusinessInfoContinue}
        onSignOut={handleSignOut}
        onReimport={handleBusinessInfoReimport}
      />
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