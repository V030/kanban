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