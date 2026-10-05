-- 088 — agency_plan_item: статус слота дня (к выполнению / в работе / готово)

ALTER TABLE agency_plan_item
  ADD COLUMN IF NOT EXISTS work_status TEXT NOT NULL DEFAULT 'todo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agency_plan_item_work_status_check'
  ) THEN
    ALTER TABLE agency_plan_item
      ADD CONSTRAINT agency_plan_item_work_status_check
      CHECK (work_status IN ('todo', 'doing', 'done'));
  END IF;
END $$;

UPDATE agency_plan_item
SET work_status = 'done'
WHERE completed_at IS NOT NULL AND work_status <> 'done';

COMMENT ON COLUMN agency_plan_item.work_status IS
  'Статус слота: todo | doing | done. done синхронизируется с completed_at.';
