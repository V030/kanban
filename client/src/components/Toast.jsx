import React, { useState, useEffect } from 'react';
import { TOAST_ICONS } from '../contexts/ToastContext';
import './Toast.css';

/**
 * Individual Toast Component
 * Displays a single toast notification with:
 * - Auto-dismiss with progress bar
 * - Manual close button
 * - Animations (slide in, fade out)
 * - Mobile-friendly design
 * - Pause on hover
 */
const Toast = ({ id, type, message, title, icon, duration, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);

  // Handle auto-dismiss
  useEffect(() => {
    if (duration <= 0 || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          setIsExiting(true);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [duration, isPaused]);

  // Trigger close when exiting animation completes
  useEffect(() => {
    if (!isExiting) return;

    const timer = setTimeout(() => {
      onClose(id);
    }, 300); // Match CSS animation duration

    return () => clearTimeout(timer);
  }, [isExiting, id, onClose]);

  // Calculate progress percentage
  const progressPercent = (timeLeft / duration) * 100;

  // Get icon for this toast type
  const displayIcon = icon || TOAST_ICONS[type] || '•';

  // Handle close button click
  const handleClose = () => {
    setIsExiting(true);
  };

  // Handle hover to pause/resume auto-dismiss
  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  return (
    <div
      className={`toast toast-${type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      role={type === 'error' || type === 'forbidden' || type === 'unauthorized' || type === 'warning' ? 'alert' : 'status'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Toast content container */}
      <div className="toast-content">
        {/* Icon */}
        <div className="toast-icon" aria-hidden="true">
          {displayIcon}
        </div>

        {/* Message container */}
        <div className="toast-message-container">
          {title && <div className="toast-title">{title}</div>}
          <div className="toast-message">{message}</div>
        </div>
      </div>

      {/* Close button */}
      <button
        className="toast-close-btn"
        onClick={handleClose}
        aria-label="Close notification"
        title="Close"
      >
        ✕
      </button>

      {/* Progress bar (only for timed dismissals) */}
      {duration > 0 && (
        <div
          className="toast-progress"
          style={{
            width: `${progressPercent}%`,
            animation: isPaused ? 'none' : `toast-progress ${duration}ms linear forwards`
          }}
        />
      )}
    </div>
  );
};

export default Toast;
