-- Поля подзадачи для раздела «Задачи»: описание, приоритет, рабочий статус (до завершения).

ALTER TABLE pm_subtasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm_subtasks ADD COLUMN IF NOT EXISTS importance TEXT;
ALTER TABLE pm_subtasks ADD COLUMN IF NOT EXISTS work_status TEXT NOT NULL DEFAULT 'not_started';
