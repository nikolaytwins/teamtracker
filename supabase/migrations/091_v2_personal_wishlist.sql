-- 091 — список хотелок: цена, статус, накоплено, заметка.

CREATE TABLE IF NOT EXISTS v2_personal_wishlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  price_rub INTEGER NOT NULL DEFAULT 0,
  saved_rub INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'want',
  note TEXT NOT NULL DEFAULT '',
  prev_status TEXT,
  done_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_wishlist_user
  ON v2_personal_wishlist (user_id, sort_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'v2_personal_wishlist_status_check'
  ) THEN
    ALTER TABLE v2_personal_wishlist
      ADD CONSTRAINT v2_personal_wishlist_status_check
      CHECK (status IN ('want', 'saving', 'done'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'v2_personal_wishlist_prev_status_check'
  ) THEN
    ALTER TABLE v2_personal_wishlist
      ADD CONSTRAINT v2_personal_wishlist_prev_status_check
      CHECK (prev_status IS NULL OR prev_status IN ('want', 'saving'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS v2_personal_wishlist_settings (
  user_id TEXT PRIMARY KEY,
  seeded_at TIMESTAMPTZ
);

ALTER TABLE v2_personal_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_wishlist_settings ENABLE ROW LEVEL SECURITY;
