-- Migration 014: create task activity log
CREATE TABLE IF NOT EXISTS task_activities (
  id BIGSERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  activity_type VARCHAR(64) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task_created
  ON task_activities (task_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_task_activities_actor
  ON task_activities (actor_id);
