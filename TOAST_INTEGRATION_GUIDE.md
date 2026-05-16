# Toast Notification System - Integration Guide

## Overview

The Toast Notification System provides a flexible, user-friendly way to display messages to users. It handles all types of responses: success, errors, warnings, info, and various error categories (validation, forbidden, unauthorized, not found, conflict, rate limit).

## Quick Start

### 1. Basic Usage in a Component

```javascript
import { useToast } from '../hooks/useToast';

function MyComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      await someApiCall();
      toast.showSuccess('Operation completed successfully');
    } catch (error) {
      toast.showError(error.message);
    }
  };

  return <button onClick={handleAction}>Perform Action</button>;
}
```

### 2. Common Patterns

#### Success Response
```javascript
const toast = useToast();
toast.showSuccess('Profile updated successfully');
// Auto-dismisses after 4 seconds
```

#### Error Response
```javascript
const toast = useToast();
toast.showError('Failed to update profile');
// Auto-dismisses after 4 seconds
```

#### Validation Error
```javascript
const toast = useToast();
toast.showValidationError('Email is required');
```

#### Access Denied
```javascript
const toast = useToast();
toast.showForbidden('You do not have permission to perform this action');
```

#### Not Found
```javascript
const toast = useToast();
toast.showNotFound('The requested project could not be found');
```

#### Conflict (Already Exists)
```javascript
const toast = useToast();
toast.showConflict('You are already friends with this user');
```

#### Rate Limited
```javascript
const toast = useToast();
toast.showRateLimit('Too many login attempts. Please try again in 60 seconds');
// Displays longer: 6 seconds
```

#### Info Message
```javascript
const toast = useToast();
toast.showInfo('If the email exists, a password reset code has been sent');
```

#### Warning Message
```javascript
const toast = useToast();
toast.showWarning('This action will affect 5 tasks');
```

#### Unauthorized (Not Logged In)
```javascript
const toast = useToast();
toast.showUnauthorized('Your session has expired. Please log in again');
```

## Advanced Usage

### Custom Options

```javascript
const toast = useToast();

// Override default duration (in milliseconds)
toast.showSuccess('Message', { duration: 6000 });

// Set a title with the message
toast.showWarning('Main message', { 
  title: 'Important',
  duration: 5000 
});

// Custom icon (emoji or unicode character)
toast.showSuccess('File uploaded', { 
  icon: '📁',
  duration: 4000 
});

// No auto-dismiss (user must click close)
toast.showError('Critical error', { duration: 0 });
```

### API Error Handler

```javascript
import { useToast } from '../hooks/useToast';
import { handleApiError } from '../utils/toastHelpers';

function MyComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      await someApiCall();
      toast.showSuccess('Done');
    } catch (error) {
      // Automatically maps status codes to appropriate toast types
      handleApiError(error, toast);
    }
  };
}
```

### HTTP Status Code Mapping

The system automatically maps HTTP status codes to appropriate toast types:

| Status Code | Toast Type | Auto-Dismiss | Color |
|-------------|-----------|--------------|-------|
| 200, 201 | success | 4 sec | Teal |
| 400 | validation | 4 sec | Amber |
| 401 | unauthorized | 4 sec | Red |
| 403 | forbidden | 4 sec | Red |
| 404 | not-found | 4 sec | Red |
| 409 | conflict | 4 sec | Red |
| 413 | validation | 4 sec | Amber |
| 429 | rate-limit | 6 sec | Amber |
| 500 | error | 4 sec | Red |

## Integration with Service Calls

### Update Authentication Service

```javascript
// In authService.js
export const login = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        message: data.message,
        statusCode: response.status,
        response: data
      };
    }

    return data;
  } catch (error) {
    throw error;
  }
};
```

### Update Component Using Service

```javascript
// In LoginPage.jsx
import { useToast } from '../hooks/useToast';
import { login } from '../services/authService';

function LoginPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const result = await login(email, password);
      toast.showSuccess('Login successful');
      // Navigate to dashboard
    } catch (error) {
      toast.showFromError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // JSX
  );
}
```

## Styling & Customization

### Default Colors

Edit [Toast.css](../components/Toast.css) to customize:

```css
:root {
  --toast-teal: #14b8a6;      /* Success */
  --toast-red: #ef4444;       /* Error, Forbidden, etc */
  --toast-blue: #3b82f6;      /* Info */
  --toast-amber: #f59e0b;     /* Warning, Validation */
  --toast-bg: #ffffff;        /* Background */
  --toast-text: #1f2937;      /* Text color */
  --toast-shadow: rgba(0, 0, 0, 0.19);
}
```

### Custom Positioning

To position toasts differently, modify [ToastContainer.css](../components/ToastContainer.css):

```css
.toast-container {
  position: fixed;
  bottom: 16px;     /* Change this */
  right: 16px;      /* Change this */
  z-index: 9999;
}
```

## Toast Types Reference

### Success
- **When**: Operation completed successfully
- **Color**: Teal
- **Icon**: ✓
- **Duration**: 4 seconds
- **Examples**: "Project created", "Task moved", "Profile updated"

### Error
- **When**: Server error or unexpected failure
- **Color**: Red
- **Icon**: ✕
- **Duration**: 4 seconds
- **Examples**: "Server error", "Failed to save changes"

### Failure
- **When**: Business logic violation
- **Color**: Red
- **Icon**: ✕
- **Duration**: 4 seconds
- **Examples**: "Cannot remove project owner"

### Forbidden
- **When**: User lacks permission
- **Color**: Red
- **Icon**: 🔒
- **Duration**: 4 seconds
- **Examples**: "You don't have permission"

### Unauthorized
- **When**: Not authenticated or token expired
- **Color**: Red
- **Icon**: 👤
- **Duration**: 4 seconds
- **Examples**: "Session expired. Please log in again"

### Not Found
- **When**: Resource doesn't exist
- **Color**: Red
- **Icon**: 🔍
- **Duration**: 4 seconds
- **Examples**: "User not found", "Task not found"

### Conflict
- **When**: Duplicate or conflicting data
- **Color**: Red
- **Icon**: ⚔
- **Duration**: 4 seconds
- **Examples**: "Already friends", "Member already assigned"

### Validation
- **When**: Invalid user input
- **Color**: Amber
- **Icon**: ⚠
- **Duration**: 4 seconds
- **Examples**: "Email is required", "Password too short"

### Rate Limit
- **When**: Too many requests
- **Color**: Amber
- **Icon**: ⏱
- **Duration**: 6 seconds
- **Examples**: "Too many login attempts"

### Info
- **When**: Informational message
- **Color**: Blue
- **Icon**: ℹ
- **Duration**: 4 seconds
- **Examples**: "Changes saved"

### Warning
- **When**: Non-critical alert
- **Color**: Amber
- **Icon**: ⚠
- **Duration**: 5 seconds
- **Examples**: "This will affect 5 tasks"

## Mobile Responsiveness

The toast system is fully responsive:

- **Desktop (≥640px)**: 320-400px width, positioned at 16px from edges
- **Tablet (≥768px)**: 320-380px width, positioned at 16px from edges
- **Mobile (≤480px)**: Full width minus 16px margin, positioned at 8px from edges
- **Small Mobile (≤360px)**: Full width minus 8px margin, reduced padding

The toasts automatically adapt font size, padding, and spacing on smaller screens.

## Accessibility

The system includes:

- ✓ ARIA labels and roles (`role="alert"` for errors, `role="status"` for success)
- ✓ Keyboard accessible close button
- ✓ Color contrast (WCAG AA compliant)
- ✓ Respects `prefers-reduced-motion`
- ✓ Respects `prefers-color-scheme` (dark mode)
- ✓ High contrast mode support

## Performance Considerations

- **Maximum visible toasts**: 3 (older toasts are hidden, not displayed)
- **Stacking**: Newest toast appears on top
- **Memory**: Old toasts are automatically removed after dismissal
- **Re-renders**: Optimized with React Context and useCallback

## Migration Guide

### Converting from `alert()` to Toast

**Before:**
```javascript
alert('Project created successfully');
```

**After:**
```javascript
const toast = useToast();
toast.showSuccess('Project created successfully');
```

### Converting from Error State

**Before:**
```javascript
const [error, setError] = useState('');

try {
  await someAction();
} catch (err) {
  setError(err.message);
}

return <div className="error-message">{error}</div>;
```

**After:**
```javascript
const toast = useToast();

try {
  await someAction();
  toast.showSuccess('Action completed');
} catch (err) {
  toast.showError(err.message);
}
```

## Testing

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '../contexts/ToastContext';

describe('Toast Notifications', () => {
  it('should display success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Trigger toast
    fireEvent.click(screen.getByRole('button'));

    // Verify toast appears
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });
});
```

## Troubleshooting

### "useToast must be used within a ToastProvider" error

**Solution**: Make sure the component using `useToast` is wrapped with `ToastProvider`. This is already done in App.js.

### Toasts not appearing

**Solution**: 
1. Check that ToastContainer is in App.js
2. Check browser console for errors
3. Verify component is using useToast correctly

### Toasts stacking incorrectly

**Solution**: The ToastContainer CSS manages stacking. Check that ToastContainer.css is imported and not overridden by other CSS.

### Custom duration not working

**Solution**: Specify duration in milliseconds:
```javascript
toast.showSuccess('Message', { duration: 5000 }); // 5 seconds
```

## Common Use Cases

### Form Submission
```javascript
const handleSubmit = async (formData) => {
  try {
    await submitForm(formData);
    toast.showSuccess('Form submitted successfully');
    resetForm();
  } catch (error) {
    if (error.statusCode === 400) {
      toast.showValidationError(error.message);
    } else {
      toast.showError(error.message);
    }
  }
};
```

### Delete Operation with Confirmation
```javascript
const handleDelete = async (itemId) => {
  if (window.confirm('Are you sure? This cannot be undone.')) {
    try {
      await deleteItem(itemId);
      toast.showSuccess('Item deleted successfully');
      refreshList();
    } catch (error) {
      toast.showError('Failed to delete item');
    }
  }
};
```

### Async Data Loading
```javascript
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await fetchData();
      setData(data);
    } catch (error) {
      toast.showError('Failed to load data');
    }
  };
  loadData();
}, [toast]);
```

## Best Practices

1. ✓ **Be specific**: Use meaningful, action-oriented messages
2. ✓ **Use appropriate types**: Match toast type to the outcome
3. ✓ **Keep messages short**: Aim for 1-2 lines
4. ✓ **Avoid duplicates**: Don't show the same message multiple times
5. ✓ **Use consistent tone**: Match your app's voice
6. ✓ **Test accessibility**: Ensure messages are clear to screen readers
7. ✓ **Don't overuse**: Reserve toasts for important feedback
8. ✓ **Provide context**: Give users actionable next steps when possible

## API Reference

### useToast() Hook

```javascript
const toast = useToast();
```

#### Methods

| Method | Parameters | Returns |
|--------|-----------|---------|
| `addToast(message, type, options)` | message (string), type (TOAST_TYPES), options (object) | toastId (string) |
| `removeToast(toastId)` | toastId (string) | void |
| `showSuccess(message, options)` | message (string), options (object) | toastId (string) |
| `showError(message, options)` | message (string), options (object) | toastId (string) |
| `showWarning(message, options)` | message (string), options (object) | toastId (string) |
| `showInfo(message, options)` | message (string), options (object) | toastId (string) |
| `showValidationError(message, options)` | message (string), options (object) | toastId (string) |
| `showConflict(message, options)` | message (string), options (object) | toastId (string) |
| `showForbidden(message, options)` | message (string), options (object) | toastId (string) |
| `showUnauthorized(message, options)` | message (string), options (object) | toastId (string) |
| `showNotFound(message, options)` | message (string), options (object) | toastId (string) |
| `showRateLimit(message, options)` | message (string), options (object) | toastId (string) |
| `showFromError(error)` | error (object) | toastId (string) |
| `showFromStatus(statusCode, message)` | statusCode (number), message (string) | toastId (string) |

#### Options Object

```javascript
{
  title?: string,           // Optional title above message
  duration?: number,        // Auto-dismiss time in ms (0 = no auto-dismiss)
  icon?: string             // Custom icon (emoji or unicode)
}
```

## Support & Questions

For issues or questions, refer to:
- Analysis document: [TOAST_NOTIFICATION_ANALYSIS.md](../../TOAST_NOTIFICATION_ANALYSIS.md)
- Implementation: [Toast System Components](../components/)
- Context: [ToastContext.jsx](../contexts/ToastContext.jsx)

---

**Last Updated**: May 2026
