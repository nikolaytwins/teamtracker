-- 076 — agency plan: user_id TEXT (v2 ids u_…), исправление 075 с UUID

DROP TABLE IF EXISTS agency_plan_item;
DROP TABLE IF EXISTS agency_plan_day_mode;

CREATE TABLE agency_plan_day_mode (
  user_id TEXT NOT NULL,
  plan_date DATE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('strategy', 'creative', 'rest')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_agency_plan_day_mode_user_date
  ON agency_plan_day_mode (user_id, plan_date);

CREATE TABLE agency_plan_item (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('task', 'call', 'personal')),
  project_id TEXT REFERENCES agency_project (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  plan_date DATE,
  planned_minutes INTEGER CHECK (planned_minutes IS NULL OR planned_minutes > 0),
  event_time TEXT,
  duration_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_plan_item_user_date
  ON agency_plan_item (user_id, plan_date);

CREATE INDEX IF NOT EXISTS idx_agency_plan_item_project
  ON agency_plan_item (project_id)
  WHERE project_id IS NOT NULL;

COMMENT ON TABLE agency_plan_day_mode IS 'Sofia Plan: strategy / creative / rest markers on calendar days.';
COMMENT ON TABLE agency_plan_item IS 'Sofia Plan: project subtasks, calls, personal events; plan_date NULL = backlog.';

UPDATE agency_dispatch_rules
SET rules_json = jsonb_set(
  rules_json,
  '{finance,pauseProfitMinRub}',
  '245000'::jsonb,
  true
)
WHERE id = 'default';
