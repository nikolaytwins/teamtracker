-- 017 — v2 «Проекты и финансы»: отдельное хранилище от v1 agency_* и v2_projects (задачи).

CREATE TABLE IF NOT EXISTS v2_finance_projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  paid_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_paid',
  service_type TEXT NOT NULL DEFAULT 'site',
  client_type TEXT,
  payment_method TEXT,
  client_contact TEXT,
  notes TEXT,
  source_lead_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_finance_projects_workspace_created
  ON v2_finance_projects (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS v2_finance_expenses (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES v2_finance_projects (id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_role TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_finance_expenses_project
  ON v2_finance_expenses (project_id);

CREATE TABLE IF NOT EXISTS v2_finance_project_details (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES v2_finance_projects (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_finance_project_details_project
  ON v2_finance_project_details (project_id);

CREATE TABLE IF NOT EXISTS v2_finance_general_expenses (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_role TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_finance_general_expenses_workspace_created
  ON v2_finance_general_expenses (workspace_id, created_at DESC);

ALTER TABLE v2_finance_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_finance_project_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_finance_general_expenses ENABLE ROW LEVEL SECURITY;
