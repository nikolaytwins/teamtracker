-- 020 — один активный таймер на пользователя

-- Закрыть дубликаты активных сессий (оставить самую свежую)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at DESC) AS rn
  FROM v2_time_sessions
  WHERE ended_at IS NULL
)
UPDATE v2_time_sessions s
SET
  ended_at = s.started_at,
  duration_seconds = 0
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_time_sessions_one_active_per_user
  ON v2_time_sessions (user_id)
  WHERE ended_at IS NULL;
