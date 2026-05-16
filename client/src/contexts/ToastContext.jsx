import React, { createContext, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Create the Toast Context
export const ToastContext = createContext();

// Toast type definitions
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  FAILURE: 'failure',
  FORBIDDEN: 'forbidden',
  UNAUTHORIZED: 'unauthorized',
  NOT_FOUND: 'not-found',
  CONFLICT: 'conflict',
  VALIDATION: 'validation',
  RATE_LIMIT: 'rate-limit',
  INFO: 'info',
  WARNING: 'warning'
};

// Map HTTP status codes to toast types
const STATUS_CODE_TO_TOAST_TYPE = {
  200: TOAST_TYPES.SUCCESS,
  201: TOAST_TYPES.SUCCESS,
  400: TOAST_TYPES.VALIDATION,
  401: TOAST_TYPES.UNAUTHORIZED,
  403: TOAST_TYPES.FORBIDDEN,
  404: TOAST_TYPES.NOT_FOUND,
  409: TOAST_TYPES.CONFLICT,
  413: TOAST_TYPES.VALIDATION,
  429: TOAST_TYPES.RATE_LIMIT,
  500: TOAST_TYPES.ERROR,
  501: TOAST_TYPES.ERROR
};

// Default durations by type
const DEFAULT_DURATIONS = {
  [TOAST_TYPES.SUCCESS]: 4000,
  [TOAST_TYPES.ERROR]: 4000,
  [TOAST_TYPES.FAILURE]: 4000,
  [TOAST_TYPES.FORBIDDEN]: 4000,
  [TOAST_TYPES.UNAUTHORIZED]: 4000,
  [TOAST_TYPES.NOT_FOUND]: 4000,
  [TOAST_TYPES.CONFLICT]: 4000,
  [TOAST_TYPES.VALIDATION]: 4000,
  [TOAST_TYPES.RATE_LIMIT]: 6000,
  [TOAST_TYPES.INFO]: 4000,
  [TOAST_TYPES.WARNING]: 5000
};

// Default icons by type
export const TOAST_ICONS = {
  [TOAST_TYPES.SUCCESS]: '✓',
  [TOAST_TYPES.ERROR]: '✕',
  [TOAST_TYPES.FAILURE]: '✕',
  [TOAST_TYPES.FORBIDDEN]: '🔒',
  [TOAST_TYPES.UNAUTHORIZED]: '👤',
  [TOAST_TYPES.NOT_FOUND]: '🔍',
  [TOAST_TYPES.CONFLICT]: '⚔',
  [TOAST_TYPES.VALIDATION]: '⚠',
  [TOAST_TYPES.RATE_LIMIT]: '⏱',
  [TOAST_TYPES.INFO]: 'ℹ',
  [TOAST_TYPES.WARNING]: '⚠'
};

/**
 * Toast Provider Component
 * Manages the state and display of all toasts in the application
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Add a new toast to the queue
  const addToast = useCallback((message, type = TOAST_TYPES.INFO, options = {}) => {
    const toastId = uuidv4();
    const duration = options.duration ?? DEFAULT_DURATIONS[type];
    
    const newToast = {
      id: toastId,
      message,
      type,
      title: options.title,
      icon: options.icon,
      duration,
      timestamp: Date.now()
    };

    setToasts(prevToasts => [...prevToasts, newToast]);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(toastId);
      }, duration);
    }

    return toastId;
  }, []);

  // Remove a toast by ID
  const removeToast = useCallback((toastId) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== toastId));
  }, []);

  // Show a success toast
  const showSuccess = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.SUCCESS, options);
  }, [addToast]);

  // Show an error toast
  const showError = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.ERROR, options);
  }, [addToast]);

  // Show a warning toast
  const showWarning = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.WARNING, options);
  }, [addToast]);

  // Show an info toast
  const showInfo = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.INFO, options);
  }, [addToast]);

  // Show a validation error toast
  const showValidationError = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.VALIDATION, options);
  }, [addToast]);

  // Show a conflict toast
  const showConflict = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.CONFLICT, options);
  }, [addToast]);

  // Show a forbidden toast
  const showForbidden = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.FORBIDDEN, options);
  }, [addToast]);

  // Show an unauthorized toast
  const showUnauthorized = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.UNAUTHORIZED, options);
  }, [addToast]);

  // Show a not found toast
  const showNotFound = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.NOT_FOUND, options);
  }, [addToast]);

  // Show a rate limit toast
  const showRateLimit = useCallback((message, options) => {
    return addToast(message, TOAST_TYPES.RATE_LIMIT, options);
  }, [addToast]);

  // Handle API response errors and automatically show appropriate toast
  const showFromError = useCallback((error) => {
    if (!error) return;

    let message = error.message || 'An error occurred';
    let type = TOAST_TYPES.ERROR;

    // Try to determine type from status code
    if (error.statusCode || error.status) {
      const statusCode = error.statusCode || error.status;
      type = STATUS_CODE_TO_TOAST_TYPE[statusCode] || TOAST_TYPES.ERROR;
    }

    return addToast(message, type);
  }, [addToast]);

  // Handle HTTP status code directly
  const showFromStatus = useCallback((statusCode, message) => {
    const type = STATUS_CODE_TO_TOAST_TYPE[statusCode] || TOAST_TYPES.ERROR;
    return addToast(message, type);
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showValidationError,
    showConflict,
    showForbidden,
    showUnauthorized,
    showNotFound,
    showRateLimit,
    showFromError,
    showFromStatus
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
