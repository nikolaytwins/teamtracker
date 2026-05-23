-- Файлы задач и ответы в комментариях.

ALTER TABLE v2_task_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id TEXT REFERENCES v2_task_comments (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_v2_task_comments_parent
  ON v2_task_comments (parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS v2_task_files (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES v2_tasks (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes INTEGER,
  kind TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_task_files_task ON v2_task_files (task_id, created_at DESC);

ALTER TABLE v2_task_files ENABLE ROW LEVEL SECURITY;
