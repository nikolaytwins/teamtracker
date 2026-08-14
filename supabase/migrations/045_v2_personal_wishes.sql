-- 045 — личные желания: карточки с категориями и фото.

CREATE TABLE IF NOT EXISTS v2_personal_wishes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  categories TEXT[] NOT NULL DEFAULT '{}',
  grid_col INTEGER NOT NULL DEFAULT 1,
  grid_row INTEGER NOT NULL DEFAULT 6,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_wishes_user
  ON v2_personal_wishes (user_id, sort_order ASC, created_at DESC);

CREATE TABLE IF NOT EXISTS v2_personal_wish_images (
  id TEXT PRIMARY KEY,
  wish_id TEXT NOT NULL REFERENCES v2_personal_wishes (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_wish_images_wish
  ON v2_personal_wish_images (wish_id, sort_order);

ALTER TABLE v2_personal_wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_wish_images ENABLE ROW LEVEL SECURITY;
