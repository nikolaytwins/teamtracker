-- 058 v2 tasks ideas redesign (week focus slots, ideas priority and archive)

ALTER TABLE v2_personal_week_focus_goals
  ADD COLUMN IF NOT EXISTS slot smallint,
  ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

ALTER TABLE v2_personal_ideas
  ADD COLUMN IF NOT EXISTS idea_priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'v2_personal_ideas_priority_check'
  ) THEN
    ALTER TABLE v2_personal_ideas
      ADD CONSTRAINT v2_personal_ideas_priority_check
      CHECK (idea_priority IN ('high', 'normal', 'low'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'v2_personal_week_focus_goals_slot_check'
  ) THEN
    ALTER TABLE v2_personal_week_focus_goals
      ADD CONSTRAINT v2_personal_week_focus_goals_slot_check
      CHECK (slot IS NULL OR slot IN (0, 1));
  END IF;
END $$;

WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (PARTITION BY focus_id ORDER BY sort_order ASC, created_at ASC) - 1)::int AS rn
  FROM v2_personal_week_focus_goals
  WHERE slot IS NULL
)
UPDATE v2_personal_week_focus_goals AS g
SET slot = CASE WHEN r.rn <= 1 THEN r.rn::smallint ELSE NULL END
FROM ranked AS r
WHERE g.id = r.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_week_focus_goals_focus_slot
  ON v2_personal_week_focus_goals (focus_id, slot)
  WHERE slot IS NOT NULL;
