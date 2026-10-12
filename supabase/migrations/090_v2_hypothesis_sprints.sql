-- 090 — гипотезы как в спринте: бэклог, очередь, в работе, проверено + спринты.

CREATE TABLE IF NOT EXISTS v2_personal_hypothesis_sprints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  range_label TEXT NOT NULL DEFAULT '',
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_hypothesis_sprints_user
  ON v2_personal_hypothesis_sprints (user_id, sort_order);

ALTER TABLE v2_personal_hypothesis_projects
  ADD COLUMN IF NOT EXISTS hue INTEGER NOT NULL DEFAULT 260;

ALTER TABLE v2_personal_hypotheses
  ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '';

ALTER TABLE v2_personal_hypotheses
  ADD COLUMN IF NOT EXISTS metric TEXT NOT NULL DEFAULT '';

ALTER TABLE v2_personal_hypotheses
  ADD COLUMN IF NOT EXISTS verdict TEXT;

ALTER TABLE v2_personal_hypotheses
  ADD COLUMN IF NOT EXISTS result_text TEXT NOT NULL DEFAULT '';

ALTER TABLE v2_personal_hypotheses
  ADD COLUMN IF NOT EXISTS sprint_id TEXT;

ALTER TABLE v2_personal_hypotheses
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'backlog';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v2_personal_hypotheses' AND column_name = 'lane'
  ) THEN
    UPDATE v2_personal_hypotheses
    SET stage = CASE
      WHEN status IN ('tested', 'worked') THEN 'done'
      WHEN lane = 'week' THEN 'active'
      WHEN lane = 'next' THEN 'queue'
      ELSE 'backlog'
    END;

    UPDATE v2_personal_hypotheses
    SET verdict = CASE status
      WHEN 'worked' THEN 'yes'
      WHEN 'tested' THEN 'unclear'
      ELSE verdict
    END
    WHERE status IN ('tested', 'worked') AND verdict IS NULL;
  END IF;
END $$;

ALTER TABLE v2_personal_hypotheses DROP CONSTRAINT IF EXISTS v2_personal_hypotheses_lane_check;
ALTER TABLE v2_personal_hypotheses DROP CONSTRAINT IF EXISTS v2_personal_hypotheses_status_check;
ALTER TABLE v2_personal_hypotheses DROP CONSTRAINT IF EXISTS v2_personal_hypotheses_week_slot_check;
ALTER TABLE v2_personal_hypotheses DROP CONSTRAINT IF EXISTS v2_personal_hypotheses_stage_check;
ALTER TABLE v2_personal_hypotheses DROP CONSTRAINT IF EXISTS v2_personal_hypotheses_verdict_check;

ALTER TABLE v2_personal_hypotheses DROP COLUMN IF EXISTS lane;
ALTER TABLE v2_personal_hypotheses DROP COLUMN IF EXISTS week_slot;
ALTER TABLE v2_personal_hypotheses DROP COLUMN IF EXISTS status;

ALTER TABLE v2_personal_hypotheses
  ADD CONSTRAINT v2_personal_hypotheses_stage_check
  CHECK (stage IN ('backlog', 'queue', 'active', 'done'));

ALTER TABLE v2_personal_hypotheses
  ADD CONSTRAINT v2_personal_hypotheses_verdict_check
  CHECK (verdict IS NULL OR verdict IN ('yes', 'no', 'unclear'));

CREATE INDEX IF NOT EXISTS idx_v2_personal_hypotheses_user_stage
  ON v2_personal_hypotheses (user_id, stage, sort_order);

CREATE TABLE IF NOT EXISTS v2_personal_home_sprint (
  user_id TEXT PRIMARY KEY,
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE v2_personal_hypothesis_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_home_sprint ENABLE ROW LEVEL SECURITY;
