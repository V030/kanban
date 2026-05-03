-- Backfill the new default category for existing projects.
-- Run this after deploying the app code that knows about 'to_review'.

DO $$
DECLARE
  project_row RECORD;
  done_position INTEGER;
  board_id UUID;
BEGIN
  FOR project_row IN
    SELECT DISTINCT p.id AS project_id
    FROM projects p
    WHERE EXISTS (
      SELECT 1
      FROM tasks_categories tc
      WHERE tc.project_id = p.id
        AND tc.name = 'todo'
    )
    AND EXISTS (
      SELECT 1
      FROM tasks_categories tc
      WHERE tc.project_id = p.id
        AND tc.name = 'in_progress'
    )
    AND EXISTS (
      SELECT 1
      FROM tasks_categories tc
      WHERE tc.project_id = p.id
        AND tc.name = 'done'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM tasks_categories tc
      WHERE tc.project_id = p.id
        AND tc.name = 'to_review'
    )
  LOOP
    SELECT b.id
    INTO board_id
    FROM board b
    WHERE b.project_id = project_row.project_id
    ORDER BY b.created_at ASC
    LIMIT 1;

    IF board_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT tc."position"
    INTO done_position
    FROM tasks_categories tc
    WHERE tc.project_id = project_row.project_id
      AND tc.name = 'done'
    LIMIT 1;

    IF done_position IS NOT NULL AND done_position < 4 THEN
      UPDATE tasks_categories
      SET "position" = 4
      WHERE project_id = project_row.project_id
        AND name = 'done';
    END IF;

    INSERT INTO tasks_categories (board_id, project_id, name, "position")
    VALUES (board_id, project_row.project_id, 'to_review', 3)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
