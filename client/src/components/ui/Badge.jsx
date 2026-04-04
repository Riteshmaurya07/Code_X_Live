import React from 'react';

/**
 * Reusable Badge component for roles and language tags
 * @param {Object} props
 * @param {React.ReactNode} props.children - Badge content
 * @param {'admin' | 'editor' | 'viewer' | 'success' | 'danger' | 'warning' | 'info'} [props.variant='editor'] - Style variant
 */
const Badge = ({ children, variant = 'editor', className = '' }) => {
  return (
    <span className={`role-badge role-${variant} ${className}`.trim()}>
      {children}
    </span>
  );
};

export default Badge;
