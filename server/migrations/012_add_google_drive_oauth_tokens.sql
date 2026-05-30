-- Migration 012: store Google Drive OAuth refresh tokens for user-owned uploads
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_scope_granted_at TIMESTAMP;
