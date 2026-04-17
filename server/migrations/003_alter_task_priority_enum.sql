-- Ensure enum task_priority supports new values used by the app.
-- This migration is idempotent and safe to run multiple times.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'task_priority'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'task_priority'
        AND e.enumlabel = 'unset'
    ) THEN
      ALTER TYPE task_priority ADD VALUE 'unset';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'task_priority'
        AND e.enumlabel = 'critical'
    ) THEN
      ALTER TYPE task_priority ADD VALUE 'critical';
    END IF;
  END IF;
END $$;

-- Keep default aligned with app behavior for newly created tasks.
ALTER TABLE tasks
  ALTER COLUMN priority SET DEFAULT 'unset';
