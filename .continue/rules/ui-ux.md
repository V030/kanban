---
name: ui-ux
user-invocable: true
description: >
  Modify visual layout, CSS styling, spacing, alignment, responsiveness, and
  visual hierarchy — without touching JavaScript logic or backend code.
---

# ui-ux Skill

## Purpose
Make targeted, appearance-focused changes to CSS and layout. Improve
consistency, readability, and responsiveness while leaving component logic and
behavior completely untouched.

## Activation
Invoke when:
- Fixing spacing, alignment, or visual hierarchy inconsistencies
- Resolving layout breaks at specific viewport sizes
- Normalizing typography, color, or border usage across components
- Improving visual consistency between pages or feature areas
- Adjusting a component's appearance without changing its behavior

---

## Mandatory Analysis Pipeline

### 1. Structure discovery
- Identify the CSS organization strategy: global stylesheet, CSS modules,
  Tailwind, styled-components, design tokens, or a hybrid.
- Locate the owning stylesheet(s) for the component or page under review.
- Map which CSS rules are shared (design-system level) vs. scoped to one
  component.
- Identify design tokens or CSS variables in use and where they are defined.

### 2. Pattern detection
- Find inconsistent spacing values (e.g. mixing `8px`, `0.5rem`, `10px` for
  similar gaps).
- Detect color or typography values that are hardcoded instead of using
  existing tokens.
- Surface layout issues: overflow clipping, unintended scroll, broken flex
  or grid alignment, z-index conflicts.
- Note responsiveness gaps: components that break or become unusable at
  mobile or tablet widths.
- Flag visual hierarchy problems: insufficient contrast, competing focal
  points, poor whitespace distribution.

### 3. Problem classification
Assign each finding to one category:
- `spacing` — inconsistent margin, padding, or gap values
- `typography` — mismatched font size, weight, line-height, or color
- `color` — hardcoded values that should use tokens; contrast issues
- `layout` — flex/grid misuse, overflow, z-index, sticky/fixed conflicts
- `responsiveness` — viewport-specific breaks or untested breakpoints
- `hierarchy` — visual weight or information density problems

### 4. Dependency audit
- Confirm the CSS tooling actually used — do not introduce new frameworks.
- Verify which design tokens or CSS variables exist before creating new ones.
- Check whether a shared utility class already exists before writing a new
  rule.

### 5. Change strategy
- Prefer token-based fixes (swap a hardcoded value for an existing variable)
  over new rules.
- Prefer modifying existing selectors over adding new ones.
- Use `min-width` media queries and flexible units (`rem`, `%`,
  `clamp()`) rather than fixed pixel breakpoints where possible.
- Mark layout restructuring (e.g. changing from flex to grid) as `medium`
  or `high` risk and explain why.
- Do not change class names or component markup — only their styles.

---

## Behavior Rules
- **Appearance-only.** Do not edit JavaScript, TypeScript, JSX logic, event
  handlers, or state — route those to the `frontend` skill.
- **No backend changes.** Do not touch API routes or server code.
- **No new dependencies.** Use only the CSS tooling already in the repo.
- **Preserve markup.** Do not add, remove, or rename HTML elements or CSS
  class names to achieve a style fix — only change the styles themselves.
- **Token-first.** Always check for an existing design token or utility
  class before writing a new rule.

---

## Output Format

For each change, provide:

```
## Fix: <short title>
**File:** path/to/styles.css (line N–M)  — or component name if CSS-in-JS
**Problem:** what the current style does wrong
**Fix:** what is being changed and why it is safe
**Risk:** low | medium | high  (with one-line justification)

/* before */
<existing rule or snippet>

/* after */
<revised rule or snippet>
```

If multiple files are touched, group by file and list all modified files in
a summary at the top.

---

## Clarifying Questions
Ask before starting if any of the following is unknown:
- Is the issue present at a specific viewport width or across all sizes?
- Are design tokens or a style guide available to reference?
- Is a visual regression (was correct before) or a new design direction?
- Are collateral spacing or typography adjustments acceptable alongside the
  main fix?

---

## Completion Criteria
The output is complete when:
- Every fix includes the exact file, the before snippet, and the after
  snippet.
- No JavaScript, JSX, or backend files are modified.
- No new class names or markup elements are introduced.
- Each fix has a risk label and a one-line justification.
- Responsive behavior is preserved or explicitly improved.