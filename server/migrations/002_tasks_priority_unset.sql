-- Ensure tasks.priority accepts 'unset' and defaults to 'unset'
-- Run manually in your database after pulling this change.

DO $$
DECLARE
  c_name text;
BEGIN
  -- Drop existing priority-related CHECK constraints on tasks to avoid conflicts.
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'tasks'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%priority%'
  LOOP
    EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT %I', c_name);
  END LOOP;
END $$;

ALTER TABLE tasks
  ALTER COLUMN priority SET DEFAULT 'unset';

ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('unset', 'low', 'medium', 'high', 'critical'));
