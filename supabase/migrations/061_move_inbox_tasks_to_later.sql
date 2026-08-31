-- 061 — перенести все активные задачи из «Входящие» в «Потом»
UPDATE v2_personal_todos
SET inbox_section = 'later'
WHERE deleted_at IS NULL
  AND completed_at IS NULL
  AND inbox_section = 'inbox';
