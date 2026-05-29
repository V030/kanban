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