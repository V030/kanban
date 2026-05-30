-- Migration 011: migrate task attachment metadata to Supabase Storage paths
ALTER TABLE task_files
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS file_size BIGINT;

UPDATE task_files
SET
  storage_path = COALESCE(NULLIF(storage_path, ''), CONCAT('legacy/', id::text)),
  file_name = COALESCE(NULLIF(file_name, ''), 'Attachment'),
  mime_type = COALESCE(NULLIF(mime_type, ''), 'application/octet-stream'),
  file_size = COALESCE(file_size, 0),
  url = COALESCE(url, '')
WHERE storage_path IS NULL
   OR file_name IS NULL
   OR mime_type IS NULL
   OR file_size IS NULL
   OR url IS NULL;

ALTER TABLE task_files
  ALTER COLUMN storage_path SET NOT NULL,
  ALTER COLUMN file_name SET NOT NULL,
  ALTER COLUMN mime_type SET NOT NULL,
  ALTER COLUMN file_size SET NOT NULL,
  ALTER COLUMN url SET DEFAULT '',
  ALTER COLUMN url SET NOT NULL;

ALTER TABLE task_files
  DROP COLUMN IF EXISTS drive_file_id;

DROP INDEX IF EXISTS idx_task_files_drive_file_id;
CREATE INDEX IF NOT EXISTS idx_task_files_storage_path ON task_files(storage_path);
