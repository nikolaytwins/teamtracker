-- 067 — правила распределения: фонды, капитал, дирхамы/лари → счета

-- Подсказки и названия существующих фондов
UPDATE v2_personal_finance_funds
SET monthly_hint = '100 000 ₽ каждый месяц · счёт в USD'
WHERE fund_key = 'life';

UPDATE v2_personal_finance_funds
SET monthly_hint = 'зарплаты следующего месяца · счёт в ₽'
WHERE fund_key = 'salary';

UPDATE v2_personal_finance_funds
SET monthly_hint = 'остаток · делить между ₽ и USD'
WHERE fund_key = 'cushion';

UPDATE v2_personal_finance_funds
SET monthly_hint = '5 000 ₽ каждый месяц · счёт в ₽'
WHERE fund_key = 'clothing';

UPDATE v2_personal_finance_funds
SET monthly_hint = '10 000 ₽ каждый месяц · счёт в ₽'
WHERE fund_key = 'gifts';

UPDATE v2_personal_finance_funds
SET monthly_hint = '5 000 ₽ каждый месяц · счёт в USD'
WHERE fund_key = 'lera';

-- Новые фонды: квартира и ИИ
INSERT INTO v2_personal_finance_funds (
  id,
  user_id,
  fund_key,
  name,
  amount_rub,
  source_account_id,
  monthly_hint,
  icon_key,
  accent,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'pffund_' || substr(md5(u.user_id || ':' || s.fund_key), 1, 20),
  u.user_id,
  s.fund_key,
  s.name,
  0,
  NULL,
  s.monthly_hint,
  s.icon_key,
  s.accent,
  s.sort_order,
  now(),
  now()
FROM (
  SELECT DISTINCT user_id
  FROM v2_workspace_members
) AS u
CROSS JOIN (
  VALUES
    ('apartment', 'Квартира', 'аренда · счёт в USD', 'key', '#0EA5E9', 5),
    ('ai', 'ИИ', '20 000 ₽ каждый месяц · остаток можно на жизнь', 'coin', '#9A8CFF', 9)
) AS s(fund_key, name, monthly_hint, icon_key, accent, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_finance_funds AS f
  WHERE f.user_id = u.user_id
    AND f.fund_key = s.fund_key
);

-- Залог: перенос суммы из фонда rent_deposit в капитал, затем удаление фонда
INSERT INTO v2_personal_capital_items (
  id,
  user_id,
  name,
  icon_key,
  amount_rub,
  meta,
  unit_label,
  tint,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'pfcap_' || substr(md5(f.user_id || ':rent_deposit'), 1, 20),
  f.user_id,
  'Залог за квартиру',
  'key',
  COALESCE(f.amount_rub, 0),
  'у арендодателя, неликвиден',
  NULL,
  '#78716C',
  0,
  now(),
  now()
FROM v2_personal_finance_funds AS f
WHERE f.fund_key = 'rent_deposit'
  AND NOT EXISTS (
    SELECT 1
    FROM v2_personal_capital_items AS c
    WHERE c.user_id = f.user_id
      AND c.name = 'Залог за квартиру'
  );

UPDATE v2_personal_capital_items AS c
SET amount_rub = c.amount_rub + COALESCE(f.amount_rub, 0)
FROM v2_personal_finance_funds AS f
WHERE f.fund_key = 'rent_deposit'
  AND f.user_id = c.user_id
  AND c.name = 'Залог за квартиру';

DELETE FROM v2_personal_finance_funds
WHERE fund_key = 'rent_deposit';

-- Капитал: залог за квартиру (если ещё нет)
INSERT INTO v2_personal_capital_items (
  id,
  user_id,
  name,
  icon_key,
  amount_rub,
  meta,
  unit_label,
  tint,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'pfcap_' || substr(md5(u.user_id || ':rent_deposit'), 1, 20),
  u.user_id,
  'Залог за квартиру',
  'key',
  0,
  'у арендодателя, неликвиден',
  NULL,
  '#78716C',
  0,
  now(),
  now()
FROM (
  SELECT DISTINCT user_id
  FROM v2_workspace_members
) AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_capital_items AS c
  WHERE c.user_id = u.user_id
    AND c.name = 'Залог за квартиру'
);

-- Дирхамы и лари: из капитала → счета (как USD)
INSERT INTO v2_personal_accounts (
  id,
  user_id,
  name,
  account_type,
  icon_key,
  accent,
  balance_rub,
  balance_native,
  currency_code,
  note,
  disposable,
  in_cushion,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'pacc_' || substr(md5(c.user_id || ':fx:' || c.id), 1, 20),
  c.user_id,
  c.name,
  'cash',
  c.icon_key,
  COALESCE(c.tint, '#F59E0B'),
  c.amount_rub,
  c.amount_rub,
  CASE
    WHEN lower(c.name) LIKE '%дирхам%'
      OR lower(c.name) LIKE '%dirham%'
      OR lower(c.name) = 'aed'
      THEN 'AED'
    WHEN lower(c.name) LIKE '%лари%'
      OR lower(c.name) LIKE '%lari%'
      OR lower(c.name) = 'gel'
      THEN 'GEL'
  END,
  COALESCE(c.meta, 'перенесено из капитала'),
  TRUE,
  FALSE,
  c.sort_order,
  now(),
  now()
FROM v2_personal_capital_items AS c
WHERE (
    lower(c.name) LIKE '%дирхам%'
    OR lower(c.name) LIKE '%dirham%'
    OR lower(c.name) = 'aed'
    OR lower(c.name) LIKE '%лари%'
    OR lower(c.name) LIKE '%lari%'
    OR lower(c.name) = 'gel'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM v2_personal_accounts AS a
    WHERE a.user_id = c.user_id
      AND lower(a.name) = lower(c.name)
  );

DELETE FROM v2_personal_capital_items AS c
WHERE lower(c.name) LIKE '%дирхам%'
  OR lower(c.name) LIKE '%dirham%'
  OR lower(c.name) = 'aed'
  OR lower(c.name) LIKE '%лари%'
  OR lower(c.name) LIKE '%lari%'
  OR lower(c.name) = 'gel';
