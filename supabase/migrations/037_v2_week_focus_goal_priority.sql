-- 037 — приоритет у целей недели (красный / оранжевый / серый).

ALTER TABLE v2_personal_week_focus_goals
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE v2_personal_week_focus_goals
  DROP CONSTRAINT IF EXISTS v2_personal_week_focus_goals_priority_check;

ALTER TABLE v2_personal_week_focus_goals
  ADD CONSTRAINT v2_personal_week_focus_goals_priority_check
  CHECK (priority IN ('high', 'medium', 'low'));

COMMENT ON COLUMN v2_personal_week_focus_goals.priority IS 'high — обязательно, medium — желательно, low — можно не делать';
