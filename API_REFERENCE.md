# API Reference

Last updated: 2026-05-13

This document describes the actual API surface used by the frontend services. It includes examples so humans and AI agents can infer request shapes without reverse-engineering components.

## Conventions

- Base URL: http://localhost:5000
- Protected requests use Bearer tokens.
- Errors usually return { "message": "..." }.
- Successful responses usually return a top-level object with one or more named payload keys.
- Most routes live under /auth even when they are not authentication endpoints. That is a historical routing choice and must be preserved for existing clients.

## Auth and Account

### POST /auth/login
Purpose: authenticate a user and issue a JWT.

Request example:
```json
{
  "email": "test@example.com",
  "password": "secret123"
}
```

Success example:
```json
{
  "message": "Login Successful",
  "token": "<jwt>",
  "user": {
    "id": "b7f3...",
    "firstName": "Maya",
    "lastName": "Chen",
    "email": "maya@example.com",
    "role": "user",
    "profileImageBase64": null
  }
}
```

Common errors:
- 400 when email or password is missing.
- 401 when credentials are invalid.

### POST /auth/register
Purpose: create a new user, then log them in immediately.

Request example:
```json
{
  "first_name": "Maya",
  "last_name": "Chen",
  "email": "maya@example.com",
  "password": "secret123"
}
```

Success example:
```json
{
  "message": "Account created successfully",
  "token": "<jwt>",
  "user": {
    "id": "b7f3...",
    "firstName": "Maya",
    "lastName": "Chen",
    "email": "maya@example.com",
    "role": "user",
    "profileImageBase64": null
  }
}
```

Common errors:
- 400 for missing fields.
- 409 when the email already exists.

## Profile

### GET /api/protected/profile
Purpose: load the signed-in user profile.

Success example:
```json
{
  "message": "Profile retrieved",
  "user": {
    "id": "b7f3...",
    "firstName": "Maya",
    "lastName": "Chen",
    "email": "maya@example.com",
    "role": "user",
    "createdAt": "2026-05-13T12:00:00.000Z",
    "profileImageBase64": null
  }
}
```

### PUT /api/protected/profile
Purpose: update name, email, or profile image.

Request example:
```json
{
  "firstName": "Maya",
  "lastName": "Chen",
  "email": "maya@example.com",
  "profileImageBase64": "data:image/png;base64,..."
}
```

Success example:
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "b7f3...",
    "firstName": "Maya",
    "lastName": "Chen",
    "email": "maya@example.com",
    "role": "user",
    "createdAt": "2026-05-13T12:00:00.000Z",
    "profileImageBase64": "data:image/png;base64,..."
  }
}
```

### POST /api/protected/change-password
Purpose: change the current user’s password.

Request example:
```json
{
  "currentPassword": "old-secret",
  "newPassword": "new-secret"
}
```

Success example:
```json
{ "message": "Password changed successfully" }
```

## Projects

### POST /auth/create-project
Purpose: create a project, default board, project settings, owner membership, and default columns.

Request example:
```json
{
  "name": "Mobile Redesign",
  "description": "Release plan for the mobile app refresh"
}
```

Success example:
```json
{
  "message": "Project created successfully",
  "project": { "id": "...", "name": "Mobile Redesign" },
  "board": { "id": "...", "project_id": "..." },
  "categories": [
    { "id": 1, "name": "todo" },
    { "id": 2, "name": "in_progress" },
    { "id": 3, "name": "to_review" },
    { "id": 4, "name": "done" }
  ]
}
```

### GET /auth/projects/my-projects
Purpose: list projects owned by the current user.

Success example:
```json
{ "projects": [ { "id": "...", "name": "Mobile Redesign" } ] }
```

### GET /auth/projects/other-projects
Purpose: list projects the current user joined as a member.

Success example:
```json
{ "projects": [ { "id": "...", "name": "QA Board", "role": "member" } ] }
```

### GET /auth/projects/:projectId/members
Purpose: list project members in role order.

Success example:
```json
{
  "members": [
    { "id": "...", "firstName": "Maya", "role": "owner" },
    { "id": "...", "firstName": "Noah", "role": "admin" },
    { "id": "...", "firstName": "Ivy", "role": "member" }
  ]
}
```

### PATCH /auth/projects/:projectId/name
Purpose: rename a project.

Request example:
```json
{ "name": "Mobile App Redesign" }
```

Success example:
```json
{ "message": "Project name updated successfully", "project": { "id": "...", "name": "Mobile App Redesign" } }
```

### PATCH /auth/projects/:projectId/description
Purpose: update project description.

Request example:
```json
{ "description": "Revised release plan" }
```

Success example:
```json
{ "message": "Project description updated successfully", "project": { "id": "...", "description": "Revised release plan" } }
```

### DELETE /auth/projects/:projectId
Purpose: delete a project and cascade related data.

Success example:
```json
{ "message": "Project deleted successfully", "projectId": "..." }
```

## Project Settings

### GET /auth/project-settings/:projectId
Purpose: fetch permission flags for a project.

Success example:
```json
{
  "project_id": "...",
  "allow_member_create_task": true,
  "allow_member_take_task": true,
  "allow_member_edit_task": true,
  "allow_member_delete_task": true,
  "allow_member_add_board": true,
  "allow_member_add_member": true,
  "allow_assign_task_to_member": false,
  "allow_admin_add_member": true,
  "allow_admin_remove_member": true,
  "allow_admin_add_board": true,
  "allow_admin_manage_tasks": true,
  "allow_admin_create_tag": true,
  "allow_member_create_tag": false
}
```

### PATCH /auth/project-settings
Purpose: update one boolean permission at a time.

Request example:
```json
{
  "projectId": "...",
  "setting": "allow_member_create_task",
  "value": true
}
```

Success example:
```json
{
  "project_id": "...",
  "allow_member_create_task": true
}
```

## Invitations and Requests

### POST /auth/projects/send-invite
Purpose: invite a user to a project by friendId or email.

Request example:
```json
{
  "projectId": "...",
  "email": "teammate@example.com"
}
```

Success example:
```json
{
  "message": "Invite sent",
  "inviteRequest": { "id": "...", "status": "pending" }
}
```

### GET /auth/projects/get-invites
Purpose: list pending project invitations for the current user.

Success example:
```json
{
  "projectInvitations": [
    { "id": "...", "projectId": "...", "status": "pending" }
  ]
}
```

### PATCH /auth/projects/invitations/:requestId/accept
Purpose: accept a project invitation.

Success example:
```json
{ "message": "Project invitation accepted", "request": { "id": "...", "status": "accepted" } }
```

### PATCH /auth/projects/invitations/:requestId/decline
Purpose: decline a project invitation.

Success example:
```json
{ "message": "Project invitation declined", "request": { "id": "...", "status": "declined" } }
```

## Kanban and Tasks

### GET /auth/projects/:projectId/get-task-categories
Purpose: fetch columns and nested task data.

Success example:
```json
{
  "categories": [
    { "id": 1, "name": "todo", "tasks": [] },
    { "id": 2, "name": "in_progress", "tasks": [] }
  ]
}
```

### POST /auth/projects/:projectId/create-task-category
Purpose: add a new column.

Request example:
```json
{ "name": "blocked" }
```

Success example:
```json
{ "category": { "id": 7, "projectId": "...", "name": "blocked", "position": 5 } }
```

### POST /auth/projects/:projectId/:categoryId/create-new-task
Purpose: create a task in a column.

Request example:
```json
{
  "title": "Design task drawer",
  "description": "Add compact details panel",
  "priority": "high",
  "targetDate": "2026-06-01"
}
```

Success example:
```json
{
  "message": "Task created successfully",
  "task": {
    "id": 42,
    "title": "Design task drawer",
    "priority": "high",
    "categoryId": 1
  }
}
```

### POST /auth/project/take-task/:taskId
Purpose: assign the current user to a task.

Success example:
```json
{ "message": "Task taken successfully" }
```

### GET /auth/tasks/my-tasks
Purpose: list tasks assigned to the current user.

Success example:
```json
{ "tasks": [ { "id": 42, "title": "Design task drawer" } ] }
```

### GET /auth/project/tasks/:taskId
Purpose: fetch a single task with assignees, subtasks, tags, and project metadata.

Success example:
```json
{
  "task": {
    "id": 42,
    "title": "Design task drawer",
    "priority": "urgent",
    "project": { "id": "...", "name": "Mobile Redesign" },
    "assignees": [],
    "subtasks": [],
    "tags": []
  }
}
```

### PATCH /auth/project/tasks/:taskId/status
Purpose: move a task to another column.

Request example:
```json
{ "categoryId": 2 }
```

Success example:
```json
{ "message": "Task moved successfully", "task": { "id": 42, "categoryId": 2 } }
```

### PATCH /auth/project/tasks/:taskId/priority
Purpose: update task priority.

Request example:
```json
{ "priority": "urgent" }
```

Success example:
```json
{ "message": "Task priority updated successfully", "task": { "id": 42, "priority": "urgent" } }
```

### PATCH /auth/project/tasks/:taskId/name
Purpose: rename a task.

Request example:
```json
{ "name": "Design the task drawer" }
```

### PATCH /auth/project/tasks/:taskId/description
Purpose: update task description.

Request example:
```json
{ "description": "Updated task details" }
```

### PATCH /auth/project/tasks/:taskId/target-date
Purpose: set or clear the due date.

Request example:
```json
{ "targetDate": "2026-06-01" }
```

### DELETE /auth/project/tasks/:taskId
Purpose: delete a task and its dependent comments, replies, assignees, tags, and subtasks.

Success example:
```json
{ "message": "Task removed successfully", "task": { "taskId": 42 } }
```

## Reviews

### GET /auth/project/tasks/:taskId/reviews
Purpose: list review records for a task.

Success example:
```json
{
  "reviews": [
    { "id": 1, "taskId": 42, "action": "approved", "comment": "Looks good" }
  ]
}
```

### POST /auth/project/tasks/:taskId/review/approve
Purpose: approve a task and move it to Done.

Request example:
```json
{ "review": "Approved after QA pass" }
```

Success example:
```json
{ "message": "Task approved and moved to Done", "task": { "id": 42, "category_id": 4 } }
```

### POST /auth/project/tasks/:taskId/review/reject
Purpose: reject a task and move it back to Todo.

Request example:
```json
{ "reason": "Needs copy edits" }
```

Success example:
```json
{ "message": "Task rejected and moved to TODO", "task": { "id": 42, "category_id": 1 } }
```

## Comments and Replies

### GET /auth/api/tasks/:taskId/comments
Purpose: fetch comments and nested replies.

Success example:
```json
{
  "comments": [
    {
      "id": 1,
      "comment": "Please update the layout.",
      "createdAt": "2026-05-13T12:00:00.000Z",
      "user": { "id": "...", "firstName": "Maya" },
      "replies": []
    }
  ]
}
```

### POST /auth/api/tasks/:taskId/comments/:userId
Purpose: add a comment.

Request example:
```json
{ "comment": "Please update the layout." }
```

Success example:
```json
{ "message": "Comment added successfully", "comment": { "id": 1, "comment": "Please update the layout." } }
```

### POST /auth/api/tasks/:taskId/comments/:commentId/:userId
Purpose: reply to a comment.

Request example:
```json
{ "comment_reply": "Done." }
```

Success example:
```json
{ "message": "Reply added successfully", "reply": { "id": 3, "commentId": 1, "commentReply": "Done." } }
```

## Tags

### GET /auth/projects/:projectId/tags
Purpose: list tags used in a project.

Success example:
```json
{ "tags": [ { "id": 1, "tagName": "ui", "projectId": "..." } ] }
```

### GET /auth/api/tasks/:taskId/tags
Purpose: list tags attached to a task.

Success example:
```json
{ "tags": [ { "id": 1, "tagName": "ui", "taskId": 42 } ] }
```

### POST /auth/api/tasks/:taskId/tags
Purpose: create a tag for a task.

Request example:
```json
{ "tagName": "ui", "projectId": "..." }
```

Success example:
```json
{ "tag": { "id": 1, "tagName": "ui", "taskId": 42, "projectId": "..." } }
```

### DELETE /auth/api/tasks/:taskId/tags/:tagId
Purpose: delete a task tag.

Success example:
```json
{ "tag": { "id": 1, "tagName": "ui", "taskId": 42 } }
```

## Assignments

### POST /auth/project/tasks/assign-task/:memberId/:taskId
Purpose: assign another member to a task.

Success example:
```json
{ "message": "Member assigned to task successfully", "assignment": { "id": 1, "taskId": 42, "memberId": "..." } }
```

### DELETE /auth/project/tasks/assign-task/:memberId/:taskId
Purpose: unassign another member.

Success example:
```json
{ "message": "Member unassigned from task successfully", "assignment": { "id": 1, "taskId": 42, "memberId": "..." } }
```

### DELETE /auth/project/tasks/unassign-task/:taskId
Purpose: unassign the current user.

Success example:
```json
{ "message": "Task unassigned successfully", "assignment": { "id": 1, "taskId": 42, "userId": "..." } }
```

## Members

### DELETE /auth/projects/:projectId/members/:memberId
Purpose: remove a member from the project.

Success example:
```json
{ "message": "Member removed successfully", "projectId": "...", "memberId": "..." }
```

### PATCH /auth/projects/:projectId/members/:memberId/role
Purpose: change a member’s role.

Request example:
```json
{ "role": "admin" }
```

Success example:
```json
{ "message": "Member role updated successfully", "projectId": "...", "memberId": "...", "role": "admin" }
```

## Friends

### POST /auth/friends
Purpose: send a friend request by email.

Request example:
```json
{ "email": "teammate@example.com" }
```

Success example:
```json
{ "message": "Friend request sent successfully", "friendRequest": { "id": "...", "status": "pending" } }
```

### GET /auth/friends
Purpose: list accepted friends.

Success example:
```json
{ "friends": [ { "id": "...", "firstName": "Noah" } ] }
```

### GET /auth/friends/sent
Purpose: list sent friend requests.

### GET /auth/friends/incoming
Purpose: list incoming friend requests.

### PATCH /auth/friends/requests/:requestId/accept
Purpose: accept a friend request.

### PATCH /auth/friends/requests/:requestId/decline
Purpose: decline a friend request.

### PATCH /auth/friends/requests/:requestId/cancel
Purpose: cancel a sent friend request.

## Metrics

### GET /auth/projects/:projectId/metrics?days=30
Purpose: compute and return project analytics.

Success example:
```json
{
  "window_days": 30,
  "completion_rate": 66.7,
  "avg_cycle_time_days": 3.1,
  "cached": false,
  "degraded": false
}
```

## Response conventions

- Controllers generally return a single success envelope with a message and one payload object.
- Validation failures are usually 400.
- Missing resources are usually 404.
- Permission failures are usually 403.
- Duplicate or state-conflict failures are usually 409.
