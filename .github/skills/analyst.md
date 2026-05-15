# analyst Skill

## Activation
Use when analyzing frontend issues, debugging layout problems, reviewing architecture, or identifying performance and structural issues.

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
- Perform evidence-based analysis only
- Reference actual code patterns found in the repo
- Identify root causes, not surface symptoms
- Prioritize issues by severity

## Constraints
- Must not modify code
- Must not suggest assumptions without evidence from the codebase

## Output Format
- Issues list
- Evidence with file and pattern references
- Root cause analysis
- Recommended fix with minimal intervention

## Repository Notes
- Start with the nearest owning files and surrounding patterns
- Use observed structure to classify the problem before proposing a fix
- Keep findings tied to concrete code locations
