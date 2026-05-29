We need to output full modified README with updated list. Replace the list at top. Provide whole file.```
# Kanban App

This repository’s canonical documentation lives in:

- [Project Source of Truth](docs/PROJECT_SOURCE_OF_TRUTH.md)
- [Architecture](docs/architecture/ARCHITECTURE.md)
- [API Reference](docs/api/API_REFERENCE.md)
- [Database](docs/database/DATABASE.md)
- [Security](SECURITY.md)
- [Contributor Guide](CONTRIBUTING.md)
- [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)
- [Toast Services Quick Reference](docs/toast/TOAST_SERVICES_QUICK_REFERENCE.md)
- [Toast Integration Guide](docs/toast/TOAST_INTEGRATION_GUIDE.md)

Start there for the real system behavior, API contracts, schema constraints, and contribution rules.

## Project Overview

This project is a Kanban application with a React frontend and a Node.js/Express backend, utilizing PostgreSQL as its database. It features user authentication, project management, task tracking, notifications, and real-time updates.

## Frontend Architecture (`client/`)

The frontend is a React application built with `create-react-app` (implied by `react-scripts`).

- **Frameworks & Libraries**:
    - React 19.x
    - React Router DOM 7.x for navigation
    - `@react-oauth/google` for Google OAuth integration
    - `@testing-library/react`, `jest-dom`, `user-event` for testing
    - TypeScript for type checking

- **Directory Structure**:
    - `src/App.js`: Main application component.
    - `src/index.js`: Entry point for the React application.
    - `src/components/`: Reusable UI components.
        - `common/`: General-purpose components (e.g., `AppIcons`, `SideBar`, `KanbanBoard`, modals, forms).
        - `protected/`: Components for authenticated routes (e.g., `ProtectedRoutes`).
        - `public/`: Components for public routes (e.g., `PublicRoutes`).
        - `styles/`: Component-specific CSS files.
    - `src/pages/`: Top-level components representing different views/routes (e.g., `Dashboard`, `Projects`, `KanbanPage`, `LoginPage`).
    - `src/contexts/`: React Context API for global state management (e.g., `ToastContext`).
    - `src/hooks/`: Custom React hooks for encapsulating reusable logic (e.g., `useInfiniteList`, `useToast`).
    - `src/services/`: Client-side API interaction logic (e.g., `authService`, `projectService`, `notificationService`).
    - `src/utils/`: Utility functions (e.g., `errorTransformer`, `toastHelpers`).

- **Styling**:
    - Global styles in `src/App.css` and `src/index.css`.
    - A design system foundation in `src/DesignSystem.css` which enforces a two-font policy and defines CSS variables.
    - Component-specific styles located in `src/components/styles/` and directly alongside components (e.g., `src/components/Toast.css`).

- **Testing**:
    - Unit tests for components, hooks, and pages are located in `client/src/**/*.test.js(x)` and `client/tests/`.

## Backend Architecture (`server/`)

The backend is a Node.js application built with Express.js.

- **Technologies**:
    - Node.js/Express.js framework.
    - `pg` for PostgreSQL database interaction.
    - `jsonwebtoken` for JWT-based authentication.
    - `bcrypt` for password hashing.
    - `nodemailer` for email services.
    - `express-rate-limit` and `rate-limit-redis` for API rate limiting.
    - `cors` for handling Cross-Origin Resource Sharing.
    - `dotenv` for environment variable management.
    - `redis` for caching and potentially session management/rate limiting.

- **Directory Structure**:
    - `server.js`: Main entry point for the Express application.
    - `routes/`: Defines API endpoints and maps them to controller functions (e.g., `authRoutes`, `protectedRoutes`).
    - `controllers/`: Contains the business logic for handling requests and preparing responses.
    - `models/`: Database interaction logic and data schemas (e.g., using `pg` directly or an ORM).
    - `middleware/`: Express middleware functions for tasks like authentication, authorization, error handling, and rate limiting.
    - `migrations/`: Database schema migration files (e.g., SQL scripts or ORM migration files).
    - `utils/`: Shared utility functions and helper modules.
        - `jwt.js`: JWT token generation and verification.
        - `mailer.js`: Email sending utilities.
        - `notificationStream.js`: Logic for Server-Sent Events (SSE) or similar real-time notification handling.
        - `projectPermissions.js`: Functions to manage project-specific access control.
        - `realtimeBroadcaster.js`: Utility for broadcasting real-time updates.
        - `googleAuth.js`: Google authentication helpers.
    - `config/`: Configuration files for the server.

- **Testing**:
    - Server-side tests are located in `server/tests/`, covering controllers, middleware, and models.
## Recent highlights:

- Icons and reusable SVGs have been centralized into `client/src/components/common/AppIcons.jsx` to provide consistent, solid-style iconography across the app.
- The client enforces a two-font policy (one display, one body) for consistent typography across pages; see `client/src/DesignSystem.css` for the current font variables.
- Real-time notifications are implemented using `utils/notificationStream.js` and `utils/realtimeBroadcaster.js` on the server, likely leveraging Server-Sent Events (SSE) for efficient updates to the client.
- Robust authentication and authorization are in place, with JWTs, Google OAuth, and granular project permissions managed through `utils/jwt.js`, `utils/googleAuth.js`, and `utils/projectPermissions.js` respectively.
- API rate limiting is applied using `express-rate-limit` and `rate-limit-redis` to protect against abuse.

