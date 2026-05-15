# backend Skill

## Activation
Use when modifying API endpoints, database schema, migrations, or server logic.

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
- Maintain clear separation between controllers, services, and data access
- Ensure database consistency and migration safety
- Use existing patterns in the repository only

## Constraints
- No frontend changes
- No UI or CSS modifications

## Output Contract
- Backend-only code changes

## Repository Notes
- Validate against existing server and test structure
- Preserve request and response shapes unless a change is required
- Check migration order and backward compatibility before editing schema files
