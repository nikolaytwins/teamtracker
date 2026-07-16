-- 028 — импорт выписок: внешний id и batch для дедупликации транзакций.

ALTER TABLE v2_personal_transactions
  ADD COLUMN IF NOT EXISTS external_id TEXT;

ALTER TABLE v2_personal_transactions
  ADD COLUMN IF NOT EXISTS import_batch_id TEXT;

COMMENT ON COLUMN v2_personal_transactions.external_id IS 'Хеш операции из выписки (дедуп при повторном импорте)';
COMMENT ON COLUMN v2_personal_transactions.import_batch_id IS 'ID пачки импорта PDF/CSV';

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_personal_txn_user_external
  ON v2_personal_transactions (user_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_v2_personal_txn_import_batch
  ON v2_personal_transactions (user_id, import_batch_id)
  WHERE import_batch_id IS NOT NULL;
