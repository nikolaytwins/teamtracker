-- Категории входящих задач (канбан «План и задачи») и поле inbox_category.

CREATE TABLE IF NOT EXISTS v2_personal_todo_inbox_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#71717A',
  bg TEXT NOT NULL DEFAULT '',
  shortcut TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO v2_personal_todo_inbox_categories (id, label, description, color, bg, shortcut, sort_order)
VALUES
  ('work', 'Рабочие задачи', 'Текущая работа на неделе', '#2d5eef', '', '1', 1),
  ('strat', 'Стратегический день', 'Решения, системы, продукты', 'oklch(0.58 0.13 262)', 'oklch(0.962 0.028 262)', '2', 2),
  ('life', 'Жизнь', 'Быт, здоровье, люди, документы', 'oklch(0.58 0.13 155)', 'oklch(0.965 0.03 155)', '3', 3),
  ('create', 'Творческий день', 'Контент, тексты, дизайн', 'oklch(0.58 0.13 320)', 'oklch(0.965 0.03 320)', '4', 4),
  ('backlog', 'Бэклог', 'Не в ближайшее время', '#71717A', '', '5', 5)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  bg = EXCLUDED.bg,
  shortcut = EXCLUDED.shortcut,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE v2_personal_todos
  ADD COLUMN IF NOT EXISTS inbox_category TEXT NOT NULL DEFAULT 'work';

UPDATE v2_personal_todos
SET inbox_category = 'backlog'
WHERE inbox_section = 'later';

UPDATE v2_personal_todos t
SET inbox_category = 'life'
FROM v2_personal_todo_projects p
WHERE t.project_id = p.id
  AND t.inbox_section IS DISTINCT FROM 'later'
  AND lower(p.name) IN ('личное', 'жизнь');

UPDATE v2_personal_todos t
SET inbox_category = 'create'
FROM v2_personal_todo_projects p
WHERE t.project_id = p.id
  AND t.inbox_section IS DISTINCT FROM 'later'
  AND lower(p.name) IN ('медийка', 'курс');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'v2_personal_todos_inbox_category_fkey'
  ) THEN
    ALTER TABLE v2_personal_todos
      ADD CONSTRAINT v2_personal_todos_inbox_category_fkey
      FOREIGN KEY (inbox_category) REFERENCES v2_personal_todo_inbox_categories (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_v2_personal_todos_inbox_category
  ON v2_personal_todos (user_id, inbox_category)
  WHERE deleted_at IS NULL;
