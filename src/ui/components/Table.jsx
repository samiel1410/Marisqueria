import React from 'react';

export const Table = ({ children, className = '' }) => (
  <div className={`overflow-hidden rounded-3xl shadow-soft border border-primary-200/50 ${className.includes('bg-') ? '' : 'bg-white'} ${className}`}>
    <table className="w-full text-left">
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children }) => (
  <thead>
    <tr className="bg-primary-900 text-white">
      {children}
    </tr>
  </thead>
);

export const TableHead = ({ children, className = '' }) => (
  <th className={`px-6 py-4 text-sm font-semibold tracking-wide ${className}`}>
    {children}
  </th>
);

export const TableBody = ({ children }) => (
  <tbody className="divide-y divide-primary-100">
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '' }) => (
  <tr className={`transition-colors duration-200 hover:bg-primary-50/50 ${className}`}>
    {children}
  </tr>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`px-6 py-4 text-sm ${className}`}>
    {children}
  </td>
);

export const EmptyState = ({ title, description, icon: Icon, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    {Icon && (
      <div className="p-4 rounded-3xl bg-primary-100 text-primary-400 mb-4">
        <Icon size={40} />
      </div>
    )}
    <h4 className="text-lg font-display font-semibold text-primary-900 mb-2">
      {title}
    </h4>
    <p className="text-primary-500 text-center max-w-sm mb-6">
      {description}
    </p>
    {action}
  </div>
);

export default Table;
