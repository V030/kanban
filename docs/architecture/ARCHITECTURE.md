# Architecture

Last updated: 2026-05-13

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

## Authorization Flow

Authorization is not decided by route guards alone. It is resolved by the model layer using project membership and project settings.

Key rules:

- authenticateToken only proves identity.
- project_members establishes project-specific role.
- project_settings provides feature flags for owner/admin/member actions.
- getProjectPermissionContext resolves project membership plus settings.
- getTaskPermissionContext resolves task access through the task’s project.

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

## Design Rationale

MVC is used here because it keeps request handling readable while allowing the model layer to enforce the real invariants. That matters in this codebase because permissions depend on a combination of ownership, membership, and project settings that cannot safely live in the UI.

## Scalability Notes

- Rate limiting can use Redis when deployed across multiple instances.
- Metrics are cached in-process and refreshed periodically.
- The current architecture can scale further, but the metrics cache and stateful localStorage auth are the first obvious pressure points.
