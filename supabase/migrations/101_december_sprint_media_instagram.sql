-- 101 — спринт Декабрь + главная гипотеза «Медийка тест Instagram».

INSERT INTO v2_personal_hypothesis_sprints (
  id,
  user_id,
  name,
  range_label,
  is_current,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'hspr_' || substr(md5(u.user_id || ':sprint-december'), 1, 20),
  u.user_id,
  'Декабрь',
  '1 — 31 дек',
  false,
  COALESCE(
    (
      SELECT MAX(s.sort_order) + 1
      FROM v2_personal_hypothesis_sprints AS s
      WHERE s.user_id = u.user_id
    ),
    2
  ),
  now(),
  now()
FROM (
  SELECT DISTINCT user_id
  FROM v2_personal_hypothesis_sprints
  UNION
  SELECT DISTINCT user_id
  FROM v2_personal_hypotheses
) AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_hypothesis_sprints AS s
  WHERE s.user_id = u.user_id
    AND lower(s.name) = 'декабрь'
);

UPDATE v2_personal_hypotheses AS h
SET
  title = 'Медийка тест Instagram',
  body = CASE
    WHEN coalesce(trim(h.body), '') = '' THEN
      'Проверить гипотезу медийки через тест в Instagram: контент, отклик аудитории и первый сигнал спроса.'
    ELSE h.body
  END,
  metric = 'Главная гипотеза',
  stage = 'active',
  sprint_id = s.id,
  updated_at = now()
FROM v2_personal_hypothesis_sprints AS s
WHERE s.user_id = h.user_id
  AND lower(s.name) = 'декабрь'
  AND h.stage <> 'done'
  AND lower(trim(h.title)) IN (
    'медийка тест инстаграм',
    'медийка тест instagram',
    'медийка · тест instagram',
    'тест instagram',
    'медийка instagram'
  );
