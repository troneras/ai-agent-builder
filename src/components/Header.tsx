import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn, User, LogOut, Crown, Clock } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useUserProfile } from '../hooks/useUserProfile';
import Logo from './Logo';

interface HeaderProps {
  onStartBuilding: () => void;
  onShowAuth: (mode: 'register' | 'login') => void;
  user: SupabaseUser | null;
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ onStartBuilding, onShowAuth, user, onSignOut }) => {
  const { profile } = useUserProfile(user);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      
      // Update active section based on scroll position
      const sections = ['features', 'how-it-works', 'testimonials', 'pricing'];
      const scrollPosition = window.scrollY + 100; // Offset for header height
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
      
      // Clear active section if at top
      if (window.scrollY < 100) {
        setActiveSection('');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
    { label: 'Testimonials', href: '#testimonials', id: 'testimonials' },
    { label: 'Pricing', href: '#pricing', id: 'pricing' }
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      const headerHeight = 80; // Account for fixed header
      const elementPosition = element.offsetTop - headerHeight;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getSubscriptionBadge = () => {
    if (!profile) return null;

    const { subscription_status, subscription_plan, trial_ends_at } = profile;
    
    if (subscription_status === 'trial') {
      const trialEnd = trial_ends_at ? new Date(trial_ends_at) : null;
      const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      return (
        <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
          <Clock className="w-3 h-3" />
          {daysLeft > 0 ? `${daysLeft} days left` : 'Trial expired'}
        </div>
      );
    }

    if (subscription_status === 'active') {
      const planColors = {
        starter: 'bg-blue-100 text-blue-700',
        professional: 'bg-purple-100 text-purple-700',
        enterprise: 'bg-green-100 text-green-700'
      };

      return (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${planColors[subscription_plan]}`}>
          <Crown className="w-3 h-3" />
          {subscription_plan.charAt(0).toUpperCase() + subscription_plan.slice(1)}
        </div>
      );
    }

    return null;
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' 
          : 'bg-transparent'
      }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo with proper padding */}
          <div className="flex items-center">
            <Logo 
              size="lg" 
              showText={true}
              variant={isScrolled ? 'default' : 'white'}
              className="flex-shrink-0"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8" aria-label="Main navigation">
            {navLinks.map((link, index) => (
              <button
                key={index}
                onClick={() => scrollToSection(link.href)}
                className={`relative font-medium transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-lg px-3 py-2 group ${
                  isScrolled 
                    ? 'text-gray-700 hover:text-purple-600' 
                    : 'text-white/90 hover:text-white drop-shadow-sm'
                }`}
                style={!isScrolled ? { textShadow: '1px 1px 2px rgba(0,0,0,0.5)' } : {}}
              >
                {link.label}
                
                {/* Animated underline */}
                <span 
                  className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 transform origin-left transition-all duration-300 ${
                    activeSection === link.id 
                      ? 'scale-x-100 opacity-100' 
                      : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </nav>

          {/* Desktop Auth/User Section */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 ${
                    isScrolled
                      ? 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500/50'
                      : 'text-white/90 hover:bg-white/10 focus:ring-white/50'
                  }`}
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    isScrolled ? 'bg-purple-100 text-purple-600' : 'bg-white/20 text-white'
                  }`}>
                    {getUserInitials(user.email || '')}
                  </div>
                  <div className="hidden xl:block">
                    <div className="text-sm">{user.email}</div>
                    {getSubscriptionBadge()}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      {profile && (
                        <div className="flex items-center justify-between mt-2">
                          {getSubscriptionBadge()}
                          {!profile.onboarding_completed && (
                            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              Setup incomplete
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onStartBuilding();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      {profile?.onboarding_completed ? 'Dashboard' : 'Complete Setup'}
                    </button>
                    
                    <hr className="my-2 border-gray-100" />
                    
                    <button
                      onClick={() => {
                        onSignOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => onShowAuth('login')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 flex items-center gap-2 ${
                    isScrolled
                      ? 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500/50'
                      : 'text-white/90 hover:bg-white/10 focus:ring-white/50'
                  }`}
                  aria-label="Sign in to your account"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  Sign In
                </button>
                
                <button
                  onClick={onStartBuilding}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 ${
                    isScrolled
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 focus:ring-purple-500/50 shadow-lg hover:shadow-xl'
                      : 'bg-white text-purple-600 hover:bg-gray-50 focus:ring-white/50 shadow-xl hover:shadow-2xl'
                  }`}
                  aria-label="Start setting up your phone assistant"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
              isScrolled 
                ? 'text-gray-700 hover:bg-gray-100' 
                : 'text-white hover:bg-white/10'
            }`}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-lg">
            <nav className="px-4 py-6 space-y-4" aria-label="Mobile navigation">
              {navLinks.map((link, index) => (
                <button
                  key={index}
                  onClick={() => {
                    scrollToSection(link.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left font-medium py-2 transition-colors focus:outline-none relative group ${
                    activeSection === link.id 
                      ? 'text-purple-600' 
                      : 'text-gray-700 hover:text-purple-600'
                  }`}
                >
                  {link.label}
                  
                  {/* Mobile underline */}
                  <span 
                    className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 transform origin-left transition-all duration-300 ${
                      activeSection === link.id 
                        ? 'scale-x-100 opacity-100' 
                        : 'scale-x-0 opacity-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              ))}
              
              <div className="pt-4 border-t border-gray-200 space-y-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-2 py-2 text-gray-700">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-semibold">
                        {getUserInitials(user.email || '')}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">{user.email}</div>
                        {getSubscriptionBadge()}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        onStartBuilding();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-gray-700 hover:text-purple-600 font-medium py-2 transition-colors focus:outline-none flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      {profile?.onboarding_completed ? 'Dashboard' : 'Complete Setup'}
                    </button>
                    
                    <button
                      onClick={() => {
                        onSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-red-600 hover:text-red-700 font-medium py-2 transition-colors focus:outline-none flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onShowAuth('login');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-gray-700 hover:text-purple-600 font-medium py-2 transition-colors focus:outline-none flex items-center gap-2"
                      aria-label="Sign in to your account"
                    >
                      <LogIn className="w-4 h-4" aria-hidden="true" />
                      Sign In
                    </button>
                    
                    <button
                      onClick={() => {
                        onStartBuilding();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                      aria-label="Start setting up your phone assistant"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
};

export default Header;