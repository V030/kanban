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



---
name: frontend
user-invocable: true
description: >
  Edit React components, restructure component logic, manage props and state,
  and improve modularity — without touching styling rules or backend logic.
  For greenfield UI or visual design work, use the design skill instead.
---

# frontend Skill

## Purpose
Make targeted, behavior-preserving changes to existing components. Focus on
structure, reusability, and maintainability. Leave visual output and backend
logic untouched unless explicitly requested.

## Activation
Invoke when:
- Refactoring a component for reusability or readability
- Fixing props contracts or state management bugs
- Splitting a large component into smaller, focused ones
- Removing duplicated logic across components
- Improving separation between UI markup and business logic

Do NOT invoke for:
- Building new UI from scratch → use the `design` skill instead
- Changing visual appearance, spacing, or styles → use the `ui-ux` skill
- API routes, server logic, or database changes → use the `backend` skill

---

## Mandatory Analysis Pipeline

### 1. Structure discovery
- Identify the folder layout and locate the owning component file(s).
- Map the component hierarchy: parent → children → shared utilities.
- Confirm the CSS strategy (be aware of it — do not change it).
- Trace data flow: which props come in, what state is local, what is lifted,
  what comes from context or a hook.

### 2. Pattern detection
- Find duplicated component logic that could be extracted into a shared hook
  or utility.
- Detect components doing too much: mixing data fetching, transformation, and
  rendering in one file.
- Spot inconsistent prop naming or shape across sibling components.
- Identify missing or incorrect memoization causing obvious re-render issues.

### 3. Problem classification
Assign each finding to one category:
- `structure` — component boundary too wide or too narrow
- `props` — inconsistent shape, missing defaults, unnecessary drilling
- `state` — local vs lifted state placed incorrectly
- `logic` — business logic mixed into render functions
- `duplication` — repeated patterns that should be extracted

### 4. Dependency audit
- Confirm the framework and any libraries already in use.
- Use only libraries already present in `package.json` — do not introduce
  new dependencies.
- Note any library used inconsistently across files.

### 5. Change strategy
- Prefer the smallest change that resolves the problem.
- Preserve all existing prop contracts unless a change is explicitly
  requested.
- Do not alter rendered output — markup and class names must remain
  identical unless the user asks otherwise.
- Mark larger refactors as `optional` and explain the trade-off.

---

## Behavior Rules
- **Behavior-preserving.** The component must render identically before and
  after the change. If it doesn't, call it out explicitly.
- **No style changes.** Do not edit class names, inline styles, or CSS
  files — route those to the `ui-ux` skill.
- **No backend changes.** Do not edit API routes, server actions, or
  database calls — route those to the `backend` skill.
- **No new dependencies.** Use only what is already installed.
- **Evidence-first.** Read the file before proposing a change. Do not
  assume the current implementation from context alone.

---

## Output Format

For each change:

```
## Change: <short title>
**File:** path/to/Component.tsx (line N–M)
**Problem:** what the current code does wrong and why
**Change:** what is being modified and why it is safe
**Risk:** low | medium | high  (with one-line justification)

// before
<existing code snippet>

// after
<revised code snippet>
```

Group changes by file. List all modified files in a summary at the top.

---

## Clarifying Questions
Ask before starting if any of the following is unknown:
- Is this a behavior fix or a structural improvement?
- Should prop contracts be preserved exactly, or is reshaping acceptable?
- Are tests expected to be updated alongside the component change?
- Is the component shared across multiple pages, or local to one feature?

---

## Completion Criteria
- Rendered output is identical to the original.
- No new dependencies introduced.
- No CSS or style files modified.
- Each change has a risk label and a one-line justification.
- Optional larger refactors are noted separately and not applied by default.



---
name: analyst
user-invocable: true
description: >
  Scan frontend architecture, identify risks and edge cases, and produce a
  prioritized findings report with concrete file references and minimal-change
  recommendations. Read-only by default — does not modify code.
---

# analyst Skill

## Purpose
Turn an empirical code scan into a short, prioritized findings report. Covers
layout, styling, component structure, data flow, accessibility, and
performance. Output is always evidence-based and tied to specific file
locations.

## Activation
Invoke when:
- Debugging a visual or layout regression
- Reviewing component architecture before a refactor
- Auditing a feature for edge cases or structural risk
- Identifying inconsistencies across pages or components

## Scope
Workspace-scoped. Intended for team-wide review and shared checklists.

---

## Mandatory Analysis Pipeline

### 1. Structure discovery
- Map the folder layout: components, pages, styles, utilities.
- Trace the component hierarchy for the feature under review.
- Determine the CSS strategy in use: global stylesheet, CSS modules,
  styled-components, Tailwind, design tokens, or a hybrid.
- Trace data flow: props, context, hooks, API calls, and derived state.

### 2. Pattern detection
- Find repeated UI patterns and duplicated markup or logic.
- Detect inconsistent styling: colors, spacing, typography, breakpoints.
- Surface layout issues: overflow, z-index stacking, improper flex/grid
  usage, fixed-height traps.
- Flag accessibility gaps: missing ARIA labels, keyboard traps, low contrast.
- Note responsiveness gaps: untested breakpoints, viewport-locked widths.

### 3. Problem classification
Assign each finding to exactly one category:
- `ui-ux` — visual inconsistency, spacing, hierarchy, accessibility
- `css` — specificity conflicts, dead rules, naming inconsistency
- `structure` — component boundary issues, prop drilling, logic in views
- `responsiveness` — layout breaks at specific viewports
- `logic` — state mismanagement, side-effect leakage, separation of concerns

### 4. Dependency audit
- Confirm the frameworks and versions actually used (React, CSS tooling,
  build tool).
- Check for design-system tokens, utility-class helpers, or theme files that
  should be used but aren't.
- Note any dependencies being imported inconsistently across files.

### 5. Change strategy
- Propose the smallest safe fix for each issue.
- Label every recommendation with a risk level: `low`, `medium`, or `high`.
- Mark larger refactors as `optional` and explain the trade-off.
- Do not propose changes that alter behavior unless explicitly requested.

---

## Behavior Rules
- **Evidence-only.** Do not infer intent or assume architecture beyond what
  is present in the repo.
- **Read-only by default.** Do not modify any file without explicit
  permission from the user.
- **No speculation.** If a root cause is uncertain, say so and ask.
- **Prioritize by impact.** Lead with user-visible problems over
  internal-only issues.

---

## Output Format

Produce a structured report with the following sections:

```
## Summary
One or two sentences: what was scanned, how many issues found, overall health.

## Issues

### [#] Issue title  |  category: <category>  |  risk: <low|medium|high>
**File:** path/to/file.tsx (line N–M)
**Evidence:** short code excerpt or description of observed behavior
**Root cause:** one-paragraph explanation
**Fix:** minimal actionable steps — include a code snippet when the change is
non-obvious
```

Issues are numbered and ordered by user-visible impact (highest first).

---

## Clarifying Questions
Ask before starting if any of the following is unknown:
- Which route, URL, or component name shows the issue?
- Is this a regression (was working before) or a new feature gap?
- Is the scope limited to one component or a full page/flow?
- Are small collateral changes (spacing, typography) acceptable as part of
  the fix?

---

## Completion Criteria
The report is complete when:
- Every issue has a file reference, a root-cause explanation, and a
  risk-labeled fix.
- High-risk suggestions are clearly marked optional.
- Uncertain items are called out with a follow-up question rather than a
  guess.
- The summary accurately reflects the findings count and overall state.

---

## Iteration Protocol
1. **Draft** — produce the issues list with evidence and proposed fixes.
2. **Review** — flag ambiguous items and ask clarifying questions.
3. **Finalize** — incorporate feedback and emit the final report with any
   optional patches appended.