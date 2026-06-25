-- Даты из списка проекта раньше писались в deadline_at. Переносим их в planned_at.
UPDATE v2_tasks
SET
  planned_at = deadline_at,
  deadline_at = NULL,
  updated_at = now()
WHERE deleted_at IS NULL
  AND project_id IS NOT NULL
  AND planned_at IS NULL
  AND deadline_at IS NOT NULL;
