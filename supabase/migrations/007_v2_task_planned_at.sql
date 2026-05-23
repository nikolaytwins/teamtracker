-- Дата выполнения (план) отдельно от дедлайна; для секций «Сегодня/Завтра» на главной.

ALTER TABLE v2_tasks ADD COLUMN IF NOT EXISTS planned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_v2_tasks_planned_at
  ON v2_tasks (planned_at)
  WHERE deleted_at IS NULL AND completed_at IS NULL;
