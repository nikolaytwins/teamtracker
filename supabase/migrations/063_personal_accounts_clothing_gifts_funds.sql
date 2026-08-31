-- 063 — счета «Фонд одежды» и «Фонд подарков» для пользователей workspace
INSERT INTO v2_personal_accounts (
  id,
  user_id,
  name,
  account_type,
  icon_key,
  accent,
  currency_code,
  balance_native,
  balance_rub,
  note,
  disposable,
  in_cushion,
  goal_amount_rub,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'pfacc_' || substr(md5(u.user_id || ':' || s.name), 1, 20),
  u.user_id,
  s.name,
  'goal',
  s.icon_key,
  s.accent,
  'RUB',
  0,
  0,
  NULL,
  TRUE,
  FALSE,
  NULL,
  base.max_sort + s.ord,
  now(),
  now()
FROM (
  SELECT DISTINCT user_id
  FROM v2_workspace_members
) AS u
CROSS JOIN (
  VALUES
    ('Фонд одежды', 'target', '#9A8CFF', 1),
    ('Фонд подарков', 'target', '#FF335F', 2)
) AS s(name, icon_key, accent, ord)
CROSS JOIN LATERAL (
  SELECT COALESCE(MAX(a.sort_order), -1) AS max_sort
  FROM v2_personal_accounts AS a
  WHERE a.user_id = u.user_id
) AS base
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_accounts AS existing
  WHERE existing.user_id = u.user_id
    AND existing.name = s.name
);
