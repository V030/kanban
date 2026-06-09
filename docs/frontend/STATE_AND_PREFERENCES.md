# Frontend State and Preferences

Last updated: 2026-06-09

This document records client-owned state that intentionally lives outside the backend. Server data, permissions, and task state remain authoritative on the API/database side.

## Local Storage Keys

| Key | Owner | Values | Purpose |
| --- | --- | --- | --- |
| `token` | `client/src/services/authService.js` | JWT string | Authenticates protected API requests. |
| `kanban:viewMode` | `client/src/pages/KanbanPage.jsx` | `board` or `table` | Remembers whether the Kanban page last rendered the board view or table view. |

## Kanban View Mode

The Kanban page supports two presentations of the same task/category data:

- Board view through `client/src/components/common/KanbanBoard.jsx`.
- Table view through `client/src/components/common/KanbanTable.jsx`.

`KanbanPage.jsx` owns `viewMode` locally. On first render it reads `kanban:viewMode`; invalid or unavailable storage falls back to `board`. When the user switches views, the page updates React state and writes the new value back to `localStorage`.

This preference is intentionally browser-local:

- It does not affect project data.
- It does not require an API endpoint or schema change.
- It is shared across projects in the same browser profile.
- If storage fails, the current-session toggle still works.

## Rules for New Local Preferences

- Keep preferences small and UI-only.
- Validate stored values before using them.
- Provide a safe default when storage is unavailable.
- Do not store project authorization, task state, or user profile data in localStorage.
- Document any new key in the table above and mention security implications if the value is sensitive.
