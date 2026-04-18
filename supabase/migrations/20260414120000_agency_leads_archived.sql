-- Лиды: флаг archived (скрытие с канбана). Новые лиды — archived = false.
-- Массовый UPDATE по всем строкам намеренно не делаем (опасно на проде).
ALTER TABLE agency_leads ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
