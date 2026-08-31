-- 066 — фонд залога за квартиру
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
    (
      'rent_deposit',
      'Фонд залог за квартиру',
      NULL,
      'key',
      '#78716C',
      8
    )
) AS s(fund_key, name, monthly_hint, icon_key, accent, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_finance_funds AS f
  WHERE f.user_id = u.user_id
    AND f.fund_key = s.fund_key
);
