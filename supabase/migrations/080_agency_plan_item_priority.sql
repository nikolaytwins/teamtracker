-- 080 — agency_plan_item: приоритет слота/события (1–4)

ALTER TABLE agency_plan_item
  ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 3;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agency_plan_item_priority_check'
  ) THEN
    ALTER TABLE agency_plan_item
      ADD CONSTRAINT agency_plan_item_priority_check
      CHECK (priority BETWEEN 1 AND 4);
  END IF;
END $$;

COMMENT ON COLUMN agency_plan_item.priority IS
  'Приоритет в Плане: 1 критичный, 2 высокий, 3 обычный, 4 низкий.';
