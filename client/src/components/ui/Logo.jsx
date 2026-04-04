import React from 'react';

/**
 * Reusable Logo component for branding consistency
 * @param {Object} props
 * @param {string} [props.className=''] - Additional classes
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - size variant
 * @param {string} [props.alt='CodeX Live'] - Alt text
 */
const Logo = ({ className = '', size = 'md', alt = 'CodeX Live' }) => {
  const width = size === 'sm' ? '80px' : size === 'lg' ? '140px' : '100px';
  
  return (
    <img 
      src="/images/codeXlive.png" 
      alt={alt} 
      className={className}
      style={{ width, objectFit: 'contain' }}
    />
  );
};

export default Logo;
