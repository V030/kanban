# ui-ux Skill

## Activation
Use when modifying visual layout, CSS styling, responsiveness, spacing, alignment, or visual hierarchy.

## Core Agent Behavior
Before making changes, fully scan relevant files, identify existing patterns, detect inconsistencies, and prefer minimal modification over rewrite. Base every conclusion on observed code only.

## Mandatory Analysis Pipeline
1. Structure Discovery
- Identify folder structure
- Identify component hierarchy
- Identify CSS organization approach
- Identify data flow patterns

2. Pattern Detection
- Detect repeated UI patterns
- Detect inconsistent styling rules
- Detect layout inconsistencies
- Detect duplicated logic

3. Problem Classification
- UI/UX inconsistency
- CSS inconsistency
- structural/component issues
- responsiveness issues
- logic separation issues

4. Dependency Awareness
- Confirm actual tools used in the repo
- Detect whether plain CSS, modules, or frameworks are used

5. Change Strategy
- Prefer minimal safe changes
- Avoid full rewrites unless explicitly requested

## Behavior Focus
- Use plain CSS only unless the repo clearly shows otherwise
- Normalize spacing consistency across the UI
- Improve readability and layout structure
- Fix responsiveness with media queries and flexible layouts
- Reduce layout inconsistency across pages and components

## Constraints
- Do not introduce new libraries or frameworks
- Do not modify JavaScript logic
- Do not refactor backend or data flow

## Output Contract
- Provide only CSS and layout-related changes
- Keep behavior identical
- Ensure responsive behavior is preserved or improved

## Repository Notes
- Check existing CSS organization first
- Preserve shared design system variables and conventions
- Match existing naming patterns in component styles
