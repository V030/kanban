/**
 * Toast Utility Functions
 * Simplified helpers for common toast scenarios
 */

import { TOAST_TYPES } from '../contexts/ToastContext';

/**
 * Create a standardized error toast from an API error
 * Handles various error formats commonly returned by the API
 */
export const handleApiError = (error, toast) => {
  if (!error || !toast) return;

  let message = 'An error occurred';
  let type = TOAST_TYPES.ERROR;

  // Handle different error object structures
  if (typeof error === 'string') {
    message = error;
  } else if (error.message) {
    message = error.message;
  } else if (error.response?.data?.message) {
    message = error.response.data.message;
  }

  // Determine type from status code if available
  const status = error.status || error.statusCode || error.response?.status;
  if (status) {
    const STATUS_TO_TYPE = {
      400: TOAST_TYPES.VALIDATION,
      401: TOAST_TYPES.UNAUTHORIZED,
      403: TOAST_TYPES.FORBIDDEN,
      404: TOAST_TYPES.NOT_FOUND,
      409: TOAST_TYPES.CONFLICT,
      429: TOAST_TYPES.RATE_LIMIT,
      500: TOAST_TYPES.ERROR
    };
    type = STATUS_TO_TYPE[status] || TOAST_TYPES.ERROR;
  }

  toast.addToast(message, type);
};

/**
 * Handle successful operation with appropriate toast
 */
export const handleSuccess = (message, toast, options = {}) => {
  return toast.showSuccess(message || 'Operation successful', options);
};

/**
 * Handle form validation errors
 */
export const handleValidationError = (message, toast, options = {}) => {
  return toast.showValidationError(message || 'Please check your input', options);
};

/**
 * Handle permission/access denied errors
 */
export const handleAccessDenied = (message, toast, options = {}) => {
  return toast.showForbidden(message || 'You do not have permission to perform this action', options);
};

/**
 * Handle authentication/token errors
 */
export const handleAuthError = (message, toast, options = {}) => {
  return toast.showUnauthorized(message || 'Please log in to continue', options);
};

/**
 * Handle not found errors
 */
export const handleNotFound = (message, toast, options = {}) => {
  return toast.showNotFound(message || 'The requested item was not found', options);
};

/**
 * Handle conflict/duplicate errors
 */
export const handleConflict = (message, toast, options = {}) => {
  return toast.showConflict(message || 'This item already exists', options);
};

/**
 * Handle rate limiting
 */
export const handleRateLimit = (message, toast, options = {}) => {
  return toast.showRateLimit(message || 'Too many requests. Please try again later', options);
};

/**
 * Batch display multiple messages
 */
export const showMultipleToasts = (messages, type, toast) => {
  return messages.map(msg => toast.addToast(msg, type));
};

export default {
  handleApiError,
  handleSuccess,
  handleValidationError,
  handleAccessDenied,
  handleAuthError,
  handleNotFound,
  handleConflict,
  handleRateLimit,
  showMultipleToasts
};
