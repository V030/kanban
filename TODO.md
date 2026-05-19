# TODO - Organize documentation files (Option A: create docs/)

## Plan checkpoints
- [ ] Create `docs/` directory (handled implicitly by file creation only after edits)
- [ ] Move all top-level `*.md` docs (except `README.md` unless you want it moved) into `docs/`
- [ ] Create `docs/README.md` as the new entry point (maps to existing canonical docs)
- [ ] Update relative links inside moved docs so they still work (e.g., `(./ARCHITECTURE.md)`)
- [ ] Update any references in root `README.md` / other docs pointing to moved files
- [ ] Verify link consistency by running a quick grep for `](./` / `](../` in docs

## Notes
- Google OAuth docs: keep `GOOGLE_OAUTH_SETUP_CHECKLIST.md`, `GOOGLE_OAUTH_IMPLEMENTATION.md` together under `docs/auth/google/` if we decide to sub-categorize further; otherwise keep in `docs/` root.

