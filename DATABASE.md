# Database

Last updated: 2026-05-13

This document describes the PostgreSQL schema as inferred from the codebase, migrations, and SQL queries. It focuses on actual relationships and lifecycle behavior that the application depends on.

## Key Principles

- The database is the source of truth for project ownership, membership, and task placement.
- Multi-step operations use transactions where consistency matters.
- Permission checks often depend on joins against project_members and project_settings.

## Relationship Overview

```txt
users
  |--< project_members >--| projects
  |--< project_requests >--| projects
  |--< friend_requests >--| users
  |--< friends >--| users

projects
  |-- board
  |-- project_settings
  |--< tasks_categories

tasks_categories
  |--< tasks

tasks
  |--< task_assignees
  |--< task_comments
  |--< task_comments_replies
  |--< task_tags
  |--< subtasks
  |--< reviews
```

## Table Reference

### users
Purpose: identity, authentication, profile data.

Important columns:
- id (uuid)
- first_name
- last_name
- email
- role
- password_hash
- profile_image_base64
- created_at

Lifecycle:
- Created on registration.
- Updated through profile and password endpoints.
- Deleted users cascade into request and friendship tables when foreign keys are configured that way.

Security:
- password_hash must never be returned.
- profile_image_base64 is exposed to the client and should be treated as user-supplied content.

### projects
Purpose: root record for a collaborative workspace.

Important columns:
- id (uuid)
- name
- description
- owner
- created_by
- created_at

Lifecycle:
- Created in a transaction together with project_settings, board, project_members, and default categories.
- Deleted only by owner.

Security:
- owner is the highest project-scoped authority.
- project deletion can remove substantial downstream data.

### project_settings
Purpose: project-scoped feature flags.

Important columns:
- project_id
- allow_member_create_task
- allow_member_take_task
- allow_member_edit_task
- allow_member_delete_task
- allow_member_add_board
- allow_member_add_member
- allow_assign_task_to_member
- allow_admin_add_member
- allow_admin_remove_member
- allow_admin_add_board
- allow_admin_manage_tasks
- allow_admin_create_tag
- allow_member_create_tag

Lifecycle:
- Seeded on project creation with defaults.
- Updated one flag at a time.
- Some permission helpers reference allow_member_review, but the current schema does not define it. That is a documented mismatch.

Security:
- These flags directly gate write access.
- Schema drift here can accidentally widen or narrow permissions.

### project_members
Purpose: project membership and role assignment.

Important columns:
- board_id
- project_id
- user_id
- role
- joined_at

Lifecycle:
- Owner membership inserted during project creation.
- New members inserted when invitations are accepted.
- Roles can be updated by the owner.

Security:
- Role values are project-scoped, not global.
- Membership is the primary authorization boundary.

### project_requests
Purpose: invitation workflow for projects.

Important columns:
- id (uuid)
- requester_id
- recipient_id
- project_id
- status
- requested_at
- updated_at

Constraints and behavior:
- status is constrained to pending, accepted, declined, cancelled, rejected.
- Unique index prevents duplicate pending requests for the same requester/recipient/project pair.
- Cascades on requester, recipient, and project delete.

Lifecycle:
- Inserted on invite.
- Updated on accept/decline.
- Acceptance also adds a project_members row.

### board
Purpose: container for a project’s task columns.

Important columns:
- id (uuid)
- project_id
- name
- created_by
- created_at

Lifecycle:
- Created with the project.
- The app assumes one board per project.

Constraint note:
- The schema snapshot in repo memory indicates board.id and projects.id are uuid without defaults in some contexts, so inserts use gen_random_uuid().

### tasks_categories
Purpose: Kanban columns / board lanes.

Important columns:
- id
- board_id
- project_id
- name
- position

Lifecycle:
- Seeded with todo, in_progress, to_review, done.
- Additional columns may be created by authorized users.

Dependency note:
- Task creation and task fetch logic assume at least one board and category set per project.

### tasks
Purpose: work items on the board.

Important columns:
- id (int)
- board_id
- category_id
- title
- description
- priority
- created_by
- created_at
- target_date
- is_past_due
- position

Lifecycle:
- Created in a transaction after board lookup.
- Moved between categories by status updates.
- Deleted with dependent rows cleaned up first.

Priority behavior:
- API uses urgent; database may store critical.
- Migrations exist to support unset and critical values.

### task_assignees
Purpose: many-to-many membership between users and tasks.

Important columns:
- task_id
- user_id

Lifecycle:
- Created when a user self-assigns or is assigned by another member.
- Deleted on task delete or manual unassignment.

### subtasks
Purpose: nested work units under a task.

Important columns:
- id
- task_id
- title
- created_by
- status
- created_at

Lifecycle:
- Created from the task detail page.
- Update/delete endpoints are not fully implemented yet.

### task_comments
Purpose: primary discussion thread per task.

Important columns:
- id
- task_id
- user_id
- comment
- created_at

Lifecycle:
- Added from task detail views.
- Deleted when the parent task is deleted.

### task_comments_replies
Purpose: replies to comments.

Important columns:
- id
- comment_id
- task_id
- user_id
- comment_reply
- created_at

Lifecycle:
- Nested under comments.
- Deleted when the parent task is deleted.

### task_tags
Purpose: freeform task labels.

Important columns:
- id
- task_id
- tag_name
- project_id

Lifecycle:
- Created and deleted independently.
- Capped at five per task by application logic.

Security and integrity:
- Tag uniqueness is enforced case-insensitively in code.
- project_id is stored to support project-scoped tag queries.

### reviews
Purpose: approval/rejection audit trail for tasks.

Important columns:
- id
- task_id
- reviewer_id
- action
- comment
- created_at

Lifecycle:
- Inserted during approve/reject flows.
- Cascades when the task is deleted.

### friends
Purpose: persistent friendship records.

Important columns:
- user1_id
- user2_id
- created_at

Lifecycle:
- Inserted when a friend request is accepted.
- Stored in canonical order using LEAST/GREATEST.

### friend_requests
Purpose: social graph request state.

Important columns:
- id
- requester_id
- recipient_id
- status
- created_at

Lifecycle:
- pending -> accepted / rejected / cancelled.
- Pending requests are used to prevent duplicates and support request inboxes.

## Foreign Key and Cascade Notes

Observed or implied behaviors:
- project_requests cascades through user and project deletion.
- reviews cascades on task deletion.
- project deletion is treated as a cascade boundary for downstream project data.
- task deletion is manually cleaned up before deleting the task row, which is a defensive choice even when cascades may exist.

## Normalization Observations

- The schema is reasonably normalized for collaboration entities.
- board and tasks_categories both carry project_id, which simplifies permission and aggregation queries at the cost of some redundancy.
- task_tags also stores project_id for project-level queries without joining through tasks first.

## Indexing Recommendations

Recommended indexes if they are not already present:
- project_members(project_id, user_id)
- task_assignees(task_id, user_id)
- tasks(category_id, position)
- task_tags(project_id, tag_name)
- task_comments(task_id, created_at)
- reviews(task_id, created_at)
- project_requests(recipient_id, status, requested_at DESC)

## Data Integrity Risks

- Some permissions rely on columns that are not yet defined in the visible migrations, so schema updates must be coordinated with permission helper updates.
- Category names are semantically important; changing them without migration/backfill logic will break review and status flows.
