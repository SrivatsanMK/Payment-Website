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
          style={{ width: '40px', height: '40px', objectFit: 'contain' }}
        />
      </div>
    );
  }

  if (size === 'sm') {
    // Sidebar — sidebar width is 256px, logo ratio is 1.5:1 (landscape)
    // Setting explicit width to fill the sidebar fully, height proportional = 256/1.5 = ~170px
    // But to make it BIGGER we scale up and let the sidebar accommodate it
    return (
      <div
        className={`flex items-center justify-center w-full ${className}`}
        style={{ width: '100%', padding: '0' }}
      >
        <img
          src="/logo.png"
          alt="Green Glide Logistics Logo"
          style={{
            width: '100%',       // fills full 256px sidebar width
            height: 'auto',      // ~170px from aspect ratio  
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    );
  }

  if (size === 'lg') {
    // Login page — make it very wide and tall
    return (
      <div
        className={`flex items-center justify-center w-full ${className}`}
        style={{ width: '100%' }}
      >
        <img
          src="/logo.png"
          alt="Green Glide Logistics Logo"
          style={{
            width: '100%',
            maxWidth: '480px',
            height: 'auto',       // ~320px from aspect ratio at 480px wide
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
        src="/logo.png"
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
