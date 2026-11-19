-- 106 — обязательные/желательные гипотезы + недостающие карточки под новые страницы.

INSERT INTO v2_personal_hypothesis_settings (user_id, seeded_at)
SELECT DISTINCT user_id, now()
FROM (
  SELECT user_id FROM v2_personal_hypotheses
  UNION
  SELECT user_id FROM v2_personal_hypothesis_projects
) AS u
ON CONFLICT (user_id) DO NOTHING;

UPDATE v2_personal_hypotheses
SET title = 'ИИ субподряд',
    body = 'Студиям выгодно отдавать часть AI/дизайн-производства на субподряд TwinLabs.',
    stage = 'active',
    updated_at = now()
WHERE lower(trim(title)) IN ('ai-субподряд для студий', 'ии-субподряд', 'ai субподряд', 'ии субподряд');

UPDATE v2_personal_hypotheses
SET title = 'Холодные сайты', stage = 'active', updated_at = now()
WHERE lower(trim(title)) IN ('холодные сайты', 'холодные предложения сайтов');

UPDATE v2_personal_hypotheses
SET title = 'Личные кабинеты онлайн-школ', stage = 'active', updated_at = now()
WHERE lower(trim(title)) = 'личные кабинеты онлайн-школ';

UPDATE v2_personal_hypotheses
SET title = 'Qmagic', stage = 'active', updated_at = now()
WHERE lower(trim(title)) IN (
  'qmagic',
  'qmagic — проверить одну продуктовую гипотезу',
  'мини-запуск qmagic'
);

UPDATE v2_personal_hypotheses
SET title = 'Коперник',
    body = 'Астрологический сервис с ИИ-расшифровками: контент-ферма, рилсы, YouTube-прогнозы и инструмент, который астрологи заводят клиентам.',
    stage = 'active',
    updated_at = now()
WHERE lower(trim(title)) IN ('коперник', 'ии-астролог', 'ии астролог', 'коперник астрология');

UPDATE v2_personal_hypotheses
SET title = 'ИИ-репетитор',
    body = 'ИИ-репетитор для ЕГЭ: статьи, личные зумы, персональная программа и решатор домашек. Рост через UGC школьников.',
    stage = 'backlog',
    sprint_id = NULL,
    updated_at = now()
WHERE lower(trim(title)) IN ('ии-репетитор', 'ии репетитор', 'егэ репетитор');

UPDATE v2_personal_hypotheses
SET title = 'Ростовские колбасы',
    body = 'Если проверить рилсы, UGC и партнерскую программу, то хотя бы один канал даст первый доход.',
    metric = 'Первый доход или ≥ 1 партнёр',
    stage = 'active',
    updated_at = now()
WHERE lower(trim(title)) IN (
  'ростовские колбасы',
  'колбаса через контент',
  'запуск ростовских колбас через контент',
  'ростовские колбасы через контент'
);

WITH users AS (
  SELECT DISTINCT user_id FROM v2_personal_hypothesis_settings
),
seeds(title, body, metric, stage, project_name, sort_order, aliases) AS (
  VALUES
    ('Холодные сайты',
     'Попробовать запустить холодную рассылку по компаниям, у которых нет сайта или он плохой. Полностью автоматизированно, через вайбкодинг.',
     '', 'active', 'TwinLabs Plus', 0,
     ARRAY['холодные сайты', 'холодные предложения сайтов']),
    ('ИИ субподряд',
     'Студиям выгодно отдавать часть AI/дизайн-производства на субподряд TwinLabs.',
     '', 'active', 'TwinLabs Plus', 1,
     ARRAY['ии субподряд', 'ai-субподряд для студий', 'ии-субподряд', 'ai субподряд']),
    ('Продажа ИИ-курсов',
     'Научиться самостоятельно создавать сайты, рабочие сервисы и ИИ-сотрудников для бизнеса — и продавать это как курс / внедрение.',
     'Первые продажи тарифа 49 990 ₽ или 149 000 ₽', 'active', 'TwinLabs Plus', 2,
     ARRAY['продажа ии-курсов', 'продажа ai-курсов', 'ии курсы', 'ai courses']),
    ('Ростовские колбасы',
     'Если проверить рилсы, UGC и партнерскую программу, то хотя бы один канал даст первый доход.',
     'Первый доход или ≥ 1 партнёр', 'active', 'FoodTech', 3,
     ARRAY['ростовские колбасы', 'колбаса через контент', 'запуск ростовских колбас через контент', 'ростовские колбасы через контент']),
    ('Коперник',
     'Астрологический сервис с ИИ-расшифровками: контент-ферма, рилсы, YouTube-прогнозы и инструмент, который астрологи заводят клиентам.',
     '', 'active', 'TwinLabs Plus', 4,
     ARRAY['коперник', 'ии-астролог', 'ии астролог', 'коперник астрология']),
    ('Личные кабинеты онлайн-школ',
     'Онлайн-школам нужен личный кабинет / обучение как продукт, который можно быстро собрать и продать.',
     '', 'active', 'TwinLabs Plus', 5,
     ARRAY['личные кабинеты онлайн-школ']),
    ('Qmagic',
     E'Пользователям нужен инструмент, который позволяет быстро создавать или редактировать дизайн через ИИ, в том числе внутри Figma.\n\nОбязательно: в агенте должен быть доступ совместной работы команды — чтобы маркетологи, продуктологи и другие роли генерировали в едином стиле.',
     '', 'active', 'Qmagic', 6,
     ARRAY['qmagic', 'qmagic — проверить одну продуктовую гипотезу', 'мини-запуск qmagic']),
    ('Клипс',
     'Платформа коротких драм / сериалов с рилс-лентой, spicy-подпиской и инструментами для креаторов.',
     '', 'backlog', 'Личный бренд', 11,
     ARRAY['клипс', 'clips', 'клипс сериалы', 'клипс драмы']),
    ('ИИ-репетитор',
     'ИИ-репетитор для ЕГЭ: статьи, личные зумы, персональная программа и решатор домашек. Рост через UGC школьников.',
     '', 'backlog', 'TwinLabs Plus', 12,
     ARRAY['ии-репетитор', 'ии репетитор', 'егэ репетитор'])
)
INSERT INTO v2_personal_hypotheses (
  id, user_id, project_id, sprint_id, title, body, metric, stage, verdict, result_text, sort_order, created_at, updated_at
)
SELECT
  'hyp_' || substr(md5(u.user_id || ':' || s.title), 1, 20),
  u.user_id,
  (
    SELECT p.id FROM v2_personal_hypothesis_projects p
    WHERE p.user_id = u.user_id AND p.name = s.project_name
    ORDER BY p.sort_order LIMIT 1
  ),
  CASE WHEN s.stage = 'active' THEN (
    SELECT sp.id FROM v2_personal_hypothesis_sprints sp
    WHERE sp.user_id = u.user_id
    ORDER BY sp.is_current DESC, sp.sort_order
    LIMIT 1
  ) ELSE NULL END,
  s.title, s.body, s.metric, s.stage, NULL, '', s.sort_order, now(), now()
FROM users u
CROSS JOIN seeds s
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_hypotheses h
  WHERE h.user_id = u.user_id
    AND lower(trim(h.title)) = ANY (s.aliases)
);

-- Привязать active без спринта к текущему.
UPDATE v2_personal_hypotheses AS h
SET sprint_id = s.id, updated_at = now()
FROM v2_personal_hypothesis_sprints AS s
WHERE h.user_id = s.user_id
  AND h.stage = 'active'
  AND h.sprint_id IS NULL
  AND s.is_current = true;
