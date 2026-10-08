-- 089 — банк гипотез: карточки, приоритет, порядок, журнал проверок.

CREATE TABLE IF NOT EXISTS v2_personal_hypotheses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  check_text TEXT NOT NULL DEFAULT '',
  success_text TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'testing',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT v2_personal_hypotheses_priority_check CHECK (priority IN ('high', 'medium', 'low')),
  CONSTRAINT v2_personal_hypotheses_status_check CHECK (status IN ('testing', 'confirmed', 'rejected', 'paused'))
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_hypotheses_user_sort
  ON v2_personal_hypotheses (user_id, priority, sort_order);

CREATE TABLE IF NOT EXISTS v2_personal_hypothesis_notes (
  id TEXT PRIMARY KEY,
  hypothesis_id TEXT NOT NULL REFERENCES v2_personal_hypotheses (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'note',
  happened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT v2_personal_hypothesis_notes_outcome_check CHECK (
    outcome IN ('worked', 'missed', 'mixed', 'note')
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_hypothesis_notes_hyp
  ON v2_personal_hypothesis_notes (hypothesis_id, happened_on DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_personal_hypothesis_notes_user
  ON v2_personal_hypothesis_notes (user_id, happened_on DESC);

ALTER TABLE v2_personal_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_hypothesis_notes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS v2_personal_hypothesis_settings (
  user_id TEXT PRIMARY KEY,
  seeded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE v2_personal_hypothesis_settings ENABLE ROW LEVEL SECURITY;
