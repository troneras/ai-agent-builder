import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  variant = 'default',
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const getTextColor = () => {
    switch (variant) {
      case 'white':
        return 'text-white';
      case 'dark':
        return 'text-gray-900';
      default:
        return 'text-gray-900';
    }
  };

  const textColor = getTextColor();

  // Always use the icon-only version for the image, but control text display with showText
  const logoSrc = '/cutcall-logo-icon.png';

  return (
    <div className={`flex items-center gap-3 py-2 ${className}`}>
      <div className={`${sizeClasses[size]} relative flex items-center justify-center flex-shrink-0`}>
        <img
          src={logoSrc}
          alt="Cutcall icon"
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error(`Failed to load logo: ${logoSrc}`);
            // Fallback to the full logo if icon fails
            const target = e.target as HTMLImageElement;
            target.src = '/cutcall-logo.png';
          }}
        />
      </div>
      
      {showText && (
        <div className={`font-bold ${textSizeClasses[size]} ${textColor} flex-shrink-0`}>
          <span className={variant === 'white' ? 'text-white' : 'gradient-text'}>Cut</span>
          <span className={textColor}>call</span>
        </div>
      )}
    </div>
  );
};

export default Logo;