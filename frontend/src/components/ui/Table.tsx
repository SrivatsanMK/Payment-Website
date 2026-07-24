import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ headers, children, className = '' }) => {
  return (
    <div className={`w-full overflow-x-auto glass-table-container ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-md">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-300"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 dark:divide-white/10">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
