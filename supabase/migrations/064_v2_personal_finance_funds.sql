-- 064 — фонды: виртуальные «корзины» на счетах, не участвуют в сумме капитала отдельно

CREATE TABLE IF NOT EXISTS v2_personal_finance_funds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  fund_key TEXT,
  name TEXT NOT NULL,
  amount_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  source_account_id TEXT REFERENCES v2_personal_accounts (id) ON DELETE SET NULL,
  monthly_hint TEXT,
  icon_key TEXT NOT NULL DEFAULT 'coin',
  accent TEXT NOT NULL DEFAULT '#F59E0B',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_finance_funds_user
  ON v2_personal_finance_funds (user_id, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_personal_finance_funds_user_key
  ON v2_personal_finance_funds (user_id, fund_key)
  WHERE fund_key IS NOT NULL;

ALTER TABLE v2_personal_finance_funds ENABLE ROW LEVEL SECURITY;

-- Перенос счетов-фондов → фонды, затем удаление счетов
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
  'pffund_' || substr(md5(a.user_id || ':' || m.fund_key), 1, 20),
  a.user_id,
  m.fund_key,
  a.name,
  COALESCE(a.balance_rub, 0),
  NULL,
  m.monthly_hint,
  m.icon_key,
  m.accent,
  m.sort_order,
  now(),
  now()
FROM v2_personal_accounts AS a
INNER JOIN (
  VALUES
    ('Подушка безопасности', 'cushion', NULL, 'shield', '#6366F1', 2),
    ('Фонд одежды', 'clothing', NULL, 'target', '#9A8CFF', 3),
    ('Фонд подарков', 'gifts', NULL, 'target', '#FF335F', 4)
) AS m(name, fund_key, monthly_hint, icon_key, accent, sort_order) ON m.name = a.name
ON CONFLICT (id) DO NOTHING;

DELETE FROM v2_personal_accounts
WHERE name IN ('Подушка безопасности', 'Фонд одежды', 'Фонд подарков');

-- Базовый набор фондов для каждого пользователя workspace
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
    ('life', 'Траты на жизнь', '150 000 ₽ каждый месяц', 'wallet', '#10B981', 0),
    ('salary', 'Фонд зарплат', '50 000 ₽ каждый месяц', 'bank', '#3B6FF7', 1),
    ('cushion', 'Подушка безопасности', NULL, 'shield', '#6366F1', 2),
    ('clothing', 'Фонд одежды', NULL, 'target', '#9A8CFF', 3),
    ('gifts', 'Фонд подарков', NULL, 'target', '#FF335F', 4),
    ('lera', 'Фонд сюрпризов Лере', NULL, 'coin', '#F472B6', 5),
    ('moscow', 'Фонд Москва', NULL, 'flag', '#0EA5E9', 6),
    ('china', 'Фонд Китай', NULL, 'coin', '#EF4444', 7)
) AS s(fund_key, name, monthly_hint, icon_key, accent, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_finance_funds AS f
  WHERE f.user_id = u.user_id
    AND f.fund_key = s.fund_key
);
