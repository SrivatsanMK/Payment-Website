import React from 'react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', collapsed = false, size = 'md' }) => {
  // No background, no card, no border — just the raw transparent logo image, much bigger
  let imgSizeClass = 'h-28 w-auto';

  if (size === 'sm') {
    // Sidebar logo — substantially bigger than before
    imgSizeClass = 'h-24 w-auto';
  } else if (size === 'md') {
    imgSizeClass = 'h-32 w-auto';
  } else if (size === 'lg') {
    // Login page logo — very large and prominent
    imgSizeClass = 'h-44 sm:h-52 w-auto';
  }

  if (collapsed) {
    imgSizeClass = 'h-10 w-auto';
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="Green Glide Logistics Logo"
        className={`${imgSizeClass} object-contain`}
      />
    </div>
  );
};
