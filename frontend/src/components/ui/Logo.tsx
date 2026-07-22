import React from 'react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', collapsed = false, size = 'md' }) => {
  let containerSize = 'p-3 rounded-2xl bg-white shadow-md border border-slate-100 dark:border-slate-700/60';
  let imgSizeClass = 'h-20 w-auto max-w-[220px]';

  if (size === 'sm') {
    containerSize = 'p-2.5 rounded-xl bg-white shadow-md border border-slate-100 dark:border-slate-700/60';
    imgSizeClass = 'h-14 md:h-16 w-auto max-w-[180px]';
  } else if (size === 'md') {
    containerSize = 'p-3.5 rounded-2xl bg-white shadow-lg border border-slate-100 dark:border-slate-700/60';
    imgSizeClass = 'h-24 w-auto max-w-[250px]';
  } else if (size === 'lg') {
    containerSize = 'p-4 sm:p-5 rounded-3xl bg-white shadow-xl border border-slate-100 dark:border-slate-700/60';
    imgSizeClass = 'h-28 sm:h-36 w-auto max-w-[320px]';
  }

  if (collapsed) {
    containerSize = 'p-1.5 rounded-lg bg-white shadow-sm';
    imgSizeClass = 'h-9 w-auto max-w-[40px]';
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`flex items-center justify-center transition-all duration-300 hover:scale-[1.03] ${containerSize}`}>
        <img
          src="/logo.png"
          alt="Green Glide Logistics Logo"
          className={`${imgSizeClass} object-contain`}
        />
      </div>
    </div>
  );
};
