-- 022 — эталонные данные «История дохода» (2024–2026).
-- Требует 021_v2_personal_income_history.sql.
-- Записывает строки для каждого user_id из v2_workspace_members.
-- Повторный запуск безопасен: ON CONFLICT обновляет суммы.

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
  s.earned_rub,
  s.profit_rub,
  s.spent_rub,
  now(),
  now()
FROM (
  SELECT DISTINCT user_id
  FROM v2_workspace_members
) AS u
CROSS JOIN (
  VALUES
    -- 2026
    (2026, 7, 326123::double precision, 0::double precision, NULL::double precision, 0::double precision),
    (2026, 6, 543273, 403744, 19284, 0),
    (2026, 5, 291123, 92000, 49624, 0),
    (2026, 4, 578000, 448550, 356234, NULL),
    (2026, 3, 372572, 465500, 174109, NULL),
    (2026, 2, 427532, 493700, 211352, NULL),
    (2026, 1, 423088, 432700, 157867, NULL),
    -- 2025
    (2025, 12, 552653, 752900, 422616, NULL),
    (2025, 11, 440000, 440660, 175790, NULL),
    (2025, 10, 490000, 485700, 209000, NULL),
    (2025, 9, 537000, 626900, 287277, NULL),
    (2025, 8, 514378, 471000, 205740, NULL),
    (2025, 7, 535378, 469000, 241240, NULL),
    (2025, 6, 774838, 551000, 297270, NULL),
    (2025, 5, 798442, 395870, 88810, NULL),
    (2025, 4, 953771, 632000, 420772, NULL),
    (2025, 3, 721619, 336850, 168500, NULL),
    (2025, 2, 824000, 575450, 408450, NULL),
    (2025, 1, 680006, 382200, 267000, NULL),
    -- 2024
    (2024, 12, 716406, 516000, 364000, NULL),
    (2024, 11, 579741, 596950, 394238, NULL),
    (2024, 10, 421766, 494587, 311052, NULL),
    (2024, 9, 355359, 464800, 265873, NULL),
    (2024, 8, 328488, 420050, 151690, NULL),
    (2024, 7, 410032, 484727, 266827, NULL),
    (2024, 6, 405000, 523250, 275592, NULL),
    (2024, 5, 447000, 385700, 250000, NULL),
    (2024, 4, 528888, 508175, 365000, NULL),
    (2024, 3, 476000, 304933, 132000, NULL),
    (2024, 2, 743445, 557000, 398000, NULL),
    (2024, 1, 517034, 243000, 155250, NULL)
) AS s (
  year,
  month,
  accounts_total_rub,
  earned_rub,
  profit_rub,
  spent_rub
)
ON CONFLICT (user_id, year, month) DO UPDATE SET
  accounts_total_rub = EXCLUDED.accounts_total_rub,
  earned_rub = EXCLUDED.earned_rub,
  profit_rub = EXCLUDED.profit_rub,
  spent_rub = EXCLUDED.spent_rub,
  updated_at = now();
