-- Migration 011: repair/upgrade task_files table for Google Drive metadata
ALTER TABLE task_files
  ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

UPDATE task_files
SET
  drive_file_id = COALESCE(NULLIF(drive_file_id, ''), split_part(url, 'id=', 2)),
  file_name = COALESCE(NULLIF(file_name, ''), 'Attachment'),
  mime_type = COALESCE(NULLIF(mime_type, ''), 'application/octet-stream')
WHERE drive_file_id IS NULL
   OR file_name IS NULL
   OR mime_type IS NULL;

ALTER TABLE task_files
  ALTER COLUMN drive_file_id SET NOT NULL,
  ALTER COLUMN file_name SET NOT NULL,
  ALTER COLUMN mime_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_files_drive_file_id ON task_files(drive_file_id);
