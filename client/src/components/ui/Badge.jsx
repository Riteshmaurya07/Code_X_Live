import React from 'react';

/**
 * Reusable Badge component
 */
const Badge = ({ children, variant = 'info', className = '' }) => {
  const variants = {
    admin: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    editor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    viewer: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${variants[variant] || variants.info} ${className}`.trim()}>
      {children}
    </span>
  );
};

export default Badge;
