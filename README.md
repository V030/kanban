# Kanban App

This repository contains a collaborative Kanban application with a React frontend, an Express API, and PostgreSQL persistence.

## Documentation

Start with the canonical docs:

- [Documentation index](docs/README.md)
- [Project source of truth](docs/PROJECT_SOURCE_OF_TRUTH.md)
- [Architecture](docs/architecture/ARCHITECTURE.md)
- [API reference](docs/api/API_REFERENCE.md)
- [Database](docs/database/DATABASE.md)
- [Frontend state and preferences](docs/frontend/STATE_AND_PREFERENCES.md)
- [Security](SECURITY.md)
- [Contributor guide](CONTRIBUTING.md)
- [Test quick start](TEST_QUICK_START.md)

## Project Overview

The app supports account authentication, Google OAuth, project creation, project invitations, member roles, task boards, table views, task details, tags, comments, file attachments, review flows, metrics, notifications, and real-time refreshes.

## Frontend Architecture (`client/`)

The frontend is a React SPA built with `react-scripts`.

- React 19.x
- React Router DOM 7.x
- `@react-oauth/google` for Google OAuth
- Testing Library and Jest tooling
- CSS files colocated by page/component area

Important folders:

- `client/src/pages/`: route-level screens such as `Dashboard`, `Projects`, `KanbanPage`, `TaskDetailsPage`, `Metrics`, and `Profile`.
- `client/src/components/common/`: shared UI such as `KanbanBoard`, `KanbanTable`, modals, toasts, icons, and project/member controls.
- `client/src/services/`: API wrappers such as `authService`, `projectService`, `notificationService`, `friendService`, and `feedbackService`.
- `client/src/hooks/`: shared React hooks.
- `client/src/contexts/`: shared React context, currently including toast state.
- `client/src/utils/`: small client utilities.

The Kanban page owns the current board data and can render it as either a board or table. The selected view is stored locally under `kanban:viewMode` so returning users keep their last selected board/table mode.

## Backend Architecture (`server/`)

The backend is an Express app using PostgreSQL through `pg`.

Important folders:

- `server/routes/`: HTTP route definitions and middleware attachment.
- `server/controllers/`: request validation, response mapping, and orchestration.
- `server/models/`: SQL, transactions, and server-side permission enforcement.
- `server/middleware/`: authentication, authorization, rate limiting, and shared request middleware.
- `server/utils/`: JWT helpers, mailers, notification streaming, realtime broadcasting, Google auth, and project permission helpers.
- `server/migrations/`: database schema changes.

## Common Commands

From `client/`:

```bash
npm start
npm run build
npm test
```

From `server/`:

```bash
npm run dev
npm test
```

## Current Notes

- Server-side authorization is the source of truth. UI permission checks are only for affordances.
- Project notification URLs are project-scoped: `/main-page/projects/:projectId/kanban/tasks/:taskId`.
- Real-time updates use the existing notification stream and client-side window events.
- JWTs are stored in `localStorage`; see [Security](SECURITY.md) for the risk profile.
