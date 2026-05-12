-- Team Tracker: канбан (pm_*), пользователи (tt_users), история месяцев (monthly_history).
-- Сервер пишет через service_role (как agency_*). Имена колонок — snake_case в Postgres.

-- --- pm_cards ---
CREATE TABLE IF NOT EXISTS pm_cards (
  id TEXT PRIMARY KEY,
  source_project_id TEXT,
  source_detail_id TEXT,
  name TEXT NOT NULL,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  extra TEXT,
  approval_waiting_since TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE INDEX IF NOT EXISTS idx_pm_cards_status ON pm_cards (status);
CREATE INDEX IF NOT EXISTS idx_pm_cards_deadline ON pm_cards (deadline);
CREATE INDEX IF NOT EXISTS idx_pm_cards_source_project ON pm_cards (source_project_id);

-- --- pm_subtasks ---
CREATE TABLE IF NOT EXISTS pm_subtasks (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES pm_cards (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_user_id TEXT,
  lead_user_id TEXT,
  estimated_hours DOUBLE PRECISION,
  completed_at TEXT,
  planned_start TEXT,
  planned_end TEXT,
  phase_id TEXT,
  deadline_at TEXT,
  execution_dates_json TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE INDEX IF NOT EXISTS idx_pm_subtasks_card ON pm_subtasks (card_id);

-- --- pm_project_phases ---
CREATE TABLE IF NOT EXISTS pm_project_phases (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES pm_cards (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE INDEX IF NOT EXISTS idx_pm_phases_card ON pm_project_phases (card_id);

-- --- pm_time_entries ---
CREATE TABLE IF NOT EXISTS pm_time_entries (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES pm_cards (id) ON DELETE CASCADE,
  phase_id TEXT NOT NULL REFERENCES pm_project_phases (id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  worker_name TEXT NOT NULL DEFAULT '',
  worker_user_id TEXT,
  task_type TEXT,
  task_note TEXT,
  subtask_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_pm_time_card ON pm_time_entries (card_id);
CREATE INDEX IF NOT EXISTS idx_pm_time_phase ON pm_time_entries (phase_id);
CREATE INDEX IF NOT EXISTS idx_pm_time_worker_user ON pm_time_entries (worker_user_id);

-- --- pm_card_comments ---
CREATE TABLE IF NOT EXISTS pm_card_comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES pm_cards (id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  author_display_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE INDEX IF NOT EXISTS idx_pm_card_comments_card_created ON pm_card_comments (card_id, created_at);

-- --- шаблоны проектов ---
CREATE TABLE IF NOT EXISTS pm_project_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS pm_project_template_items (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES pm_project_templates (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  estimated_hours DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_pm_project_template_items_tid ON pm_project_template_items (template_id);

-- --- tt_users ---
CREATE TABLE IF NOT EXISTS tt_users (
  id TEXT PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  display_name TEXT NOT NULL,
  job_title TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  supabase_id TEXT,
  auth_email TEXT,
  weekly_capacity_hours DOUBLE PRECISION NOT NULL DEFAULT 40,
  work_hours_per_day DOUBLE PRECISION NOT NULL DEFAULT 8,
  work_days_json TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tt_users_supabase_id
  ON tt_users (supabase_id) WHERE supabase_id IS NOT NULL AND trim(supabase_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tt_users_auth_email_lower
  ON tt_users (lower(trim(auth_email))) WHERE auth_email IS NOT NULL AND trim(auth_email) <> '';

CREATE INDEX IF NOT EXISTS idx_tt_users_login ON tt_users (login);

-- --- monthly_history (те же имена колонок, что в SQLite / agency.db) ---
CREATE TABLE IF NOT EXISTS monthly_history (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  "totalAccounts" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cushionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "goalsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "personalExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "businessExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "agencyExpectedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "agencyActualRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "agencyExpectedProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "agencyActualProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "impulseExpectedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "impulseActualRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "impulseExpectedProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "impulseActualProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalExpectedProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (now()::text),
  "updatedAt" TEXT NOT NULL DEFAULT (now()::text),
  UNIQUE (year, month)
);

-- RLS: только service_role (клиент с ключом обходит RLS).
ALTER TABLE pm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_history ENABLE ROW LEVEL SECURITY;
