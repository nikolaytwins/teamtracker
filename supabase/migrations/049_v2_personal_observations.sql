-- 049 — личные наблюдения: записи, теги, связи.

CREATE TABLE IF NOT EXISTS v2_personal_observation_tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_personal_observation_tags_user_name
  ON v2_personal_observation_tags (user_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_v2_personal_observation_tags_user
  ON v2_personal_observation_tags (user_id, name);

CREATE TABLE IF NOT EXISTS v2_personal_observations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  obs_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  why TEXT NOT NULL DEFAULT '',
  link_key TEXT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT v2_personal_observations_type_check CHECK (
    obs_type IN (
      'loop', 'chance', 'market', 'magnet', 'person', 'pattern', 'place', 'love', 'other'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_observations_user_observed
  ON v2_personal_observations (user_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_personal_observations_user_type
  ON v2_personal_observations (user_id, obs_type);

CREATE TABLE IF NOT EXISTS v2_personal_observation_tag_links (
  observation_id TEXT NOT NULL REFERENCES v2_personal_observations (id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES v2_personal_observation_tags (id) ON DELETE CASCADE,
  PRIMARY KEY (observation_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_observation_tag_links_tag
  ON v2_personal_observation_tag_links (tag_id);

ALTER TABLE v2_personal_observation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_observation_tag_links ENABLE ROW LEVEL SECURITY;
