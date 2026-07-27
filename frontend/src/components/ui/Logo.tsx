import React from 'react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Cache-busting: forces the browser to load the latest logo file every time
const LOGO_SRC = `/logo.png?v=${Date.now()}`;

export const Logo: React.FC<LogoProps> = ({ className = '', collapsed = false, size = 'md' }) => {

  if (collapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src={LOGO_SRC}
          alt="Green Glide Logistics Logo"
          style={{ width: '40px', height: '40px', objectFit: 'contain' }}
        />
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div
        className={`flex items-center justify-center w-full ${className}`}
        style={{ width: '100%', padding: '0' }}
      >
        <img
          src={LOGO_SRC}
          alt="Green Glide Logistics Logo"
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div
        className={`flex items-center justify-center w-full ${className}`}
        style={{ width: '100%' }}
      >
        <img
          src={LOGO_SRC}
          alt="Green Glide Logistics Logo"
          style={{
            width: '100%',
            maxWidth: '480px',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    );
  }

  // md
  return (
    <div
      className={`flex items-center justify-center w-full ${className}`}
      style={{ width: '100%' }}
    >
      <img
        src={LOGO_SRC}
        alt="Green Glide Logistics Logo"
        style={{
          width: '100%',
          maxWidth: '400px',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
};
