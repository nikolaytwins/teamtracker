-- Явная секция на главной (сегодня / завтра / на этой неделе / позже) без обязательной даты.
ALTER TABLE v2_tasks
  ADD COLUMN IF NOT EXISTS home_bucket TEXT
  CHECK (home_bucket IS NULL OR home_bucket IN ('today', 'tomorrow', 'this_week', 'later'));

CREATE INDEX IF NOT EXISTS idx_v2_tasks_home_bucket
  ON v2_tasks (home_bucket)
  WHERE home_bucket IS NOT NULL AND deleted_at IS NULL;
