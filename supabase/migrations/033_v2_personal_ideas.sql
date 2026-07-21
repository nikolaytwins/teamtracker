-- 033 — личные идеи (стикеры): теги, карточки, фото.

CREATE TABLE IF NOT EXISTS v2_personal_idea_tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FDE68A',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_personal_idea_tags_user_name
  ON v2_personal_idea_tags (user_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_v2_personal_idea_tags_user
  ON v2_personal_idea_tags (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_personal_ideas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '#FEF3C7',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_ideas_user
  ON v2_personal_ideas (user_id, pinned DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS v2_personal_idea_tag_links (
  idea_id TEXT NOT NULL REFERENCES v2_personal_ideas (id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES v2_personal_idea_tags (id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_idea_tag_links_tag
  ON v2_personal_idea_tag_links (tag_id);

CREATE TABLE IF NOT EXISTS v2_personal_idea_images (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES v2_personal_ideas (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_idea_images_idea
  ON v2_personal_idea_images (idea_id, sort_order);

ALTER TABLE v2_personal_idea_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_idea_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_idea_images ENABLE ROW LEVEL SECURITY;
