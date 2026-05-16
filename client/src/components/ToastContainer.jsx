import React from 'react';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import './ToastContainer.css';

/**
 * Toast Container Component
 * Manages display and stacking of all active toasts
 * - Displays toasts in bottom-right corner
 * - Handles stacking order (newest on top)
 * - Removes dismissed toasts
 * - Mobile responsive positioning
 */
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  // Show maximum 3 toasts, older ones are hidden
  const visibleToasts = toasts.slice(-3);

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {visibleToasts.map((toast, index) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={removeToast}
          style={{
            // Stagger toasts vertically
            '--toast-index': index
          }}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
