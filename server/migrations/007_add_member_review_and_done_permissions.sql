ALTER TABLE IF EXISTS project_settings
  ADD COLUMN IF NOT EXISTS allow_member_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_member_move_task_to_done boolean NOT NULL DEFAULT false;
