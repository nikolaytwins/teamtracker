-- 074 — капитал на счетах (accounts_total_rub): июнь 2023 — январь 2024

INSERT INTO v2_personal_income_history (
  user_id,
  year,
  month,
  accounts_total_rub,
  earned_rub,
  profit_rub,
  spent_rub,
  created_at,
  updated_at
)
SELECT
  u.user_id,
  s.year,
  s.month,
  s.accounts_total_rub,
  NULL::double precision,
  NULL::double precision,
  NULL::double precision,
  now(),
  now()
FROM (
  SELECT DISTINCT user_id
  FROM v2_workspace_members
) AS u
CROSS JOIN (
  VALUES
    (2024, 1, 517034::double precision),
    (2023, 12, 535000),
    (2023, 11, 359000),
    (2023, 10, 425000),
    (2023, 9, 263000),
    (2023, 8, 306724),
    (2023, 7, 179000),
    (2023, 6, 111306)
) AS s (year, month, accounts_total_rub)
ON CONFLICT (user_id, year, month) DO UPDATE SET
  accounts_total_rub = EXCLUDED.accounts_total_rub,
  updated_at = now();
