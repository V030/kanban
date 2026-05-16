import React from 'react';
import { useToast, TOAST_TYPES } from '../contexts/ToastContext';
import './ToastDemo.css';

/**
 * Toast Notification System Demo
 * Showcases all available toast types and their visual appearance
 */
const ToastDemo = () => {
  const toast = useToast();

  // Simulate different types of responses
  const demoToasts = [
    {
      type: TOAST_TYPES.SUCCESS,
      label: 'Success',
      message: 'Project created successfully',
      handler: () => toast.showSuccess('Project created successfully')
    },
    {
      type: TOAST_TYPES.ERROR,
      label: 'Error',
      message: 'Server error - please try again',
      handler: () => toast.showError('Server error - please try again')
    },
    {
      type: TOAST_TYPES.WARNING,
      label: 'Warning',
      message: 'This action will affect 5 tasks',
      handler: () => toast.showWarning('This action will affect 5 tasks')
    },
    {
      type: TOAST_TYPES.INFO,
      label: 'Info',
      message: 'If the email exists, a password reset code has been sent',
      handler: () => toast.showInfo('If the email exists, a password reset code has been sent')
    },
    {
      type: TOAST_TYPES.VALIDATION,
      label: 'Validation Error',
      message: 'Email is required',
      handler: () => toast.showValidationError('Email is required')
    },
    {
      type: TOAST_TYPES.FORBIDDEN,
      label: 'Forbidden',
      message: 'You do not have permission to modify this',
      handler: () => toast.showForbidden('You do not have permission to modify this')
    },
    {
      type: TOAST_TYPES.UNAUTHORIZED,
      label: 'Unauthorized',
      message: 'Session expired. Please log in again.',
      handler: () => toast.showUnauthorized('Session expired. Please log in again.')
    },
    {
      type: TOAST_TYPES.NOT_FOUND,
      label: 'Not Found',
      message: 'Project not found',
      handler: () => toast.showNotFound('Project not found')
    },
    {
      type: TOAST_TYPES.CONFLICT,
      label: 'Conflict',
      message: 'You are already friends with this user',
      handler: () => toast.showConflict('You are already friends with this user')
    },
    {
      type: TOAST_TYPES.RATE_LIMIT,
      label: 'Rate Limit',
      message: 'Too many login attempts. Please try again in 60 seconds',
      handler: () => toast.showRateLimit('Too many login attempts. Please try again in 60 seconds')
    }
  ];

  const handleMultipleToasts = () => {
    toast.showSuccess('First notification');
    setTimeout(() => toast.showInfo('Second notification'), 200);
    setTimeout(() => toast.showWarning('Third notification'), 400);
  };

  const handleCustomOptions = () => {
    toast.showSuccess('Custom duration toast', {
      duration: 6000,
      title: 'Important'
    });
  };

  return (
    <div className="toast-demo-container">
      <div className="toast-demo-header">
        <h1>Toast Notification System Demo</h1>
        <p>Click buttons below to see different toast types in action</p>
      </div>

      {/* Main demo buttons */}
      <div className="toast-demo-grid">
        {demoToasts.map((item) => (
          <button
            key={item.type}
            className={`toast-demo-btn toast-demo-btn-${item.type}`}
            onClick={item.handler}
            title={`Show ${item.label} toast`}
          >
            <div className="btn-label">{item.label}</div>
            <div className="btn-message">{item.message}</div>
          </button>
        ))}
      </div>

      {/* Special demo buttons */}
      <div className="toast-demo-special">
        <h2>Advanced Examples</h2>
        
        <button
          className="toast-demo-btn-special"
          onClick={handleMultipleToasts}
        >
          Show Multiple Toasts (Stacking)
        </button>

        <button
          className="toast-demo-btn-special"
          onClick={handleCustomOptions}
        >
          Show with Custom Options
        </button>

        <button
          className="toast-demo-btn-special"
          onClick={() => {
            const id = toast.showError('This will persist until you close it', {
              duration: 0
            });
          }}
        >
          Show Non-Auto-Dismissing Toast
        </button>

        <button
          className="toast-demo-btn-special"
          onClick={() => {
            toast.showSuccess('Using custom emoji', {
              icon: '🎉'
            });
          }}
        >
          Show with Custom Emoji Icon
        </button>
      </div>

      {/* Info section */}
      <div className="toast-demo-info">
        <h2>Features</h2>
        <ul>
          <li>✓ 11 different toast types for different scenarios</li>
          <li>✓ Auto-dismiss after 4 seconds (configurable)</li>
          <li>✓ Pause auto-dismiss on hover</li>
          <li>✓ Manual close button (✕)</li>
          <li>✓ Visual progress bar</li>
          <li>✓ Smooth animations (slide in/out)</li>
          <li>✓ Multiple toasts stack vertically</li>
          <li>✓ Mobile-friendly design</li>
          <li>✓ Accessible (ARIA labels, keyboard navigation)</li>
          <li>✓ Dark mode support</li>
          <li>✓ Respects prefers-reduced-motion</li>
        </ul>
      </div>

      {/* Usage guide */}
      <div className="toast-demo-usage">
        <h2>Quick Usage</h2>
        <pre>{`import { useToast } from '../hooks/useToast';

function MyComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      await someApiCall();
      toast.showSuccess('Done!');
    } catch (error) {
      toast.showError(error.message);
    }
  };

  return <button onClick={handleAction}>Action</button>;
}`}</pre>
      </div>
    </div>
  );
};

export default ToastDemo;
