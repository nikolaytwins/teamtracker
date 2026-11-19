-- 105 — удаление снятых гипотез + флаг seeded, чтобы sync не возвращал удалённые.

INSERT INTO v2_personal_hypothesis_settings (user_id, seeded_at)
SELECT DISTINCT h.user_id, now()
FROM v2_personal_hypotheses AS h
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_hypothesis_settings AS s
  WHERE s.user_id = h.user_id
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO v2_personal_hypothesis_settings (user_id, seeded_at)
SELECT DISTINCT p.user_id, now()
FROM v2_personal_hypothesis_projects AS p
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_hypothesis_settings AS s
  WHERE s.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;

DELETE FROM v2_personal_hypotheses
WHERE lower(trim(title)) IN (
  'повторные точечные продажи клиентам',
  'колбаса через контент',
  'запуск ростовских колбас через контент',
  'найм',
  'запустить услугу продвижения сайтов',
  'дизайн-поддержка',
  'twinlabs plus — запустить продажи дизайн-поддержки',
  'запуск подписки твинлабс:плюс + найм',
  'youtube (личная медийка)',
  'личная медийка — начать строить долгосрочный актив',
  'запуск контента в соц.сетях'
);
