-- 024 — v2 лиды (админ-канбан): статусы, тип агентство/курс, напоминание.

CREATE TABLE IF NOT EXISTS v2_leads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  comment TEXT,
  lead_type TEXT NOT NULL DEFAULT 'agency'
    CHECK (lead_type IN ('agency', 'course')),
  status TEXT NOT NULL DEFAULT 'correspondence'
    CHECK (status IN ('correspondence', 'thinking', 'pause', 'lost')),
  reminder_at DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_leads_workspace_status
  ON v2_leads (workspace_id, status, sort_order)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_leads_workspace_reminder
  ON v2_leads (workspace_id, reminder_at)
  WHERE archived_at IS NULL AND reminder_at IS NOT NULL;

ALTER TABLE v2_leads ENABLE ROW LEVEL SECURITY;
