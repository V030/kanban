-- Migration 012: remove obsolete upload OAuth token storage
ALTER TABLE users
  DROP COLUMN IF EXISTS google_refresh_token,
  DROP COLUMN IF EXISTS google_drive_scope_granted_at;
