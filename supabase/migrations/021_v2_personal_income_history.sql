-- 021 — история дохода (ручные помесячные записи, отдельно от auto-snapshot дашборда).

CREATE TABLE IF NOT EXISTS v2_personal_income_history (
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  accounts_total_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  earned_rub DOUBLE PRECISION,
  profit_rub DOUBLE PRECISION,
  spent_rub DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_income_history_user
  ON v2_personal_income_history (user_id, year DESC, month DESC);

ALTER TABLE v2_personal_income_history ENABLE ROW LEVEL SECURITY;
