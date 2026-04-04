import React from 'react';

/**
 * Reusable Input component with label support
 * @param {Object} props
 * @param {string} props.label - Optional label
 * @param {string} props.type - Input type
 * @param {string} props.placeholder - Input placeholder
 * @param {any} props.value - Input value
 * @param {function} props.onChange - Change handler
 * @param {boolean} [props.required=false] - Whether input is required
 * @param {string} [props.className=''] - Additional classes
 */
const Input = ({ 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  className = '', 
  required = false,
  ...props 
}) => {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={className}
        {...props}
      />
    </div>
  );
};

export default Input;
