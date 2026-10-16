-- Якорь ручной суммы почасовой строки: таймер после правки прибавляет только новое время.

ALTER TABLE agency_project_detail
  ADD COLUMN IF NOT EXISTS total_override_seconds INTEGER;

COMMENT ON COLUMN agency_project_detail.total_override_seconds IS
  'Секунды таймера в момент ручной суммы. Новое время после этого прибавляется по ставке.';
