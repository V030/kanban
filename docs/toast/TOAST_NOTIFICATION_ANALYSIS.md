# Toast Notification System: Comprehensive Analysis

## Executive Summary

This document provides a complete analysis of all possible system outcomes in the Kanban application and defines the toast notification system requirements based on actual system responses and error codes.

---

## Part 1: System Outcomes Categorization

### 1. SUCCESS (Status: 200, 201)

**Definition**: Operation completed as intended with expected results.

**When it occurs**:
- User successfully logs in / registers
- Task/project created, updated, moved
- Member assigned / role changed
- Friend request accepted
- Password changed/reset successfully
- Comment/reply posted
- Profile updated
- Settings applied

**Visual Representation**:
- **Color**: Teal (#14b8a6 or similar)
- **Icon**: ✓ (checkmark) or ✓ circle
- **Tone**: Positive, confirmatory
- **Duration**: Auto-dismiss in 4 seconds
- **Example Messages**:
  - "Task moved successfully"
  - "Project created successfully"
  - "Profile updated successfully"
  - "Friend request accepted"

**Examples from codebase**:
- Login: "Login Successful"
- Task creation: "Task created successfully"
- Project creation: "Project created successfully"
- Task movement: "Task moved successfully"

---

### 2. ERROR (Status: 500)

**Definition**: Server encountered an unexpected error during processing. System failure, not user error.

**When it occurs**:
- Database connection failures
- Unhandled exceptions in controllers
- Email service failures
- External API failures
- Transaction rollback failures

**Visual Representation**:
- **Color**: Red (#ef4444 or similar)
- **Icon**: ✕ or ⚠ (error icon)
- **Tone**: Critical, urgent attention needed
- **Duration**: Auto-dismiss in 4 seconds (or user-dismissable)
- **Example Messages**:
  - "Server error - please try again"
  - "Unable to load projects"
  - "Failed to save changes"

**Examples from codebase**:
- "Server error"
- "Unable to [operation]"
- "Failed to [operation]"

---

### 3. FAILURE (Status: 500 - Business Logic)

**Definition**: Operation failed due to business logic violation or system state, not user input validation.

**When it occurs**:
- Cannot remove project owner
- Cannot assign task to self when not allowed
- Cannot update task state (missing prerequisites)
- Race condition in concurrent operations
- State constraint violations

**Visual Representation**:
- **Color**: Red (#ef4444 or similar)
- **Icon**: ✕ (error icon)
- **Tone**: Explanatory, indicates constraint violation
- **Duration**: Auto-dismiss in 4 seconds
- **Example Messages**:
  - "Cannot remove project owner"
  - "Task is locked for editing"
  - "Operation not allowed in current state"

**Examples from codebase**:
- "Cannot remove owner"
- "Cannot change owner while members exist"

---

### 4. FORBIDDEN (Status: 403)

**Definition**: User lacks permission to perform the requested action.

**When it occurs**:
- User attempts to modify project they don't own
- Non-owner attempts to delete project
- Non-reviewer attempts to approve task
- User tries to access another user's data
- Insufficient role/permissions

**Visual Representation**:
- **Color**: Red (#ef4444 or similar)
- **Icon**: 🔒 (lock) or ⛔ (prohibition)
- **Tone**: Firm, definitive (not changeable by user action)
- **Duration**: Auto-dismiss in 4 seconds
- **Example Messages**:
  - "You don't have permission to modify this"
  - "Only project owner can delete"
  - "Insufficient permissions"

**Examples from codebase**:
- "Forbidden: you are not a member of this project"
- "Forbidden: you don't have permission to approve reviews"
- "Access denied. Insufficient permissions."

---

### 5. UNAUTHORIZED (Status: 401)

**Definition**: User is not authenticated or authentication token is invalid/expired.

**When it occurs**:
- No authentication token provided
- Token expired during session
- Invalid token format
- Session timeout
- User logged out in another tab

**Visual Representation**:
- **Color**: Red (#ef4444 or similar)
- **Icon**: 👤 (user) or 🔓 (unlocked)
- **Tone**: Informative, indicates need to re-authenticate
- **Duration**: Auto-dismiss in 4 seconds (may trigger redirect to login)
- **Example Messages**:
  - "Session expired. Please log in again."
  - "Authentication required"
  - "Invalid or expired token"

**Examples from codebase**:
- "Access denied. No token provided."
- "Invalid / Expired token."
- "User not authenticated"
- "Session expired. Please log in again."

---

### 6. NOT FOUND (Status: 404)

**Definition**: Requested resource does not exist or has been deleted.

**When it occurs**:
- User deleted by admin
- Project was deleted
- Task has been removed
- Member removed from project
- Comment/subtask no longer exists

**Visual Representation**:
- **Color**: Red (#ef4444 or similar)
- **Icon**: 🔍 (search) or ❌ (missing)
- **Tone**: Informative, suggests refresh or navigation away
- **Duration**: Auto-dismiss in 4 seconds
- **Example Messages**:
  - "User not found"
  - "Task not found"
  - "Project has been deleted"

**Examples from codebase**:
- "User not found."
- "Friend request not found."
- "Task not found"
- "Member not found."

---

### 7. CONFLICT (Status: 409)

**Definition**: Request conflicts with current resource state or violates uniqueness constraints.

**When it occurs**:
- User already exists (duplicate email)
- Already friends with user
- Member already assigned to task
- Tag already exists for task
- Duplicate project name in same workspace
- Pending request state conflicts

**Visual Representation**:
- **Color**: Red (#ef4444 or similar)
- **Icon**: ⚔️ (crossed swords) or ⚡ (collision)
- **Tone**: Informative, suggests alternative action
- **Duration**: Auto-dismiss in 4 seconds
- **Example Messages**:
  - "Already friends with this user"
  - "Member already assigned to this task"
  - "Email already in use"

**Examples from codebase**:
- "User already exists"
- "Friend request already exists."
- "You are already friends."
- "Member is already assigned to this task"

---

### 8. VALIDATION ERROR (Status: 400)

**Definition**: User input is invalid, incomplete, or violates format constraints.

**When it occurs**:
- Missing required fields
- Invalid email format
- Password too short
- Project name exceeds character limit
- Invalid UUID format
- Date format incorrect
- File too large (413 - Payload Too Large)

**Visual Representation**:
- **Color**: Amber/Orange (#f59e0b or similar)
- **Tone**: Helpful, indicates how to fix
- **Duration**: Auto-dismiss in 4 seconds
- **Icon**: ⚠️ (warning) or 📝 (form)
- **Example Messages**:
  - "Email is required"
  - "Password must be at least 6 characters"
  - "Project name is too long"
  - "Invalid email format"

**Examples from codebase**:
- "Missing fields"
- "Email and password are required"
- "Project name is required"
- "New password must be at least 6 characters"

---

### 9. RATE LIMIT (Status: 429)

**Definition**: User has exceeded the rate limit for this operation type.

**When it occurs**:
- Too many login attempts
- Too many password reset requests
- Too many invitations sent
- Too many task creation/updates
- General API rate limit exceeded

**Visual Representation**:
- **Color**: Amber/Orange (#f59e0b or similar)
- **Icon**: ⏱️ (timer) or 🚫 (stop)
- **Tone**: Informative, temporary restriction
- **Duration**: Auto-dismiss in 4 seconds + retry timer
- **Example Messages**:
  - "Too many login attempts. Please try again in 60 seconds."
  - "You're sending invitations too quickly. Wait a moment."
  - "Please wait before trying again"

**Examples from codebase**:
- "Too many <operation> attempts. Please try again later."
- Rate limiters: auth (3/15min), password reset (3/60min), invitations, task writes, general API

---

### 10. INFO (Status: 200 - Informational Response)

**Definition**: Operation completed successfully with informational message (not critical data).

**When it occurs**:
- Initial welcome message
- Feature explanation
- Setup guidance
- Status updates
- Test email sent confirmation

**Visual Representation**:
- **Color**: Blue (#3b82f6 or similar)
- **Icon**: ℹ️ (info) or 💡 (lightbulb)
- **Tone**: Informative, neutral
- **Duration**: Auto-dismiss in 4 seconds
- **Example Messages**:
  - "If the email exists, a password reset code has been sent."
  - "Test email sent successfully"
  - "Changes saved"

**Examples from codebase**:
- "If the email exists, a password reset code has been sent." (security best practice)
- "Test email sent successfully"

---

### 11. WARNING (Status: 200 - Non-Critical Alert)

**Definition**: Operation succeeded but user should be aware of unusual conditions or implications.

**When it occurs**:
- Action will affect multiple items
- Destructive operation warning (before delete)
- Limited data displayed (pagination)
- Background operation started
- Non-critical performance degradation

**Visual Representation**:
- **Color**: Amber/Orange (#f59e0b or similar)
- **Icon**: ⚠️ (warning triangle)
- **Tone**: Cautionary, suggests awareness
- **Duration**: Auto-dismiss in 4 seconds (longer than success)
- **Example Messages**:
  - "This will affect 5 tasks"
  - "Deleting this project will remove all tasks"
  - "Operation completed with warnings"

**Examples from codebase**:
- Metrics responses with "degraded" flag
- Validation warnings pre-delete

---

## Part 2: Visual Design Specification

### Color Palette

| Category | Color (hex) | CSS Variable | RGB |
|----------|-------------|--------------|-----|
| Success | #14b8a6 | --toast-teal | rgb(20, 184, 166) |
| Error | #ef4444 | --toast-red | rgb(239, 68, 68) |
| Info | #3b82f6 | --toast-blue | rgb(59, 130, 246) |
| Warning | #f59e0b | --toast-amber | rgb(245, 158, 11) |
| Background | #ffffff | --toast-bg | rgb(255, 255, 255) |
| Text | #1f2937 | --toast-text | rgb(31, 39, 55) |
| Shadow | #00000030 | --toast-shadow | rgba(0, 0, 0, 0.19) |

### Icon Set

| Category | Icon | Unicode | Alternative |
|----------|------|---------|--------------|
| Success | ✓ | U+2713 | 🎉 U+1F389 |
| Error | ✕ | U+2715 | ❌ U+274C |
| Info | ℹ | U+2139 | 💡 U+1F4A1 |
| Warning | ⚠ | U+26A0 | ⚡ U+26A1 |
| Forbidden | 🔒 | U+1F512 | ⛔ U+26D4 |
| Unauthorized | 👤 | U+1F464 | 🔓 U+1F513 |
| Not Found | 🔍 | U+1F50D | ❌ U+274C |
| Conflict | ⚔ | U+2694 | ⚡ U+26A1 |
| Rate Limit | ⏱ | U+23F1 | 🚫 U+1F6AB |
| Timeout | ⏱ | U+23F1 | ⏰ U+23F0 |

### Typography

- **Font Family**: System font stack (inherit from app)
- **Title/Message Font Size**: 14px
- **Title Font Weight**: 500-600 (semi-bold)
- **Message Line Height**: 1.4

### Layout & Spacing

- **Position**: Bottom-right corner
- **Distance from edge**: 16px (desktop), 8px (mobile)
- **Toast width**: 320px (desktop), 280px (mobile)
- **Padding**: 16px
- **Icon size**: 24px
- **Icon-to-text margin**: 12px
- **Line spacing**: 12px between message lines
- **Stack gap**: 8px (between multiple toasts)

### Animation Timing

- **Entrance**: 300ms ease-out (slide from right + fade in)
- **Exit**: 300ms ease-in (slide right + fade out)
- **Auto-dismiss delay**: 4000ms
- **Progress bar animation**: Linear over 4 seconds

---

## Part 3: Toast Component Specification

### Component Props

```javascript
{
  id: string (UUID),
  type: 'success' | 'error' | 'failure' | 'forbidden' | 'unauthorized' | 'not-found' | 'conflict' | 'validation' | 'rate-limit' | 'info' | 'warning',
  message: string (required),
  title?: string (optional),
  duration?: number (default: 4000ms),
  icon?: string | React.ReactNode (auto-selected if not provided),
  onClose?: () => void
}
```

### State Management

- **Centralized Toast Store**: Global state for all active toasts
- **Auto-generation of IDs**: UUIDs for each toast
- **Stacking Order**: First-in, first-out (FIFO) or most recent on top
- **Maximum Stack**: Display max 3 toasts, queue additional

### Interaction Patterns

1. **Manual Close**: Click 'X' button dismisses immediately
2. **Auto-Dismiss**: After 4 seconds (unless hovered)
3. **Hover to Pause**: Pause auto-dismiss progress bar on hover
4. **Mobile Touch**: Swipe right to dismiss

### Accessibility Requirements

- **ARIA Labels**: `role="alert"` for error/warning, `role="status"` for success/info
- **Focus Management**: Close button keyboard accessible
- **Color Contrast**: Text meets WCAG AA standards (4.5:1)
- **Motion**: Respects `prefers-reduced-motion`

---

## Part 4: Integration Points

### Response Mapping to Toast Types

```javascript
const responseToastMap = {
  200: { type: 'success', duration: 4000 },
  201: { type: 'success', duration: 4000 },
  400: { type: 'validation', duration: 4000 },
  401: { type: 'unauthorized', duration: 4000 },
  403: { type: 'forbidden', duration: 4000 },
  404: { type: 'not-found', duration: 4000 },
  409: { type: 'conflict', duration: 4000 },
  429: { type: 'rate-limit', duration: 6000 },
  500: { type: 'error', duration: 4000 }
};

const messageToTypeMap = {
  'already': 'conflict',
  'cannot': 'failure',
  'forbidden': 'forbidden',
  'not found': 'not-found',
  'not authenticated': 'unauthorized',
  'expired': 'unauthorized',
  'succeeded': 'success',
  'updated': 'success',
  'created': 'success',
  'too many': 'rate-limit',
  'required': 'validation',
  'invalid': 'validation'
};
```

### Service Integration

Each service (authService, projectService, friendService, etc.) should:
1. Return standardized error objects with `message` and `statusCode`
2. Catch exceptions and transform to user-friendly messages
3. Pass errors through to calling component
4. Component triggers toast notification

---

## Part 5: Error Categories Reference

### By HTTP Status Code

| Code | Type | Count | Severity |
|------|------|-------|----------|
| 200 | Success | 50+ | Low (positive) |
| 201 | Success | 30+ | Low (positive) |
| 400 | Validation | 80+ | Medium |
| 401 | Unauthorized | 30+ | High |
| 403 | Forbidden | 20+ | High |
| 404 | Not Found | 15+ | Medium |
| 409 | Conflict | 15+ | Low-Medium |
| 413 | Payload Too Large | 1 | Medium |
| 429 | Rate Limited | 8 limiters | Medium |
| 500 | Error | 50+ | Critical |
| 501 | Not Implemented | 2 | Medium |

### By Operation Type

#### Authentication
- Login: success, unauthorized, validation, rate-limit
- Register: success, conflict, validation
- Password Reset: unauthorized, validation, not-found
- Token Refresh: unauthorized

#### Project Operations
- Create: success, validation, conflict, forbidden
- Update: success, validation, forbidden, not-found
- Delete: success, forbidden, not-found
- Member Add: success, conflict, forbidden, not-found
- Member Role Change: success, forbidden, failure

#### Task Operations
- Create: success, validation, forbidden, not-found
- Update: success, validation, forbidden, not-found
- Move: success, forbidden, not-found, failure
- Assign: success, conflict, validation, forbidden, not-found
- Approve/Reject: success, validation, forbidden, not-found

#### Social Operations
- Friend Request: success, conflict, validation
- Accept/Decline: success, not-found, failure
- Invite: success, conflict, rate-limit, forbidden

---

## Implementation Roadmap

1. **Phase 1**: Create Toast Context and Provider
2. **Phase 2**: Build Toast component with animations
3. **Phase 3**: Build Toast Container (manages stacking)
4. **Phase 4**: Integrate with Error Handlers
5. **Phase 5**: Update Service Calls to trigger toasts
6. **Phase 6**: Testing and mobile optimization

---

## Next Steps

This analysis provides the complete foundation for designing and implementing the toast notification system. All response types have been mapped, visual specifications defined, and integration points identified.

**Ready to proceed with implementation.**
