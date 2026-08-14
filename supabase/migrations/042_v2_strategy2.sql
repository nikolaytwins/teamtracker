-- 042: Стратегия 2.0 — операционная система решений (отдельно от журнала Стратегии).

CREATE TABLE IF NOT EXISTS v2_s2_sprints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  next_review_date DATE,
  core_question TEXT NOT NULL DEFAULT '',
  meta_principle TEXT NOT NULL DEFAULT '',
  main_task TEXT NOT NULL DEFAULT '',
  success_criterion TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_sprints_user
  ON v2_s2_sprints (user_id, status, start_date DESC);

CREATE TABLE IF NOT EXISTS v2_s2_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  essence TEXT NOT NULL DEFAULT '',
  why_important TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT '',
  anti_distortion TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'building',
  sort_order INTEGER NOT NULL DEFAULT 0,
  spotlight BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_goals_user
  ON v2_s2_goals (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_s2_engines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  function_text TEXT NOT NULL DEFAULT '',
  not_for TEXT NOT NULL DEFAULT '',
  good_scenario TEXT NOT NULL DEFAULT '',
  red_line TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'active',
  metrics TEXT NOT NULL DEFAULT '',
  spotlight_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_engines_user
  ON v2_s2_engines (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_s2_bets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sprint_id TEXT REFERENCES v2_s2_sprints (id) ON DELETE SET NULL,
  engine_id TEXT REFERENCES v2_s2_engines (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  hypothesis TEXT NOT NULL DEFAULT '',
  why TEXT NOT NULL DEFAULT '',
  minimal_test TEXT NOT NULL DEFAULT '',
  sufficient_action TEXT NOT NULL DEFAULT '',
  success_signals TEXT NOT NULL DEFAULT '',
  fail_signals TEXT NOT NULL DEFAULT '',
  threshold TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  front TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'testing',
  review_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_bets_user
  ON v2_s2_bets (user_id, status, sort_order);

CREATE TABLE IF NOT EXISTS v2_s2_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  old_pattern TEXT NOT NULL DEFAULT '',
  instruction TEXT NOT NULL DEFAULT '',
  why TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT '',
  antipattern_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_rules_user
  ON v2_s2_rules (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_s2_antipatterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  manifestation TEXT NOT NULL DEFAULT '',
  antidote TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_antipatterns_user
  ON v2_s2_antipatterns (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_s2_decisions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'need_data',
  position TEXT NOT NULL DEFAULT '',
  why TEXT NOT NULL DEFAULT '',
  needed_data TEXT NOT NULL DEFAULT '',
  revisit_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_decisions_user
  ON v2_s2_decisions (user_id, status, sort_order);

CREATE TABLE IF NOT EXISTS v2_s2_backlog (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'product',
  why_interesting TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  activation_trigger TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_backlog_user
  ON v2_s2_backlog (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS v2_s2_constraints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sprint_id TEXT REFERENCES v2_s2_sprints (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_constraints_user
  ON v2_s2_constraints (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_s2_month_outcomes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_month_outcomes_user
  ON v2_s2_month_outcomes (user_id, year, month, sort_order);

CREATE TABLE IF NOT EXISTS v2_s2_evidence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bet_id TEXT REFERENCES v2_s2_bets (id) ON DELETE SET NULL,
  engine_id TEXT REFERENCES v2_s2_engines (id) ON DELETE SET NULL,
  happened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'neutral',
  fact TEXT NOT NULL,
  interpretation TEXT NOT NULL DEFAULT '',
  weight TEXT NOT NULL DEFAULT 'medium',
  next_action TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_evidence_user
  ON v2_s2_evidence (user_id, happened_on DESC);

CREATE TABLE IF NOT EXISTS v2_s2_signals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'returns',
  text TEXT NOT NULL,
  bet_id TEXT REFERENCES v2_s2_bets (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_signals_user
  ON v2_s2_signals (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS v2_s2_prana (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_start DATE NOT NULL,
  training_count INTEGER NOT NULL DEFAULT 0,
  walk BOOLEAN NOT NULL DEFAULT FALSE,
  white_window BOOLEAN NOT NULL DEFAULT FALSE,
  social BOOLEAN NOT NULL DEFAULT FALSE,
  creative BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE TABLE IF NOT EXISTS v2_s2_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sprint_id TEXT REFERENCES v2_s2_sprints (id) ON DELETE SET NULL,
  summary TEXT NOT NULL DEFAULT '',
  next_architecture TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_s2_reviews_user
  ON v2_s2_reviews (user_id, created_at DESC);

COMMENT ON TABLE v2_s2_sprints IS 'Стратегия 2.0: сезоны / спринты проверки гипотез';

ALTER TABLE v2_s2_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_antipatterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_backlog ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_month_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_prana ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_s2_reviews ENABLE ROW LEVEL SECURITY;
