# Architecture

Last updated: 2026-06-09

This document describes the runtime architecture, request lifecycle, layering rules, and the real request/data flow used by the application.

## Overview

The application is a React SPA backed by an Express API and PostgreSQL. The backend follows an MVC-style structure, but with a deliberate constraint: business rules and authorization are pushed down into the model layer so the controllers stay thin and the database remains the source of truth.

## System Shape

```txt
React UI
  -> client/src/services/*.js
  -> fetchWithAuth (Bearer token)
  -> Express routes (/auth or /api/protected)
  -> route middleware (rate limiters + auth)
  -> controllers
  -> models
  -> PostgreSQL
```

## Request Lifecycle

1. The frontend calls a service method in client/src/services.
2. fetchWithAuth adds the JWT to the Authorization header.
3. Express receives the request and applies the global limiter first.
4. Route-specific middleware runs, including authenticateToken where required.
5. The controller validates input and normalizes alternate field names.
6. The controller delegates to a model function.
7. The model performs SQL, permissions checks, and transactions if needed.
8. The controller translates known error codes into HTTP responses.

## Middleware Order

The actual middleware stack matters:

- server.js applies app-wide JSON parsing and CORS.
- generalApiLimiter runs for /auth and /api/protected.
- authRoutes adds route-level limiters before the controller.
- protectedRoutes always require authenticateToken.
- authenticatedLimiter is used on read-heavy authenticated endpoints.

## Authentication Flow

- Login and registration return a signed JWT.
- JWT payload contains userId, email, and role.
- The client stores the token in localStorage.
- On 401, fetchWithAuth logs the user out and redirects to /login.
- hydrateUserFromToken attempts to restore the in-memory user object from /api/protected/profile on startup.

## Frontend State Flow

- API-backed project, task, member, notification, and permission data is loaded through `client/src/services`.
- Route-level pages own the state for their active workflow instead of pushing feature-specific state into global context.
- `KanbanPage.jsx` owns the project board data and renders the same category/task payload through `KanbanBoard.jsx` or `KanbanTable.jsx`.
- The board/table preference is the only documented Kanban UI preference stored in `localStorage`; it uses `kanban:viewMode` with `board` as the safe default.
- Browser storage is never treated as authoritative for permissions, task data, project membership, or profile data.

## Authorization Flow

Authorization is not decided by route guards alone. It is resolved by the model layer using project membership and project settings.

Key rules:

- authenticateToken only proves identity.
- project_members establishes project-specific role.
- project_settings provides feature flags for owner/admin/member actions.
- getProjectPermissionContext resolves project membership plus settings.
- getTaskPermissionContext resolves task access through the task’s project.

## Realtime Flow

The application uses the existing SSE notification stream as its realtime transport.

Flow:

1. The controller completes the write through the model.
2. The controller asks the broadcaster to emit a typed event to the project members or acting user.
3. `server/utils/notificationStream.js` pushes the SSE payload to connected clients.
4. `client/src/components/common/NotificationsStream.jsx` forwards the payload into window events and toast handling.
5. Feature pages subscribe to those window events and refresh the affected slice of state.

Key event types:

- `permissionUpdate` for project settings changes.
- `taskUpdate` for task rename, description, priority, target date, and status changes.
- `approvalDecision` for To Review -> Done / To Review -> TODO review outcomes.
- `commentUpdate` for task comments and replies.
- `toast` for forbidden or validation feedback that should surface immediately in the UI.

The payloads are intentionally small and flat so clients can react without reimplementing server logic. A typical payload includes `eventType`, `projectId`, `taskId`, `userRole`, `reason`, and `timestamp`, plus any extra fields needed by the page that received it.

## Layer Responsibilities

### Routes
- Map URLs to controllers.
- Attach middleware.
- Stay thin.

Should not:
- Contain SQL.
- Contain business rules.
- Perform permission checks beyond middleware selection.

### Controllers
- Validate request shape.
- Normalize input aliases such as name vs project_name.
- Call models.
- Map known model errors to HTTP responses.

Should not:
- Implement multi-table SQL.
- Reach directly into req/res from lower layers.

### Models
- Perform SQL.
- Implement permission rules.
- Use transactions for multi-step writes.
- Return normalized objects for the UI.

Should not:
- Know anything about routing or Express middleware.

### Frontend Services
- Wrap fetch.
- Inject auth headers.
- Hide repetitive endpoint details.

Should not:
- Hold UI state.
- Reimplement server-side authorization.

### Frontend Pages
- Own route-level UI state, filters, drafts, optimistic updates, and display preferences.
- Subscribe to realtime window events only for the project/task slices they render.
- Keep browser-local preferences small, validated, and documented in [Frontend State and Preferences](../frontend/STATE_AND_PREFERENCES.md).

Should not:
- Persist server-owned entities in localStorage.
- Treat localStorage values as permission or identity facts.

## Design Rationale

MVC is used here because it keeps request handling readable while allowing the model layer to enforce the real invariants. That matters in this codebase because permissions depend on a combination of ownership, membership, and project settings that cannot safely live in the UI.

## Scalability Notes

- Rate limiting can use Redis when deployed across multiple instances.
- Metrics are cached in-process and refreshed periodically.
- The current architecture can scale further, but the metrics cache and stateful localStorage auth are the first obvious pressure points.
- UI preferences such as `kanban:viewMode` are intentionally client-local and do not add backend scaling concerns.
