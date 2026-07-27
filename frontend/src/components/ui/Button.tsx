import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md';

  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-500 text-white font-bold shadow-lg shadow-primary-600/25 active:scale-95 border border-primary-500/40 dark:bg-primary-600 dark:hover:bg-primary-500 dark:text-white dark:border-primary-400/40',
    secondary: 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border border-slate-700 dark:border-slate-600 shadow-md active:scale-95',
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-500/40 shadow-lg shadow-red-500/20 active:scale-95',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/40 shadow-lg shadow-emerald-500/20 active:scale-95',
    outline: 'border border-slate-300 dark:border-white/20 bg-slate-100/80 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-100 active:scale-95',
    ghost: 'bg-transparent hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 active:scale-95',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { scale: 1.03, y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...(props as any)}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
};

export default Button;
