# Project Invite Flow Summary

This summary reflects the current invite flow in the app. Project invitations are stored as project requests for existing users, not as external email invitation records.

## Entry Point

**File:** `client/src/components/common/ProjectMembersModal.jsx`

The active project invite UI is `ProjectMembersModal`. It supports:

- Inviting a friend by user id.
- Inviting an existing registered user by email address.

`AddMemberModal` was removed because it was an outdated, unused invite path.

## Frontend Service

**File:** `client/src/services/projectService.js`

```js
export async function inviteMemberToProject(inviteData) {
  return fetchWithAuth(`${API_URL}/auth/projects/send-invite`, {
    method: "POST",
    body: JSON.stringify(inviteData),
  });
}
```

The service sends either:

```js
{ projectId, friendId }
```

or:

```js
{ projectId, email }
```

## Frontend Permission Gate

**File:** `client/src/pages/KanbanPage.jsx`

The members modal receives `canInvite` using the same role split as the backend:

- Owners can invite.
- Admins can invite only when `allow_admin_add_member` is enabled.
- Regular members can invite only when `allow_member_add_member` is enabled.

## Route

**File:** `server/routes/authRoutes.js`

```js
router.post(
  "/projects/send-invite/",
  authenticateToken,
  inviteLimiter,
  inviteMemberToProject
);
```

Requests must be authenticated and pass the invite rate limiter.

## Controller

**File:** `server/controllers/projectController.js`

`inviteMemberToProject()` validates:

- The user is authenticated.
- A project id is provided.
- Either a friend id or email is provided.

It calls the model with either:

```js
{
  inviter_id: req.user.userId,
  invitee_id: inviteeId,
  project_id: projectId,
}
```

or:

```js
{
  inviter_id: req.user.userId,
  invitee_email: inviteeEmail,
  project_id: projectId,
}
```

Successful invites return:

```text
201 Created
```

with:

```js
{ message: "Invite sent", inviteRequest }
```

The controller also creates a `project_invitation` notification for the invite recipient when the invite is stored successfully.

## Model

**File:** `server/models/projectModel.js`

`inviteMemberToProject()` resolves and validates the invite before writing to the database.

For email invites, the model looks up the email in `users`:

```sql
SELECT id FROM users WHERE email = $1 LIMIT 1
```

If no registered user exists for that email, it throws `USER_NOT_FOUND`. The current implementation does not store or deliver external email invitations.

After resolving the invitee, the model checks:

- Inviter id exists.
- Invitee id exists.
- Project id exists.
- The inviter is not inviting themselves.
- The inviter has permission for their project role.
- The invitee is not already a project member.
- The invitee does not already have a pending or accepted project request.

## Database

**File:** `server/migrations/001_create_project_requests.sql`

Invites are stored in `project_requests`:

```sql
CREATE TABLE IF NOT EXISTS project_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Important columns:

- `requester_id`: user sending the invite.
- `recipient_id`: registered user receiving the invite.
- `project_id`: invited project.
- `status`: `pending`, `accepted`, or `declined`.

There is no `project_invitations` table in the current flow and no `invitee_email` column in `project_requests`.

## Current Behavior

1. The user opens `ProjectMembersModal`.
2. The UI checks `canInvite`.
3. The user invites a friend by id or an existing user by email.
4. The service posts to `/auth/projects/send-invite`.
5. The controller validates the request and delegates to the model.
6. The model stores a pending row in `project_requests`.
7. The controller sends a notification.
8. The frontend shows a success toast and refreshes the member list.
