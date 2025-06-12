import React from 'react';
import Logo from './Logo';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Help Center', href: '#' },
    { label: 'Contact', href: 'mailto:hello@cutcall.com' },
    { label: 'System Status', href: '#' }
  ];

  return (
    <footer className="bg-gray-900 text-white py-12 px-4" role="contentinfo">
      <div className="max-w-6xl mx-auto">
        {/* Main footer content */}
        <div className="flex flex-col items-center space-y-8">
          {/* Logo - Made larger */}
          <Logo variant="white" size="xl" />
          
          {/* Links */}
          <nav className="w-full" aria-label="Footer navigation">
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-gray-300" role="list">
              {links.map((link, index) => (
                <li key={index} role="listitem">
                  <a 
                    href={link.href}
                    className="hover:text-white transition-colors duration-200 focus:outline-none focus:text-white focus:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Bottom section */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full pt-8 border-t border-gray-800 gap-4">
            <div className="text-gray-400 text-sm">
              © {currentYear} Cutcall. All rights reserved.
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Made with</span>
              <span className="text-red-400" aria-label="love">❤️</span>
              <span>for small businesses</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;