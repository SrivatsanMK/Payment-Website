import React from 'react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', collapsed = false, size = 'md' }) => {
  let imgSizeClass = 'h-24 md:h-28 w-auto max-w-[280px]';

  if (size === 'sm') {
    imgSizeClass = 'h-16 md:h-20 w-auto max-w-[220px]';
  } else if (size === 'md') {
    imgSizeClass = 'h-24 md:h-28 w-auto max-w-[280px]';
  } else if (size === 'lg') {
    imgSizeClass = 'h-36 sm:h-48 md:h-56 w-auto max-w-[420px]';
  }

  if (collapsed) {
    imgSizeClass = 'h-10 w-auto max-w-[48px]';
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="Green Glide Logistics Logo"
        className={`${imgSizeClass} object-contain transition-transform duration-300 hover:scale-105 drop-shadow-md`}
      />
    </div>
  );
};
