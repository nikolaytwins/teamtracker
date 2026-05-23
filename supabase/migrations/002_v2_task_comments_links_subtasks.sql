-- 002 — Комментарии, ссылки, планирование по дням (подзадачи через parent_id в 001).

CREATE TABLE IF NOT EXISTS v2_task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES v2_tasks (id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_task_comments_task ON v2_task_comments (task_id, created_at);

CREATE TABLE IF NOT EXISTS v2_task_links (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES v2_tasks (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_task_links_task ON v2_task_links (task_id);

CREATE TABLE IF NOT EXISTS v2_task_scheduled_days (
  task_id TEXT NOT NULL REFERENCES v2_tasks (id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_v2_task_scheduled_date ON v2_task_scheduled_days (scheduled_date);

ALTER TABLE v2_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_task_scheduled_days ENABLE ROW LEVEL SECURITY;
