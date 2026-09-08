-- 079 — agency_plan_item: отметка выполненного слота/события дня

ALTER TABLE agency_plan_item
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

COMMENT ON COLUMN agency_plan_item.completed_at IS
  'Когда слот/событие дня отмечено выполненным в Плане; NULL = ещё не сделано.';
