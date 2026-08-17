-- 052 — Финансовая система: очередь целей и стабильные расходы месяца.

CREATE TABLE IF NOT EXISTS v2_personal_finance_system (
  user_id TEXT PRIMARY KEY,
  life_expenses_rub DOUBLE PRECISION NOT NULL DEFAULT 200000,
  funds_rub DOUBLE PRECISION NOT NULL DEFAULT 22000,
  moscow_job_stable BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_personal_finance_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_key TEXT,
  title TEXT NOT NULL,
  hint TEXT NOT NULL DEFAULT '',
  target_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_finance_goals_user
  ON v2_personal_finance_goals (user_id, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_personal_finance_goals_user_key
  ON v2_personal_finance_goals (user_id, goal_key)
  WHERE goal_key IS NOT NULL;

COMMENT ON TABLE v2_personal_finance_system IS 'Стабильные расходы жизни/фондов и флаги финсистемы';
COMMENT ON TABLE v2_personal_finance_goals IS 'Очередь финансовых целей; ближайшая — первая незакрытая';

ALTER TABLE v2_personal_finance_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_finance_goals ENABLE ROW LEVEL SECURITY;
