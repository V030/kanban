# Security

Last updated: 2026-06-09

This document focuses on trust boundaries, authorization, and the operational risks visible in the current codebase.

## Trust Boundaries

- Browser state is untrusted.
- JWTs are the identity source for authenticated requests.
- The server must enforce all permissions regardless of frontend UI state.
- Project membership and project settings are the real authorization boundary.

## Authentication

- JWTs are signed with JWT_SECRET and expire using JWT_EXPIRES_IN or the default of 7d.
- Tokens are stored in localStorage, which is convenient but vulnerable to XSS.
- fetchWithAuth logs the user out and redirects to /login when a 401 is returned.

## Browser Storage

Known localStorage keys:

- `token`: JWT used by authenticated API requests. This is sensitive and exposed to XSS risk.
- `kanban:viewMode`: non-sensitive UI preference with values `board` or `table`.

Rules:

- Never trust browser storage for authorization.
- Never store project membership, task data, permission flags, or profile objects in localStorage.
- Validate any non-sensitive preference before using it and provide a safe default.

## Authorization

- authenticateToken only verifies identity.
- Model-level permission helpers determine project/task access.
- Owner/admin/member behavior is derived from project_members and project_settings.
- Role checks should never be trusted in the frontend alone.

## Rate Limiting

Current limiter categories:
- generalApiLimiter for broad API traffic.
- authLimiter for login/register using IP + email keys.
- authenticatedLimiter for account-scoped read traffic.
- inviteLimiter for invitations and friend requests.
- projectActionLimiter for project mutations.
- taskWriteLimiter for task mutations.
- feedbackLimiter for authenticated email-only feedback submissions.

Operational note:
- Redis can back the limiter store when RATE_LIMIT_STORE=redis.
- TRUST_PROXY must be configured correctly behind a proxy or client IP resolution can be wrong.

## Logging Risks

- authenticateToken logs headers and token verification details.
- server.js prints request bodies and headers for review endpoints.
- These logs are useful during development but should be removed or gated in production.

## Validation Gaps

- Input validation is manual and inconsistent across controllers.
- The app relies on SQL constraint failures in some cases.
- Subtask update/delete endpoints are stubbed with 501, which is safe but incomplete.

## Permission Risks

- Review approval is controlled by allow_member_review.
- Those flags must stay aligned across the migration, permission helper, project settings UI, and server-side task handlers.
- Any new permission flag must be added in three places: migration, permission helper, and updateProjectSettings allowed keys.

## SQL Injection Protection

- Most queries use parameterized SQL, which is good.
- Dynamic identifiers in SQL are limited and should be treated carefully.
- Any future dynamic column/table logic must avoid string interpolation unless fully controlled.

## Recommended Improvements

1. Move JWT storage to an HTTP-only cookie flow if the frontend architecture allows it.
2. Add a centralized validation library such as Zod or Joi.
3. Remove development debug logging from auth and review endpoints.
4. Add audit logging for permission-changing actions.
5. Align schema and permission helpers for all referenced settings.
6. Add explicit authorization tests for every mutating endpoint.
7. Keep the documented localStorage key list current when adding client-only preferences.

## Production Hardening Checklist

- Set DATABASE_URL, JWT_SECRET, and JWT_EXPIRES_IN explicitly.
- Configure TRUST_PROXY correctly in deployed environments.
- Use RATE_LIMIT_STORE=redis when running multiple API instances.
- Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and FEEDBACK_RECEIVER_EMAIL for feedback delivery.
- Ensure HTTPS is enforced in production.
- Verify all routes under /auth are intentionally protected where needed.
- Confirm that all new endpoints have server-side permission checks.
