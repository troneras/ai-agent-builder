import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  onStartBuilding: () => void;
  onShowAuth: (mode: 'register' | 'login') => void;
}

const Header: React.FC<HeaderProps> = ({ onStartBuilding, onShowAuth }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

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

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
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
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;