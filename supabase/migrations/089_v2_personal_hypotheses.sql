-- 089 — банк гипотез: спринт недели, очередь, бэклог, проекты.

CREATE TABLE IF NOT EXISTS v2_personal_hypothesis_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#71717A',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_hypothesis_projects_user
  ON v2_personal_hypothesis_projects (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_personal_hypotheses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT REFERENCES v2_personal_hypothesis_projects (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  lane TEXT NOT NULL DEFAULT 'backlog',
  week_slot INTEGER,
  status TEXT NOT NULL DEFAULT 'queued',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT v2_personal_hypotheses_lane_check CHECK (lane IN ('week', 'next', 'backlog')),
  CONSTRAINT v2_personal_hypotheses_status_check CHECK (status IN ('queued', 'tested', 'worked')),
  CONSTRAINT v2_personal_hypotheses_week_slot_check CHECK (week_slot IS NULL OR week_slot IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_hypotheses_user_lane
  ON v2_personal_hypotheses (user_id, lane, sort_order);

CREATE INDEX IF NOT EXISTS idx_v2_personal_hypotheses_user_project
  ON v2_personal_hypotheses (user_id, project_id);

CREATE TABLE IF NOT EXISTS v2_personal_hypothesis_settings (
  user_id TEXT PRIMARY KEY,
  seeded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE v2_personal_hypothesis_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_hypothesis_settings ENABLE ROW LEVEL SECURITY;
