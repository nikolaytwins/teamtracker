-- 046 — пользовательские категории желаний.

CREATE TABLE IF NOT EXISTS v2_personal_wish_categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tint TEXT NOT NULL DEFAULT '#52525B',
  bg TEXT NOT NULL DEFAULT '#F4F4F5',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_personal_wish_categories_user_name
  ON v2_personal_wish_categories (user_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_v2_personal_wish_categories_user
  ON v2_personal_wish_categories (user_id, sort_order);

ALTER TABLE v2_personal_wish_categories ENABLE ROW LEVEL SECURITY;
