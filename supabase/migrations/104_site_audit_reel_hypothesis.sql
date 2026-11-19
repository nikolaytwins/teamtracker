-- 104 — очередь гипотез: «Аудит сайта через рилс» (TwinLabs).
-- Карточка также есть в каталоге DESIGN_HYPOTHESES и подтягивается при открытии доски.

INSERT INTO v2_personal_hypotheses (
  id,
  user_id,
  project_id,
  sprint_id,
  title,
  body,
  metric,
  stage,
  verdict,
  result_text,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'hyp_' || substr(md5(u.user_id || ':site-audit-reel'), 1, 20),
  u.user_id,
  (
    SELECT p.id
    FROM v2_personal_hypothesis_projects AS p
    WHERE p.user_id = u.user_id
      AND p.name = 'TwinLabs Plus'
    ORDER BY p.sort_order
    LIMIT 1
  ),
  NULL,
  'Аудит сайта через рилс',
  $body$Рилс: «Проверьте, насколько ваш сайт понятен и продающий». Кто напишет кодовое слово — получает ссылку на сервис.

Сервис прогоняет сайт через исследование ЦА и Jobs to Be Done и выдаёт, что исправить и что изменить.

В конце — предложение исправить: оставить контактные данные, и мы сделаем коммерческое предложение по этим правкам.$body$,
  'Заявка с контактами после аудита',
  'queue',
  NULL,
  '',
  13,
  now(),
  now()
FROM (
  SELECT DISTINCT user_id
  FROM v2_personal_hypotheses
  UNION
  SELECT DISTINCT user_id
  FROM v2_personal_hypothesis_projects
) AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_hypotheses AS h
  WHERE h.user_id = u.user_id
    AND lower(trim(h.title)) IN (
      'аудит сайта через рилс',
      'проверка сайта на понятность',
      'проверьте, насколько ваш сайт понятен и продающий',
      'проверьте насколько ваш сайт понятен и продающий'
    )
);
