# Project Source of Truth

Last updated: 2026-06-09

This is the entry point for the project documentation set. The detailed source of truth is split into focused documents so humans and AI agents can read only the layer they need.

## Canonical Docs

- [Architecture](./architecture/ARCHITECTURE.md)
- [API Reference](./api/API_REFERENCE.md)
- [Database](./database/DATABASE.md)
- [Frontend State and Preferences](./frontend/STATE_AND_PREFERENCES.md)
- [Security](../SECURITY.md)
- [Contributor Guide](../CONTRIBUTING.md)
- [Test Quick Start](../TEST_QUICK_START.md)

## What This Repository Uses This For

- Preserve the real request and data flow.
- Document endpoint contracts with concrete examples.
- Capture schema constraints and permission rules.
- Record browser-local state that should not become backend state by accident.
- Provide stable guidance for future code changes.

## Reading Order

1. Read [Architecture](./architecture/ARCHITECTURE.md) to understand the runtime shape.
2. Read [API Reference](./api/API_REFERENCE.md) for endpoint contracts and examples.
3. Read [Database](./database/DATABASE.md) for tables, relationships, and lifecycle rules.
4. Read [Frontend State and Preferences](./frontend/STATE_AND_PREFERENCES.md) before adding client-only persistence.
5. Read [Security](../SECURITY.md) for trust boundaries and risks.
6. Read [Contributor Guide](../CONTRIBUTING.md) before adding features.
