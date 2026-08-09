import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}

export const Table: React.FC<TableProps> = ({
  headers,
  children,
  className = '',
  minWidth = 'min-w-[680px]'
}) => {
  return (
    <div
      className={`w-full overflow-x-auto glass-table-container ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      <table className={`w-full ${minWidth} text-left border-collapse`}>
        <thead>
          <tr className="border-b border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-md">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 dark:divide-white/10 text-xs">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
