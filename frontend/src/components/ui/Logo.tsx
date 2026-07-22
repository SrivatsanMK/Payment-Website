import React from 'react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', collapsed = false, size = 'md' }) => {

  if (collapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src="/logo.png"
          alt="Green Glide Logistics Logo"
          className="h-10 w-10 object-contain"
        />
      </div>
    );
  }

  if (size === 'sm') {
    // Sidebar: fill the full width, very tall
    return (
      <div className={`flex items-center justify-center w-full ${className}`}>
        <img
          src="/logo.png"
          alt="Green Glide Logistics Logo"
          className="w-full h-auto object-contain"
          style={{ minHeight: '180px', maxHeight: '240px' }}
        />
      </div>
    );
  }

  if (size === 'lg') {
    // Login page: extremely large
    return (
      <div className={`flex items-center justify-center w-full ${className}`}>
        <img
          src="/logo.png"
          alt="Green Glide Logistics Logo"
          className="w-full h-auto object-contain"
          style={{ minHeight: '260px', maxHeight: '320px' }}
        />
      </div>
    );
  }

  // md (default)
  return (
    <div className={`flex items-center justify-center w-full ${className}`}>
      <img
        src="/logo.png"
        alt="Green Glide Logistics Logo"
        className="w-full h-auto object-contain"
        style={{ minHeight: '200px', maxHeight: '280px' }}
      />
    </div>
  );
};
