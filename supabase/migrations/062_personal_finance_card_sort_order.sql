-- 062 — уникальный sort_order для счетов и капитала (фиксированный порядок карточек)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sort_order, created_at, id) - 1 AS new_sort
  FROM v2_personal_accounts
)
UPDATE v2_personal_accounts AS a
SET sort_order = r.new_sort
FROM ranked AS r
WHERE a.id = r.id;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sort_order, created_at, id) - 1 AS new_sort
  FROM v2_personal_capital_items
)
UPDATE v2_personal_capital_items AS c
SET sort_order = r.new_sort
FROM ranked AS r
WHERE c.id = r.id;
