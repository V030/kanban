-- Migration: create project_requests table
-- Run this in your Postgres database (psql or pgAdmin)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS project_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pending','accepted','declined','cancelled','rejected'))
);

-- Index for fast lookup of recipient's incoming requests
CREATE INDEX IF NOT EXISTS idx_project_requests_recipient_status ON project_requests(recipient_id, status, requested_at DESC);

-- Index for looking up requests by project
CREATE INDEX IF NOT EXISTS idx_project_requests_project_status ON project_requests(project_id, status, requested_at DESC);

-- Prevent duplicate pending requests for the same project between the same requester and recipient
CREATE UNIQUE INDEX IF NOT EXISTS ux_project_requests_pending_pair
ON project_requests (project_id, requester_id, recipient_id)
WHERE status = 'pending';

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION trg_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON project_requests;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON project_requests
FOR EACH ROW
EXECUTE PROCEDURE trg_set_timestamp();
