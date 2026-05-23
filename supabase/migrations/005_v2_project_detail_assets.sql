-- 005 — Карточка проекта: метаданные, ссылки и файлы на уровне проекта.

ALTER TABLE v2_projects ADD COLUMN IF NOT EXISTS contract_ref TEXT;
ALTER TABLE v2_projects ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ;
ALTER TABLE v2_projects ADD COLUMN IF NOT EXISTS budget_rub INTEGER;

CREATE TABLE IF NOT EXISTS v2_project_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES v2_projects (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_project_links_project ON v2_project_links (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS v2_project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES v2_projects (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT,
  kind TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_project_files_project ON v2_project_files (project_id, created_at DESC);

ALTER TABLE v2_project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_project_files ENABLE ROW LEVEL SECURITY;
