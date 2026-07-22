import React from 'react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', collapsed = false, size = 'md' }) => {
  let imgSizeClass = 'h-14 w-auto max-w-[200px]';

  if (size === 'sm') {
    imgSizeClass = 'h-11 w-auto max-w-[170px]';
  } else if (size === 'md') {
    imgSizeClass = 'h-16 w-auto max-w-[220px]';
  } else if (size === 'lg') {
    imgSizeClass = 'h-24 md:h-28 w-auto max-w-[280px]';
  }

  if (collapsed) {
    imgSizeClass = 'h-8 w-auto max-w-[36px]';
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="Green Glide Logistics Logo"
        className={`${imgSizeClass} object-contain transition-transform duration-300 hover:scale-105`}
      />
    </div>
  );
};
