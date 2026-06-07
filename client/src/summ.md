Here's a cleaner, documentation-style version with consistent formatting, headings, and code blocks.

# Invite a Friend to a Project — End-to-End Flow Trace

This traces the complete flow when a user invites a friend (or enters an email address) from the **Project Members** modal.

**Scope:** Documentation/tracing only. No code changes are suggested.

---

## 1. UI Layer — User Clicks "Invite"

**File:** `client/src/components/common/ProjectMembersModal.jsx`

### Invite Existing Friend

```js
const handleSelectFriend = async (friendId, projectId) => {
  ...
  await inviteMemberToProject({ projectId, friendId });
  toast.showSuccess("Invitation sent successfully!");
};
```

### Invite via Email

```js
const handleSubmit = async (e) => {
  e.preventDefault();
  ...

  await inviteMemberToProject({
    projectId: project.id,
    email: email.trim(),
  });

  toast.showSuccess("Invitation sent successfully!");
};
```

### What Happens

The modal calls `inviteMemberToProject()` (imported from `projectService.js`) with either:

```js
{ projectId, friendId }
```

or

```js
{ projectId, email }
```

depending on how the invitation is initiated.

---

## 2. Service Layer — Convert Data into an HTTP Request

**File:** `client/src/services/projectService.js`

```js
export async function inviteMemberToProject(inviteData) {
  return fetchWithAuth(`${API_URL}/auth/projects/send-invite`, {
    method: "POST",
    body: JSON.stringify(inviteData),
  });
}
```

### What Happens

The service sends a **POST** request to:

```text
/auth/projects/send-invite
```

using the configured API URL:

```js
process.env.REACT_APP_API_URL
```

The request body contains the JSON-stringified invitation payload.

---

## 3. Express Router — Request Enters the Backend

**File:** `server/routes/authRoutes.js`

```js
router.post(
  "/projects/send-invite/",
  authenticateToken,
  inviteLimiter,
  inviteMemberToProject
);
```

### What Happens

Before reaching the controller, the request passes through:

1. `authenticateToken`

   * Verifies the user is authenticated.
   * Populates `req.user`.

2. `inviteLimiter`

   * Applies rate limiting.
   * Helps prevent invitation spam/abuse.

After those checks, the request is forwarded to:

```js
inviteMemberToProject
```

(controller function)

---

## 4. Controller Layer — Validation & Delegation

**File:** `server/controllers/projectController.js`

```js
export async function inviteMemberToProject(req, res) {
  const projectId =
    (req.body?.project || req.body?.projectId || "").trim();

  const inviteeId =
    (req.body?.friend || req.body?.friendId || "").trim();

  const inviteeEmail =
    (req.body?.email || req.body?.emailAddress || "").trim();

  try {
    const inviteRequest = await inviteMemberToProjectModel({
      inviter_id: req.user.userId,
      invitee_id: inviteeId,
      invitee_email: inviteeEmail,
      project_id: projectId,
    });

    return res.status(200).json({
      message: "Invitation sent",
      invitation: inviteRequest,
    });
  } catch (err) {
    console.error("[invite] error:", err);

    return res.status(400).json({
      message: err.message || "Unable to send invitation",
    });
  }
}
```

### What Happens

The controller:

1. Extracts:

   * `projectId`
   * `friendId` → normalized to `invitee_id`
   * `email` → normalized to `invitee_email`

2. Retrieves the authenticated user's ID:

```js
req.user.userId
```

3. Calls the model:

```js
inviteMemberToProjectModel(...)
```

4. Returns:

   * **200 OK** on success
   * **400 Bad Request** on failure

---

## 5. Model Layer — Database Insert

**File:** `server/models/projectModel.js`

```js
export async function inviteMemberToProject({
  inviter_id,
  invitee_id,
  invitee_email,
  project_id,
}) {
  const fields = [
    "inviter_id",
    "project_id",
    "status",
    "created_at",
  ];

  const values = [
    inviter_id,
    project_id,
    "pending",
    new Date(),
  ];

  let placeholderIdx = 3;

  if (invitee_id) {
    fields.push("invitee_id");
    values.push(invitee_id);
    placeholderIdx++;
  }

  if (invitee_email) {
    fields.push("invitee_email");
    values.push(invitee_email);
    placeholderIdx++;
  }

  const query = `
    INSERT INTO project_invitations (${fields.join(", ")})
    VALUES (${fields.map((_, i) => `$${i + 1}`).join(", ")})
    RETURNING *
  `;

  const { rows } = await pool.query(query, values);

  return rows[0];
}
```

### What Happens

The model dynamically constructs an `INSERT` statement for the `project_invitations` table.

Common fields:

```text
inviter_id
project_id
status = "pending"
created_at
```

Additionally, it includes either:

```text
invitee_id
```

or

```text
invitee_email
```

depending on the invitation type.

The newly created row is returned via:

```sql
RETURNING *
```

---

## 6. Database Layer — Invitation Stored

**Table:** `project_invitations`

### Relevant Columns

```text
id
project_id
inviter_id
invitee_id
invitee_email
status
created_at
updated_at
```

### Status Values

```text
pending
accepted
declined
```

### What Happens

A new invitation record is created and stored.

This record is later used by invitation-management endpoints such as:

```text
/projects/invitations/:requestId/accept
/projects/invitations/:requestId/decline
```

---

## 7. Response Returns to the Client

**Controller Response**

```js
res.status(200).json({
  message: "Invitation sent",
  invitation: inviteRequest,
});
```

### What Happens

1. Controller returns the newly created invitation.
2. Service promise resolves.
3. UI displays:

```text
Invitation sent successfully!
```

via:

```js
toast.showSuccess(...)
```

---

# Complete Data Flow

```text
ProjectMembersModal
        │
        ▼
inviteMemberToProject()
        │
        ▼
fetchWithAuth()
        │
        ▼
POST /auth/projects/send-invite
        │
        ▼
authenticateToken
        │
        ▼
inviteLimiter
        │
        ▼
projectController.inviteMemberToProject()
        │
        ▼
projectModel.inviteMemberToProject()
        │
        ▼
INSERT INTO project_invitations
        │
        ▼
PostgreSQL
        │
        ▼
Created invitation row returned
        │
        ▼
Controller returns JSON
        │
        ▼
Service promise resolves
        │
        ▼
Success toast displayed in UI
```

---

# Key Observations

### Flexible Payload Format

The frontend may submit either:

```js
{
  projectId,
  friendId
}
```

or

```js
{
  projectId,
  email
}
```

The controller normalizes these into:

```js
invitee_id
invitee_email
```

before passing data to the model.

### Authentication

Authentication is enforced by:

```js
authenticateToken
```

The authenticated user's ID is automatically injected as:

```js
req.user.userId
```

and becomes:

```js
inviter_id
```

in the database.

### Rate Limiting

```js
inviteLimiter
```

helps protect the endpoint from excessive invitation requests.

### Error Handling

Errors are:

```js
console.error("[invite] error:", err);
```

logged on the server and returned as:

```js
res.status(400).json(...)
```

The frontend can then surface the error message to the user.

---

## One-Sentence Summary

The invitation flow starts in `ProjectMembersModal`, sends either a `friendId` or `email` through `projectService`, passes authentication and rate-limiting middleware, is normalized and processed by the controller, stored in `project_invitations` by the model, and finally returns a success response that triggers the UI toast notification.
