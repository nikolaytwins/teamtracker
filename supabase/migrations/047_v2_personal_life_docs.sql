-- 047 — личные разделы: время, бренд, стратегия сезона, мой код (JSONB docs).

CREATE TABLE IF NOT EXISTS v2_personal_life_docs (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  doc JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind),
  CONSTRAINT v2_personal_life_docs_kind_check
    CHECK (kind IN ('time', 'brand', 'life_strategy', 'mycode'))
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_life_docs_kind
  ON v2_personal_life_docs (kind);

ALTER TABLE v2_personal_life_docs ENABLE ROW LEVEL SECURITY;
