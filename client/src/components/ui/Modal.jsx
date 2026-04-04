import React from 'react';

/**
 * Reusable Modal component for the application
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.footer - Modal footer
 * @param {string} [props.variant='default'] - Optional style variant (e.g., 'kicked', 'banned', 'approval')
 * @param {string} [props.icon] - Optional icon
 */
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  variant = 'default',
  icon
}) => {
  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className={`admin-modal ${variant}-modal`} onClick={(e) => e.stopPropagation()}>
        {icon && <div className="admin-modal-icon">{icon}</div>}
        {title && <h3>{title}</h3>}
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="admin-modal-actions">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
