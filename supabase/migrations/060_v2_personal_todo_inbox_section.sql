-- 060 — inbox_section у личных задач: входящие (inbox) и отложенные (later)

ALTER TABLE v2_personal_todos
  ADD COLUMN IF NOT EXISTS inbox_section TEXT NOT NULL DEFAULT 'inbox'
  CHECK (inbox_section IN ('inbox', 'later'));

CREATE INDEX IF NOT EXISTS idx_v2_personal_todos_inbox_section
  ON v2_personal_todos (user_id, inbox_section)
  WHERE deleted_at IS NULL AND completed_at IS NULL AND parent_id IS NULL;
