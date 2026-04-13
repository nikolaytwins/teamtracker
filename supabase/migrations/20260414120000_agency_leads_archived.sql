-- Скрытие с канбана: архив. Существующие на момент миграции лиды помечаем archived (исторический сброс).
ALTER TABLE agency_leads ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE agency_leads SET archived = TRUE WHERE archived = FALSE;
