import React from 'react';

/**
 * Reusable Textarea component
 */
const Textarea = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  className = '', 
  required = false,
  rows = 3,
  error,
  ...props 
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        rows={rows}
        className={`w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-500 ring-red-500/20' : ''} ${className}`.trim()}
        {...props}
      />
      {error && <span className="text-xs text-red-500 mt-1 ml-1">{error}</span>}
    </div>
  );
};

export default Textarea;
