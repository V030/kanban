---
name: backend
user-invocable: true
description: >
  Modify API endpoints, database schema, migrations, and server logic —
  without touching frontend components, styles, or UI behavior.
---

# backend Skill

## Purpose
Make targeted, safe changes to server-side code. Maintain clear separation
between controllers, services, and data access layers. Preserve existing
request/response shapes unless a change is explicitly requested.

## Activation
Invoke when:
- Adding or modifying API endpoints
- Updating database schema or writing migrations
- Fixing server-side business logic or data transformation bugs
- Refactoring service or repository layers for clarity or correctness
- Debugging data integrity, query performance, or API contract issues

---

## Mandatory Analysis Pipeline

### 1. Structure discovery
- Identify the server-side folder layout: routes, controllers, services,
  repositories/models, middleware, and utilities.
- Confirm the framework and ORM/query builder in use (e.g. Express,
  Fastify, Prisma, Drizzle, Sequelize, raw SQL).
- Map the request lifecycle for the endpoint under review: route → middleware
  → controller → service → data access → response.
- Locate existing migration files and confirm the migration naming and
  ordering conventions.

### 2. Pattern detection
- Detect business logic leaking into route handlers or controllers that
  should live in a service layer.
- Find duplicated query logic across services or repositories.
- Identify inconsistent error handling: some routes returning structured
  errors, others throwing raw exceptions.
- Spot missing input validation or authorization checks.
- Flag N+1 query patterns or obviously missing indexes.

### 3. Problem classification
Assign each finding to one category:
- `api` — route definition, request validation, response shape, HTTP status
  codes
- `logic` — business rule in the wrong layer, incorrect computation
- `data` — schema design, migration safety, query correctness, N+1
- `auth` — missing or incorrect authorization and authentication checks
- `error-handling` — unhandled rejections, inconsistent error shapes
- `performance` — slow queries, missing indexes, over-fetching

### 4. Dependency audit
- Confirm the exact versions of the framework, ORM, and any middleware in
  use.
- Use only libraries already present in `package.json` (or equivalent) —
  do not introduce new dependencies.
- Check whether a shared utility (validation schema, error class, query
  helper) already exists before creating a new one.

### 5. Change strategy
- Prefer minimal changes: fix the targeted behavior without restructuring
  adjacent code.
- For schema changes, always write a migration — do not mutate the database
  directly.
- Verify migration order and backward compatibility before proposing schema
  edits.
- Preserve existing request and response shapes unless the user explicitly
  asks to change the API contract.
- Mark changes that alter a public API contract as `high` risk.

---

## Behavior Rules
- **Backend-only.** Do not edit React components, CSS, or any frontend
  file — route those to the `frontend` or `ui-ux` skill.
- **No dependency additions.** Use only what is already installed.
- **Migration-safe.** Every schema change requires a corresponding migration.
  Never modify a previously applied migration file.
- **Contract-preserving.** Do not change request or response shapes without
  an explicit instruction to do so.
- **Evidence-first.** Read the relevant route, service, and model files
  before proposing any change.

---

## Output Format

For each change, provide:

```
## Change: <short title>
**File:** path/to/file.ts (line N–M)
**Problem:** what the current code does wrong and why
**Change:** what is being modified and why it is safe
**Risk:** low | medium | high  (with one-line justification)

// before
<existing code snippet>

// after
<revised code snippet>
```

For schema changes, include a separate migration snippet:

```
## Migration: <migration filename>
<migration up and down SQL or ORM DSL>
```

List all modified files in a summary at the top.

---

## Clarifying Questions
Ask before starting if any of the following is unknown:
- Is this a bug fix (breaking existing behavior) or a new feature addition?
- Should the API contract (request/response shape) remain unchanged?
- Are there existing tests that need to be updated alongside this change?
- Is the database running in a multi-tenant or shared schema setup that
  affects migration strategy?

---

## Completion Criteria
The output is complete when:
- Every change is tied to a specific file and line range.
- Schema changes are accompanied by a migration with both `up` and `down`
  paths.
- No frontend files are modified.
- Each change has a risk label and a one-line justification.
- API contract changes (if any) are explicitly called out and confirmed by
  the user before being applied.