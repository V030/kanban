import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

/**
 * Custom hook to use the Toast Context
 * Provides access to all toast methods
 * 
 * Usage:
 * const toast = useToast();
 * toast.showSuccess('Operation completed');
 * toast.showError('Something went wrong');
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

export default useToast;
