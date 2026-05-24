-- 013 — CRM-клиенты v2: карточка клиента и привязка к проектам.

CREATE TABLE IF NOT EXISTS v2_clients (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_clients_workspace_normalized
  ON v2_clients (workspace_id, normalized_name);

CREATE INDEX IF NOT EXISTS idx_v2_clients_workspace_name
  ON v2_clients (workspace_id, display_name);

ALTER TABLE v2_projects
  ADD COLUMN IF NOT EXISTS client_id TEXT REFERENCES v2_clients (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_v2_projects_client_id ON v2_projects (client_id);

-- RLS: anon/authenticated не видят строк; сервер пишет через service_role (обходит RLS).
ALTER TABLE v2_clients ENABLE ROW LEVEL SECURITY;
