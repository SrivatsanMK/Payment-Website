import React from 'react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', collapsed = false, size = 'md' }) => {
  // Define size-dependent classes to prevent sidebar overflow/clipping
  let iconContainerClass = 'w-40 h-32 md:w-56 md:h-40';
  let textClass = 'text-4xl md:text-5xl';
  let subTextClass = 'text-sm md:text-base';
  let lineClass = 'w-16';

  if (size === 'sm') {
    iconContainerClass = 'w-28 h-24';
    textClass = 'text-2xl';
    subTextClass = 'text-xs';
    lineClass = 'w-10';
  } else if (size === 'md') {
    iconContainerClass = 'w-36 h-28';
    textClass = 'text-3xl';
    subTextClass = 'text-xs';
    lineClass = 'w-12';
  } else if (size === 'lg') {
    iconContainerClass = 'w-44 h-32 md:w-56 md:h-40';
    textClass = 'text-4xl md:text-5xl';
    subTextClass = 'text-sm md:text-base';
    lineClass = 'w-16';
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Icon Part */}
      <div className={`relative flex items-center justify-center mb-1 ${iconContainerClass}`}>
        <svg viewBox="0 0 300 250" className="w-full h-full overflow-visible drop-shadow-xl transition-all duration-300 hover:scale-105">
          <defs>
            <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#70B85E" />
              <stop offset="100%" stopColor="#3A8022" />
            </linearGradient>
            <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1B2B4C" />
              <stop offset="100%" stopColor="#0B152A" />
            </linearGradient>
          </defs>

          {/* Navy Crescent (D Shape) */}
          <path d="M 170 70 
                   C 240 70, 280 120, 270 170 
                   C 260 210, 210 230, 140 230 
                   L 110 230 
                   C 170 230, 230 200, 240 160 
                   C 250 120, 210 90, 170 85 Z" 
                fill="currentColor" className="text-[#122240] dark:text-slate-100" />
                
          {/* Navy Inner Cutout Detail (Negative space motion line) */}
          <path d="M 175 90 C 230 100, 245 135, 235 170" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white dark:text-slate-900" opacity="0.6" />
          
          {/* Green Swoosh */}
          <path d="M 160 85 
                   C 100 85, 70 120, 75 160 
                   C 80 200, 130 210, 170 190 
                   C 200 175, 215 165, 230 150
                   L 215 140
                   C 200 155, 180 170, 150 180
                   C 110 190, 95 180, 95 160
                   C 95 130, 120 100, 160 100 Z" 
                fill="url(#greenGrad)" />
                
          {/* Arrow Head */}
          <path d="M 205 135 L 260 120 L 230 170 L 220 148 Z" fill="url(#greenGrad)" />

          {/* The 3D Box (Package) integrated into the green swoosh */}
          <g transform="translate(85, 120) scale(1.1)">
            {/* Top Face */}
            <path d="M 20 0 L 40 10 L 20 20 L 0 10 Z" fill="#84CC70" />
            {/* Left Face */}
            <path d="M 0 10 L 20 20 L 20 40 L 0 30 Z" fill="#3A8022" />
            {/* Right Face */}
            <path d="M 20 20 L 40 10 L 40 30 L 20 40 Z" fill="#2C6319" />
            {/* White Ribbon (Negative Space Illusion) */}
            <path d="M 8 14 L 12 16 L 12 34 L 8 32 Z" fill="currentColor" className="text-white dark:text-slate-900" />
            <path d="M 8 6 L 20 12 L 24 10 L 12 4 Z" fill="currentColor" className="text-white dark:text-slate-900" />
          </g>

          {/* Leaves */}
          {/* Middle */}
          <path d="M 160 75 C 145 35, 170 20, 160 10 C 185 30, 175 65, 160 75 Z" fill="#509E35" />
          <path d="M 160 75 C 150 45, 160 30, 160 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-white dark:text-slate-900" />
          {/* Left */}
          <path d="M 152 75 C 115 65, 110 35, 120 25 C 140 45, 150 65, 152 75 Z" fill="#509E35" />
          <path d="M 152 75 C 135 60, 125 45, 120 25" fill="none" stroke="currentColor" strokeWidth="2" className="text-white dark:text-slate-900" />
          {/* Right */}
          <path d="M 168 75 C 205 65, 210 35, 200 25 C 180 45, 170 65, 168 75 Z" fill="#509E35" />
          <path d="M 168 75 C 185 60, 195 45, 200 25" fill="none" stroke="currentColor" strokeWidth="2" className="text-white dark:text-slate-900" />
          
          {/* Registered Trademark (R) */}
          <text x="215" y="45" fontSize="24" fontWeight="bold" fill="currentColor" className="text-[#122240] dark:text-slate-100">®</text>
        </svg>
      </div>

      {/* Text Part */}
      {!collapsed && (
        <div className="flex flex-col items-center mt-2">
          <div className={`flex gap-2 ${textClass} font-extrabold tracking-wide uppercase leading-none`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <span className="text-[#509E35]">GREEN</span>
            <span className="text-[#122240] dark:text-slate-100">GLIDE</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 w-full">
            <div className={`h-[2px] ${lineClass} bg-[#509E35]`}></div>
            <span className={`${subTextClass} font-bold tracking-[0.4em] text-[#122240] dark:text-slate-100 uppercase`}>
              Logistics
            </span>
            <div className={`h-[2px] ${lineClass} bg-[#509E35]`}></div>
          </div>
        </div>
      )}
    </div>
  );
};
