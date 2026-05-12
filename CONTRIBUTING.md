# Contributor Guide

Last updated: 2026-05-13

This guide explains how to add features without breaking the project’s layering or authorization model.

## Core Rules

- Keep routes thin.
- Keep controllers focused on validation and response mapping.
- Put SQL and transactional logic in models.
- Enforce permissions in the server, not the UI.
- Preserve existing route prefixes unless you also update the frontend services.

## Adding a Route

1. Add the new handler to server/controllers.
2. Add the route mapping in server/routes/authRoutes.js or server/routes/protectedRoutes.js.
3. Attach the appropriate limiter and authenticateToken if the route is protected.
4. Add the matching function in client/src/services if the UI needs it.
5. Update the page/component that consumes the service.

## Adding a Model

1. Put the SQL in server/models.
2. Use parameterized queries only.
3. Use transactions for multi-step writes.
4. Throw errors with stable .code values so controllers can map them to HTTP responses.
5. Return normalized objects rather than raw SQL rows when the shape is consumed by the UI.

## Adding Permissions

1. Add the new setting in a migration.
2. Update projectPermissions.js so the helper understands the new flag.
3. Update projectModel.js allowedKeys and defaults.
4. Ensure any dependent UI flags come from the server response, not hard-coded assumptions.
5. Add tests for both allowed and denied cases.

## Adding a DB Migration

- Use sequential naming in server/migrations.
- Make migrations idempotent when practical.
- Include backfill steps when a new column affects existing data.
- Document any new invariants in this guide or in the architecture docs.

## Safe Feature Pattern

A safe feature usually follows this path:

```txt
UI event
  -> service function
  -> route
  -> controller validation
  -> model permission check
  -> SQL transaction
  -> normalized JSON response
```

## What to Avoid

- Direct fetch calls inside components when a service already exists.
- Repeating permission logic in the frontend.
- Adding global state when the current pages already own the data.
- Breaking the current /auth route convention without a migration plan.
