import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glass = false,
  hoverable = false,
  className = '',
  ...props
}) => {
  const baseStyle = glass
    ? 'glass rounded-xl shadow-premium dark:shadow-dark-premium border border-white/30 dark:border-slate-800/20'
    : 'bg-white dark:bg-slate-850 rounded-xl shadow-premium dark:shadow-dark-premium border border-slate-100 dark:border-slate-800/10';
  
  const hoverStyle = hoverable
    ? 'hover:shadow-premium-hover dark:hover:shadow-dark-premium-hover hover:border-slate-200 dark:hover:border-slate-800/50 hover:-translate-y-0.5 transition-all duration-300'
    : '';

  return (
    <div
      className={`${baseStyle} ${hoverStyle} p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
