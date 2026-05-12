ALTER TABLE IF EXISTS project_settings
  ADD COLUMN IF NOT EXISTS allow_admin_add_member boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_admin_remove_member boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_admin_add_board boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_admin_manage_tasks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_admin_create_tag boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_member_create_tag boolean NOT NULL DEFAULT false;
