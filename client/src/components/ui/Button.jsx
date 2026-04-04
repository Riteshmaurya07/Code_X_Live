import React from 'react';

/**
 * Reusable Button component that maps to project's CSS classes
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {'primary' | 'success' | 'danger' | 'outline' | 'none'} [props.variant='primary'] - Style variant
 * @param {'sm' | 'md'} [props.size='md'] - size variant
 * @param {boolean} [props.fullWidth=false] - Whether button should take 100% width
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  type = 'button', 
  disabled = false, 
  onClick,
  fullWidth = false,
  ...props 
}) => {
  const variantClass = variant !== 'none' ? `btn-${variant}` : '';
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  const widthClass = fullWidth ? 'full-width' : '';
  
  return (
    <button
      type={type}
      className={`${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
