-- 004 — Уведомления v2 и цвет текста на аватарке проекта

ALTER TABLE v2_projects ADD COLUMN IF NOT EXISTS color_ink TEXT;

CREATE TABLE IF NOT EXISTS v2_notifications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id TEXT,
  actor_user_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_notifications_user_created
  ON v2_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_notifications_user_unread
  ON v2_notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE v2_notifications ENABLE ROW LEVEL SECURITY;

UPDATE v2_projects SET color_ink = '#7A5C00' WHERE color_tint = '#FFDD2D' AND color_ink IS NULL;
UPDATE v2_projects SET color_ink = color_tint WHERE color_ink IS NULL AND color_tint IS NOT NULL;
