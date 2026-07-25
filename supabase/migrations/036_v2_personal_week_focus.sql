-- 036 — редактируемый фокус недели в личном календаре.

CREATE TABLE IF NOT EXISTS v2_personal_week_focus (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_start DATE NOT NULL,
  result_title TEXT NOT NULL DEFAULT 'Главный результат недели',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_week_focus_user_week
  ON v2_personal_week_focus (user_id, week_start);

CREATE TABLE IF NOT EXISTS v2_personal_week_focus_goals (
  id TEXT PRIMARY KEY,
  focus_id TEXT NOT NULL REFERENCES v2_personal_week_focus (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_week_focus_goals_focus
  ON v2_personal_week_focus_goals (focus_id, sort_order);

ALTER TABLE v2_personal_week_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_week_focus_goals ENABLE ROW LEVEL SECURITY;
