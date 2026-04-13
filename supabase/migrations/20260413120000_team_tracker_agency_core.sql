-- Team Tracker: core agency + sales tables for Supabase (Postgres).
-- Имена колонок — snake_case; импорт из SQLite: scripts/import-agency-sqlite-to-supabase.ts
-- Остальное из монолитного agency.db (личные финансы, monthly_history, impulse …) — отдельные миграции позже.

CREATE TABLE IF NOT EXISTS agency_project (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_amount DOUBLE PRECISION NOT NULL,
  paid_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_paid',
  service_type TEXT NOT NULL,
  client_type TEXT,
  payment_method TEXT,
  client_contact TEXT,
  notes TEXT,
  source_lead_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_project_source_lead_id
  ON agency_project (source_lead_id)
  WHERE source_lead_id IS NOT NULL AND TRIM(source_lead_id) != '';

CREATE TABLE IF NOT EXISTS agency_expense (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES agency_project (id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_role TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_expense_project_id ON agency_expense (project_id);

CREATE TABLE IF NOT EXISTS agency_project_detail (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES agency_project (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_project_detail_project_id ON agency_project_detail (project_id);

CREATE TABLE IF NOT EXISTS agency_leads (
  id TEXT PRIMARY KEY,
  contact TEXT NOT NULL,
  source TEXT NOT NULL,
  task_description TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  next_contact_date TIMESTAMPTZ,
  manual_date_set BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_history (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  old_source TEXT,
  new_source TEXT,
  old_date TEXT,
  new_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history (lead_id);

CREATE TABLE IF NOT EXISTS agency_general_expense (
  id TEXT PRIMARY KEY,
  employee_name TEXT NOT NULL,
  employee_role TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_responses (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'profi',
  created_at TIMESTAMPTZ NOT NULL,
  cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  refund_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'response',
  project_amount DOUBLE PRECISION,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outreach_platform ON outreach_responses (platform);
CREATE INDEX IF NOT EXISTS idx_outreach_created ON outreach_responses (created_at);

CREATE TABLE IF NOT EXISTS platform_visits (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_visits_platform ON platform_visits (platform);
CREATE INDEX IF NOT EXISTS idx_platform_visits_at ON platform_visits (visited_at);

-- RLS: anon/authenticated не видят строк; сервер пишет через service_role (обходит RLS).
ALTER TABLE agency_project ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_project_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_general_expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_visits ENABLE ROW LEVEL SECURITY;
