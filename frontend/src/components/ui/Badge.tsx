import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normStatus = status.trim().toUpperCase();

  const colors: Record<string, string> = {
    // Invoice / Payment Statuses
    PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30',
    PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30',
    OVERDUE: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 border border-rose-200/50 dark:border-rose-900/30',
    FAILED: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/50 dark:border-red-900/30',
    COMPLETED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30',
    CANCELLED: 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/30',

    // Customer Statuses
    ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30',
    SUSPENDED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 border border-rose-200/50 dark:border-rose-900/30',
  };

  const currentStyle = colors[normStatus] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 border border-slate-200 dark:border-slate-750';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${currentStyle} ${className}`}>
      {status}
    </span>
  );
};

export default Badge;
