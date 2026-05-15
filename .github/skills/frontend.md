# frontend Skill

## Activation
Use when editing React components, restructuring component logic, managing props or state, or improving modularity.

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
- Keep components small and reusable
- Separate UI from logic where possible
- Maintain consistency with existing project patterns
- Use only libraries already present in the repo

## Constraints
- Do not change styling system rules
- Do not introduce new dependencies
- Do not modify backend logic

## Output Contract
- Return refactored React components only
- Maintain identical behavior

## Repository Notes
- Inspect component boundaries before editing
- Preserve existing props contracts and file-level conventions
- Avoid mixing UI styling changes into React refactors unless requested
