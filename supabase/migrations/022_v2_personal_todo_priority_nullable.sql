-- 022 — личные задачи: NULL = без приоритета, medium = явно выбранный средний.

ALTER TABLE v2_personal_todos
  ALTER COLUMN priority DROP NOT NULL,
  ALTER COLUMN priority DROP DEFAULT;

UPDATE v2_personal_todos
SET priority = NULL
WHERE priority = 'medium'
  AND deleted_at IS NULL;
