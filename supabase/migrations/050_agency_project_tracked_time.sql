-- 050 — Учёт времени с личного таймера на карточке проекта (отдельно от сметы).

CREATE TABLE IF NOT EXISTS agency_project_tracked_time (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES agency_project (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'personal_timer',
  source_entry_id TEXT,
  task TEXT NOT NULL DEFAULT '',
  activity TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  in_estimate BOOLEAN NOT NULL DEFAULT false,
  detail_id TEXT REFERENCES agency_project_detail (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_project_tracked_time_project
  ON agency_project_tracked_time (project_id, tracked_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_project_tracked_time_source_entry
  ON agency_project_tracked_time (source_entry_id)
  WHERE source_entry_id IS NOT NULL;

COMMENT ON TABLE agency_project_tracked_time IS 'Время с личного таймера; в смету попадает только по галочке in_estimate';
COMMENT ON COLUMN agency_project_tracked_time.detail_id IS 'Почасовая строка сметы, созданная из этой записи';
